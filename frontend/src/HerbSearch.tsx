// src/HerbSearch.tsx

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { searchEngine, SearchResult } from "./searchEngine";
import { embedText } from "./queryEmbedding";
import { RAGEngine, RAGResponse } from "./ragEngine";
import { conversationMemory } from "./conversationMemory";
import { resultReranker } from "./resultReranker";
import { queryRewriter } from "./queryRewriter";
import { autoComplete } from "./autoComplete";
import { herbEntityResolver } from "./herbEntityResolver";
import * as S from "./HerbSearchStyles";

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

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((word) => escapeRegExp(word));
  if (queryWords.length === 0) return text;
  try {
    const regex = new RegExp(`(${queryWords.join("|")})`, "gi");
    return text.split(regex).map((part, idx) => {
      const isMatch = queryWords.some((escapedWord) => {
        const unescaped = escapedWord
          .replace(/\\\\/g, "\\")
          .replace(/\\(.)/g, "$1");
        return part.toLowerCase() === unescaped.toLowerCase();
      });
      if (isMatch)
        return (
          <span key={idx} style={S.highlightStyle}>
            {part}
          </span>
        );
      return part;
    });
  } catch {
    return text;
  }
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
    <span style={style}>{labels[type as keyof typeof labels]}</span>
  );
}

function buildHerbMap(herbsData: HerbData[]): Map<string, HerbData> {
  return new Map(herbsData.map((h) => [h.id, h]));
}

function enrichResult(
  result: SearchResult,
  herbMap: Map<string, HerbData>
): SearchResult {
  const fullData = herbMap.get(result.id);
  if (!fullData) return result;
  return {
    ...result,
    healing: fullData.healing,
    symptoms: fullData.symptoms,
    alternativeNames: fullData.alternativeNames,
    usage: fullData.usage,
    description: fullData.description,
  } as SearchResult;
}

export default function HerbSearch() {
  const [view, setView] = useState<"list" | "search">("list");
  const [localQuery, setLocalQuery] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [ragResponse, setRagResponse] = useState<RAGResponse | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [herbsData, setHerbsData] = useState<HerbData[]>([]);
  const [selectedHerb, setSelectedHerb] = useState<HerbData | null>(null);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [rewriteInfo, setRewriteInfo] = useState<string | null>(null);

  const ragEngine = useRef(new RAGEngine()).current;
  const herbMap = useMemo(() => buildHerbMap(herbsData), [herbsData]);

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

  
  const renderedAnswer = useMemo(() => {
    if (!ragResponse?.answer) return null;
    const text = ragResponse.answer;
    let parts: (string | JSX.Element)[] = [text];

    herbsData.forEach((herb) => {
      const newParts: (string | JSX.Element)[] = [];
      parts.forEach((part) => {
        if (typeof part !== "string") {
          newParts.push(part);
          return;
        }
        const regex = new RegExp(`(${escapeRegExp(herb.name)})`, "gi");
        part.split(regex).forEach((sub, i) => {
          if (sub.toLowerCase() === herb.name.toLowerCase()) {
            newParts.push(
              <span
                key={`${herb.id}-${i}`}
                style={S.herbLinkInTextStyle}
                onClick={() => setSelectedHerb(herb)}
              >
                {sub}
              </span>
            );
          } else if (sub) {
            newParts.push(sub);
          }
        });
      });
      parts = newParts;
    });

    return parts;
  }, [ragResponse, herbsData]);

  
  const handleSearch = useCallback(
    async (searchQuery?: string) => {
      let trimmedQuery = (searchQuery ?? query).trim();
      if (!trimmedQuery) return;
  
      setLoading(true);
      setError(null);
      setRagResponse(null);
      setRewriteInfo(null);
      setAutocompleteSuggestions([]);
  
      if (searchQuery && searchQuery.trim() !== query) {
        setQuery(searchQuery.trim());
      }
       
      try {
          //  Ստուգում ենք Follow-up-ը՝ հաշվի առնելով բոլոր բույսերի տվյալները
          if (conversationMemory.isFollowUpQuery(trimmedQuery)) {
          //  Փոխանցում ենք ամբողջ herbsData-ն
           const resolved = conversationMemory.resolveFollowUp(trimmedQuery, herbsData);
          
          if (resolved !== trimmedQuery) {
            trimmedQuery = resolved;
          }
        }

        // STEP 1 Այժմ կանչում ենք rewrite-ը արդեն «մաքրված» trimmedQuery-ով
        const rewritten = queryRewriter.rewrite(
          trimmedQuery,
          herbsData.map((h) => h.name) //herbsData-> herbsDataRef.current
        );

        console.log("rewritten.canonical:", rewritten.canonical);
  
        // STEP 2 — Entity resolve canonical form-ի վրա
        const entityResult = herbEntityResolver.resolve(rewritten.canonical);
  
        let finalQuery = rewritten.canonical;
  
        if (entityResult.type === "herb") {
          setRewriteInfo(`Բույս՝ "${entityResult.herbName}"`);
          finalQuery = entityResult.resolvedQuery;
        } else if (entityResult.type === "symptom") {
          setRewriteInfo(`Ախտանշան՝ "${entityResult.symptom}"`);
          finalQuery = entityResult.resolvedQuery;
        }
  
        // STEP 3 — Embedding
        const queryEmbedding = await embedText(finalQuery);
        let found = await searchEngine.search(queryEmbedding, finalQuery, 5);
        found = resultReranker.rerank(finalQuery, found);
        let enrichedFound = found.map((r) => enrichResult(r, herbMap));
  
        // STEP 4 — Entity herb inject եթե results-ում չկա
        if (
          entityResult.type === "herb" &&
          entityResult.herbId &&
          !enrichedFound.some(
            (r) => r.id === entityResult.herbId ||
                   r.name.toLowerCase() === (entityResult.herbName ?? "").toLowerCase()
          )
        ) {
          const directHerb =
            herbMap.get(entityResult.herbId!) ??
            herbsData.find(  
              (h) => h.name.toLowerCase() === (entityResult.herbName ?? "").toLowerCase()
            );
  
          if (directHerb) {
            const directResult: SearchResult = {
              ...directHerb,
              id: directHerb.id,
              embedding: [],
              finalScore: 1.0,
              matchType: "exact",
            };
            enrichedFound = [directResult, ...enrichedFound].slice(0, 5);
          }
        }

        if (entityResult.type === "herb" && entityResult.herbName) {
          const entityNameLower = entityResult.herbName.toLowerCase();
          enrichedFound = enrichedFound.map((r) =>
            r.id === entityResult.herbId ||
            r.name.toLowerCase() === entityNameLower
              ? { ...r, finalScore: 1.0, matchType: "exact" as const }
              : r
          );
          enrichedFound.sort(
            (a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0)
          );
        }
  
        setResults(enrichedFound);
  
        if (
          enrichedFound.length === 0 ||
          (enrichedFound[0].finalScore ?? 0) < 0.3
        ) {
          setSuggestions(await searchEngine.findSuggestions(finalQuery, 3));
        } else {
          setSuggestions([]);
        }
        
        // entity="herb" դեպքում primaryHerb-ը փոխանցել
        // symptom/general դեպքում undefined — AI ազատ է
        if (ragEngine.shouldTriggerRAG(finalQuery, enrichedFound)) {
          setRagResponse(
            await ragEngine.generateAnswer(
              finalQuery,
              enrichedFound,
              entityResult.type === "herb" ? entityResult.herbName : undefined
            )
          );
        }
  
        conversationMemory.addTurn(finalQuery, enrichedFound);
      } catch {
        setError("Որոնման ընթացքում սխալ տեղի ունեցավ");
      } finally {
        setLoading(false);
      }
    },
    [query, herbsData, herbMap, ragEngine] 
  );


  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !loading) {
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
    [loading, autocompleteIndex, autocompleteSuggestions, handleSearch]
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
  if (dataError)
    return (
      <div style={S.errorBoxStyle}>
        ❌ {dataError}
      </div>
    );

  return (
    <div style={S.containerStyle}>
      {/* Page Toggle */}
      <div style={S.viewToggleContainer}>
        <button
          style={S.getViewButtonStyle(view === "list")}
          onClick={() => {
            setView("list");
            setSelectedHerb(null);
          }}
        >
          📚 Բոլոր դեղաբույսերը
        </button>
        <button
          style={S.getViewButtonStyle(view === "search")}
          onClick={() => {
            setView("search");
            setSelectedHerb(null);
          }}
        >
          🌿 Դեղաբույսերի որոնում հիվանդությամբ
        </button>
      </div>

      {selectedHerb ? (
        <div style={S.selectedHerbCardStyle}>
          <button onClick={() => setSelectedHerb(null)} style={S.backButtonStyle}>
            ← Ետ գնալ
          </button>
          {selectedHerb.img && (
              <img
                src={selectedHerb.img}
                alt={selectedHerb.name}
                style={S.herbImageStyle}
                loading="eager"    
                decoding="async"
              />
          )}
          <h2 style={S.herbNameStyle}>🌿 {selectedHerb.name}</h2>
          {selectedHerb.alternativeNames.length > 0 && (
            <p style={S.altNamesStyle}>
              <strong>Այլ անուններ:</strong>{" "}
              {selectedHerb.alternativeNames.join(", ")}
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
                    onClick={() => setSelectedHerb(herb)}
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
                  disabled={loading}
                  style={S.getSearchInputStyle(loading)}
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
                disabled={loading}
                style={S.getSearchButtonStyle(loading)}
              >
                {loading ? "Որոնում է..." : "Որոնել"}
              </button>

              {rewriteInfo && (
                <div style={S.rewriteInfoStyle}>{rewriteInfo}</div>
              )}
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

              {ragResponse && renderedAnswer && (
                <div style={S.ragBoxStyle}>
                  <h3 style={S.ragTitleStyle}>
                    🤖 Պատասխան{" "}
                    <span
                      style={S.getConfidenceBadgeStyle(ragResponse.confidence)}
                    >
                      {ragResponse.confidence === "high"
                        ? "Բարձր վստահություն"
                        : "Միջին վստահություն"}
                    </span>
                  </h3>
                  
                  <p style={S.ragAnswerStyle}>{renderedAnswer}</p>
                </div>
              )}

              <ul style={S.resultsListStyle}>
                {results.map((r) => {
                  //selectedHerb null handling
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
                          if (herbData) setSelectedHerb(herbData);
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
        </>
      )}
    </div>
  );
}


