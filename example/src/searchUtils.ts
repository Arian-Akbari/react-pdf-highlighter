import type { PDFDocumentProxy } from "pdfjs-dist";

export interface SearchResult {
  id: string;
  pageNumber: number;
  text: string;
  matchText: string;
  position: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  context: string; // surrounding text for context
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

interface TextContent {
  items: TextItem[];
}

/**
 * Extract all text content from a PDF page
 */
async function extractPageText(
  pdfDocument: PDFDocumentProxy,
  pageNumber: number
) {
  try {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = (await page.getTextContent()) as TextContent;

    // Build text with position information
    const textItems: Array<{
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    for (const item of textContent.items) {
      // Extract position from transform matrix
      const x = item.transform[4];
      const y = item.transform[5];

      textItems.push({
        text: item.str,
        x,
        y,
        width: item.width,
        height: item.height,
      });
    }

    // Sort items by vertical position (top to bottom) then horizontal (left to right)
    textItems.sort((a, b) => {
      const yDiff = b.y - a.y; // Higher y values first (PDF coordinates)
      if (Math.abs(yDiff) > 5) {
        // If items are on different lines
        return yDiff > 0 ? 1 : -1;
      }
      return a.x - b.x; // Same line, sort left to right
    });

    // Combine into full text and maintain position mapping
    let fullText = "";
    const positionMap: Array<{
      start: number;
      end: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    for (const item of textItems) {
      const start = fullText.length;
      fullText += `${item.text} `;
      const end = fullText.length - 1;

      positionMap.push({
        start,
        end,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      });
    }

    return { fullText: fullText.trim(), positionMap };
  } catch (error) {
    console.error(`Error extracting text from page ${pageNumber}:`, error);
    return { fullText: "", positionMap: [] };
  }
}

/**
 * Find position of text matches within position map
 */
function findMatchPositions(
  searchQuery: string,
  fullText: string,
  positionMap: Array<{
    start: number;
    end: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>
): Array<{
  matchStart: number;
  matchEnd: number;
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const matches: Array<{
    matchStart: number;
    matchEnd: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  const searchText = searchQuery.toLowerCase();
  const textToSearch = fullText.toLowerCase();

  let searchIndex = 0;
  while (searchIndex < textToSearch.length) {
    const matchIndex = textToSearch.indexOf(searchText, searchIndex);
    if (matchIndex === -1) break;

    const matchEnd = matchIndex + searchText.length;

    // Find the position information for this match
    let startPos: (typeof positionMap)[0] | undefined;
    let endPos: (typeof positionMap)[0] | undefined;

    for (const pos of positionMap) {
      if (pos.start <= matchIndex && pos.end >= matchIndex) {
        startPos = pos;
      }
      if (pos.start <= matchEnd && pos.end >= matchEnd) {
        endPos = pos;
        break;
      }
    }

    if (startPos && endPos) {
      // Calculate bounding box for the match
      const left = Math.min(startPos.x, endPos.x);
      const right = Math.max(
        startPos.x + startPos.width,
        endPos.x + endPos.width
      );
      const top = Math.max(
        startPos.y + startPos.height,
        endPos.y + endPos.height
      );
      const bottom = Math.min(startPos.y, endPos.y);

      matches.push({
        matchStart: matchIndex,
        matchEnd,
        x: left,
        y: bottom,
        width: right - left,
        height: top - bottom,
      });
    }

    searchIndex = matchIndex + 1;
  }

  return matches;
}

/**
 * Get context around a text match
 */
function getMatchContext(
  fullText: string,
  matchStart: number,
  matchEnd: number,
  contextLength = 50
): string {
  const start = Math.max(0, matchStart - contextLength);
  const end = Math.min(fullText.length, matchEnd + contextLength);

  let context = fullText.slice(start, end);

  // Add ellipsis if we truncated
  if (start > 0) context = `...${context}`;
  if (end < fullText.length) context = `${context}...`;

  return context;
}

/**
 * Search for text across all pages of a PDF document
 */
export async function searchPDF(
  pdfDocument: PDFDocumentProxy,
  searchQuery: string
): Promise<SearchResult[]> {
  if (!searchQuery.trim()) {
    return [];
  }

  const results: SearchResult[] = [];
  const numPages = pdfDocument.numPages;

  // Search each page
  for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
    try {
      const { fullText, positionMap } = await extractPageText(
        pdfDocument,
        pageNumber
      );

      if (!fullText) continue;

      const matches = findMatchPositions(searchQuery, fullText, positionMap);

      // Create search results for each match on this page
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const matchText = fullText.slice(match.matchStart, match.matchEnd);
        const context = getMatchContext(
          fullText,
          match.matchStart,
          match.matchEnd
        );

        results.push({
          id: `search-${pageNumber}-${i}`,
          pageNumber,
          text: matchText,
          matchText,
          position: {
            left: match.x,
            top: match.y,
            width: match.width,
            height: match.height,
          },
          context,
        });
      }
    } catch (error) {
      console.error(`Error searching page ${pageNumber}:`, error);
    }
  }

  return results;
}
