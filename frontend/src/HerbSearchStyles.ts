
import { CSSProperties } from "react";

export const containerStyle: CSSProperties = {
  maxWidth: "1200px", 
  margin: "20px auto",
  padding: "20px",
  fontFamily: "sans-serif",
  color: "#333",
};

export const viewToggleContainer: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "10px",
  marginBottom: "30px",
};

export function getViewButtonStyle(isActive: boolean): CSSProperties {
  return {
    padding: "10px 20px",
    borderRadius: "25px",
    border: "2px solid #4caf50",
    backgroundColor: isActive ? "#4caf50" : "white",
    color: isActive ? "white" : "#4caf50",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "0.3s ease",
  };
}

export const backButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 16px",
  marginBottom: "20px",
  backgroundColor: "#f5f5f5",
  border: "1px solid #ddd",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
};

// --- Herb List Page ---
export const herbListWrapperStyle: CSSProperties = {
  marginBottom: 30,
  padding: 15,
  backgroundColor: "#f5f5f5",
  borderRadius: "8px",
  border: "1px solid #ddd",
};

export const localSearchInputStyle: CSSProperties = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  fontSize: "16px",
  border: "2px solid #ddd",
  borderRadius: "8px",
  boxSizing: "border-box",
  outline: "none",
};


export const herbListGridStyle: CSSProperties = {
  display: "grid",
  // Ավտոմատ տեղավորում է քարտերը էկրանի լայնությամբ
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", 
  gap: "20px",
  padding: "20px 0",
};

// Նոր ոճ քարտի ներսի նկարի համար
export const herbCardImageStyle: CSSProperties = {
  width: "100%",
  height: "120px",
  objectFit: "cover",
  borderRadius: "6px",
  marginBottom: "8px",
  backgroundColor: "#eee", // placeholder եթե նկարը չկա
};


export function getHerbButtonStyle(isSelected: boolean, inResults: boolean): CSSProperties {
  return {
    padding: "15px", 
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s",
    backgroundColor: isSelected ? "#4caf50" : inResults ? "#fff9c4" : "#fff",
    color: isSelected ? "#fff" : "#333",
    border: "1px solid #ddd",
    fontWeight: "bold",
    display: "flex",
    flexDirection: "column", // Նկարը և անունը իրար տակ դնելու համար
    alignItems: "center",
    textAlign: "center",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
  };
}

export function getHerbButtonHoverBg(inResults: boolean): string {
  return inResults ? "#fff59d" : "#e8f5e9";
}

export function getHerbButtonDefaultBg(inResults: boolean): string {
  return inResults ? "#fff9c4" : "#fff";
}

// --- Selected Herb Card ---
export const selectedHerbCardStyle: CSSProperties = {
  marginBottom: 30,
  padding: 20,
  backgroundColor: "#f4f3ed",
  borderRadius: "8px",
  border: "2px solid #4caf50",
  position: "relative",
};

export const closeButtonStyle: CSSProperties = {
  position: "absolute", top: "10px", right: "10px",
  backgroundColor: "#f44336", color: "white",
  border: "none", borderRadius: "4px",
  padding: "5px 10px", cursor: "pointer",
};

export const herbImageStyle: CSSProperties = {
  position: "absolute", top: "10px", right: "76px",
  width: "120px", height: "120px",
  objectFit: "cover", borderRadius: "8px", border: "2px solid #ddd",
};

export const herbNameStyle: CSSProperties = {
   marginTop: 0,
   color: "#4caf50"
};

export const altNamesStyle: CSSProperties = { 
  fontStyle: "italic", 
  color: "#666", 
  fontSize: "14px" 
};

export const sectionTitleStyle: CSSProperties = { 
  color: "#333",
  marginBottom: 5, 
  fontWeight: "bold"
};

export const sectionTextStyle: CSSProperties = { 
 lineHeight: 1.6, 
 color: "#555" 
};

export const symptomTagStyle: CSSProperties = { 
 backgroundColor: "#e0d69b",
 padding: "4px 10px",
 borderRadius: "4px", 
 fontSize: "15px", 
 color: "#01070e" 
};

export const tagsWrapperStyle: CSSProperties = { 
 display: "flex", 
 flexWrap: "wrap", 
 gap: "5px" 
};

// --- Search Interface ---
export const searchInputWrapperStyle: CSSProperties = { position: "relative" };

export function getSearchInputStyle(loading: boolean): CSSProperties {
  return {
    width: "100%", padding: 10, marginBottom: 10,
    fontSize: "16px", border: "2px solid #ddd", borderRadius: "4px",
    opacity: loading ? 0.6 : 1, boxSizing: "border-box",
  };
}

export function getSearchButtonStyle(loading: boolean): CSSProperties {
  return {
    padding: "10px 20px", fontSize: "16px",
    cursor: loading ? "not-allowed" : "pointer",
    backgroundColor: loading ? "#ccc" : "#4caf50",
    color: "white", border: "none", borderRadius: "4px", fontWeight: "bold",
  };
}

export const clickableTitleStyle: CSSProperties = {
  cursor: "pointer", 
  color: "#2e7d32", 
  textDecoration: "underline",
  margin: "0 0 10px 0", 
  display: "inline-block",
};

export const herbLinkInTextStyle: CSSProperties = {
  color: "#2e7d32", 
  fontWeight: "bold", 
  cursor: "pointer", 
  textDecoration: "underline",
};

// --- Results, RAG & Misc ---
export const autocompleteDropdownStyle: CSSProperties = {
  position: "absolute", 
  top: "100%", 
  left: 0, 
  right: 0,
  backgroundColor: "white", 
  border: "1px solid #ddd", 
  borderRadius: "4px",
  marginTop: "-10px", 
  zIndex: 1000, 
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

export function getAutocompleteItemStyle(isActive: boolean, isLast: boolean): CSSProperties {
  return {
    padding: "10px", cursor: "pointer",
    backgroundColor: isActive ? "#e8f5e9" : "white",
    borderBottom: isLast ? "none" : "1px solid #eee",
    fontWeight: isActive ? 600 : "normal",
  };
}

export const ragBoxStyle: CSSProperties = { 
  marginTop: 20, 
  padding: 20, 
  backgroundColor: "#e3f2fd", 
  border: "2px solid #2196f3", 
  borderRadius: "8px" 
};

export const ragTitleStyle: CSSProperties = { 
  margin: "0 0 10px 0", 
  color: "#1976d2" 
};

export function getConfidenceBadgeStyle(c: string): CSSProperties {
  return { marginLeft: 10, fontSize: "12px", padding: "2px 8px", borderRadius: "4px", backgroundColor: c === "high" ? "#4caf50" : "#ff9800", color: "white" };
}

export const ragAnswerStyle: CSSProperties = { 
  margin: "10px 0", 
  lineHeight: 1.6, 
  whiteSpace: "pre-line" 
};

export const ragSourcesStyle: CSSProperties = { color: "#666" };

export const resultsListStyle: CSSProperties = { 
  marginTop: 20, 
  listStyle: "none", 
  padding: 0 
};

export const resultItemStyle: CSSProperties = { 
  marginBottom: 20, 
  padding: 15, 
  border: "1px solid #ddd", 
  borderRadius: "8px", 
  backgroundColor: "#f9f9f9" 
};

export const resultTitleStyle: CSSProperties = { margin: "0 0 10px 0" };

export const resultScoreStyle: CSSProperties = { display: "none" }; 

export const resultHealingStyle: CSSProperties = { margin: "10px 0" };

export const resultMetaStyle: CSSProperties = { color: "#555" };

export const matchBadgeStyles: Record<string, CSSProperties> = {
  exact: { backgroundColor: "#4caf50", color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", marginLeft: "8px", fontWeight: "bold" },
  fuzzy: { backgroundColor: "#ff9800", color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", marginLeft: "8px", fontWeight: "bold" },
  semantic: { backgroundColor: "#2196f3", color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", marginLeft: "8px", fontWeight: "bold" },
};

export const highlightStyle: CSSProperties = { 
  backgroundColor: "#ffff66", 
  fontWeight: "bold" 
};

export const rewriteInfoStyle: CSSProperties = { 
  marginTop: 10, 
  fontSize: "13px", 
  color: "#666", 
  fontStyle: "italic" 
};

export const errorBoxStyle: CSSProperties = { 
  marginTop: 20, 
  padding: 15, 
  backgroundColor: "#ffebee", 
  border: "1px solid #ef5350", 
  borderRadius: "4px", 
  color: "#c62828" 
};

export const suggestionsBoxStyle: CSSProperties = { 
  marginTop: 20, 
  padding: 15, 
  backgroundColor: "#fff3e0", 
  border: "1px solid #ff9800", 
  borderRadius: "4px" 
};

export const suggestionsTitleStyle: CSSProperties = { 
  margin: "0 0 10px 0", 
  color: "#e65100" 
};

export const suggestionsRowStyle: CSSProperties = { 
  display: "flex", 
  gap: "10px", 
  flexWrap: "wrap" 
};

export const suggestionButtonStyle: CSSProperties = { 
  padding: "6px 12px", 
  backgroundColor: "#fff", 
  border: "1px solid #ff9800", 
  borderRadius: "4px", 
  cursor: "pointer", 
  color: "#e65100" 
};

export const loadingStyle: CSSProperties = { textAlign: "center", marginTop: 50 };

export const emptyResultsStyle: CSSProperties = { color: "#666", marginTop: 20 };