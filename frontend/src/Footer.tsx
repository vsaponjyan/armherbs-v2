import React, { useState, useEffect } from "react";
import * as S from "./HerbSearchStyles";

const Footer: React.FC = () => {
  const [modalType, setModalType] = useState<"terms" | "literature" | null>(null);
  const [data, setData] = useState<any>(null);

  // 1. Բեռնում ենք տվյալները Backend-ից
  useEffect(() => {
    fetch("http://localhost:8000/api/footer-data")
      .then((res) => {
        if (!res.ok) throw new Error("Backend error");
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => console.error("Error loading footer data:", err));
  }, []);

  // 2. Ստուգում ենք URL-ը էջը բեռնելիս (օր. localhost:3000/terms)
  useEffect(() => {
    const path = window.location.pathname.replace("/", "");
    if (path === "terms") {
      setModalType("terms");
    } else if (path === "literature") {
      setModalType("literature");
    }

    // Լսում ենք "Back" կոճակը զննարկիչում
    const handlePopState = () => {
      const newPath = window.location.pathname.replace("/", "");
      if (newPath === "terms") setModalType("terms");
      else if (newPath === "literature") setModalType("literature");
      else setModalType(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // 3. Պատուհանը բացելու ֆունկցիա
  const openModal = (type: "terms" | "literature") => {
    setModalType(type);
    window.history.pushState(null, "", `/${type}`);
  };

  // 4. Պատուհանը փակելու ֆունկցիա
  const closeModal = () => {
    setModalType(null);
    // Եթե URL-ը /terms կամ /literature է, վերադարձնում ենք գլխավորին
    const currentPath = window.location.pathname.replace("/", "");
    if (currentPath === "terms" || currentPath === "literature") {
      window.history.pushState(null, "", "/");
    }
  };

  return (
    <footer style={S.footerContainerStyle}>
      <div style={S.footerNavStyle}>
        <button style={S.footerButtonStyle} onClick={() => openModal("terms")}>
          Տերմիններ
        </button>
        
        <span style={S.footerDividerStyle}>|</span>
        
        <button style={S.footerButtonStyle} onClick={() => openModal("literature")}>
          Գրականություն
        </button>
        
        <span style={S.footerDividerStyle}>|</span>
        
        <span style={S.footerButtonStyle}>
          Հետադարձ Կապ:{" "}
          <a href="mailto:herbs.armenia@gmail.com" style={S.contactLinkStyle}>
            herbs.armenia@gmail.com
          </a>
        </span>
      </div>
      
      <p style={S.copyrightStyle}>
        © Նյութը օգտագործելիս կայքին հղվելը պարտադիր է
      </p>

      {/* Modal Window */}
      {modalType && (
        <div style={S.modalOverlayStyle} onClick={closeModal}>
          <div style={S.modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button style={S.modalCloseButtonStyle} onClick={closeModal}>
              ✕
            </button>
            
            <h2 style={{ color: "#2e7d32", marginBottom: "20px", marginTop: "10px" }}>
              {modalType === "terms" ? "🌿 Բժշկական Տերմիններ" : "📚 Օգտագործված Գրականություն"}
            </h2>
            
            <div style={{ textAlign: "left" }}>
              {modalType === "terms" && data?.terms ? (
                data.terms.map((t: any, i: number) => (
                  <div key={i} style={{ marginBottom: "20px", borderBottom: "1px solid #f0f0f0", paddingBottom: "10px" }}>
                    <strong style={{ color: "#4caf50", fontSize: "1.1em" }}>{t.name}</strong>
                    <p style={{ marginTop: "5px", color: "#444", lineHeight: "1.5" }}>{t.text}</p>
                  </div>
                ))
              ) : modalType === "literature" && data?.literature ? (
                data.literature.map((l: string, i: number) => (
                  <p key={i} style={{ 
                    padding: "10px", 
                    marginBottom: "8px", 
                    backgroundColor: "#f9f9f9", 
                    borderRadius: "6px",
                    borderLeft: "4px solid #4caf50" 
                  }}>
                    📖 {l}
                  </p>
                ))
              ) : (
                <p>Բեռնվում է...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;