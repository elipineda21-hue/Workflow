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
    <div className="mb-4 rounded-xl border border-border overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div
        onClick={onToggle}
        className="flex items-center justify-between bg-steel px-4 py-2.5 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[16px]">{icon}</span>
          <span className="text-white font-bold text-[13px]">{label}</span>
          <span className="rounded-xl px-2 py-[1px] text-[11px] font-bold" style={{ background: "rgba(0,174,239,0.25)", color: "#7FD9F7" }}>
            {devCount} device{devCount !== 1 ? "s" : ""}
          </span>
          <span className="text-[11px] ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>{collapsed ? "▶ expand" : "▼ collapse"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onMove && (
            <select
              value=""
              onClick={e => e.stopPropagation()}
              onChange={e => { e.stopPropagation(); if (e.target.value) onMove(e.target.value); }}
              className="rounded text-[10px] font-bold cursor-pointer" style={{ background: "rgba(0,174,239,0.15)", color: "#7FD9F7", border: "1px solid rgba(0,174,239,0.3)", padding: "2px 6px" }}>
              <option value="">Move to…</option>
              {CATEGORIES.filter(c => c.value !== currentCategory).map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          )}
          <button onClick={e => { e.stopPropagation(); onRemove(); }}
            className="border-none rounded px-2.5 py-[3px] text-[11px] font-bold cursor-pointer" style={{ background: "rgba(239,68,68,0.15)", color: "#FCA5A5" }}>
            ✕ Remove
          </button>
        </div>
      </div>
      {!collapsed && <div className="p-4 bg-surface">{children}</div>}
    </div>
  );
}
