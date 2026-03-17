import React, { useEffect, useState } from "react";
import * as S from "./HerbSearchStyles";

const LiteraturePage: React.FC = () => {
  const [literature, setLiterature] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/footer_data.json")
      .then((res) => res.json())
      .then((data) => {
        setLiterature(data.literature);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={S.loadingStyle}>🌿 Բեռնվում է...</div>;

  return (
    <div style={S.containerStyle}>
      <h1 style={{ color: "#2e7d32", textAlign: "center" }}>Օգտագործված Գրականություն</h1>
      <ul style={{ marginTop: "30px", listStyleType: "none", padding: 0 }}>
        {literature.map((item, index) => (
          <li key={index} style={{ 
            padding: "12px", 
            marginBottom: "8px", 
            backgroundColor: "#f9f9f9", 
            borderRadius: "6px",
            borderLeft: "4px solid #4caf50",
            fontSize: "15px",
            lineHeight: "1.4"
          }}>
            📖 {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LiteraturePage;