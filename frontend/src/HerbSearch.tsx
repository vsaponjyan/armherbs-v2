import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RAGEngine } from "./ragEngine";
import { autoComplete } from "./autoComplete";
import { herbEntityResolver } from "./herbEntityResolver";
import { useHerbSearch } from "./useHerbSearch";
import * as S from "./HerbSearchStyles";
import Footer from "./Footer";

interface HerbData {
  id: string;
  name: string;
  alternativeNames: string[];
  description: string;
  chemistry: string;
  healing: string;
  usage: string;
  otherBenefits: string;
  symptoms: string[];
  htmlFile: string;
  img: string;
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

function buildHerbMap(herbsData: HerbData[]): Map<string, HerbData> {
  return new Map(herbsData.map((h) => [h.id, h]));
}

export default function HerbSearch() {
  const [view, setView] = useState<"list" | "search" | "terms" | "literature">("list");
  const [localQuery, setLocalQuery] = useState("");
  const [query, setQuery] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [herbsData, setHerbsData] = useState<HerbData[]>([]);
  const [selectedHerb, setSelectedHerb] = useState<HerbData | null>(null);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [footerData, setFooterData] = useState<any>(null);

  const ragEngine = useRef(new RAGEngine()).current;
  const herbMap = useMemo(() => buildHerbMap(herbsData), [herbsData]);

  const {
    results,
    ragResponse,
    suggestions,
    loading: searchLoading,
    error,
    rewriteInfo,
    handleSearch,
  } = useHerbSearch({
    query,
    setQuery,
    herbsData,
    herbMap,
    ragEngine,
    setAutocompleteSuggestions,
  });

  useEffect(() => {
    setDataLoading(true);
    setDataError(null);
    fetch("/herbs_data.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: HerbData[]) => setHerbsData(data))
      .catch(() => {
        setDataError("Տվյալների բեռնումը ձախողվեց։ Խնդրում ենք թարմացնել էջը։");
      })
      .finally(() => setDataLoading(false));
  }, []);

  useEffect(() => {
    if (herbsData.length > 0) {
      autoComplete.setHerbs(herbsData);
      herbEntityResolver.setHerbs(
        herbsData.map((h) => ({
          id: h.id,
          name: h.name,
          alternativeNames: h.alternativeNames,
          symptoms: h.symptoms,
        }))
      );
    }
  }, [herbsData]);

  useEffect(() => {
    if (view !== "terms" && view !== "literature") return;
    if (footerData) return;
  
    fetch("/footer_data.json")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => setFooterData(json))
      .catch(err => console.error("Footer data error:", err));
  }, [view, footerData]);

  const handleNavigate = (newView: string) => {
    setSelectedHerb(null);
    setView(newView as any);
    
    let path = "/";
    if (newView === "search") path = "/smart-search";
    else if (newView === "terms") path = "/terms";
    else if (newView === "literature") path = "/literature";
    
    window.history.pushState(null, "", path);
    window.scrollTo(0, 0);
  };
  
  useEffect(() => {
    if (herbsData.length === 0) return;

    const path = window.location.pathname.replace("/", "");
    
    if (path === "smart-search") {
      setView("search");
    } else if (path === "terms" || path === "literature") {
      setView(path as any);
    } else if (path && path !== "") {
      const herb = herbsData.find(h => h.id === path);
      if (herb) setSelectedHerb(herb);
    }

    const handlePopState = () => {
      const newPath = window.location.pathname.replace("/", "");
      if (newPath === "smart-search") {
        setView("search");
        setSelectedHerb(null);
      } else if (newPath === "" || newPath === "list") {
        setView("list");
        setSelectedHerb(null);
      } else {
        const h = herbsData.find(x => x.id === newPath);
        if (h) setSelectedHerb(h);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [herbsData]);

  const filteredHerbs = useMemo(() => {
    const q = localQuery.toLowerCase().trim();
    if (!q) return herbsData;
    return herbsData.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.alternativeNames.some((alt) => alt.toLowerCase().includes(q)) ||
        h.id.toLowerCase().includes(q)
    );
  }, [herbsData, localQuery]);
  
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
    [searchLoading, autocompleteIndex, autocompleteSuggestions, handleSearch, setQuery]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setAutocompleteIndex(-1);
    if (value.length >= 2) {
      setAutocompleteSuggestions(autoComplete.getSuggestions(value, 5));
    } else {
      setAutocompleteSuggestions([]);
    }
  };

  if (dataLoading) return <div style={S.loadingStyle}>🌿 Բեռնվում է...</div>;
  if (dataError) return <div style={S.errorBoxStyle}>❌ {dataError}</div>;

  return (
    <div style={S.containerStyle}>
      {!selectedHerb && (view === "list" || view === "search") && (
        <div style={S.viewToggleContainer}>
          <button
            style={S.getViewButtonStyle(view === "list")}
            onClick={() => handleNavigate("list")}
          >
            📚 Բոլոր դեղաբույսերը
          </button>
          <button
            style={S.getViewButtonStyle(view === "search")}
            onClick={() => handleNavigate("search")}
          >
            🌿 Դեղաբույսերի որոնում հիվանդությամբ
          </button>
        </div>
      )}

      {selectedHerb ? (
        <div style={S.selectedHerbCardStyle}>
          <button onClick={() => handleNavigate(view)} style={S.backButtonStyle}>
            ← Ետ գնալ
          </button>
          {selectedHerb.img && (
            <img
              src={selectedHerb.img}
              alt={selectedHerb.name}
              style={S.herbImageStyle}
              loading="lazy"     
              decoding="async"
            />
          )}
          <h2 style={S.herbNameStyle}>🌿 {selectedHerb.name}</h2>
          {selectedHerb.alternativeNames.length > 0 && (
            <p style={S.altNamesStyle}>
              <strong>Այլ անուններ:</strong> {selectedHerb.alternativeNames.join(", ")}
            </p>
          )}
          <div style={{ marginTop: 15 }}>
            <h4 style={S.sectionTitleStyle}>📝 Նկարագրություն</h4>
            <p style={S.sectionTextStyle}>{selectedHerb.description}</p>
            <h4 style={S.sectionTitleStyle}>🧪 Քիմիական կազմ</h4>
            <p style={S.sectionTextStyle}>{selectedHerb.chemistry}</p>
            <h4 style={S.sectionTitleStyle}>💊 Բուժիչ հատկություններ</h4>
            <p style={S.sectionTextStyle}>{selectedHerb.healing}</p>
            <h4 style={S.sectionTitleStyle}> 🔬 Օգտագործում</h4>
            <p style={S.sectionTextStyle}>{selectedHerb.usage}</p>
            <h4 style={S.sectionTitleStyle}> ✨ Այլ օգուտներ</h4>
            <p style={S.sectionTextStyle}>{selectedHerb.otherBenefits}</p>
          </div>
          {selectedHerb.symptoms.length > 0 && (
            <div style={{ marginTop: 15 }}>
              <h4 style={S.sectionTitleStyle}>🩺 Ախտանշաններ</h4>
              <div style={S.tagsWrapperStyle}>
                {selectedHerb.symptoms.map((s, idx) => (
                  <span key={idx} style={S.symptomTagStyle}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {view === "list" && (
            <div style={S.herbListWrapperStyle}>
              <input
                style={S.localSearchInputStyle}
                placeholder="Որոնել դեղաբույսը ցանկում..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
              />
              <div style={S.herbListGridStyle}>
                {filteredHerbs.map((herb) => (
                  <button
                    key={herb.id}
                    onClick={() => {
                      setSelectedHerb(herb);
                      window.history.pushState(null, "", `/${herb.id}`);
                      window.scrollTo(0, 0);
                    }}
                    style={S.getHerbButtonStyle(false, false)} 
                  >
                    <img
                      src={herb.img || "/placeholder-herb.png"}
                      alt={herb.name}
                      style={S.herbCardImageStyle}
                      loading="lazy"   
                      decoding="async"
                    />
                    <span>{herb.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === "search" && (
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
                />
                {autocompleteSuggestions.length > 0 && (
                  <div style={S.autocompleteDropdownStyle}>
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

              {/* Գրագետ AI Պատասխանի հղումների ստացում՝ String.indexOf-ով (Առանց RegExp-ի) */}
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
                                onClick={() => {
                                  setSelectedHerb(herb);
                                  window.history.pushState(null, "", `/${herb.id}`);
                                  window.scrollTo(0, 0);
                                }}
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
                          if (herbData) {
                            setSelectedHerb(herbData);
                            window.history.pushState(null, "", `/${herbData.id}`);
                            window.scrollTo(0, 0);
                          }
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
          )}

          {view === "terms" && (
            <div style={S.pageContainerStyle}>
              <h2 style={S.footerTitleStyle}>🌿 Բժշկական Տերմիններ</h2>
              {footerData?.terms?.map((t: any, i: number) => (
                <div key={i} style={S.termItemStyle}>
                  <strong style={S.termNameStyle}>{t.name}</strong>
                  <p style={S.termTextStyle}>{t.text}</p>
                </div>
              ))}
            </div>
          )}

          {view === "literature" && (
            <div style={S.pageContainerStyle}>
              <h2 style={S.footerTitleStyle}>📚 Օգտագործված Գրականություն</h2>
              {footerData?.literature?.map((l: string, i: number) => (
                <p key={i} style={S.literatureItemStyle}>📖 {l}</p>
              ))}
            </div>
          )}
        </>
      )}

      <Footer 
        currentView={selectedHerb ? "herb-detail" : view} 
        onNavigate={handleNavigate} 
      />
    </div>
  );
}