import { useState, useEffect, useRef, useMemo } from "react";
import { RAGEngine } from "./ragEngine";
import { autoComplete } from "./autoComplete";
import { herbEntityResolver } from "./herbEntityResolver";
import { useHerbSearch } from "./useHerbSearch";
import * as S from "./HerbSearchStyles";
import Footer from "./Footer";
import SmartSearchView from "./SmartSearchView";

export interface HerbData {
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

interface FooterTerm {
  name: string;
  text: string;
   }
  
interface FooterData {
  terms: FooterTerm[];
  literature: string[];
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
  const [footerData, setFooterData] = useState<FooterData | null>(null);
  const [footerError, setFooterError] = useState<string | null>(null);

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
      .catch(() => setFooterError("\u054F\u057E\u0575\u0561\u056C\u0576\u0565\u0580\u056B \u0562\u0565\u057C\u0576\u0578\u0582\u0574\u0568 \u0571\u0561\u056D\u0578\u0572\u057E\u0565\u0581\u0589"));
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

  const selectHerb = (herb: HerbData) => {
    setSelectedHerb(herb);
    window.history.pushState(null, "", `/${herb.id}`);
    window.scrollTo(0, 0);
  };

  if (dataLoading) return <div style={S.loadingStyle}>🌿 Բեռնվում է...</div>;
  if (dataError) return <div style={S.errorBoxStyle}>❌ {dataError}</div>;

  return (
    <div style={S.containerStyle}>
      {!selectedHerb && (view === "list" || view === "search") && (
        <nav style={S.viewToggleContainer} aria-label="Նավիգացիա">
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
        </nav>
      )}

      {selectedHerb ? (
        <div style={S.selectedHerbCardStyle}>
          <button onClick={() => handleNavigate(view)} style={S.backButtonStyle} aria-label="Ետ գնալ">
            ← Ետ գնալ
          </button>
          {selectedHerb.img && (
            <img
              src={selectedHerb.img}
              alt={selectedHerb.name}
              style={S.herbImageStyle}
              loading="eager"
              decoding="sync"
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
                {filteredHerbs.map((herb, idx) => (
                  <button
                    key={herb.id}
                    onClick={() => selectHerb(herb)}
                    style={S.getHerbButtonStyle(false, false)}
                    aria-label={herb.name}
                  >
                    <img
                      src={herb.img}
                      alt={herb.name}
                      style={S.herbCardImageStyle}
                      loading={idx < 4 ? "eager" : "lazy"}
                      decoding={idx < 4 ? "sync" : "async"}
                    />
                    <span>{herb.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === "search" && (
            <SmartSearchView
              herbsData={herbsData}
              query={query}
              setQuery={setQuery}
              results={results}
              ragResponse={ragResponse}
              suggestions={suggestions}
              searchLoading={searchLoading}
              error={error}
              rewriteInfo={rewriteInfo}
              handleSearch={handleSearch}
              autocompleteSuggestions={autocompleteSuggestions}
              setAutocompleteSuggestions={setAutocompleteSuggestions}
              autocompleteIndex={autocompleteIndex}
              setAutocompleteIndex={setAutocompleteIndex}
              onSelectHerb={selectHerb}
            />
          )}

          {view === "terms" && (
            <div style={S.pageContainerStyle}>
              <h2 style={S.footerTitleStyle}>🌿 Բժշկական Տերմիններ</h2>
              {footerError && <div style={S.errorBoxStyle}>❌ {footerError}</div>}
              {footerData?.terms?.map((t, i) => (
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
              {footerError && <div style={S.errorBoxStyle}>❌ {footerError}</div>}
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