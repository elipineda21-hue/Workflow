export const F = ({ label, children, span = 1 }) => (
  <div style={{ gridColumn: `span ${span}` }} className="flex flex-col gap-[3px]">
    <label className="text-[10px] font-bold text-muted tracking-[0.07em] uppercase">{label}</label>
    {children}
  </div>
);

export const Inp = (props) => (
  <input {...props} className="py-[7px] px-[9px] rounded-[5px] border-[1.5px] border-border text-xs bg-white text-navy outline-none w-full box-border"
    style={props.style}
    onFocus={e => { e.target.style.borderColor = '#00AEEF'; props.onFocus?.(e); }}
    onBlur={e => { e.target.style.borderColor = '#CBD5E1'; props.onBlur?.(e); }}
  />
);

export const Sel = ({ children, ...props }) => (
  <select {...props} className="py-[7px] px-[9px] rounded-[5px] border-[1.5px] border-border text-xs bg-white text-navy outline-none w-full" style={props.style}>{children}</select>
);

export const TA = (props) => (
  <textarea {...props} rows={2} className="py-[7px] px-[9px] rounded-[5px] border-[1.5px] border-border text-xs bg-white text-navy outline-none resize-y font-[inherit] w-full box-border" />
);

export const Tog = ({ label, val, set }) => (
  <label className="flex items-center gap-[7px] cursor-pointer text-xs text-navy select-none">
    <div onClick={() => set(!val)} className="w-[34px] h-[18px] rounded-[9px] relative cursor-pointer transition-colors duration-200 shrink-0" style={{ background: val ? '#00AEEF' : '#CBD5E1' }}>
      <div className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-[left] duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.2)]" style={{ left: val ? 16 : 2 }} />
    </div>
    {label}
  </label>
);

export const G = ({ children, cols = 3 }) => (
  <div style={{ gridTemplateColumns: `repeat(${cols},1fr)` }} className="grid gap-3">{children}</div>
);

export const CardHead = ({ icon, title, count, onAdd, addLabel, color }) => (
  <div className="flex items-center justify-between rounded-t-lg px-4 py-2.5" style={{ background: color || '#0B1F3A' }}>
    <div className="flex items-center gap-2.5">
      <span className="text-[18px]">{icon}</span>
      <span className="text-white font-bold text-[13px]">{title}</span>
      {count !== undefined && <span className="bg-accent text-white rounded-xl px-2 py-[1px] text-[11px] font-bold">{count}</span>}
    </div>
    {onAdd && (
      <button onClick={onAdd} className="bg-accent text-white border-none rounded-[5px] px-3 py-[5px] text-[11px] font-bold cursor-pointer">
        + {addLabel}
      </button>
    )}
  </div>
);

export const Empty = ({ icon, msg }) => (
  <div className="text-center p-8 text-muted">
    <div className="text-[36px] mb-1.5">{icon}</div>
    <div className="font-semibold text-[13px]">{msg}</div>
  </div>
);

export const SectionLabel = ({ text }) => (
  <div className="text-[10px] font-extrabold text-muted tracking-[0.1em] uppercase border-b border-border pb-1 mb-2.5 mt-3.5">{text}</div>
);
