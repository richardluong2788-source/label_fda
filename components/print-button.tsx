"use client"

export default function PrintButton() {
  return (
    <div className="print-btn-wrapper" style={{
      position: "fixed",
      top: 16,
      right: 16,
      zIndex: 999,
    }}>
      <button
        onClick={() => window.print()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Download PDF
      </button>
    </div>
  )
}
