import { C } from "../constants";

export const F = ({ label, children, span = 1 }) => (
  <div style={{ gridColumn: `span ${span}`, display: "flex", flexDirection: "column", gap: 3 }}>
    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</label>
    {children}
  </div>
);

export const Inp = (props) => (
  <input {...props} style={{ padding: "7px 9px", borderRadius: 5, border: `1.5px solid ${C.border}`, fontSize: 12, background: C.white, color: C.navy, outline: "none", width: "100%", boxSizing: "border-box", ...props.style }}
    onFocus={e => e.target.style.borderColor = C.accent}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);

export const Sel = ({ children, ...props }) => (
  <select {...props} style={{ padding: "7px 9px", borderRadius: 5, border: `1.5px solid ${C.border}`, fontSize: 12, background: C.white, color: C.navy, outline: "none", width: "100%", ...props.style }}>{children}</select>
);

export const TA = (props) => (
  <textarea {...props} rows={2} style={{ padding: "7px 9px", borderRadius: 5, border: `1.5px solid ${C.border}`, fontSize: 12, background: C.white, color: C.navy, outline: "none", resize: "vertical", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
);

export const Tog = ({ label, val, set }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12, color: C.navy, userSelect: "none" }}>
    <div onClick={() => set(!val)} style={{ width: 34, height: 18, borderRadius: 9, background: val ? C.accent : C.border, position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: val ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: C.white, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
    </div>
    {label}
  </label>
);

export const G = ({ children, cols = 3 }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 12 }}>{children}</div>
);

export const CardHead = ({ icon, title, count, onAdd, addLabel, color = C.navy }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: color, borderRadius: "8px 8px 0 0", padding: "10px 16px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>{title}</span>
      {count !== undefined && <span style={{ background: C.accent, color: C.white, borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{count}</span>}
    </div>
    {onAdd && (
      <button onClick={onAdd} style={{ background: C.accent, color: C.white, border: "none", borderRadius: 5, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
        + {addLabel}
      </button>
    )}
  </div>
);

export const Empty = ({ icon, msg }) => (
  <div style={{ textAlign: "center", padding: 32, color: C.muted }}>
    <div style={{ fontSize: 36, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontWeight: 600, fontSize: 13 }}>{msg}</div>
  </div>
);

export const SectionLabel = ({ text }) => (
  <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 10, marginTop: 14 }}>{text}</div>
);
