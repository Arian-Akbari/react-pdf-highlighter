import { useState, useCallback, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { searchPDF, type SearchResult } from "./searchUtils";

interface UseSearchResult {
  searchResults: SearchResult[];
  currentResultIndex: number;
  isSearching: boolean;
  performSearch: (query: string) => Promise<void>;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
  clearSearch: () => void;
  getCurrentResult: () => SearchResult | undefined;
}

export function useSearch(
  pdfDocument: PDFDocumentProxy | null,
  onNavigateToResult?: (result: SearchResult) => void
): UseSearchResult {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const lastSearchQuery = useRef<string>("");

  const performSearch = useCallback(
    async (query: string) => {
      if (!pdfDocument || !query.trim()) {
        setSearchResults([]);
        setCurrentResultIndex(-1);
        lastSearchQuery.current = "";
        return;
      }

      // Don't search again if it's the same query
      if (query === lastSearchQuery.current) {
        return;
      }

      setIsSearching(true);
      lastSearchQuery.current = query;

      try {
        const results = await searchPDF(pdfDocument, query);
        setSearchResults(results);

        // Set to first result if any found
        if (results.length > 0) {
          setCurrentResultIndex(0);
          onNavigateToResult?.(results[0]);
        } else {
          setCurrentResultIndex(-1);
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
        setCurrentResultIndex(-1);
      } finally {
        setIsSearching(false);
      }
    },
    [pdfDocument, onNavigateToResult]
  );

  const navigateToNext = useCallback(() => {
    if (searchResults.length === 0) return;

    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    onNavigateToResult?.(searchResults[nextIndex]);
  }, [searchResults, currentResultIndex, onNavigateToResult]);

  const navigateToPrevious = useCallback(() => {
    if (searchResults.length === 0) return;

    const prevIndex =
      currentResultIndex === 0
        ? searchResults.length - 1
        : currentResultIndex - 1;
    setCurrentResultIndex(prevIndex);
    onNavigateToResult?.(searchResults[prevIndex]);
  }, [searchResults, currentResultIndex, onNavigateToResult]);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setCurrentResultIndex(-1);
    lastSearchQuery.current = "";
  }, []);

  const getCurrentResult = useCallback(() => {
    if (currentResultIndex >= 0 && currentResultIndex < searchResults.length) {
      return searchResults[currentResultIndex];
    }
    return undefined;
  }, [searchResults, currentResultIndex]);

  return {
    searchResults,
    currentResultIndex,
    isSearching,
    performSearch,
    navigateToNext,
    navigateToPrevious,
    clearSearch,
    getCurrentResult,
  };
}
