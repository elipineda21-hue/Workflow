const CATEGORIES = [
  { value: "camera",   label: "CCTV / Cameras",      icon: "📷" },
  { value: "door",     label: "Access Control",       icon: "🚪" },
  { value: "zone",     label: "Intrusion",            icon: "🔔" },
  { value: "speaker",  label: "Audio",                icon: "🔊" },
  { value: "switch",   label: "Switching",            icon: "🔀" },
  { value: "server",   label: "Server / NVR",         icon: "🖥" },
  { value: "software", label: "Software & Licenses",  icon: "💿" },
];

export default function GroupCard({ icon, title, idx, devCount, collapsed, onToggle, onRemove, onMove, currentCategory, children }) {
  const label = title || `Group #${idx + 1}`;
  return (
    <div className="mb-4 rounded-xl border border-border/60 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div
        onClick={onToggle}
        className="flex items-center justify-between bg-gradient-to-r from-steel to-navy px-4 py-3 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{icon}</span>
          <span className="text-white font-semibold text-[13px] tracking-tight">{label}</span>
          <span className="bg-accent/20 text-accent/80 rounded-md px-2 py-0.5 text-[10px] font-semibold">
            {devCount} device{devCount !== 1 ? "s" : ""}
          </span>
          <span className="text-white/30 text-[10px] ml-1">{collapsed ? "▸" : "▾"}</span>
        </div>
        <div className="flex items-center gap-2">
          {onMove && (
            <select
              value=""
              onClick={e => e.stopPropagation()}
              onChange={e => { e.stopPropagation(); if (e.target.value) onMove(e.target.value); }}
              className="bg-white/[0.08] text-white border border-white/10 rounded-md text-[11px] font-medium cursor-pointer py-1 px-2.5"
              style={{ colorScheme: "dark" }}>
              <option value="">Move to…</option>
              {CATEGORIES.filter(c => c.value !== currentCategory).map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          )}
          <button onClick={e => { e.stopPropagation(); onRemove(); }}
            className="bg-danger/10 hover:bg-danger/20 text-danger/70 hover:text-danger border-none rounded-md px-2.5 py-1 text-[10px] font-semibold cursor-pointer transition-colors">
            ✕ Remove
          </button>
        </div>
      </div>
      {!collapsed && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
}
