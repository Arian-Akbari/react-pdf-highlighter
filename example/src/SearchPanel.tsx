import React, { useState } from "react";
import type { SearchResult } from "./searchUtils";

interface SearchPanelProps {
  onSearch: (query: string) => Promise<void>;
  onNavigateToNext: () => void;
  onNavigateToPrevious: () => void;
  onClearSearch: () => void;
  searchResults: SearchResult[];
  currentResultIndex: number;
  isSearching: boolean;
}

export function SearchPanel({
  onSearch,
  onNavigateToNext,
  onNavigateToPrevious,
  onClearSearch,
  searchResults,
  currentResultIndex,
  isSearching,
}: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const clearSearch = () => {
    setSearchQuery("");
    onClearSearch();
  };

  return (
    <div
      className="search-panel"
      style={{ padding: "1rem", borderBottom: "1px solid #ddd" }}
    >
      <div style={{ marginBottom: "0.5rem" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Search in PDF..."
            value={searchQuery}
            onChange={handleInputChange}
            style={{
              flex: 1,
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              style={{
                position: "absolute",
                right: "5px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                color: "#666",
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {isSearching && (
        <div style={{ fontSize: "12px", color: "#666" }}>Searching...</div>
      )}

      {searchResults.length > 0 && (
        <div
          style={{ fontSize: "12px", color: "#666", marginBottom: "0.5rem" }}
        >
          {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}{" "}
          found
          {currentResultIndex >= 0 &&
            ` (${currentResultIndex + 1} of ${searchResults.length})`}
        </div>
      )}

      {searchResults.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={onNavigateToPrevious}
            disabled={searchResults.length === 0}
            style={{
              padding: "0.25rem 0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              background: "#f5f5f5",
              cursor: "pointer",
              fontSize: "12px",
            }}
            title="Previous result"
          >
            ↑ Previous
          </button>
          <button
            type="button"
            onClick={onNavigateToNext}
            disabled={searchResults.length === 0}
            style={{
              padding: "0.25rem 0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              background: "#f5f5f5",
              cursor: "pointer",
              fontSize: "12px",
            }}
            title="Next result"
          >
            ↓ Next
          </button>
        </div>
      )}

      {searchQuery && searchResults.length === 0 && !isSearching && (
        <div style={{ fontSize: "12px", color: "#999" }}>No results found</div>
      )}
    </div>
  );
}
