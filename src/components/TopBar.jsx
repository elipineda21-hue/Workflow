import { C } from "../constants";

export default function TopBar({
  selectedProject, saveStatus, totalDevices,
  importFileRef, handleProposalFileChange,
  tab, setTab, TABS,
  onBack, onReports, onPdfImport,
}) {
  return (
    <div style={{ background: C.navy, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,.35)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 18px", height: 48 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", color: C.white, border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>← Back</button>
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.15)" }} />
        <div>
          <div style={{ color: C.white, fontWeight: 800, fontSize: 13 }}>{selectedProject?.name || "Project"}</div>
          <div style={{ color: C.accent, fontSize: 10 }}>ID: {selectedProject?.projectId || "—"}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {saveStatus === "saving" && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>⏳ Saving…</span>}
          {saveStatus === "saved"  && <span style={{ color: C.success, fontSize: 11, fontWeight: 700 }}>✓ Saved</span>}
          {saveStatus === "error"  && <span style={{ color: C.danger,  fontSize: 11, fontWeight: 700 }}>⚠ Save failed</span>}
          {totalDevices > 0 && (
            <span style={{ background: C.accent, color: C.white, borderRadius: 10, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
              {totalDevices} devices
            </span>
          )}
          <input ref={importFileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleProposalFileChange} />
          <button onClick={onPdfImport}
            style={{ background: C.steel, color: C.white, border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 6, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            📄 Import PDF
          </button>
          <button onClick={onReports}
            style={{ background: C.gold, color: C.navy, border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            📊 Reports
          </button>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display: "flex", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? C.accent : "transparent", color: tab === t.id ? C.white : "rgba(255,255,255,.55)", border: "none", borderBottom: tab === t.id ? `3px solid ${C.white}` : "3px solid transparent", padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, borderRadius: "3px 3px 0 0" }}>
            {t.icon} {t.label}
            {t.count > 0 && <span style={{ background: C.gold, color: C.navy, borderRadius: 8, padding: "0 5px", fontSize: 10, fontWeight: 800 }}>{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
