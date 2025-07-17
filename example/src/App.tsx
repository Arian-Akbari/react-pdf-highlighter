import React, { useState, useEffect, useCallback, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

import {
  AreaHighlight,
  Highlight,
  PdfHighlighter,
  PdfLoader,
  Popup,
  Tip,
} from "./react-pdf-highlighter";
import type {
  Content,
  IHighlight,
  NewHighlight,
  ScaledPosition,
} from "./react-pdf-highlighter";

import { Spinner } from "./Spinner";
import { SearchPanel } from "./SearchPanel";
import { useSearch } from "./useSearch";
import type { SearchResult } from "./searchUtils";

import "./style/App.css";
import "../../dist/style.css";

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

const resetHash = () => {
  document.location.hash = "";
};

const HighlightPopup = ({
  comment,
}: {
  comment: { text: string; emoji: string };
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

const PDF_URL = "./season1.pdf";

export function App() {
  const searchParams = new URLSearchParams(document.location.search);
  const initialUrl = searchParams.get("url") || PDF_URL;

  const [url, setUrl] = useState(initialUrl);
  const [highlights, setHighlights] = useState<Array<IHighlight>>([]);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);

  const scrollViewerTo = useRef((highlight: IHighlight) => {});

  // Search functionality
  const handleNavigateToSearchResult = useCallback((result: SearchResult) => {
    // Convert search result to a format compatible with scrollTo
    const searchHighlight: IHighlight = {
      id: result.id,
      content: { text: result.text },
      comment: { text: "Search result", emoji: "🔍" },
      position: {
        boundingRect: {
          x1: result.position.left,
          y1: result.position.top,
          x2: result.position.left + result.position.width,
          y2: result.position.top + result.position.height,
          width: 800, // Default PDF width
          height: 1200, // Default PDF height
          pageNumber: result.pageNumber,
        },
        rects: [
          {
            x1: result.position.left,
            y1: result.position.top,
            x2: result.position.left + result.position.width,
            y2: result.position.top + result.position.height,
            width: 800,
            height: 1200,
            pageNumber: result.pageNumber,
          },
        ],
        pageNumber: result.pageNumber,
      },
    };
    scrollViewerTo.current(searchHighlight);
  }, []);

  const search = useSearch(pdfDocument, handleNavigateToSearchResult);

  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = getHighlightById(parseIdFromHash());
    if (highlight) {
      scrollViewerTo.current(highlight);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash, false);
    return () => {
      window.removeEventListener(
        "hashchange",
        scrollToHighlightFromHash,
        false
      );
    };
  }, [scrollToHighlightFromHash]);

  const getHighlightById = (id: string) => {
    return highlights.find((highlight) => highlight.id === id);
  };

  const addHighlight = (highlight: NewHighlight) => {
    console.log("Saving highlight", highlight);
    setHighlights((prevHighlights) => [
      { ...highlight, id: getNextId() },
      ...prevHighlights,
    ]);
  };

  const updateHighlight = (
    highlightId: string,
    position: Partial<ScaledPosition>,
    content: Partial<Content>
  ) => {
    console.log("Updating highlight", highlightId, position, content);
    setHighlights((prevHighlights) =>
      prevHighlights.map((h) => {
        const {
          id,
          position: originalPosition,
          content: originalContent,
          ...rest
        } = h;
        return id === highlightId
          ? {
              id,
              position: { ...originalPosition, ...position },
              content: { ...originalContent, ...content },
              ...rest,
            }
          : h;
      })
    );
  };

  return (
    <div
      className="App"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      {/* Top search bar */}
      <SearchPanel
        onSearch={search.performSearch}
        onNavigateToNext={search.navigateToNext}
        onNavigateToPrevious={search.navigateToPrevious}
        onClearSearch={search.clearSearch}
        searchResults={search.searchResults}
        currentResultIndex={search.currentResultIndex}
        isSearching={search.isSearching}
      />

      {/* PDF viewer taking full remaining space */}
      <div
        style={{
          flex: 1,
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <PdfLoader url={url} beforeLoad={<Spinner />}>
          {(pdfDocument) => {
            // Set the PDF document for search functionality
            setPdfDocument(pdfDocument);

            return (
              <PdfHighlighter
                pdfDocument={pdfDocument}
                enableAreaSelection={(event) => event.altKey}
                onScrollChange={resetHash}
                scrollRef={(scrollTo) => {
                  scrollViewerTo.current = scrollTo;
                  scrollToHighlightFromHash();
                }}
                onSelectionFinished={(
                  position,
                  content,
                  hideTipAndSelection,
                  transformSelection
                ) => (
                  <Tip
                    onOpen={transformSelection}
                    onConfirm={(comment) => {
                      addHighlight({ content, position, comment });
                      hideTipAndSelection();
                    }}
                  />
                )}
                highlightTransform={(
                  highlight,
                  index,
                  setTip,
                  hideTip,
                  viewportToScaled,
                  screenshot,
                  isScrolledTo
                ) => {
                  const isTextHighlight = !highlight.content?.image;

                  const component = isTextHighlight ? (
                    <Highlight
                      isScrolledTo={isScrolledTo}
                      position={highlight.position}
                      comment={highlight.comment}
                    />
                  ) : (
                    <AreaHighlight
                      isScrolledTo={isScrolledTo}
                      highlight={highlight}
                      onChange={(boundingRect) => {
                        updateHighlight(
                          highlight.id,
                          { boundingRect: viewportToScaled(boundingRect) },
                          { image: screenshot(boundingRect) }
                        );
                      }}
                    />
                  );

                  return (
                    <Popup
                      popupContent={<HighlightPopup {...highlight} />}
                      onMouseOver={(popupContent) =>
                        setTip(highlight, (highlight) => popupContent)
                      }
                      onMouseOut={hideTip}
                      key={index}
                    >
                      {component}
                    </Popup>
                  );
                }}
                highlights={highlights}
              />
            );
          }}
        </PdfLoader>
      </div>
    </div>
  );
}
