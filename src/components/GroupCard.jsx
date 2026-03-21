import { C } from "../constants";

export default function GroupCard({ icon, title, idx, devCount, collapsed, onToggle, onRemove, children }) {
  const label = title || `Group #${idx + 1}`;
  return (
    <div style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.steel, padding: "10px 16px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>{label}</span>
          <span style={{ background: "rgba(0,174,239,0.25)", color: "#7FD9F7", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
            {devCount} device{devCount !== 1 ? "s" : ""}
          </span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginLeft: 4 }}>{collapsed ? "▶ expand" : "▼ collapse"}</span>
        </div>
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: "rgba(239,68,68,0.15)", color: "#FCA5A5", border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          ✕ Remove Group
        </button>
      </div>
      {!collapsed && <div style={{ padding: 16, background: C.surface }}>{children}</div>}
    </div>
  );
}
