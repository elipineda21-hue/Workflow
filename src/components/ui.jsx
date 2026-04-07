export const F = ({ label, children, span = 1 }) => (
  <div style={{ gridColumn: `span ${span}` }} className="flex flex-col gap-1">
    <label className="text-[10px] font-semibold text-muted/80 tracking-[0.06em] uppercase">{label}</label>
    {children}
  </div>
);

export const Inp = (props) => (
  <input {...props}
    className={`py-2 px-2.5 rounded-lg border border-border text-xs bg-white text-navy outline-none w-full box-border transition-shadow duration-150 placeholder:text-muted/40 ${props.className || ""}`}
    style={props.style}
  />
);

export const Sel = ({ children, ...props }) => (
  <select {...props} className={`py-2 px-2.5 rounded-lg border border-border text-xs bg-white text-navy outline-none w-full cursor-pointer ${props.className || ""}`} style={props.style}>{children}</select>
);

export const TA = (props) => (
  <textarea {...props} rows={2} className="py-2 px-2.5 rounded-lg border border-border text-xs bg-white text-navy outline-none resize-y font-[inherit] w-full box-border" />
);

export const Tog = ({ label, val, set }) => (
  <label className="flex items-center gap-2 cursor-pointer text-xs text-navy select-none">
    <div onClick={() => set(!val)} className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 shrink-0 ${val ? 'bg-accent' : 'bg-border'}`}>
      <div className="absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white transition-all duration-200 shadow-sm" style={{ left: val ? 18 : 3 }} />
    </div>
    {label}
  </label>
);

export const G = ({ children, cols = 3 }) => (
  <div style={{ gridTemplateColumns: `repeat(${cols},1fr)` }} className="grid gap-3">{children}</div>
);

export const CardHead = ({ icon, title, count, onAdd, addLabel, color }) => (
  <div className="flex items-center justify-between rounded-t-xl px-4 py-3" style={{ background: color || '#0B1F3A' }}>
    <div className="flex items-center gap-2.5">
      <span className="text-lg">{icon}</span>
      <span className="text-white font-semibold text-[13px] tracking-tight">{title}</span>
      {count !== undefined && <span className="bg-white/15 text-white/90 rounded-md px-2 py-0.5 text-[10px] font-semibold">{count}</span>}
    </div>
    {onAdd && (
      <button onClick={onAdd} className="bg-white/15 hover:bg-white/25 text-white border-none rounded-lg px-3 py-1.5 text-[11px] font-semibold cursor-pointer">
        + {addLabel}
      </button>
    )}
  </div>
);

export const Empty = ({ icon, msg }) => (
  <div className="text-center py-12 text-muted">
    <div className="text-4xl mb-2 opacity-50">{icon}</div>
    <div className="font-medium text-sm">{msg}</div>
  </div>
);

export const SectionLabel = ({ text }) => (
  <div className="text-[10px] font-semibold text-muted/60 tracking-[0.08em] uppercase border-b border-border/50 pb-1.5 mb-3 mt-4">{text}</div>
);
