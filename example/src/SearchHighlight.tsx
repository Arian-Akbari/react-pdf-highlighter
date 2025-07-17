import React from "react";
import type { Position } from "./react-pdf-highlighter";

interface SearchHighlightProps {
  position: Position;
  isActive?: boolean;
  onClick?: () => void;
}

export function SearchHighlight({
  position,
  isActive = false,
  onClick,
}: SearchHighlightProps) {
  const { rects } = position;

  return (
    <div>
      {rects.map((rect, index) => (
        <div
          key={`${rect.left}-${rect.top}-${rect.width}-${rect.height}-${index}`}
          className="search-highlight"
          style={{
            position: "absolute",
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            backgroundColor: isActive
              ? "rgba(255, 235, 59, 0.7)"
              : "rgba(255, 193, 7, 0.4)",
            border: isActive
              ? "2px solid #ff9800"
              : "1px solid rgba(255, 193, 7, 0.6)",
            borderRadius: "2px",
            pointerEvents: "auto",
            cursor: "pointer",
            zIndex: 1,
            transition: "all 0.2s ease",
            animation: isActive ? "searchPulse 1s ease-in-out" : undefined,
          }}
          onClick={onClick}
          title="Search result"
        />
      ))}

      <style>{`
        @keyframes searchPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .search-highlight:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}
