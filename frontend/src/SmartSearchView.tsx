import { KeyboardEvent, ChangeEvent, Dispatch, SetStateAction, useCallback } from "react";
import { autoComplete } from "./autoComplete";
import { SearchResult } from "./searchEngine";
import { RAGResponse } from "./ragEngine";
import * as S from "./HerbSearchStyles";
import { HerbData } from "./HerbSearch";

interface SmartSearchViewProps {
  herbsData: HerbData[];
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  ragResponse: RAGResponse | null;
  suggestions: string[];
  searchLoading: boolean;
  error: string | null;
  rewriteInfo: string | null;
  handleSearch: (q?: string) => void;
  autocompleteSuggestions: string[];
  setAutocompleteSuggestions: (s: string[]) => void;
  autocompleteIndex: number;
  setAutocompleteIndex: Dispatch<SetStateAction<number>>;
  onSelectHerb: (herb: HerbData) => void;
}

function highlightText(text: string, query: string): (string | JSX.Element)[] | string {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return text;

  const queryWords = trimmedQuery
    .split(/\s+/)
    .filter((word) => word.length > 2);

  if (queryWords.length === 0) return text;

  const lowerText = text.toLowerCase();
  const result: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  while (lastIndex < text.length) {
    let earliestMatchIndex = -1;
    let matchLength = 0;

    for (const word of queryWords) {
      const index = lowerText.indexOf(word, lastIndex);
      if (index !== -1 && (earliestMatchIndex === -1 || index < earliestMatchIndex)) {
        earliestMatchIndex = index;
        matchLength = word.length;
      }
    }

    if (earliestMatchIndex === -1) {
      result.push(text.slice(lastIndex));
      break;
    }

    if (earliestMatchIndex > lastIndex) {
      result.push(text.slice(lastIndex, earliestMatchIndex));
    }

    const matchText = text.slice(earliestMatchIndex, earliestMatchIndex + matchLength);
    result.push(
      <span key={earliestMatchIndex} style={S.highlightStyle}>
        {matchText}
      </span>
    );

    lastIndex = earliestMatchIndex + matchLength;
  }

  return result;
}

function truncateText(text: string, maxLength = 200): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (
    (lastSpace > maxLength * 0.8
      ? truncated.slice(0, lastSpace)
      : truncated) + "..."
  );
}

function MatchBadge({ type }: { type?: "exact" | "fuzzy" | "semantic" }) {
  if (!type) return null;
  const labels = { exact: "Ճիշտ", fuzzy: "Մոտավոր", semantic: "Իմաստային" };
  const style = S.matchBadgeStyles[type] || {};
  return (
    <span style={style}>{labels[type]}</span>
  );
}

export default function SmartSearchView({
  herbsData,
  query,
  setQuery,
  results,
  ragResponse,
  suggestions,
  searchLoading,
  error,
  rewriteInfo,
  handleSearch,
  autocompleteSuggestions,
  setAutocompleteSuggestions,
  autocompleteIndex,
  setAutocompleteIndex,
  onSelectHerb,
}: SmartSearchViewProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && !searchLoading) {
        if (
          autocompleteIndex >= 0 &&
          autocompleteSuggestions[autocompleteIndex]
        ) {
          const selected = autocompleteSuggestions[autocompleteIndex];
          setQuery(selected);
          setAutocompleteSuggestions([]);
          handleSearch(selected);
        } else {
          handleSearch();
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setAutocompleteIndex((p) =>
          p < autocompleteSuggestions.length - 1 ? p + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setAutocompleteIndex((p) =>
          p > 0 ? p - 1 : autocompleteSuggestions.length - 1
        );
      } else if (e.key === "Escape") {
        setAutocompleteSuggestions([]);
      }
    },
    [searchLoading, autocompleteIndex, autocompleteSuggestions, handleSearch, setQuery, setAutocompleteIndex, setAutocompleteSuggestions]
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setAutocompleteIndex(-1);
    if (value.length >= 2) {
      setAutocompleteSuggestions(autoComplete.getSuggestions(value, 5));
    } else {
      setAutocompleteSuggestions([]);
    }
  };

  return (
    <div>
      <h2>🌿 Դեղաբույսերի որոնում</h2>
      <div style={S.searchInputWrapperStyle}>
        <input
          type="text"
          value={query}
          placeholder="օր․ ի՞նչպես կիրառել կատվախոտը, ի՞նչ անել գլխացավի դեպքում"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={searchLoading}
          style={S.getSearchInputStyle(searchLoading)}
          aria-label="Որոնել դեղաբույսեր"
        />
        {autocompleteSuggestions.length > 0 && (
          <div style={S.autocompleteDropdownStyle} role="listbox">
            {autocompleteSuggestions.map((sugg, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setQuery(sugg);
                  setAutocompleteSuggestions([]);
                  handleSearch(sugg);
                }}
                style={S.getAutocompleteItemStyle(
                  idx === autocompleteIndex,
                  idx === autocompleteSuggestions.length - 1
                )}
              >
                🔍 {sugg}
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => handleSearch()}
        disabled={searchLoading}
        style={S.getSearchButtonStyle(searchLoading)}
        aria-label="Որոնել"
      >
        {searchLoading ? "Որոնում է..." : "Որոնել"}
      </button>

      {rewriteInfo && <div style={S.rewriteInfoStyle}>{rewriteInfo}</div>}
      {error && <div style={S.errorBoxStyle}>❌ {error}</div>}

      {suggestions.length > 0 && (
        <div style={S.suggestionsBoxStyle}>
          <p style={S.suggestionsTitleStyle}>💡 Գուցե նկատի ունեիք՝</p>
          <div style={S.suggestionsRowStyle}>
            {suggestions.map((sugg, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(sugg);
                  handleSearch(sugg);
                }}
                style={S.suggestionButtonStyle}
              >
                {sugg}
              </button>
            ))}
          </div>
        </div>
      )}

      {ragResponse && (
        <div style={S.ragBoxStyle}>
          <h3 style={S.ragTitleStyle}>
            🤖 Պատասխան{" "}
            <span style={S.getConfidenceBadgeStyle(ragResponse.confidence)}>
              {ragResponse.confidence === "high"
                ? "Բարձր վստահություն"
                : "Միջին վստահություն"}
            </span>
          </h3>
          <p style={S.ragAnswerStyle}>
            {(() => {
              let parts: (string | JSX.Element)[] = [ragResponse.answer];

              herbsData.forEach((herb) => {
                const herbNameLower = herb.name.toLowerCase();
                const newParts: (string | JSX.Element)[] = [];

                parts.forEach((part) => {
                  if (typeof part !== "string") {
                    newParts.push(part);
                    return;
                  }

                  let lastIndex = 0;
                  const partLower = part.toLowerCase();

                  while (lastIndex < part.length) {
                    const matchIndex = partLower.indexOf(herbNameLower, lastIndex);

                    if (matchIndex === -1) {
                      newParts.push(part.slice(lastIndex));
                      break;
                    }

                    if (matchIndex > lastIndex) {
                      newParts.push(part.slice(lastIndex, matchIndex));
                    }

                    const originalText = part.slice(matchIndex, matchIndex + herb.name.length);

                    newParts.push(
                      <span
                        key={`${herb.id}-${matchIndex}`}
                        style={S.herbLinkInTextStyle}
                        onClick={() => onSelectHerb(herb)}
                      >
                        {originalText}
                      </span>
                    );

                    lastIndex = matchIndex + herb.name.length;
                  }
                });
                parts = newParts;
              });

              return parts;
            })()}
          </p>
        </div>
      )}

      <ul style={S.resultsListStyle}>
        {results.map((r) => {
          const herbData = herbsData.find((h) => h.id === r.id);
          return (
            <li key={r.id} style={S.resultItemStyle}>
              <h3
                style={
                  herbData
                    ? S.clickableTitleStyle
                    : { ...S.clickableTitleStyle, cursor: "default", textDecoration: "none" }
                }
                onClick={() => {
                  if (herbData) onSelectHerb(herbData);
                }}
              >
                {highlightText(r.name, query)}{" "}
                <MatchBadge type={r.matchType} />
              </h3>
              <p style={S.resultHealingStyle}>
                {truncateText(r.healing, 200)}
              </p>
              <small style={S.resultMetaStyle}>
                <strong>ԱԽՏԱՆՇԱՆՆԵՐ՝</strong>{" "}
                {truncateText(r.symptoms.join(", "), 150)}
              </small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}