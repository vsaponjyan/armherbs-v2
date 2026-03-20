import React from "react";
import * as S from "./HerbSearchStyles";

interface FooterProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const Footer: React.FC<FooterProps> = ({ currentView, onNavigate }) => {
  return (
    <footer style={S.footerContainerStyle}>
      <div style={S.footerNavStyle}>
        {/* «Գլխավոր էջ» կոճակը երևում է միայն այն ժամանակ, երբ մենք search բաժնում չենք */}
        {currentView !== "list" && (
          <>
            <button style={S.footerButtonStyle} onClick={() => onNavigate("list")}>
              🏠 Գլխավոր էջ
            </button>
            <span style={S.footerDividerStyle}>|</span>
          </>
        )}

        <button 
          style={{...S.footerButtonStyle, color: currentView === "terms" ? "#1b5e20" : "#2e7d32"}} 
          onClick={() => onNavigate("terms")}
        >
          Տերմիններ
        </button>
        
        <span style={S.footerDividerStyle}>|</span>
        
        <button 
          style={{...S.footerButtonStyle, color: currentView === "literature" ? "#1b5e20" : "#2e7d32"}} 
          onClick={() => onNavigate("literature")}
        >
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
    </footer>
  );
};

export default Footer;