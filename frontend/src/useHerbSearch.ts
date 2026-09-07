import { useState, useCallback } from "react";
import { SearchResult, searchEngine } from "./searchEngine";
import { RAGResponse, RAGEngine } from "./ragEngine";
import { conversationMemory } from "./conversationMemory";
import { queryRewriter } from "./queryRewriter";
import { herbEntityResolver } from "./herbEntityResolver";
import { embedText } from "./queryEmbedding";
import { resultReranker } from "./resultReranker";

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

interface UseHerbSearchProps {
  query: string;
  setQuery: (q: string) => void;
  herbsData: HerbData[];
  herbMap: Map<string, HerbData>;
  ragEngine: RAGEngine;
  setAutocompleteSuggestions: (s: string[]) => void;
}

export function useHerbSearch({
  query,
  setQuery,
  herbsData,
  herbMap,
  ragEngine,
  setAutocompleteSuggestions,
}: UseHerbSearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [ragResponse, setRagResponse] = useState<RAGResponse | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewriteInfo, setRewriteInfo] = useState<string | null>(null);

  function enrichResult(result: SearchResult, herbMap: Map<string, HerbData>): SearchResult {
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
        if (conversationMemory.isFollowUpQuery(trimmedQuery)) {
          const resolved = conversationMemory.resolveFollowUp(trimmedQuery, herbsData);
          if (resolved !== trimmedQuery) {
            trimmedQuery = resolved;
          }
        }

        const rewritten = queryRewriter.rewrite(
          trimmedQuery,
          herbsData.map((h) => h.name)
        );

        console.log("rewritten.canonical:", rewritten.canonical);

        const entityResult = herbEntityResolver.resolve(rewritten.canonical);
        let finalQuery = rewritten.canonical;

        if (entityResult.type === "herb") {
          setRewriteInfo(`Բույս՝ "${entityResult.herbName}"`);
          finalQuery = entityResult.resolvedQuery;
        } else if (entityResult.type === "symptom") {
          setRewriteInfo(`Ախտանշան՝ "${entityResult.symptom}"`);
          finalQuery = entityResult.resolvedQuery;
        }

        const queryEmbedding = await embedText(finalQuery);
        let found = await searchEngine.search(queryEmbedding, finalQuery, 5);
        found = resultReranker.rerank(finalQuery, found);
        let enrichedFound = found.map((r) => enrichResult(r, herbMap));

        if (
          entityResult.type === "herb" &&
          entityResult.herbId &&
          !enrichedFound.some(
            (r) =>
              r.id === entityResult.herbId ||
              r.name.toLowerCase() === (entityResult.herbName ?? "").toLowerCase()
          )
        ) {
          const directHerb =
            herbMap.get(entityResult.herbId) ??
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
            r.id === entityResult.herbId || r.name.toLowerCase() === entityNameLower
              ? { ...r, finalScore: 1.0, matchType: "exact" as const }
              : r
          );
          enrichedFound.sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));
        }

        setResults(enrichedFound);

        if (enrichedFound.length === 0 || (enrichedFound[0].finalScore ?? 0) < 0.3) {
          setSuggestions(await searchEngine.findSuggestions(finalQuery, 3));
        } else {
          setSuggestions([]);
        }

        if (ragEngine.shouldTriggerRAG(finalQuery, enrichedFound)) {
          try {
            const ragResult = await ragEngine.generateAnswer(
              finalQuery,
              enrichedFound,
              entityResult.type === "herb" ? entityResult.herbName : undefined
            );

            if (ragResult && ragResult.answer) {
              if (ragResult.rankedIds && ragResult.rankedIds.length > 0) {
                const idOrder = ragResult.rankedIds;
                const reranked = [...enrichedFound].sort((a, b) => {
                  const aIdx = idOrder.indexOf(a.id);
                  const bIdx = idOrder.indexOf(b.id);
                  const aRank = aIdx === -1 ? Infinity : aIdx;
                  const bRank = bIdx === -1 ? Infinity : bIdx;
                  return aRank - bRank;
                });
                setResults(reranked);
              }
              setRagResponse(ragResult);
            }
          } catch (ragErr) {
            console.warn("AI RAG failed silently, but showing results:", ragErr);
          }
        }

        conversationMemory.addTurn(finalQuery, enrichedFound);
      } catch (err) {
        console.error("SEARCH ERROR:", err);
        setError("Որոնման ընթացքում սխալ տեղի ունեցավ");
      } finally {
        setLoading(false);
      }
    },
    [query, setQuery, herbsData, herbMap, ragEngine, setAutocompleteSuggestions]
  );

  return {
    results,
    setResults,
    ragResponse,
    setRagResponse,
    suggestions,
    setSuggestions,
    loading,
    error,
    setError,
    rewriteInfo,
    setRewriteInfo,
    handleSearch,
  };
}