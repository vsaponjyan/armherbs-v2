import React, { useEffect, useState } from "react";
import * as S from "./HerbSearchStyles";

interface Term {
  name: string;
  text: string;
}

const TermsPage: React.FC = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/footer_data.json") // Ենթադրվում է, որ backend-ը մատուցում է այս ֆայլը
      .then((res) => res.json())
      .then((data) => {
        setTerms(data.terms);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={S.loadingStyle}>🌿 Բեռնվում է...</div>;

  return (
    <div style={S.containerStyle}>
      <h1 style={{ color: "#2e7d32", textAlign: "center" }}>Բժշկական Տերմիններ</h1>
      <div style={{ marginTop: "30px" }}>
        {terms.map((term, index) => (
          <div key={index} style={{ marginBottom: "25px", paddingBottom: "15px", borderBottom: "1px solid #eee" }}>
            <h3 style={{ color: "#4caf50", marginBottom: "10px" }}>{term.name}</h3>
            <p style={{ lineHeight: "1.6", color: "#444" }}>{term.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TermsPage;