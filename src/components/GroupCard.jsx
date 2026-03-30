import { C } from "../constants";

const CATEGORIES = [
  { value: "camera",  label: "CCTV / Cameras", icon: "📷" },
  { value: "door",    label: "Access Control", icon: "🚪" },
  { value: "zone",    label: "Intrusion",      icon: "🔔" },
  { value: "speaker", label: "Audio",          icon: "🔊" },
  { value: "switch",  label: "Switching",      icon: "🔀" },
  { value: "server",  label: "Server / NVR",   icon: "🖥" },
];

export default function GroupCard({ icon, title, idx, devCount, collapsed, onToggle, onRemove, onMove, currentCategory, children }) {
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {onMove && (
            <select
              value=""
              onClick={e => e.stopPropagation()}
              onChange={e => { e.stopPropagation(); if (e.target.value) onMove(e.target.value); }}
              style={{ background: "rgba(0,174,239,0.15)", color: "#7FD9F7", border: `1px solid rgba(0,174,239,0.3)`, borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              <option value="">Move to…</option>
              {CATEGORIES.filter(c => c.value !== currentCategory).map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          )}
          <button onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{ background: "rgba(239,68,68,0.15)", color: "#FCA5A5", border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            ✕ Remove
          </button>
        </div>
      </div>
      {!collapsed && <div style={{ padding: 16, background: C.surface }}>{children}</div>}
    </div>
  );
}
