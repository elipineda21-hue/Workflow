import { useState, useEffect, useRef, useCallback } from "react";
import { CAM_DB, SWITCH_DB, SERVER_DB, ACCESS_DB, PANEL_DB } from "./deviceDB";
import { loadWorkOrder, saveWorkOrder, listWorkOrders, listLibrary, uploadSpecSheet, deleteLibraryEntry, getSpecSheetUrl, uploadProjectFile, listProjectFiles, deleteProjectFile, getProjectFileUrl } from "./supabase";
// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy: "#0B1F3A", steel: "#1A3355", accent: "#00AEEF", gold: "#F4A300",
  bg: "#EEF2F7", white: "#FFFFFF", muted: "#6B7E96", border: "#CBD5E1",
  success: "#10B981", warn: "#F59E0B", danger: "#EF4444",
  surface: "#F8FAFD", dark: "#07142A",
};
// ── Monday API ────────────────────────────────────────────────────────────────
const MONDAY_BOARD_ID = "18394052747";
async function fetchProjects(token, colMap = {}) {
  if (!token) return [];
  const query = `{ boards(ids: ${MONDAY_BOARD_ID}) { items_page(limit: 100) { items { id name column_values { id text } } } } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  const items = data?.data?.boards?.[0]?.items_page?.items || [];
  return items.map(item => {
    const col = id => item.column_values.find(c => c.id === id)?.text || "";
    return {
      id: item.id,
      name: item.name,
      projectId:         col("text_mm0vkgrq"),
      techLead:          col("multiple_person_mm01ew1v"),
      programmingStatus: col("status"),
      schedule:          col("timerange_mm034yws"),
      customer:    colMap.customer    ? col(colMap.customer)    : "",
      siteAddress: colMap.siteAddress ? col(colMap.siteAddress) : "",
      pm:          colMap.pm          ? col(colMap.pm)          : "",
    };
  });
}
// Fetch raw column list from first board item for mapping UI
async function fetchBoardColumns(token) {
  if (!token) return [];
  const query = `{ boards(ids: ${MONDAY_BOARD_ID}) { columns { id title } items_page(limit: 1) { items { column_values { id text } } } } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  const board = data?.data?.boards?.[0];
  const cols  = board?.columns || [];
  const vals  = board?.items_page?.items?.[0]?.column_values || [];
  return cols.map(c => ({
    id:    c.id,
    title: c.title,
    sample: vals.find(v => v.id === c.id)?.text || "",
  }));
}
// ── Monday Write-back ─────────────────────────────────────────────────────────
async function pushMondayUpdate(token, itemId, colId, textValue) {
  if (!token || !itemId || !colId || !textValue) return;
  const mutation = `mutation { change_simple_column_value(board_id: ${MONDAY_BOARD_ID}, item_id: "${itemId}", column_id: "${colId}", value: ${JSON.stringify(String(textValue))}) { id } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({ query: mutation }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data;
}
// ── Utilities ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const nextIP = (base, n) => {
  const p = (base || "").trim().split(".");
  if (p.length !== 4 || p.some(x => isNaN(parseInt(x)))) return base || "";
  const last = parseInt(p[3], 10) + n;
  return last > 254 ? base : `${p[0]}.${p[1]}.${p[2]}.${last}`;
};
// ── Group data makers ─────────────────────────────────────────────────────────
const mkProcurement = () => ({ procurementStatus: "not_ordered", vendor: "", poNumber: "", eta: "", trackingNumber: "" });
const mkCamGroup = () => ({ id: uid(), groupLabel: "", brand: "", model: "", codec: "H.265", resolution: "4MP", lens: "2.8mm", type: "Outdoor Dome", port: "80", rtspPort: "554", fps: "15", bitrate: "", ptz: false, username: "", password: "", storageGroup: "", quantity: "4", ipStart: "", devices: [], ...mkProcurement() });
const mkCamDev = (ip = "", idx = 0) => ({ id: uid(), name: `Camera ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", ip, mac: "", serial: "", notes: "", installed: false, programmed: false });
const mkSwGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", vlan: "", uplink: "", quantity: "1", ipStart: "", devices: [], ...mkProcurement() });
const mkSwDev = (ip = "", idx = 0) => ({ id: uid(), name: `Switch ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", ip, mac: "", serial: "", ports: "", notes: "", installed: false, programmed: false });
const mkSrvGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", role: "VMS Server", os: "", storage: "", quantity: "1", ipStart: "", devices: [], ...mkProcurement() });
const mkSrvDev = (ip = "", idx = 0) => ({ id: uid(), name: `Server ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", ip, mac: "", serial: "", notes: "", installed: false, programmed: false });
const mkDoorGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", readerType: "OSDP", credentialType: "Smart Card", lockType: "Electric Strike", cardFormat: "", facilityCode: "", accessGroup: "", schedule: "", quantity: "1", devices: [], ...mkProcurement() });
const mkDoorDev = (idx = 0) => ({ id: uid(), name: `Door ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", controllerName: "", controllerIP: "", controllerSerial: "", readerSerial: "", rex: false, doorContact: false, notes: "", installed: false, programmed: false });
const mkZoneGrp = () => ({ id: uid(), groupLabel: "", zoneType: "Motion", partitions: "", bypassable: false, quantity: "1", startNumber: "1", devices: [], ...mkProcurement() });
const mkZoneDev = (idx = 0, g = {}) => ({ id: uid(), name: `Zone ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", zoneNumber: String((parseInt(g.startNumber) || 1) + idx), zoneType: g.zoneType || "Motion", partitions: g.partitions || "", bypassable: g.bypassable || false, notes: "", installed: false, programmed: false });
const mkSpkGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", zoneGroup: "", ampZone: "", volume: "70", quantity: "1", ipStart: "", devices: [], ...mkProcurement() });
const mkSpkDev = (ip = "", idx = 0) => ({ id: uid(), name: `Speaker ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", ip, notes: "", installed: false, programmed: false });
// Generate device arrays from a group config
const genCam  = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 64) }, (_, i) => mkCamDev(nextIP(g.ipStart, i), i));
const genSw   = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 32) }, (_, i) => mkSwDev(nextIP(g.ipStart, i), i));
const genSrv  = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 16) }, (_, i) => mkSrvDev(nextIP(g.ipStart, i), i));
const genDoor = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 64) }, (_, i) => mkDoorDev(i));
const genZone = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 128) }, (_, i) => mkZoneDev(i, g));
const genSpk  = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 64) }, (_, i) => mkSpkDev(nextIP(g.ipStart, i), i));
// Group/device state helpers
const updGrp = (set, gid, k, v) => set(gs => gs.map(g => g.id === gid ? { ...g, [k]: v } : g));
const updDev = (set, gid, did, k, v) => set(gs => gs.map(g => g.id === gid ? { ...g, devices: g.devices.map(d => d.id === did ? { ...d, [k]: v } : d) } : g));
const remGrp = (set, gid) => set(gs => gs.filter(g => g.id !== gid));
const remDev = (set, gid, did) => set(gs => gs.map(g => g.id === gid ? { ...g, devices: g.devices.filter(d => d.id !== did) } : g));
const addDev = (set, gid, dev) => set(gs => gs.map(g => g.id === gid ? { ...g, devices: [...g.devices, dev] } : g));
const applyGen = (set, gid, genFn) => set(gs => gs.map(g => g.id === gid ? { ...g, devices: genFn(g) } : g));
// ── Option lists ──────────────────────────────────────────────────────────────
const CODECS = ["H.264","H.265","H.265+","MJPEG"];
const RESS   = ["1MP (720p)","2MP (1080p)","4MP","5MP","6MP","8MP (4K)","12MP"];
const LENSES = ["2.8mm","4mm","6mm","8mm","2.8–12mm VF","Motorized VF","Other"];
const CAM_TYPES = ["Indoor Dome","Outdoor Dome","Bullet","PTZ","Fisheye","Multi-Sensor","Box"];
const READER_TYPES = ["Wiegand","OSDP","RS-485","Bluetooth","Biometric","Keypad","Multi-Tech"];
const CRED_TYPES = ["Prox Card","Smart Card","Mobile","PIN","Biometric","Dual Auth"];
const LOCK_TYPES = ["Mag Lock","Electric Strike","Electronic Deadbolt","Other"];
const ZONE_TYPES = ["Motion","Door Contact","Glass Break","Smoke","CO","Heat","Panic","Tamper"];
const SERVER_ROLES = ["VMS Server","NVR","DVR","Access Control Server","Video Analytics","Storage Array","Workstation","Other"];
// ── Small UI components ───────────────────────────────────────────────────────
const F = ({ label, children, span = 1 }) => (
  <div style={{ gridColumn: `span ${span}`, display: "flex", flexDirection: "column", gap: 3 }}>
    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</label>
    {children}
  </div>
);
const Inp = (props) => (
  <input {...props} style={{ padding: "7px 9px", borderRadius: 5, border: `1.5px solid ${C.border}`, fontSize: 12, background: C.white, color: C.navy, outline: "none", width: "100%", boxSizing: "border-box", ...props.style }}
    onFocus={e => e.target.style.borderColor = C.accent}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);
const Sel = ({ children, ...props }) => (
  <select {...props} style={{ padding: "7px 9px", borderRadius: 5, border: `1.5px solid ${C.border}`, fontSize: 12, background: C.white, color: C.navy, outline: "none", width: "100%", ...props.style }}>{children}</select>
);
const TA = (props) => (
  <textarea {...props} rows={2} style={{ padding: "7px 9px", borderRadius: 5, border: `1.5px solid ${C.border}`, fontSize: 12, background: C.white, color: C.navy, outline: "none", resize: "vertical", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
);
const Tog = ({ label, val, set }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12, color: C.navy, userSelect: "none" }}>
    <div onClick={() => set(!val)} style={{ width: 34, height: 18, borderRadius: 9, background: val ? C.accent : C.border, position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: val ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: C.white, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
    </div>
    {label}
  </label>
);
const G = ({ children, cols = 3 }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 12 }}>{children}</div>
);
const CardHead = ({ icon, title, count, onAdd, addLabel, color = C.navy }) => (
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
const Empty = ({ icon, msg }) => (
  <div style={{ textAlign: "center", padding: 32, color: C.muted }}>
    <div style={{ fontSize: 36, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontWeight: 600, fontSize: 13 }}>{msg}</div>
  </div>
);
// Section label inside a group card
const SectionLabel = ({ text }) => (
  <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 10, marginTop: 14 }}>{text}</div>
);
// ── GroupCard wrapper ─────────────────────────────────────────────────────────
function GroupCard({ icon, title, idx, devCount, collapsed, onToggle, onRemove, children }) {
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
// ── Compact device row (used in all group tables) ─────────────────────────────
function DevRow({ num, dev, cols, onRemove, onUpd, onLog, onFieldLog }) {
  const inpSt = { padding: "5px 7px", borderRadius: 4, border: `1.5px solid ${C.border}`, fontSize: 11, background: C.white, color: C.navy, outline: "none", width: "100%", boxSizing: "border-box" };
  const focusVals = useRef({});
  const rowBg = dev.programmed ? "#F0FDF4" : dev.installed ? "#FFFBEB" : (num % 2 === 0 ? C.white : C.surface);
  return (
    <tr style={{ background: rowBg }}>
      <td style={{ padding: "5px 8px", fontSize: 11, fontWeight: 700, color: C.muted, textAlign: "center", width: 30 }}>{num}</td>
      {cols.map(col => (
        <td key={col.key} style={{ padding: "4px 4px" }}>
          {col.type === "toggle" ? (
            <Tog label="" val={dev[col.key]} set={v => onUpd(col.key, v)} />
          ) : (
            <input
              value={dev[col.key] || ""}
              onChange={e => onUpd(col.key, e.target.value)}
              placeholder={col.ph || ""}
              style={inpSt}
              onFocus={e => { e.target.style.borderColor = C.accent; focusVals.current[col.key] = e.target.value; }}
              onBlur={e => {
                e.target.style.borderColor = C.border;
                const newVal = e.target.value;
                const oldVal = focusVals.current[col.key] ?? "";
                if (newVal !== oldVal && onFieldLog) onFieldLog(col.key, oldVal, newVal);
              }}
            />
          )}
        </td>
      ))}
      <td style={{ padding: "4px 8px", textAlign: "center", width: 50 }}>
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: "pointer" }}>
          <input type="checkbox" checked={!!dev.installed} onChange={e => onUpd("installed", e.target.checked)}
            style={{ cursor: "pointer", accentColor: C.warn, width: 15, height: 15 }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: dev.installed ? C.warn : C.muted }}>
            {dev.installed ? "✓ Inst" : "—"}
          </span>
        </label>
      </td>
      <td style={{ padding: "4px 8px", textAlign: "center", width: 50 }}>
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: "pointer" }}>
          <input type="checkbox" checked={!!dev.programmed} onChange={e => { onUpd("programmed", e.target.checked); onLog?.(dev.name, e.target.checked); }}
            style={{ cursor: "pointer", accentColor: C.success, width: 15, height: 15 }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: dev.programmed ? C.success : C.muted }}>
            {dev.programmed ? "✓ Pgmd" : "—"}
          </span>
        </label>
      </td>
      <td style={{ padding: "4px 6px", textAlign: "center" }}>
        <button onClick={onRemove} style={{ background: "#FEE2E2", color: C.danger, border: "none", borderRadius: 3, padding: "2px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✕</button>
      </td>
    </tr>
  );
}
// ── Device table (wraps rows with header) ─────────────────────────────────────
function DevTable({ cols, devices, gid, setter, newDevFn, onLog, onFieldLog }) {
  if (!devices.length) {
    return (
      <div style={{ textAlign: "center", padding: "16px", color: C.muted, fontSize: 12, border: `1px dashed ${C.border}`, borderRadius: 6, marginTop: 8 }}>
        No devices yet — click Generate or add one manually.
        <button onClick={() => addDev(setter, gid, newDevFn())}
          style={{ marginLeft: 10, background: C.accent, color: C.white, border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          + Add One
        </button>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.steel }}>{devices.length} Device{devices.length !== 1 ? "s" : ""}</span>
        <button onClick={() => addDev(setter, gid, newDevFn(devices.length))}
          style={{ background: C.accent, color: C.white, border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          + Add One
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: C.navy }}>
              <th style={{ padding: "5px 8px", color: C.muted, fontSize: 10, fontWeight: 700, textAlign: "center", width: 30 }}>#</th>
              {cols.map(c => <th key={c.key} style={{ padding: "5px 8px", color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700, textAlign: "left", whiteSpace: "nowrap" }}>{c.label}</th>)}
              <th style={{ padding: "5px 8px", color: C.warn, fontSize: 10, fontWeight: 700, textAlign: "center", width: 50, whiteSpace: "nowrap" }}>Inst</th>
              <th style={{ padding: "5px 8px", color: C.success, fontSize: 10, fontWeight: 700, textAlign: "center", width: 50, whiteSpace: "nowrap" }}>Pgmd</th>
              <th style={{ padding: "5px 8px", width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {devices.map((dev, i) => (
              <DevRow key={dev.id} num={i + 1} dev={dev} cols={cols}
                onRemove={() => remDev(setter, gid, dev.id)}
                onUpd={(k, v) => updDev(setter, gid, dev.id, k, v)}
                onLog={onLog}
                onFieldLog={onFieldLog}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ── Model selector (Brand -> Model -> auto-fill) ───────────────────────────────
function ModelSelector({ db, brand, model, onBrand, onModel, onApply }) {
  const brandList = db.map(b => b.brand);
  const brandEntry = db.find(b => b.brand === brand);
  const modelList = brandEntry ? brandEntry.models : [];
  const handleBrand = (b) => {
    onBrand(b);
    onModel("");
  };
  const handleModel = (m) => {
    onModel(m);
    if (onApply && brandEntry) {
      const obj = brandEntry.models.find(x => x.model === m);
      if (obj) onApply(obj);
    }
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
      <F label="Brand">
        <Sel value={brand} onChange={e => handleBrand(e.target.value)}>
          <option value="">-- Select Brand --</option>
          {brandList.map(b => <option key={b}>{b}</option>)}
          <option value="__custom__">Other / Custom</option>
        </Sel>
      </F>
      <F label="Model">
        {brand === "__custom__" || !brandEntry ? (
          <Inp value={model} onChange={e => onModel(e.target.value)} placeholder="Enter model number / name" />
        ) : (
          <Sel value={model} onChange={e => handleModel(e.target.value)}>
            <option value="">-- Select Model --</option>
            {modelList.map(m => <option key={m.model} value={m.model}>{m.name} ({m.model})</option>)}
          </Sel>
        )}
      </F>
    </div>
  );
}
// ── Generate bar ──────────────────────────────────────────────────────────────
function GenerateBar({ group, setter, genFn, showIP = true }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, background: "#EBF8FF", border: `1px solid #BAE6FD`, borderRadius: 7, padding: "10px 14px", marginTop: 10 }}>
      <F label="Quantity" >
        <Inp type="number" min="1" max="64" value={group.quantity}
          onChange={e => updGrp(setter, group.id, "quantity", e.target.value)}
          style={{ width: 80 }} />
      </F>
      {showIP && (
        <F label="IP Start">
          <Inp value={group.ipStart}
            onChange={e => updGrp(setter, group.id, "ipStart", e.target.value)}
            placeholder="192.168.x.x" style={{ width: 160 }} />
        </F>
      )}
      <button
        onClick={() => applyGen(setter, group.id, genFn)}
        style={{ background: C.gold, color: C.navy, border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", marginBottom: 1 }}>
        ⚡ Generate {group.quantity || 1} Device{parseInt(group.quantity) !== 1 ? "s" : ""}
      </button>
      {group.devices.length > 0 && (
        <span style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>
          (will replace {group.devices.length} existing row{group.devices.length !== 1 ? "s" : ""})
        </span>
      )}
    </div>
  );
}
// ── CSV Export ────────────────────────────────────────────────────────────────
function buildCSV(state, projectMeta) {
  const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
  const headers = [
    "Project Name","Project ID","Customer","Site Address","Tech Lead","Techs","Date",
    "Category","Group Label","Brand","Model",
    "Device Name","Location","IP Address","MAC Address","Serial #","Notes",
    // camera-specific
    "Codec","Resolution","Lens","Camera Type","HTTP Port","RTSP Port","FPS","Bitrate (kbps)","PTZ","Username","Password","Storage Group",
    // server-specific
    "Role","OS / Platform","Storage Config",
    // switch-specific
    "Port Count","VLAN Config","Uplink",
    // access-specific
    "Reader Type","Credential Type","Lock Type","Card Format","Facility Code","Access Group","Schedule","Controller Name","Controller IP","Controller S/N","Reader S/N",
    // zone-specific
    "Zone #","Zone Type","Partitions","Bypassable",
    // audio-specific
    "Zone Group","Amp Zone","Volume (%)",
  ];

  const projCols = [projectMeta.name, projectMeta.projectId, state.customer, state.siteAddress, state.techLead, state.techs, state.date];

  const rows = [headers.map(esc).join(",")];

  const emptyFrom = (start, total) => Array(total - start).fill('""');

  // Cameras (cols 7-16 base, 17-28 camera-specific)
  state.cameraGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Camera", grp.groupLabel || "", grp.brand, grp.model, d.name, d.location, d.ip, d.mac, d.serial, d.notes].flat().map(esc);
      const cam  = [grp.codec, grp.resolution, grp.lens, grp.type, grp.port, grp.rtspPort, grp.fps, grp.bitrate, grp.ptz ? "Yes" : "No", grp.username, grp.password, grp.storageGroup].map(esc);
      const rest = Array(headers.length - base.length - cam.length).fill('""');
      rows.push([...base, ...cam, ...rest].join(","));
    });
  });

  // Servers (cols after camera block: Role, OS, Storage = indices 30,31,32)
  state.serverGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Server", grp.groupLabel || "", grp.brand, grp.model, d.name, d.location, d.ip, d.mac, d.serial, d.notes].flat().map(esc);
      const camEmpty = Array(12).fill('""');
      const srv = [grp.role, grp.os, grp.storage].map(esc);
      const rest = Array(headers.length - base.length - camEmpty.length - srv.length).fill('""');
      rows.push([...base, ...camEmpty, ...srv, ...rest].join(","));
    });
  });

  // Switches
  state.switchGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Switch", grp.groupLabel || "", grp.brand, grp.model, d.name, d.location, d.ip, d.mac, d.serial, d.notes].flat().map(esc);
      const camEmpty = Array(12).fill('""');
      const srvEmpty = Array(3).fill('""');
      const sw = [d.ports || "", grp.vlan, grp.uplink].map(esc);
      const rest = Array(headers.length - base.length - camEmpty.length - srvEmpty.length - sw.length).fill('""');
      rows.push([...base, ...camEmpty, ...srvEmpty, ...sw, ...rest].join(","));
    });
  });

  // Doors
  state.doorGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Access Door", grp.groupLabel || "", grp.brand, grp.model, d.name, d.location, "", "", "", d.notes].flat().map(esc);
      const camEmpty = Array(12).fill('""');
      const srvEmpty = Array(3).fill('""');
      const swEmpty  = Array(3).fill('""');
      const ac = [grp.readerType, grp.credentialType, grp.lockType, grp.cardFormat, grp.facilityCode, grp.accessGroup, grp.schedule, d.controllerName, d.controllerIP, d.controllerSerial, d.readerSerial].map(esc);
      const rest = Array(headers.length - base.length - camEmpty.length - srvEmpty.length - swEmpty.length - ac.length).fill('""');
      rows.push([...base, ...camEmpty, ...srvEmpty, ...swEmpty, ...ac, ...rest].join(","));
    });
  });

  // Zones
  state.zoneGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Intrusion Zone", grp.groupLabel || "", "", "", d.name, d.location, "", "", "", d.notes].flat().map(esc);
      const camEmpty = Array(12).fill('""');
      const srvEmpty = Array(3).fill('""');
      const swEmpty  = Array(3).fill('""');
      const acEmpty  = Array(11).fill('""');
      const zone = [d.zoneNumber, d.zoneType, d.partitions, d.bypassable ? "Yes" : "No"].map(esc);
      const rest = Array(headers.length - base.length - camEmpty.length - srvEmpty.length - swEmpty.length - acEmpty.length - zone.length).fill('""');
      rows.push([...base, ...camEmpty, ...srvEmpty, ...swEmpty, ...acEmpty, ...zone, ...rest].join(","));
    });
  });

  // Audio
  state.speakerGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Audio Zone", grp.groupLabel || "", grp.brand, grp.model, d.name, d.location, d.ip, "", "", d.notes].flat().map(esc);
      const camEmpty = Array(12).fill('""');
      const srvEmpty = Array(3).fill('""');
      const swEmpty  = Array(3).fill('""');
      const acEmpty  = Array(11).fill('""');
      const zoneEmpty = Array(4).fill('""');
      const audio = [grp.zoneGroup, grp.ampZone, grp.volume].map(esc);
      const rest = Array(headers.length - base.length - camEmpty.length - srvEmpty.length - swEmpty.length - acEmpty.length - zoneEmpty.length - audio.length).fill('""');
      rows.push([...base, ...camEmpty, ...srvEmpty, ...swEmpty, ...acEmpty, ...zoneEmpty, ...audio, ...rest].join(","));
    });
  });

  const csv = rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PCWO_${projectMeta.name.replace(/\s+/g,"_").substring(0,40)}_${state.date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
// ── PDF Generator ─────────────────────────────────────────────────────────────
async function buildPDF(state, projectMeta, opts = {}) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const W = 215.9, M = 14, CW = W - M * 2;
  let y = 0;
  const np = () => { doc.addPage(); y = 18; hdrStrip(); };
  const chk = (n = 20) => { if (y + n > 262) np(); };
  const hdrStrip = () => {
    doc.setFillColor(11, 31, 58); doc.rect(0, 0, W, 10, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(`${projectMeta.name}  |  Programming & Configuration Report`, M, 7);
    doc.setTextColor(0, 174, 239);
    doc.text(`Project ID: ${projectMeta.projectId}`, W - M - 30, 7);
  };
  const sectionBanner = (txt, icon = "") => {
    chk(14);
    doc.setFillColor(11, 31, 58); doc.rect(M, y, CW, 8, "F");
    doc.setFillColor(0, 174, 239); doc.rect(M, y + 8, CW, 1.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(`${icon}  ${txt}`, M + 4, y + 5.5);
    y += 13;
  };
  const groupBanner = (txt) => {
    chk(10);
    doc.setFillColor(26, 51, 85); doc.rect(M, y, CW, 7, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(0, 174, 239);
    doc.text(txt, M + 4, y + 5);
    y += 9;
  };
  const row = (pairs, lineH = 9) => {
    const cols = pairs.length;
    const colW = CW / cols;
    doc.setFontSize(8);
    pairs.forEach(([k, v], i) => {
      const x = M + i * colW;
      doc.setFont("helvetica", "bold"); doc.setTextColor(107, 126, 150); doc.text(k, x + 2, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20); doc.text(String(v || "—").substring(0, 32), x + 2, y + 4.5);
    });
    y += lineH;
  };
  const noteRow = (note) => {
    if (!note) return;
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130);
    doc.text("Note: " + note.substring(0, 160), M + 2, y);
    y += 5;
  };
  const divider = () => {
    doc.setDrawColor(200, 210, 220); doc.setLineWidth(0.3);
    doc.line(M, y, M + CW, y); y += 3;
  };
  // ─ Cover ─────────────────────────────────────────────────────────────────
  doc.setFillColor(11, 31, 58); doc.rect(0, 0, W, 62, "F");
  doc.setFillColor(0, 174, 239); doc.rect(0, 62, W, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0, 174, 239);
  doc.text("PROGRAMMING & CONFIGURATION WORK ORDER", M, 18);
  doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text(projectMeta.name, M, 30);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 200, 220);
  doc.text(`Project ID: ${projectMeta.projectId}   |   Date: ${state.date}   |   Tech Lead: ${state.techLead}   |   Tech(s): ${state.techs}`, M, 40);
  const camCount  = state.cameraGroups.reduce((s, g) => s + g.devices.length, 0);
  const swCount   = state.switchGroups.reduce((s, g) => s + g.devices.length, 0);
  const srvCount  = state.serverGroups.reduce((s, g) => s + g.devices.length, 0);
  const doorCount = state.doorGroups.reduce((s, g) => s + g.devices.length, 0);
  const zoneCount = state.zoneGroups.reduce((s, g) => s + g.devices.length, 0);
  const spkCount  = state.speakerGroups.reduce((s, g) => s + g.devices.length, 0);
  const tiles = [
    { label: "Servers",       val: srvCount },
    { label: "Switches",      val: swCount },
    { label: "Cameras",       val: camCount },
    { label: "Access Doors",  val: doorCount },
    { label: "Intrusion Zones", val: zoneCount },
    { label: "Audio Zones",   val: spkCount },
  ];
  const tW = CW / tiles.length;
  tiles.forEach((t, i) => {
    const x = M + i * tW;
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(0, 174, 239);
    doc.text(String(t.val), x + 4, 58);
    doc.setFontSize(7); doc.setTextColor(180, 200, 220);
    doc.text(t.label, x + 4, 54);
  });
  y = 78;
  // Project info box
  doc.setFillColor(240, 244, 248); doc.roundedRect(M, y, CW, 38, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(11, 31, 58);
  doc.text("PROJECT INFORMATION", M + 4, y + 7);
  y += 10;
  const infoL = [["Project Name:", projectMeta.name],["Project ID:", projectMeta.projectId],["Customer:", state.customer],["Site Address:", state.siteAddress]];
  const infoR = [["Tech Lead:", state.techLead],["Tech(s):", state.techs],["Date:", state.date],["Submitted By:", state.submittedBy]];
  infoL.forEach(([k, v], i) => {
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(107,126,150); doc.text(k, M+4, y+i*7);
    doc.setFont("helvetica","normal"); doc.setTextColor(20,20,20); doc.text(v||"—", M+36, y+i*7);
  });
  infoR.forEach(([k, v], i) => {
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(107,126,150); doc.text(k, M+CW/2+4, y+i*7);
    doc.setFont("helvetica","normal"); doc.setTextColor(20,20,20); doc.text(v||"—", M+CW/2+28, y+i*7);
  });
  y += 38;
  // ─ SERVERS ───────────────────────────────────────────────────────────────
  if (srvCount > 0) {
    np();
    sectionBanner("SERVERS & COMPUTING INFRASTRUCTURE", "Server");
    state.serverGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.brand || "Server"} ${grp.model || "Group"}`.trim();
      groupBanner(`${grpLabel}  |  Role: ${grp.role || "—"}  |  OS: ${grp.os || "—"}  |  Storage: ${grp.storage || "—"}`);
      grp.devices.forEach((s, i) => {
        chk(22);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 20, 1.5, 1.5, "F");
        y += 4;
        doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(11,31,58);
        doc.text(`SERVER ${i+1}${s.name ? " — " + s.name : ""}`, M+3, y);
        y += 5;
        row([["IP Address:", s.ip], ["MAC:", s.mac], ["Serial #:", s.serial], ["Location:", s.location]]);
        noteRow(s.notes);
        divider();
      });
    });
  }
  // ─ SWITCHING ─────────────────────────────────────────────────────────────
  if (swCount > 0) {
    np();
    sectionBanner("NETWORK SWITCHING", "Switch");
    state.switchGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.brand || "Switch"} ${grp.model || "Group"}`.trim();
      groupBanner(`${grpLabel}  |  VLAN: ${grp.vlan || "—"}  |  Uplink: ${grp.uplink || "—"}`);
      grp.devices.forEach((sw, i) => {
        chk(22);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 20, 1.5, 1.5, "F");
        y += 4;
        doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(11,31,58);
        doc.text(`SWITCH ${i+1}${sw.name ? " — " + sw.name : ""}`, M+3, y);
        y += 5;
        row([["IP Address:", sw.ip], ["MAC:", sw.mac], ["Serial #:", sw.serial], ["Ports:", sw.ports]]);
        row([["Location:", sw.location]]);
        noteRow(sw.notes);
        divider();
      });
    });
  }
  // ─ CAMERAS ───────────────────────────────────────────────────────────────
  if (camCount > 0) {
    np();
    sectionBanner("CCTV / VMS CAMERA PROGRAMMING LOG", "Camera");
    if (state.nvrBrand) {
      doc.setFillColor(235,244,255); doc.roundedRect(M, y, CW, 14, 1.5, 1.5, "F");
      y += 3;
      row([["NVR/DVR Brand:", state.nvrBrand], ["Model:", state.nvrModel], ["IP:", state.nvrIp], ["Serial:", state.nvrSerial]]);
      row([["Firmware:", state.nvrFirmware], ["Storage:", state.nvrStorage], ["Retention:", state.nvrRetention], ["VMS Software:", state.vmsSoftware]]);
      y += 2;
    }
    state.cameraGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.brand || "Camera"} ${grp.model || "Group"}`.trim();
      groupBanner(`${grpLabel}  |  ${grp.resolution}  ${grp.codec}  ${grp.lens}  ${grp.type}  |  FPS: ${grp.fps}  Bitrate: ${grp.bitrate || "—"}  |  HTTP: ${grp.port}  RTSP: ${grp.rtspPort}  |  PTZ: ${grp.ptz ? "Yes" : "No"}`);
      grp.devices.forEach((cam, i) => {
        chk(28);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 26, 1.5, 1.5, "F");
        y += 4;
        doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(11,31,58);
        doc.text(`CAMERA ${i+1}${cam.name ? " — " + cam.name : ""}`, M+3, y);
        y += 5;
        row([["Location:", cam.location], ["IP Address:", cam.ip], ["MAC:", cam.mac], ["Serial #:", cam.serial]]);
        row([["Username:", grp.username], ["Password:", grp.password], ["Storage Group:", grp.storageGroup]]);
        noteRow(cam.notes);
        divider();
      });
    });
  }
  // ─ ACCESS CONTROL ────────────────────────────────────────────────────────
  if (doorCount > 0) {
    np();
    sectionBanner("ACCESS CONTROL PROGRAMMING LOG", "Door");
    state.doorGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.brand || "Access"} ${grp.model || "Group"}`.trim();
      groupBanner(`${grpLabel}  |  Reader: ${grp.readerType}  Credential: ${grp.credentialType}  Lock: ${grp.lockType}  |  Format: ${grp.cardFormat || "—"}  Facility: ${grp.facilityCode || "—"}`);
      grp.devices.forEach((d, i) => {
        chk(30);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 28, 1.5, 1.5, "F");
        y += 4;
        doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(11,31,58);
        doc.text(`DOOR ${i+1}${d.name ? " — " + d.name : ""}`, M+3, y);
        y += 5;
        row([["Location:", d.location], ["Controller:", d.controllerName], ["Controller IP:", d.controllerIP], ["Controller S/N:", d.controllerSerial]]);
        row([["Reader S/N:", d.readerSerial], ["REX:", d.rex ? "Yes" : "No"], ["Door Contact:", d.doorContact ? "Yes" : "No"], ["Schedule:", grp.schedule || "—"]]);
        noteRow(d.notes);
        divider();
      });
    });
  }
  // ─ INTRUSION ─────────────────────────────────────────────────────────────
  if (zoneCount > 0) {
    np();
    sectionBanner("INTRUSION SYSTEM PROGRAMMING LOG", "Alarm");
    if (state.panelBrand) {
      doc.setFillColor(235,244,255); doc.roundedRect(M, y, CW, 12, 1.5, 1.5, "F");
      y += 3;
      row([["Panel Brand:", state.panelBrand], ["Model:", state.panelModel], ["Serial:", state.panelSerial], ["Firmware:", state.panelFirmware]]);
      y += 4;
    }
    state.zoneGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.zoneType} Zones`;
      groupBanner(`${grpLabel}  |  Type: ${grp.zoneType}  |  Partitions: ${grp.partitions || "—"}  |  Bypassable: ${grp.bypassable ? "Yes" : "No"}`);
      grp.devices.forEach((z, i) => {
        chk(18);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 16, 1.5, 1.5, "F");
        y += 4;
        row([["Zone #:", z.zoneNumber], ["Name:", z.name], ["Location:", z.location], ["Type:", z.zoneType]]);
        noteRow(z.notes);
        divider();
      });
    });
  }
  // ─ AUDIO ─────────────────────────────────────────────────────────────────
  if (spkCount > 0) {
    np();
    sectionBanner("AUDIO SYSTEM PROGRAMMING LOG", "Audio");
    state.speakerGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.brand || "Audio"} ${grp.model || "Group"}`.trim();
      groupBanner(`${grpLabel}  |  Zone Group: ${grp.zoneGroup || "—"}  Amp Zone: ${grp.ampZone || "—"}  Volume: ${grp.volume}%`);
      grp.devices.forEach((sp, i) => {
        chk(16);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 14, 1.5, 1.5, "F");
        y += 4;
        row([["Speaker/Zone:", sp.name], ["Location:", sp.location], ["IP/Address:", sp.ip]]);
        noteRow(sp.notes);
        divider();
      });
    });
  }
  // ─ Sign-off ───────────────────────────────────────────────────────────────
  np();
  sectionBanner("SIGN-OFF & CERTIFICATION", "Sign");
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(60,60,60);
  doc.text("The undersigned certifies all programming listed in this document has been completed, tested, verified, and customer training provided.", M, y);
  y += 12;
  [["Lead Technician", state.techLead], ["Customer Representative", state.customer]].forEach(([lbl, name], i) => {
    const x = M + i * (CW / 2 + 2);
    doc.setDrawColor(200,210,220); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, CW/2-2, 30, 2, 2, "S");
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(107,126,150); doc.text(lbl, x+4, y+7);
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(11,31,58); doc.text(name || "___________________________", x+4, y+16);
    doc.setFontSize(8); doc.setTextColor(150,150,150); doc.text("Date: __________________", x+4, y+24);
  });
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(160,160,160);
    doc.text(`Page ${i} of ${totalPages}`, W-M-18, 270);
    doc.text("CONFIDENTIAL — Programming & Configuration Work Order", M, 270);
  }
  const fname = `PCWO_${projectMeta.name.replace(/\s+/g,"_").substring(0,40)}_${state.date}.pdf`;
  if (opts?.returnBytes) return doc.output("arraybuffer");
  doc.save(fname);
}
// ── MASTER DASHBOARD ──────────────────────────────────────────────────────────
function MasterDashboard({ onBack, laborTypes }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  useEffect(() => {
    listWorkOrders()
      .then(data => { setRows(data); setLoading(false); })
      .catch(e   => { setError(e.message); setLoading(false); });
  }, []);
  const allDevs = (s) => [
    ...(s.cameraGroups  || []), ...(s.switchGroups  || []),
    ...(s.serverGroups  || []), ...(s.doorGroups    || []),
    ...(s.zoneGroups    || []), ...(s.speakerGroups || []),
  ].flatMap(g => g.devices || []);
  const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;
  const Bar = ({ val, color }) => (
    <div style={{ background: "#E5E7EB", borderRadius: 999, height: 6, width: "100%", overflow: "hidden", marginTop: 2 }}>
      <div style={{ height: "100%", width: `${val}%`, background: color, borderRadius: 999, transition: "width .4s" }} />
    </div>
  );
  // Summaries
  const summary = rows.map(r => {
    const s = r.state || {};
    const devs = allDevs(s);
    const inst = devs.filter(d => d.installed).length;
    const pgmd = devs.filter(d => d.programmed).length;
    const bud  = laborTypes.reduce((a, t) => a + (parseFloat((s.laborBudget || {})[t.key]) || 0), 0);
    const act  = laborTypes.reduce((a, t) => a + (parseFloat((s.laborActual || {})[t.key]) || 0), 0);
    return { name: r.project_name, id: r.monday_project_id, total: devs.length, inst, pgmd, bud, act, updated: r.updated_at };
  });
  const totDevices = summary.reduce((a, r) => a + r.total, 0);
  const totInst    = summary.reduce((a, r) => a + r.inst,  0);
  const totPgmd    = summary.reduce((a, r) => a + r.pgmd,  0);
  const totBud     = summary.reduce((a, r) => a + r.bud,   0);
  const totAct     = summary.reduce((a, r) => a + r.act,   0);
  const statusLabel = (r) => {
    if (r.total === 0) return { label: "No Devices", color: C.muted };
    if (r.pgmd === r.total) return { label: "Complete", color: C.success };
    if (r.inst === r.total) return { label: "Installed", color: C.warn };
    if (r.inst > 0) return { label: "In Progress", color: C.accent };
    return { label: "Not Started", color: C.steel };
  };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.navy, padding: "12px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", color: C.white, border: "none", borderRadius: 5, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>← Back</button>
        <div style={{ color: C.white, fontWeight: 800, fontSize: 16 }}>📊 Master Project Dashboard</div>
        <div style={{ marginLeft: "auto", color: C.accent, fontSize: 12, fontWeight: 600 }}>{rows.length} projects loaded</div>
      </div>
      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        {loading && <div style={{ textAlign: "center", padding: 60, color: C.muted }}>Loading all projects…</div>}
        {error   && <div style={{ background: "#FEE2E2", borderRadius: 8, padding: 16, color: C.danger, marginBottom: 16 }}>Error: {error}</div>}
        {!loading && !error && (
          <>
            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Projects",     value: rows.length,                              color: C.navy },
                { label: "Total Devices",value: totDevices,                               color: C.navy },
                { label: "Avg Install",  value: `${pct(totInst, totDevices)}%`,           color: C.warn },
                { label: "Avg Program",  value: `${pct(totPgmd, totDevices)}%`,           color: C.accent },
                { label: "Budget Hrs",   value: `${totBud}h`,                             color: C.navy },
                { label: "Actual Hrs",   value: `${totAct}h`,                             color: totAct > totBud && totBud > 0 ? C.danger : C.success },
              ].map(card => (
                <div key={card.label} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16 }}>
                  <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{card.label}</div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: card.color, marginTop: 4 }}>{card.value}</div>
                </div>
              ))}
            </div>
            {/* Projects table */}
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.navy }}>
                    {["Project", "Status", "Devices", "Install %", "Program %", "Budget Hrs", "Actual Hrs", "Variance", "Last Updated"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 700, textAlign: h === "Project" || h === "Status" ? "left" : "center", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.map((r, i) => {
                    const st   = statusLabel(r);
                    const ip   = pct(r.inst, r.total);
                    const pp   = pct(r.pgmd, r.total);
                    const varr = r.act - r.bud;
                    return (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: C.navy, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: st.color + "22", color: st.color, borderRadius: 6, padding: "2px 10px", fontWeight: 700, fontSize: 11 }}>{st.label}</span>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: C.navy, fontWeight: 700 }}>{r.total}</td>
                        <td style={{ padding: "10px 14px", minWidth: 100 }}>
                          <div style={{ textAlign: "center", fontWeight: 700, color: ip === 100 ? C.success : C.warn, fontSize: 12 }}>{ip}%</div>
                          <Bar val={ip} color={ip === 100 ? C.success : C.warn} />
                        </td>
                        <td style={{ padding: "10px 14px", minWidth: 100 }}>
                          <div style={{ textAlign: "center", fontWeight: 700, color: pp === 100 ? C.success : C.accent, fontSize: 12 }}>{pp}%</div>
                          <Bar val={pp} color={pp === 100 ? C.success : C.accent} />
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: C.navy }}>{r.bud ? `${r.bud}h` : "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: C.navy }}>{r.act ? `${r.act}h` : "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: varr > 0 ? C.danger : varr < 0 ? C.success : C.muted }}>
                          {r.bud === 0 ? "—" : varr === 0 ? "0h" : `${varr > 0 ? "+" : ""}${varr}h`}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: C.muted, fontSize: 11 }}>
                          {r.updated ? new Date(r.updated).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {summary.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: C.muted }}>No saved projects yet. Open a project and make changes to save it.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
// ── Portal.io Proposal CSV Import ─────────────────────────────────────────────
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
function areaToCategory(area) {
  const a = (area || "").toLowerCase();
  // Camera / CCTV
  if (/video surveil|cctv|surveillance camera|camera system/.test(a)) return "camera";
  if (/^video$/.test(a.trim()))                                        return "camera";
  // Access control
  if (/access control|door control|door access/.test(a))              return "door";
  if (/^access$/.test(a.trim()))                                       return "door";
  // Intrusion / Alarm
  if (/intrusion|alarm|burglar/.test(a))                               return "zone";
  // Audio (check before generic "video" since "distributed audio" is common)
  if (/audio|speaker|sound|a\/v distributed|distributed a/.test(a))   return "speaker";
  // Networking
  if (/network|switching|switch|structured|it infrastructure/.test(a)) return "switch";
  // Servers / NVR
  if (/server|nvr|dvr|recording|vms/.test(a))                         return "server";
  // Fallback broader matches
  if (/video|camera/.test(a))                                          return "camera";
  if (/access/.test(a))                                                return "door";
  return "unknown";
}
// Detect header row by looking for known column names (case-insensitive)
function detectPortalHeaders(cols) {
  const norm = cols.map(c => (c || "").toLowerCase().replace(/[^a-z]/g, ""));
  const find = (...keys) => {
    for (const k of keys) {
      const idx = norm.findIndex(n => n.includes(k));
      if (idx !== -1) return idx;
    }
    return -1;
  };
  return {
    proposal:    find("proposal"),
    changeorder: find("changeorder", "change"),
    area:        find("area"),
    itemtype:    find("itemtype", "type"),
    brand:       find("brand", "mfr", "manufacturer"),
    model:       find("model", "partnum", "partnumber", "sku"),
    shortdesc:   find("shortdesc", "description", "desc", "name"),
    recurring:   find("recurring", "mrr", "monthly"),
    qty:         find("areaqty", "qty", "quantity"),
  };
}
function parseProposalCSV(csvText) {
  // Strip BOM (Excel adds \uFEFF to the start of CSV exports — breaks Number() checks)
  const text = csvText.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const rows = [];
  let proposalId = null;
  let headerMap = null;
  let isChangeOrder = false;

  for (const line of lines) {
    const cols = parseCSVLine(line);
    if (!cols.length) continue;

    // ── Detect header row ───────────────────────────────────────────────────
    if (!headerMap) {
      const candidate = detectPortalHeaders(cols);
      if (candidate.proposal !== -1 && (candidate.area !== -1 || candidate.itemtype !== -1)) {
        headerMap = candidate;
        continue; // skip the header row itself
      }
      // Fallback: Portal.io default positional layout (A=Proposal, B=ChangeOrder, C=Area, D=ItemType, E=Brand, F=Model, G=ShortDesc, H=Recurring, I=AreaQty)
      headerMap = { proposal: 0, changeorder: 1, area: 2, itemtype: 3, brand: 4, model: 5, shortdesc: 6, recurring: 7, qty: 8 };
    }

    const g = (idx) => idx !== -1 && idx < cols.length ? (cols[idx] || "").trim() : "";
    const colA      = g(headerMap.proposal).replace(/[^\d]/g, ""); // strip any stray chars (BOM, spaces)
    const coB       = g(headerMap.changeorder);
    const area      = g(headerMap.area);
    const itemType  = g(headerMap.itemtype).toLowerCase();
    const brand     = g(headerMap.brand);
    const model     = g(headerMap.model);
    const shortDesc = g(headerMap.shortdesc);
    const recurring = g(headerMap.recurring);
    const qty       = g(headerMap.qty);

    // Skip summary/blank rows (no proposal number or no itemtype)
    if (!colA || !itemType) continue;

    // Only import hardware line items — Portal uses "Part", "Parts", "Hardware", "Product"
    const isHardware = /^parts?$|^hardware$|^product$|^equipment$/i.test(itemType);
    if (!isHardware) continue;

    if (!proposalId) proposalId = colA;
    if (coB && coB !== "0") isChangeOrder = true;

    // "Non-Recurring" or "Non-Recu" → not recurring. "Recurring" or "Recu" → recurring.
    const isRecurring = /^recu|^yes$|^true$|^1$|^mrr$/i.test(recurring) && !/^non/i.test(recurring);

    rows.push({
      proposalId,
      changeOrder:  coB || "",
      brand,
      model,
      label:        shortDesc,
      qty:          Math.max(1, parseInt(qty) || 1),
      area,
      category:     areaToCategory(area),
      recurring:    isRecurring,
    });
  }
  return { proposalId, rows, isChangeOrder };
}
function buildGroupsFromRows(rows, overrideCats = {}) {
  const result = { cameraGroups: [], switchGroups: [], serverGroups: [], doorGroups: [], zoneGroups: [], speakerGroups: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cat = overrideCats[i] || r.category;
    const base = { id: uid(), groupLabel: r.label || "", brand: r.brand || "", model: r.model || "", quantity: String(r.qty), devices: [] };
    switch (cat) {
      case "camera":  result.cameraGroups.push({ ...mkCamGroup(), ...base });  break;
      case "door":    result.doorGroups.push({ ...mkDoorGrp(), ...base });     break;
      case "zone":    result.zoneGroups.push({ ...mkZoneGrp(), ...base });     break;
      case "speaker": result.speakerGroups.push({ ...mkSpkGrp(), ...base });   break;
      case "switch":  result.switchGroups.push({ ...mkSwGrp(), ...base });     break;
      case "server":  result.serverGroups.push({ ...mkSrvGrp(), ...base });    break;
      default: break; // unknown — skip
    }
  }
  return result;
}
// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const LABOR_TYPES = [
    { key: "l1",           label: "Installation - L1" },
    { key: "l2",           label: "Installation - L2" },
    { key: "l3",           label: "Installation - L3" },
    { key: "programming",  label: "Programming" },
    { key: "travel",       label: "Travel" },
    { key: "super",        label: "Superintendent" },
    { key: "pm",           label: "Project Management" },
  ];
  const emptyLabor = () => ({ l1: "", l2: "", l3: "", programming: "", travel: "", super: "", pm: "" });
  const [phase, setPhase] = useState("select");
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [mondayToken, setMondayToken] = useState(() => import.meta.env.VITE_MONDAY_TOKEN || localStorage.getItem("mondayToken") || "");
  const [tokenDraft, setTokenDraft] = useState("");
  const [colMap, setColMap] = useState(() => { try { return JSON.parse(localStorage.getItem("mondayColMap") || "{}"); } catch { return {}; } });
  const [colMapperOpen, setColMapperOpen] = useState(false);
  const [colMapperCols, setColMapperCols] = useState([]);   // [{id, title, sample}]
  const [colMapperLoading, setColMapperLoading] = useState(false);
  const [colMapDraft, setColMapDraft] = useState({});
  const [projectFiles, setProjectFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileUploadCat, setFileUploadCat] = useState("Drawings");
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState("info");
  const [generating, setPDF] = useState(false);
  const [sdkReady, setSDK] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const saveTimerRef = useRef(null);
  // project info
  const [info, setInfo] = useState({ customer: "", siteAddress: "", techLead: "", techs: "", date: new Date().toISOString().split("T")[0], submittedBy: "" });
  const [nvrInfo, setNVR] = useState({ nvrBrand: "", nvrModel: "", nvrIp: "", nvrSerial: "", nvrFirmware: "", nvrStorage: "", nvrRetention: "", vmsSoftware: "" });
  const [panelInfo, setPanel] = useState({ panelBrand: "", panelModel: "", panelSerial: "", panelFirmware: "" });
  // labor hours
  const [laborBudget, setLaborBudget] = useState(emptyLabor());
  const [laborActual, setLaborActual] = useState(emptyLabor());
  // group-based device state
  const [cameraGroups, setCameraGroups] = useState([]);
  const [switchGroups,  setSwitchGroups]  = useState([]);
  const [serverGroups,  setServerGroups]  = useState([]);
  const [doorGroups,    setDoorGroups]    = useState([]);
  const [zoneGroups,    setZoneGroups]    = useState([]);
  const [speakerGroups, setSpeakerGroups] = useState([]);
  // collapse state per group
  const [collapsed, setCollapsed] = useState({});
  const toggleCollapse = (id) => setCollapsed(s => ({ ...s, [id]: !s[id] }));
  // change log + AI summary
  const [changeLog,     setChangeLog]     = useState([]);   // [{ id, ts, type, desc }] — persisted
  const [webhookUrl,    setWebhookUrl]    = useState(() => localStorage.getItem("agentWebhookUrl") || "");
  const [aiLoading,     setAiLoading]     = useState(false);
  const [dashCollapsed, setDashCollapsed] = useState({});   // category collapse in dashboard
  // Monday write-back
  const [mondaySyncEnabled, setMondaySyncEnabled] = useState(() => localStorage.getItem("mondaySyncEnabled") === "true");
  const [mondaySyncColId,   setMondaySyncColId]   = useState(() => localStorage.getItem("mondaySyncColId") || "");
  const addLog = (type, desc) =>
    setChangeLog(l => [{ id: uid(), ts: new Date().toISOString(), type, desc }, ...l].slice(0, 500));
  // proposal import
  const [importPreview, setImportPreview] = useState(null); // { proposalId, rows, overrideCats: {index: category} }
  const importFileRef = useRef(null);
  // device library / OEM manual
  const [specSheetUrls,  setSpecSheetUrls]  = useState({}); // {"brand|model": url} — persisted (reference links only)
  const [coverPageFile,  setCoverPageFile]  = useState(null);
  const [pdfLibReady,    setPdfLibReady]    = useState(false);
  const coverFileRef = useRef(null);
  // living library (Supabase-backed)
  const [library,        setLibrary]        = useState([]);  // all device_library rows
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libUploadForm,  setLibUploadForm]  = useState(null); // null | { category, brand, model, displayName, file, uploading, error }
  const [libShowAll,     setLibShowAll]     = useState(false); // false = show only project-matched entries
  const libUploadFileRef = useRef(null);
  // device counts
  const camCount  = cameraGroups.reduce((s, g) => s + g.devices.length, 0);
  const swCount   = switchGroups.reduce((s, g) => s + g.devices.length, 0);
  const srvCount  = serverGroups.reduce((s, g) => s + g.devices.length, 0);
  const doorCount = doorGroups.reduce((s, g) => s + g.devices.length, 0);
  const zoneCount = zoneGroups.reduce((s, g) => s + g.devices.length, 0);
  const spkCount  = speakerGroups.reduce((s, g) => s + g.devices.length, 0);
  const totalDevices = camCount + swCount + srvCount + doorCount + zoneCount + spkCount;
  // field setters
  const setI   = (k, v) => setInfo(s => ({ ...s, [k]: v }));
  const setNV  = (k, v) => setNVR(s => ({ ...s, [k]: v }));
  const setPan = (k, v) => setPanel(s => ({ ...s, [k]: v }));
  // ── Auto-save to Supabase ─────────────────────────────────────────────────
  const pendingSnapRef = useRef(null);
  const flushSave = useCallback(async (project, extraSnap) => {
    const snap = extraSnap || pendingSnapRef.current;
    if (!project?.id || !snap) return;
    pendingSnapRef.current = null;
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    try {
      await saveWorkOrder(project.id, project.name, project.projectId, snap);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
      // Monday.com write-back: push programming % to configured column
      const syncEnabled = localStorage.getItem("mondaySyncEnabled") === "true";
      const syncColId   = localStorage.getItem("mondaySyncColId") || "";
      const token       = import.meta.env.VITE_MONDAY_TOKEN || localStorage.getItem("mondayToken") || "";
      if (syncEnabled && syncColId && token && project?.id) {
        try {
          const allDevs = [
            ...(snap.cameraGroups || []), ...(snap.switchGroups || []),
            ...(snap.serverGroups || []), ...(snap.doorGroups   || []),
            ...(snap.zoneGroups   || []), ...(snap.speakerGroups || []),
          ].flatMap(g => g.devices || []);
          const total = allDevs.length;
          const pgmd  = allDevs.filter(d => d.programmed).length;
          const inst  = allDevs.filter(d => d.installed).length;
          const pct   = total ? Math.round((pgmd / total) * 100) : 0;
          const statusText = total === 0 ? "No Devices" : pgmd === total ? "Complete" : inst === total ? "Installed" : inst > 0 ? `In Progress (${pct}%)` : "Not Started";
          await pushMondayUpdate(token, project.id, syncColId, statusText);
        } catch (e) { console.warn("Monday write-back failed:", e.message); }
      }
    } catch { setSaveStatus("error"); }
  }, []);
  const triggerSave = useCallback((snap, project) => {
    if (!project?.id) return;
    pendingSnapRef.current = snap;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(() => flushSave(project), 1000);
  }, [flushSave]);
  // Watch all state and auto-save when anything changes (only in build phase)
  useEffect(() => {
    if (phase !== "build" || !selectedProject) return;
    const snap = { info, nvrInfo, panelInfo, cameraGroups, switchGroups, serverGroups, doorGroups, zoneGroups, speakerGroups, laborBudget, laborActual, specSheetUrls, changeLog };
    triggerSave(snap, selectedProject);
  }, [info, nvrInfo, panelInfo, cameraGroups, switchGroups, serverGroups, doorGroups, zoneGroups, speakerGroups, laborBudget, laborActual, specSheetUrls, changeLog]); // eslint-disable-line
  // Flush save on tab close / refresh
  useEffect(() => {
    const handleUnload = () => { if (selectedProject) flushSave(selectedProject); };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [selectedProject, flushSave]);
  useEffect(() => {
    if (window.jspdf) { setSDK(true); } else {
      if (!document.querySelector('script[src*="jspdf"]')) {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload = () => setSDK(true);
        document.head.appendChild(s);
      }
    }
    if (window.PDFLib) { setPdfLibReady(true); } else {
      if (!document.querySelector('script[src*="pdf-lib"]')) {
        const s2 = document.createElement("script");
        s2.src = "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js";
        s2.onload = () => setPdfLibReady(true);
        document.head.appendChild(s2);
      }
    }
  }, []);
  useEffect(() => {
    if (!mondayToken) return;
    setLoadingProjects(true);
    setProjectsError("");
    fetchProjects(mondayToken, colMap)
      .then(ps => { setProjects(ps); setLoadingProjects(false); })
      .catch(e => { setProjectsError(e.message || "Failed to load projects"); setLoadingProjects(false); });
  }, [mondayToken, colMap]);
  // Load library whenever the library or export tab is opened (export needs it for OEM match count)
  useEffect(() => {
    if (tab !== "library" && tab !== "export") return;
    setLibraryLoading(true);
    listLibrary()
      .then(rows => { setLibrary(rows); setLibraryLoading(false); })
      .catch(() => setLibraryLoading(false));
  }, [tab]);
  // Load project files whenever the files tab is opened
  useEffect(() => {
    if (tab !== "files" || !selectedProject) return;
    setFilesLoading(true);
    listProjectFiles(selectedProject.id)
      .then(rows => { setProjectFiles(rows); setFilesLoading(false); })
      .catch(() => setFilesLoading(false));
  }, [tab, selectedProject]);
  const stateSnapshot = () => ({ ...info, ...nvrInfo, ...panelInfo, cameraGroups, switchGroups, serverGroups, doorGroups, zoneGroups, speakerGroups, specSheetUrls, changeLog });
  const projectMeta  = () => ({ name: selectedProject?.name || "Project", projectId: selectedProject?.projectId || "—" });
  const handleCSV = () => {
    try { buildCSV(stateSnapshot(), projectMeta()); }
    catch (e) { alert("CSV error: " + e.message); }
  };
  const handleGenerate = async () => {
    if (!sdkReady) { alert("PDF library still loading. Please wait."); return; }
    setPDF(true);
    try {
      await buildPDF(stateSnapshot(), projectMeta());
    } catch (e) { alert("PDF error: " + e.message); }
    setPDF(false);
  };
  const buildOEMManual = async () => {
    if (!pdfLibReady) { alert("PDF library still loading. Please wait."); return; }
    if (!sdkReady)    { alert("PDF library still loading. Please wait."); return; }
    const { PDFDocument } = window.PDFLib;
    const merger = await PDFDocument.create();
    const appendPdfBytes = async (bytes) => {
      try {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merger.copyPages(src, src.getPageIndices());
        pages.forEach(p => merger.addPage(p));
      } catch (e) { console.warn("Skipping unreadable PDF:", e); }
    };
    // 1. Cover page (user-uploaded)
    if (coverPageFile) await appendPdfBytes(await coverPageFile.arrayBuffer());
    // 2. Close-out report (generated fresh)
    try {
      const closeoutBytes = await buildPDF(stateSnapshot(), projectMeta(), { returnBytes: true });
      if (closeoutBytes) await appendPdfBytes(closeoutBytes);
    } catch (e) { console.warn("Could not generate close-out PDF:", e); }
    // 3. Spec sheet PDFs — auto-match from living library by brand+model
    const allGroups = [...cameraGroups, ...doorGroups, ...zoneGroups, ...speakerGroups, ...switchGroups, ...serverGroups];
    const usedKeys  = new Set(allGroups.map(g => `${g.brand}|${g.model}`.toLowerCase()));
    const matched   = library.filter(e => usedKeys.has(`${e.brand}|${e.model}`.toLowerCase()));
    for (const entry of matched) {
      try {
        const url = getSpecSheetUrl(entry.file_path);
        if (url) {
          const res = await fetch(url);
          if (res.ok) await appendPdfBytes(await res.arrayBuffer());
        }
      } catch (e) { console.warn(`Skipping spec sheet for ${entry.brand} ${entry.model}:`, e); }
    }
    if (merger.getPageCount() === 0) { alert("No PDF content to export. Upload a cover page or spec sheets first."); return; }
    const mergedBytes = await merger.save();
    const blob = new Blob([mergedBytes], { type: "application/pdf" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `OEM_Manual_${(selectedProject?.name || "Project").replace(/\s+/g,"_").substring(0,40)}_${new Date().toISOString().split("T")[0]}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleProposalFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { proposalId, rows, isChangeOrder } = parseProposalCSV(ev.target.result);
        if (!rows.length) {
          // Show the actual header row so we can diagnose column layout issues
          const raw = ev.target.result.replace(/^\uFEFF/, "");
          const firstLines = raw.split(/\r?\n/).filter(l => l.trim()).slice(0, 3);
          const headerRow  = firstLines[0] ? parseCSVLine(firstLines[0]).map((v, i) => `${String.fromCharCode(65+i)}: ${v}`).join("\n") : "(empty)";
          const sampleData = firstLines[1] ? parseCSVLine(firstLines[1]).slice(0, 8).join(" | ") : "(none)";
          alert(`No hardware rows found in this CSV.\n\nColumn layout detected:\n${headerRow}\n\nFirst data row (A–H):\n${sampleData}\n\nParser looks for a column named ItemType with values: Part, Parts, Hardware, Product, Equipment.\nPaste this output in the chat to get the column mapping fixed.`);
          return;
        }
        setImportPreview({ proposalId, rows, isChangeOrder, overrideCats: {} });
      } catch (err) {
        alert("Error parsing CSV: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const handleProposalImport = () => {
    if (!importPreview) return;
    const { rows, overrideCats, isChangeOrder } = importPreview;
    // Only import one-time (non-recurring) hardware items
    const hardwareRows = rows.filter(r => !r.recurring);
    const newGroups = buildGroupsFromRows(hardwareRows, overrideCats);
    setCameraGroups(g => [...g, ...newGroups.cameraGroups]);
    setSwitchGroups(g => [...g, ...newGroups.switchGroups]);
    setServerGroups(g => [...g, ...newGroups.serverGroups]);
    setDoorGroups(g => [...g, ...newGroups.doorGroups]);
    setZoneGroups(g => [...g, ...newGroups.zoneGroups]);
    setSpeakerGroups(g => [...g, ...newGroups.speakerGroups]);
    setImportPreview(null);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 3000);
    const importedCount = hardwareRows.filter((r, i) => (overrideCats[i] || r.category) !== "unknown").length;
    const recurringCount = rows.filter(r => r.recurring).length;
    addLog("import", `${isChangeOrder ? "Change Order" : "Proposal"} #${importPreview.proposalId} — ${importedCount} hardware groups imported${recurringCount ? `, ${recurringCount} MRR items skipped` : ""}`);
  };
  const PROC_STATUSES = [
    { value: "not_ordered", label: "Not Ordered", color: C.muted,    bg: "#F1F5F9" },
    { value: "ordered",     label: "Ordered",     color: C.accent,   bg: "#E0F2FE" },
    { value: "in_transit",  label: "In Transit",  color: C.gold,     bg: "#FEF3C7" },
    { value: "received",    label: "Received",    color: "#059669",  bg: "#D1FAE5" },
    { value: "in_house",    label: "In House",    color: C.success,  bg: "#ECFDF5" },
  ];
  const procStatusMeta = Object.fromEntries(PROC_STATUSES.map(s => [s.value, s]));
  const allGroupsForProc = [
    ...(cameraGroups.map(g  => ({ ...g, _cat: "camera",  _icon: "📷", _label: "CCTV",     _setter: setCameraGroups  }))),
    ...(switchGroups.map(g  => ({ ...g, _cat: "switch",  _icon: "🔀", _label: "Switch",    _setter: setSwitchGroups  }))),
    ...(serverGroups.map(g  => ({ ...g, _cat: "server",  _icon: "🖥", _label: "Server",    _setter: setServerGroups  }))),
    ...(doorGroups.map(g    => ({ ...g, _cat: "door",    _icon: "🚪", _label: "Access",    _setter: setDoorGroups    }))),
    ...(zoneGroups.map(g    => ({ ...g, _cat: "zone",    _icon: "🔔", _label: "Intrusion", _setter: setZoneGroups    }))),
    ...(speakerGroups.map(g => ({ ...g, _cat: "speaker", _icon: "🔊", _label: "Audio",     _setter: setSpeakerGroups }))),
  ];
  const TABS = [
    // ── Exec overview ─────────────────────────────────────────────────────────
    { id: "info",        label: "Project Info",  icon: "📋" },
    { id: "dashboard",   label: "Dashboard",     icon: "📊" },
    { id: "labor",       label: "Labor",         icon: "⏱" },
    { id: "procurement", label: "Procurement",   icon: "📦" },
    // ── Hardware (alphabetical) ────────────────────────────────────────────────
    { id: "access",    label: "Access",        icon: "🚪", count: doorCount },
    { id: "audio",     label: "Audio",         icon: "🔊", count: spkCount },
    { id: "cameras",   label: "CCTV",          icon: "📷", count: camCount },
    { id: "intrusion", label: "Intrusion",     icon: "🔔", count: zoneCount },
    { id: "servers",   label: "Server / NVR",  icon: "🖥", count: srvCount },
    { id: "switches",  label: "Switching",     icon: "🔀", count: swCount },
    // ── Resources ─────────────────────────────────────────────────────────────
    { id: "files",     label: "Project Files", icon: "📁" },
    { id: "library",   label: "Device Library",icon: "📚" },
    { id: "export",    label: "Reports",        icon: "📊" },
  ];
  // ─ PROJECT SELECT ─────────────────────────────────────────────────────────
  if (phase === "select") {
    const inp2St = { width: "100%", padding: "10px 14px", borderRadius: 6, border: `1px solid rgba(255,255,255,0.15)`, background: "rgba(255,255,255,0.07)", color: C.white, fontSize: 13, outline: "none", boxSizing: "border-box" };
    const saveToken = () => {
      const t = tokenDraft.trim();
      if (!t) return;
      localStorage.setItem("mondayToken", t);
      setMondayToken(t);
      setTokenDraft("");
    };
    return (
      <div style={{ minHeight: "100vh", background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 720, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 22, letterSpacing: "0.02em" }}>PROGRAMMING & CONFIG WORK ORDER</div>
            <div style={{ color: C.accent, fontSize: 13, marginTop: 4, letterSpacing: "0.06em" }}>Select an active project from monday.com</div>
          </div>

          {/* Token setup */}
          {!mondayToken && (
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ color: C.gold, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Connect to monday.com</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
                Enter your monday.com API token to load active projects automatically.<br />
                Find it at: <span style={{ color: C.accent }}>monday.com → Avatar → Developers → API v2 Token</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={tokenDraft} onChange={e => setTokenDraft(e.target.value)}
                  placeholder="eyJhbGc..." type="password"
                  onKeyDown={e => e.key === "Enter" && saveToken()}
                  style={{ ...inp2St, flex: 1 }} />
                <button onClick={saveToken} style={{ background: C.accent, color: C.white, border: "none", borderRadius: 6, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Connect
                </button>
              </div>
            </div>
          )}

          {/* Refresh token + column mapper */}
          {mondayToken && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 8, alignItems: "center" }}>
                <button onClick={() => setPhase("master")}
                  style={{ background: C.accent, color: C.white, border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  📊 Master Dashboard
                </button>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: C.success, fontSize: 11, fontWeight: 600 }}>✓ Connected to monday.com</span>
                  <button onClick={() => setColMapperOpen(v => !v)}
                    style={{ background: "rgba(255,255,255,0.07)", color: C.accent, border: `1px solid rgba(0,174,239,0.3)`, borderRadius: 5, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>
                    ⚙ Column Map
                  </button>
                  <button onClick={() => { localStorage.removeItem("mondayToken"); setMondayToken(""); setProjects([]); }}
                    style={{ background: "rgba(255,255,255,0.07)", color: C.muted, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 5, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>
                    Change Token
                  </button>
                </div>
              </div>

              {/* ── Column Mapper Panel ── */}
              {colMapperOpen && (
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, border: `1px solid rgba(0,174,239,0.2)`, padding: 16, marginBottom: 16 }}>
                  <div style={{ color: C.white, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>⚙ Monday.com Column Mapping</div>
                  <div style={{ color: C.muted, fontSize: 11, marginBottom: 12 }}>
                    Map your board columns to app fields so project info auto-fills when you select a project.
                    Click <strong style={{ color: C.accent }}>Load Columns</strong> to see all column IDs from your board.
                  </div>
                  <button
                    onClick={async () => {
                      setColMapperLoading(true);
                      try {
                        const cols = await fetchBoardColumns(mondayToken);
                        setColMapperCols(cols);
                        setColMapDraft({ ...colMap });
                      } catch(e) { alert("Error: " + e.message); }
                      setColMapperLoading(false);
                    }}
                    style={{ background: C.accent, color: C.white, border: "none", borderRadius: 5, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
                    {colMapperLoading ? "Loading…" : "Load Columns from Board"}
                  </button>
                  {colMapperCols.length > 0 && (
                    <>
                      <div style={{ overflowX: "auto", marginBottom: 12 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
                              <th style={{ padding: "5px 8px", textAlign: "left", color: C.muted }}>Column Title</th>
                              <th style={{ padding: "5px 8px", textAlign: "left", color: C.muted }}>Column ID</th>
                              <th style={{ padding: "5px 8px", textAlign: "left", color: C.muted }}>Sample Value</th>
                              <th style={{ padding: "5px 8px", textAlign: "left", color: C.muted }}>Map to App Field</th>
                            </tr>
                          </thead>
                          <tbody>
                            {colMapperCols.map(col => (
                              <tr key={col.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                                <td style={{ padding: "5px 8px", color: C.white, fontWeight: 600 }}>{col.title}</td>
                                <td style={{ padding: "5px 8px", color: C.accent, fontFamily: "monospace", fontSize: 10 }}>{col.id}</td>
                                <td style={{ padding: "5px 8px", color: C.muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.sample || "—"}</td>
                                <td style={{ padding: "5px 8px" }}>
                                  <select
                                    value={Object.entries(colMapDraft).find(([, v]) => v === col.id)?.[0] || ""}
                                    onChange={e => {
                                      const field = e.target.value;
                                      setColMapDraft(d => {
                                        const next = { ...d };
                                        // Clear any other mapping that used this col
                                        Object.keys(next).forEach(k => { if (next[k] === col.id) next[k] = ""; });
                                        if (field) next[field] = col.id;
                                        return next;
                                      });
                                    }}
                                    style={{ background: "rgba(255,255,255,0.07)", color: C.white, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 4, padding: "3px 6px", fontSize: 11 }}>
                                    <option value="">— none —</option>
                                    <option value="customer">Customer Name</option>
                                    <option value="siteAddress">Site Address</option>
                                    <option value="pm">Project Manager</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => {
                            const next = colMapDraft;
                            setColMap(next);
                            localStorage.setItem("mondayColMap", JSON.stringify(next));
                            setColMapperOpen(false);
                            // Re-fetch projects with new mapping
                            setLoadingProjects(true);
                            fetchProjects(mondayToken, next)
                              .then(ps => { setProjects(ps); setLoadingProjects(false); })
                              .catch(() => setLoadingProjects(false));
                          }}
                          style={{ background: C.success, color: C.white, border: "none", borderRadius: 5, padding: "6px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          ✓ Save Mapping
                        </button>
                        <button onClick={() => setColMapperOpen(false)}
                          style={{ background: "rgba(255,255,255,0.07)", color: C.muted, border: "none", borderRadius: 5, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {loadingProjects ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <div>Loading projects from monday.com...</div>
            </div>
          ) : projectsError ? (
            <div style={{ background: "#3B0F0F", borderRadius: 8, padding: 16, color: "#FCA5A5", fontSize: 13, marginBottom: 16 }}>
              Error: {projectsError}. Check your API token and board ID.
            </div>
          ) : projects.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projects.map(p => (
                <div key={p.id} onClick={async () => {
                    setSelectedProject(p);
                    try {
                      const saved = await loadWorkOrder(p.id);
                      if (saved?.state) {
                        const s = saved.state;
                        // Load saved state but back-fill any Monday fields that are now mapped
                        const mergedInfo = {
                          customer:    p.customer    || "",
                          siteAddress: p.siteAddress || "",
                          techLead:    p.techLead    || "",
                          ...(s.info || {}),
                          // If Monday now has a value and the saved field is blank, use Monday's
                          ...(p.customer    && !(s.info?.customer)    ? { customer:    p.customer }    : {}),
                          ...(p.siteAddress && !(s.info?.siteAddress) ? { siteAddress: p.siteAddress } : {}),
                          ...(p.techLead    && !(s.info?.techLead)    ? { techLead:    p.techLead }    : {}),
                        };
                        setInfo(mergedInfo);
                        if (s.nvrInfo)       setNVR(s.nvrInfo);
                        if (s.panelInfo)     setPanel(s.panelInfo);
                        if (s.cameraGroups)  setCameraGroups(s.cameraGroups);
                        if (s.switchGroups)  setSwitchGroups(s.switchGroups);
                        if (s.serverGroups)  setServerGroups(s.serverGroups);
                        if (s.doorGroups)    setDoorGroups(s.doorGroups);
                        if (s.zoneGroups)    setZoneGroups(s.zoneGroups);
                        if (s.speakerGroups) setSpeakerGroups(s.speakerGroups);
                        if (s.laborBudget)   setLaborBudget(s.laborBudget);
                        if (s.laborActual)   setLaborActual(s.laborActual);
                        if (s.specSheetUrls) setSpecSheetUrls(s.specSheetUrls);
                        if (s.changeLog)     setChangeLog(s.changeLog);
                      } else {
                        // New project — pre-fill from Monday.com
                        setInfo(s => ({
                          ...s,
                          customer:    p.customer    || s.customer,
                          siteAddress: p.siteAddress || s.siteAddress,
                          techLead:    p.techLead    || s.techLead,
                        }));
                      }
                    } catch (e) { console.warn("Could not load saved work order:", e); }
                    setPhase("build");
                  }}
                  style={{ background: selectedProject?.id === p.id ? C.accent : "rgba(255,255,255,0.05)", border: `1px solid ${selectedProject?.id === p.id ? C.accent : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "14px 18px", cursor: "pointer", transition: "background .15s" }}>
                  <div style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>ID: {p.projectId}  |  Lead: {p.techLead}  |  Status: {p.programmingStatus}</div>
                  {(p.customer || p.siteAddress || p.pm) && (
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 2 }}>
                      {[p.customer, p.siteAddress, p.pm ? `PM: ${p.pm}` : ""].filter(Boolean).join("  ·  ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : mondayToken ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 24, fontSize: 13 }}>No projects found on board {MONDAY_BOARD_ID}.</div>
          ) : null}

          {/* Manual fallback */}
          <div style={{ marginTop: 20 }}>
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 11, marginBottom: 12 }}>— or enter manually —</div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 16 }}>
              {[["Project Name","name"],["Project ID","projectId"]].map(([lbl, k]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>{lbl}</label>
                  <input value={selectedProject?.[k] || ""} onChange={e => setSelectedProject(s => ({ ...(s || {}), [k]: e.target.value }))}
                    style={inp2St} />
                </div>
              ))}
            </div>
            <button onClick={() => setPhase("build")} style={{ width: "100%", marginTop: 12, background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }
  // ─ MASTER DASHBOARD ───────────────────────────────────────────────────────
  if (phase === "master") {
    return <MasterDashboard onBack={() => setPhase("select")} laborTypes={LABOR_TYPES} />;
  }
  // ─ BUILD PHASE ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Topbar */}
      <div style={{ background: C.navy, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 18px", height: 48 }}>
          <button onClick={async () => {
            await flushSave(selectedProject);
            setPhase("select");
            setInfo({ customer: "", siteAddress: "", techLead: "", techs: "", date: new Date().toISOString().split("T")[0], submittedBy: "" });
            setNVR({ nvrBrand: "", nvrModel: "", nvrIp: "", nvrSerial: "", nvrFirmware: "", nvrStorage: "", nvrRetention: "", vmsSoftware: "" });
            setPanel({ panelBrand: "", panelModel: "", panelSerial: "", panelFirmware: "" });
            setCameraGroups([]); setSwitchGroups([]); setServerGroups([]);
            setDoorGroups([]); setZoneGroups([]); setSpeakerGroups([]);
            setLaborBudget(emptyLabor()); setLaborActual(emptyLabor());
            setCollapsed({}); setDashCollapsed({}); setSaveStatus("idle"); setSpecSheetUrls({}); setCoverPageFile(null); setLibUploadForm(null); setChangeLog([]);
          }} style={{ background: "rgba(255,255,255,0.1)", color: C.white, border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>← Back</button>
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
            <button onClick={() => setTab("export")}
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
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 16px" }}>

        {/* ─ INFO ─ */}
        {tab === "info" && (
          <div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20 }}>
              <CardHead icon="📋" title="Job & Project Details" color={C.navy} />
              <div style={{ padding: 18 }}>
                <G cols={3}>
                  <F label="Customer"><Inp value={info.customer} onChange={e => setI("customer", e.target.value)} placeholder="Customer / Client name" /></F>
                  <F label="Site Address" span={2}><Inp value={info.siteAddress} onChange={e => setI("siteAddress", e.target.value)} placeholder="Full site address" /></F>
                  <F label="Tech Lead"><Inp value={info.techLead} onChange={e => setI("techLead", e.target.value)} /></F>
                  <F label="Tech(s) On-Site"><Inp value={info.techs} onChange={e => setI("techs", e.target.value)} placeholder="e.g. Brendan, Jake" /></F>
                  <F label="Date"><Inp type="date" value={info.date} onChange={e => setI("date", e.target.value)} /></F>
                  <F label="Submitted By"><Inp value={info.submittedBy} onChange={e => setI("submittedBy", e.target.value)} /></F>
                </G>
              </div>
            </div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20 }}>
              <CardHead icon="🖥" title="VMS / Recorder Details" color={C.steel} />
              <div style={{ padding: 18 }}>
                <G cols={4}>
                  {[["NVR/DVR Brand","nvrBrand","e.g. Hikvision"],["Model","nvrModel","DS-9632NI"],["IP Address","nvrIp","192.168.x.x"],["Serial Number","nvrSerial",""],["Firmware","nvrFirmware",""],["Storage","nvrStorage","e.g. 4x4TB"],["Retention","nvrRetention","e.g. 30 days"],["VMS Software","vmsSoftware","e.g. iVMS-4200"]].map(([lbl, k, ph]) => (
                    <F key={k} label={lbl}><Inp value={nvrInfo[k]} onChange={e => setNV(k, e.target.value)} placeholder={ph} /></F>
                  ))}
                </G>
              </div>
            </div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <CardHead icon="🔔" title="Intrusion Panel Details" color={C.steel} />
              <div style={{ padding: 18 }}>
                <G cols={4}>
                  <F label="Panel Brand">
                    <Sel value={panelInfo.panelBrand} onChange={e => setPan("panelBrand", e.target.value)}>
                      <option value="">Select...</option>
                      {PANEL_DB.map(b => <option key={b.brand}>{b.brand}</option>)}
                      <option>Other</option>
                    </Sel>
                  </F>
                  <F label="Model">
                    {(() => {
                      const entry = PANEL_DB.find(b => b.brand === panelInfo.panelBrand);
                      return entry ? (
                        <Sel value={panelInfo.panelModel} onChange={e => setPan("panelModel", e.target.value)}>
                          <option value="">Select model...</option>
                          {entry.models.map(m => <option key={m.model} value={m.model}>{m.name} ({m.model})</option>)}
                        </Sel>
                      ) : (
                        <Inp value={panelInfo.panelModel} onChange={e => setPan("panelModel", e.target.value)} />
                      );
                    })()}
                  </F>
                  {[["Serial #","panelSerial"],["Firmware","panelFirmware"]].map(([lbl, k]) => (
                    <F key={k} label={lbl}><Inp value={panelInfo[k]} onChange={e => setPan(k, e.target.value)} /></F>
                  ))}
                </G>
              </div>
            </div>
          </div>
        )}

        {/* ─ SERVERS ─ */}
        {tab === "servers" && (
          <div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <CardHead icon="🖥" title="Servers & Computing" count={srvCount} onAdd={() => { setServerGroups(g => [...g, mkSrvGrp()]); addLog("group_added", "Server group added"); }} addLabel="Add Server Group" color={C.navy} />
              <div style={{ padding: 18 }}>
                {serverGroups.length === 0 && <Empty icon="🖥" msg="No server groups yet. Click + Add Server Group." />}
                {serverGroups.map((grp, gi) => (
                  <GroupCard key={grp.id} icon="🖥"
                    title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
                    idx={gi} devCount={grp.devices.length}
                    collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
                    onRemove={() => remGrp(setServerGroups, grp.id)}>
                    <ModelSelector db={SERVER_DB} brand={grp.brand} model={grp.model}
                      onBrand={v => updGrp(setServerGroups, grp.id, "brand", v)}
                      onModel={v => updGrp(setServerGroups, grp.id, "model", v)}
                      onApply={obj => setServerGroups(gs => gs.map(g => g.id === grp.id ? { ...g, os: obj.os || g.os } : g))} />
                    <SectionLabel text="Group Settings" />
                    <G cols={3}>
                      <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setServerGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. VMS Servers" /></F>
                      <F label="Role">
                        <Sel value={grp.role} onChange={e => updGrp(setServerGroups, grp.id, "role", e.target.value)}>
                          {SERVER_ROLES.map(r => <option key={r}>{r}</option>)}
                        </Sel>
                      </F>
                      <F label="OS / Platform"><Inp value={grp.os} onChange={e => updGrp(setServerGroups, grp.id, "os", e.target.value)} placeholder="e.g. Windows Server 2022" /></F>
                      <F label="Storage Config"><Inp value={grp.storage} onChange={e => updGrp(setServerGroups, grp.id, "storage", e.target.value)} placeholder="e.g. RAID 5 / 8TB" /></F>
                    </G>
                    <GenerateBar group={grp} setter={setServerGroups} genFn={genSrv} />
                    <DevTable gid={grp.id} setter={setServerGroups} devices={grp.devices} newDevFn={(i) => mkSrvDev("", i || grp.devices.length)}
                      onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Server)`)}
                      onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Server)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Server)`); }}
                      cols={[
                        { key: "name", label: "Server Name", ph: "e.g. VMS-01" },
                        { key: "location", label: "Location", ph: "e.g. Server Room" },
                        { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-201" },
                        { key: "ip", label: "IP Address", ph: "192.168.x.x" },
                        { key: "mac", label: "MAC", ph: "AA:BB:CC..." },
                        { key: "serial", label: "Serial #", ph: "" },
                        { key: "notes", label: "Notes", ph: "" },
                      ]} />
                  </GroupCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─ SWITCHES ─ */}
        {tab === "switches" && (
          <div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <CardHead icon="🔀" title="Network Switching" count={swCount} onAdd={() => { setSwitchGroups(g => [...g, mkSwGrp()]); addLog("group_added", "Switch group added"); }} addLabel="Add Switch Group" color={C.navy} />
              <div style={{ padding: 18 }}>
                {switchGroups.length === 0 && <Empty icon="🔀" msg="No switch groups yet. Click + Add Switch Group." />}
                {switchGroups.map((grp, gi) => (
                  <GroupCard key={grp.id} icon="🔀"
                    title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
                    idx={gi} devCount={grp.devices.length}
                    collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
                    onRemove={() => remGrp(setSwitchGroups, grp.id)}>
                    <ModelSelector db={SWITCH_DB} brand={grp.brand} model={grp.model}
                      onBrand={v => updGrp(setSwitchGroups, grp.id, "brand", v)}
                      onModel={v => updGrp(setSwitchGroups, grp.id, "model", v)}
                      onApply={obj => setServerGroups(gs => gs)} />
                    <SectionLabel text="Group Settings" />
                    <G cols={3}>
                      <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setSwitchGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. CCTV Switches" /></F>
                      <F label="VLAN Config"><Inp value={grp.vlan} onChange={e => updGrp(setSwitchGroups, grp.id, "vlan", e.target.value)} placeholder="e.g. VLAN 10 CCTV, 20 AC" /></F>
                      <F label="Uplink Port / Speed"><Inp value={grp.uplink} onChange={e => updGrp(setSwitchGroups, grp.id, "uplink", e.target.value)} placeholder="e.g. G1 1Gbps to core" /></F>
                    </G>
                    <GenerateBar group={grp} setter={setSwitchGroups} genFn={genSw} />
                    <DevTable gid={grp.id} setter={setSwitchGroups} devices={grp.devices} newDevFn={(i) => mkSwDev("", i || grp.devices.length)}
                      onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Switch)`)}
                      onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Switch)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Switch)`); }}
                      cols={[
                        { key: "name", label: "Switch Name", ph: "e.g. CCTV-SW-01" },
                        { key: "location", label: "Location", ph: "e.g. IDF Room B" },
                        { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-301" },
                        { key: "ip", label: "IP Address", ph: "192.168.x.x" },
                        { key: "mac", label: "MAC", ph: "AA:BB:CC..." },
                        { key: "serial", label: "Serial #", ph: "" },
                        { key: "ports", label: "Port Count", ph: "24" },
                        { key: "notes", label: "Notes", ph: "" },
                      ]} />
                  </GroupCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─ CAMERAS ─ */}
        {tab === "cameras" && (
          <div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <CardHead icon="📷" title="CCTV Camera Programming" count={camCount} onAdd={() => { setCameraGroups(g => [...g, mkCamGroup()]); addLog("group_added", "Camera group added"); }} addLabel="Add Camera Group" color={C.navy} />
              <div style={{ padding: 18 }}>
                {cameraGroups.length === 0 && <Empty icon="📷" msg="No camera groups yet. Click + Add Camera Group to get started." />}
                {cameraGroups.map((grp, gi) => {
                  const grpTitle = grp.groupLabel || (grp.brand ? `${grp.brand}${grp.model ? " — " + grp.model : ""}` : null);
                  return (
                    <GroupCard key={grp.id} icon="📷"
                      title={grpTitle} idx={gi} devCount={grp.devices.length}
                      collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
                      onRemove={() => remGrp(setCameraGroups, grp.id)}>
                      <SectionLabel text="Model" />
                      <ModelSelector db={CAM_DB} brand={grp.brand} model={grp.model}
                        onBrand={v => updGrp(setCameraGroups, grp.id, "brand", v)}
                        onModel={v => updGrp(setCameraGroups, grp.id, "model", v)}
                        onApply={obj => setCameraGroups(gs => gs.map(g => g.id === grp.id ? {
                          ...g,
                          codec: obj.codec || g.codec,
                          resolution: obj.resolution || g.resolution,
                          lens: obj.lens || g.lens,
                          type: obj.type || g.type,
                          fps: obj.fps || g.fps,
                          bitrate: obj.bitrate || g.bitrate,
                          port: obj.port || g.port,
                          rtspPort: obj.rtspPort || g.rtspPort,
                          ptz: obj.ptz !== undefined ? obj.ptz : g.ptz,
                        } : g))}
                      />
                      <SectionLabel text="Shared Settings (applied to all cameras in this group)" />
                      <G cols={4}>
                        <F label="Codec"><Sel value={grp.codec} onChange={e => updGrp(setCameraGroups, grp.id, "codec", e.target.value)}>{["H.264","H.265","H.265+","MJPEG"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                        <F label="Resolution"><Sel value={grp.resolution} onChange={e => updGrp(setCameraGroups, grp.id, "resolution", e.target.value)}>{["1MP (720p)","2MP (1080p)","4MP","5MP","6MP","8MP (4K)","12MP"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                        <F label="Lens"><Sel value={grp.lens} onChange={e => updGrp(setCameraGroups, grp.id, "lens", e.target.value)}>{["2.8mm","4mm","6mm","8mm","2.8–12mm VF","Motorized VF","Other"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                        <F label="Camera Type"><Sel value={grp.type} onChange={e => updGrp(setCameraGroups, grp.id, "type", e.target.value)}>{["Indoor Dome","Outdoor Dome","Bullet","PTZ","Fisheye","Multi-Sensor","Box"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                        <F label="HTTP Port"><Inp value={grp.port} onChange={e => updGrp(setCameraGroups, grp.id, "port", e.target.value)} placeholder="80" /></F>
                        <F label="RTSP Port"><Inp value={grp.rtspPort} onChange={e => updGrp(setCameraGroups, grp.id, "rtspPort", e.target.value)} placeholder="554" /></F>
                        <F label="FPS"><Inp value={grp.fps} onChange={e => updGrp(setCameraGroups, grp.id, "fps", e.target.value)} placeholder="15" /></F>
                        <F label="Bitrate (kbps)"><Inp value={grp.bitrate} onChange={e => updGrp(setCameraGroups, grp.id, "bitrate", e.target.value)} placeholder="e.g. 4096" /></F>
                        <F label="Username"><Inp value={grp.username} onChange={e => updGrp(setCameraGroups, grp.id, "username", e.target.value)} /></F>
                        <F label="Password"><Inp value={grp.password} onChange={e => updGrp(setCameraGroups, grp.id, "password", e.target.value)} /></F>
                        <F label="Storage Group"><Inp value={grp.storageGroup} onChange={e => updGrp(setCameraGroups, grp.id, "storageGroup", e.target.value)} /></F>
                        <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setCameraGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. Perimeter Cameras" /></F>
                        <F label="PTZ"><div style={{ paddingTop: 6 }}><Tog label="PTZ Enabled" val={grp.ptz} set={v => updGrp(setCameraGroups, grp.id, "ptz", v)} /></div></F>
                      </G>
                      <GenerateBar group={grp} setter={setCameraGroups} genFn={genCam} />
                      <DevTable gid={grp.id} setter={setCameraGroups} devices={grp.devices} newDevFn={(i) => mkCamDev("", i || grp.devices.length)}
                        onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Camera)`)}
                        onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Camera)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Camera)`); }}
                        cols={[
                          { key: "name", label: "Camera Name", ph: "e.g. NE Entry" },
                          { key: "location", label: "Location", ph: "e.g. NE Corner Lobby" },
                          { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-101" },
                          { key: "ip", label: "IP Address", ph: "192.168.x.x" },
                          { key: "mac", label: "MAC Address", ph: "AA:BB:CC..." },
                          { key: "serial", label: "Serial #", ph: "" },
                          { key: "notes", label: "Notes", ph: "" },
                        ]} />
                    </GroupCard>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─ ACCESS ─ */}
        {tab === "access" && (
          <div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <CardHead icon="🚪" title="Access Control Door Programming" count={doorCount} onAdd={() => { setDoorGroups(g => [...g, mkDoorGrp()]); addLog("group_added", "Access door group added"); }} addLabel="Add Door Group" color={C.navy} />
              <div style={{ padding: 18 }}>
                {doorGroups.length === 0 && <Empty icon="🚪" msg="No door groups yet. Click + Add Door Group." />}
                {doorGroups.map((grp, gi) => (
                  <GroupCard key={grp.id} icon="🚪"
                    title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
                    idx={gi} devCount={grp.devices.length}
                    collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
                    onRemove={() => remGrp(setDoorGroups, grp.id)}>
                    <ModelSelector db={ACCESS_DB} brand={grp.brand} model={grp.model}
                      onBrand={v => updGrp(setDoorGroups, grp.id, "brand", v)}
                      onModel={v => updGrp(setDoorGroups, grp.id, "model", v)}
                      onApply={obj => setDoorGroups(gs => gs.map(g => g.id === grp.id ? {
                        ...g,
                        readerType: obj.readerType || g.readerType,
                        credentialType: obj.credentialType || g.credentialType,
                      } : g))} />
                    <SectionLabel text="Shared Settings" />
                    <G cols={3}>
                      <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setDoorGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. Interior Doors" /></F>
                      <F label="Reader Type"><Sel value={grp.readerType} onChange={e => updGrp(setDoorGroups, grp.id, "readerType", e.target.value)}>{["Wiegand","OSDP","RS-485","Bluetooth","Biometric","Keypad","Multi-Tech"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                      <F label="Credential Type"><Sel value={grp.credentialType} onChange={e => updGrp(setDoorGroups, grp.id, "credentialType", e.target.value)}>{["Prox Card","Smart Card","Mobile","PIN","Biometric","Dual Auth"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                      <F label="Lock Type"><Sel value={grp.lockType} onChange={e => updGrp(setDoorGroups, grp.id, "lockType", e.target.value)}>{["Mag Lock","Electric Strike","Electronic Deadbolt","Other"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                      <F label="Card Format"><Inp value={grp.cardFormat} onChange={e => updGrp(setDoorGroups, grp.id, "cardFormat", e.target.value)} placeholder="e.g. 26-bit Wiegand" /></F>
                      <F label="Facility Code"><Inp value={grp.facilityCode} onChange={e => updGrp(setDoorGroups, grp.id, "facilityCode", e.target.value)} /></F>
                      <F label="Access Group"><Inp value={grp.accessGroup} onChange={e => updGrp(setDoorGroups, grp.id, "accessGroup", e.target.value)} /></F>
                      <F label="Schedule"><Inp value={grp.schedule} onChange={e => updGrp(setDoorGroups, grp.id, "schedule", e.target.value)} placeholder="e.g. 24/7 or M-F 7a-6p" /></F>
                    </G>
                    <GenerateBar group={grp} setter={setDoorGroups} genFn={genDoor} showIP={false} />
                    <DevTable gid={grp.id} setter={setDoorGroups} devices={grp.devices} newDevFn={(i) => mkDoorDev(i || grp.devices.length)}
                      onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Access)`)}
                      onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Access)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Access)`); }}
                      cols={[
                        { key: "name", label: "Door Name", ph: "e.g. Main Entry" },
                        { key: "location", label: "Location", ph: "e.g. Lobby" },
                        { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-401" },
                        { key: "controllerName", label: "Controller", ph: "" },
                        { key: "controllerIP", label: "Controller IP", ph: "192.168.x.x" },
                        { key: "controllerSerial", label: "Ctrl S/N", ph: "" },
                        { key: "readerSerial", label: "Reader S/N", ph: "" },
                        { key: "notes", label: "Notes", ph: "" },
                      ]} />
                  </GroupCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─ INTRUSION ─ */}
        {tab === "intrusion" && (
          <div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <CardHead icon="🔔" title="Intrusion Zone Programming" count={zoneCount} onAdd={() => { setZoneGroups(g => [...g, mkZoneGrp()]); addLog("group_added", "Intrusion zone group added"); }} addLabel="Add Zone Group" color={C.navy} />
              <div style={{ padding: 18 }}>
                {zoneGroups.length === 0 && <Empty icon="🔔" msg="No zone groups yet. Click + Add Zone Group." />}
                {zoneGroups.map((grp, gi) => (
                  <GroupCard key={grp.id} icon="🔔"
                    title={grp.groupLabel || `${grp.zoneType} Zones`}
                    idx={gi} devCount={grp.devices.length}
                    collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
                    onRemove={() => remGrp(setZoneGroups, grp.id)}>
                    <SectionLabel text="Group Settings" />
                    <G cols={4}>
                      <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setZoneGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. Perimeter PIRs" /></F>
                      <F label="Zone Type"><Sel value={grp.zoneType} onChange={e => updGrp(setZoneGroups, grp.id, "zoneType", e.target.value)}>{["Motion","Door Contact","Glass Break","Smoke","CO","Heat","Panic","Tamper"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                      <F label="Partitions"><Inp value={grp.partitions} onChange={e => updGrp(setZoneGroups, grp.id, "partitions", e.target.value)} placeholder="e.g. 1, 2" /></F>
                      <F label="Start Zone #"><Inp type="number" value={grp.startNumber} onChange={e => updGrp(setZoneGroups, grp.id, "startNumber", e.target.value)} placeholder="1" /></F>
                      <F label="Bypassable"><div style={{ paddingTop: 6 }}><Tog label="Bypassable" val={grp.bypassable} set={v => updGrp(setZoneGroups, grp.id, "bypassable", v)} /></div></F>
                    </G>
                    <GenerateBar group={grp} setter={setZoneGroups} genFn={genZone} showIP={false} />
                    <DevTable gid={grp.id} setter={setZoneGroups} devices={grp.devices} newDevFn={(i) => mkZoneDev(i || grp.devices.length, grp)}
                      onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Intrusion)`)}
                      onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Intrusion)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Intrusion)`); }}
                      cols={[
                        { key: "zoneNumber", label: "Zone #", ph: "01" },
                        { key: "name", label: "Zone Name", ph: "e.g. Back Door PIR" },
                        { key: "location", label: "Location", ph: "" },
                        { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-501" },
                        { key: "zoneType", label: "Type", ph: "" },
                        { key: "partitions", label: "Partitions", ph: "" },
                        { key: "notes", label: "Notes", ph: "EOL, wiring..." },
                      ]} />
                  </GroupCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─ AUDIO ─ */}
        {tab === "audio" && (
          <div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <CardHead icon="🔊" title="Audio Zone Programming" count={spkCount} onAdd={() => { setSpeakerGroups(g => [...g, mkSpkGrp()]); addLog("group_added", "Audio group added"); }} addLabel="Add Audio Group" color={C.navy} />
              <div style={{ padding: 18 }}>
                {speakerGroups.length === 0 && <Empty icon="🔊" msg="No audio groups yet. Click + Add Audio Group." />}
                {speakerGroups.map((grp, gi) => (
                  <GroupCard key={grp.id} icon="🔊"
                    title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
                    idx={gi} devCount={grp.devices.length}
                    collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
                    onRemove={() => remGrp(setSpeakerGroups, grp.id)}>
                    <SectionLabel text="Group Settings" />
                    <G cols={4}>
                      <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setSpeakerGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. Lobby PA" /></F>
                      <F label="Brand"><Inp value={grp.brand} onChange={e => updGrp(setSpeakerGroups, grp.id, "brand", e.target.value)} placeholder="e.g. Bogen" /></F>
                      <F label="Model"><Inp value={grp.model} onChange={e => updGrp(setSpeakerGroups, grp.id, "model", e.target.value)} placeholder="e.g. TB8008" /></F>
                      <F label="Zone Group"><Inp value={grp.zoneGroup} onChange={e => updGrp(setSpeakerGroups, grp.id, "zoneGroup", e.target.value)} /></F>
                      <F label="Amp Zone / Tap"><Inp value={grp.ampZone} onChange={e => updGrp(setSpeakerGroups, grp.id, "ampZone", e.target.value)} placeholder="e.g. Amp 1 Zone A" /></F>
                      <F label="Volume (%)"><Inp type="number" min="0" max="100" value={grp.volume} onChange={e => updGrp(setSpeakerGroups, grp.id, "volume", e.target.value)} /></F>
                    </G>
                    <GenerateBar group={grp} setter={setSpeakerGroups} genFn={genSpk} />
                    <DevTable gid={grp.id} setter={setSpeakerGroups} devices={grp.devices} newDevFn={(i) => mkSpkDev("", i || grp.devices.length)}
                      onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Audio)`)}
                      onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Audio)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Audio)`); }}
                      cols={[
                        { key: "name", label: "Speaker / Zone", ph: "e.g. Lobby 01" },
                        { key: "location", label: "Location", ph: "" },
                        { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-601" },
                        { key: "ip", label: "IP / Address", ph: "192.168.x.x" },
                        { key: "notes", label: "Notes", ph: "" },
                      ]} />
                  </GroupCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─ LABOR ─ */}
        {tab === "labor" && (() => {
          const parseCSV = (text) => {
            const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
            const budget = emptyLabor();
            lines.forEach(line => {
              const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
              const combined = cols.join(" ").toLowerCase();
              const qty = cols.map(c => parseFloat(c)).find(n => !isNaN(n) && n > 0);
              if (!qty) return;
              if (combined.includes("l1") || combined.includes("level 1") || (combined.includes("install") && combined.includes("1"))) budget.l1 = qty;
              else if (combined.includes("l2") || combined.includes("level 2") || (combined.includes("install") && combined.includes("2"))) budget.l2 = qty;
              else if (combined.includes("l3") || combined.includes("level 3") || (combined.includes("install") && combined.includes("3"))) budget.l3 = qty;
              else if (combined.includes("program")) budget.programming = qty;
              else if (combined.includes("travel")) budget.travel = qty;
              else if (combined.includes("super")) budget.super = qty;
              else if (combined.includes("manage") || combined.includes(" pm") || combined.includes("admin")) budget.pm = qty;
            });
            setLaborBudget(b => ({ ...b, ...Object.fromEntries(Object.entries(budget).filter(([,v]) => v !== "")) }));
          };
          const totalBudget = LABOR_TYPES.reduce((s, t) => s + (parseFloat(laborBudget[t.key]) || 0), 0);
          const totalActual = LABOR_TYPES.reduce((s, t) => s + (parseFloat(laborActual[t.key]) || 0), 0);
          const variance = totalActual - totalBudget;
          const inp = { padding: "6px 10px", borderRadius: 5, border: `1.5px solid ${C.border}`, fontSize: 13, width: 90, textAlign: "right", outline: "none", background: C.white, color: C.navy };
          return (
            <div style={{ maxWidth: 700 }}>
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ background: C.navy, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: C.white, fontWeight: 800, fontSize: 15 }}>⏱ Labor Hours</div>
                  <label style={{ background: C.accent, color: C.white, borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    📎 Import from CSV
                    <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={e => {
                      const f = e.target.files[0]; if (!f) return;
                      const r = new FileReader(); r.onload = ev => parseCSV(ev.target.result); r.readAsText(f);
                      e.target.value = "";
                    }} />
                  </label>
                </div>
                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 90px", gap: 0, padding: "8px 20px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                  {["Labor Type", "Budget (hrs)", "Actual (hrs)", "Variance"].map(h => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 700, color: C.steel, textAlign: h === "Labor Type" ? "left" : "right" }}>{h}</div>
                  ))}
                </div>
                {/* Rows */}
                {LABOR_TYPES.map((lt, i) => {
                  const b = parseFloat(laborBudget[lt.key]) || 0;
                  const a = parseFloat(laborActual[lt.key]) || 0;
                  const v = a - b;
                  return (
                    <div key={lt.key} style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 90px", gap: 0, padding: "8px 20px", background: i % 2 === 0 ? C.white : C.surface, alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 13, color: C.navy, fontWeight: 600 }}>{lt.label}</div>
                      <div style={{ textAlign: "right" }}>
                        <input style={inp} type="number" min="0" value={laborBudget[lt.key]} placeholder="0"
                          onChange={e => setLaborBudget(s => ({ ...s, [lt.key]: e.target.value }))} />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <input style={inp} type="number" min="0" value={laborActual[lt.key]} placeholder="0"
                          onChange={e => setLaborActual(s => ({ ...s, [lt.key]: e.target.value }))} />
                      </div>
                      <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: v > 0 ? C.danger : v < 0 ? C.success : C.muted }}>
                        {b === 0 && a === 0 ? "—" : (v > 0 ? `+${v}h` : v < 0 ? `${v}h` : "0h")}
                      </div>
                    </div>
                  );
                })}
                {/* Totals */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 90px", gap: 0, padding: "12px 20px", background: C.navy, alignItems: "center" }}>
                  <div style={{ color: C.white, fontWeight: 800, fontSize: 13 }}>TOTAL</div>
                  <div style={{ textAlign: "right", color: C.white, fontWeight: 800, fontSize: 14 }}>{totalBudget}h</div>
                  <div style={{ textAlign: "right", color: C.white, fontWeight: 800, fontSize: 14 }}>{totalActual}h</div>
                  <div style={{ textAlign: "right", fontWeight: 800, fontSize: 14, color: variance > 0 ? "#FCA5A5" : variance < 0 ? "#6EE7B7" : "rgba(255,255,255,0.5)" }}>
                    {variance === 0 ? "—" : (variance > 0 ? `+${variance}h` : `${variance}h`)}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, color: C.muted, fontSize: 11 }}>
                CSV format: one row per labor type, e.g. <code>Labor,Installation - L1,49</code> — the app matches keywords automatically.
              </div>
            </div>
          );
        })()}

        {/* ─ DASHBOARD ─ */}
        {tab === "dashboard" && (() => {
          const catSections = [
            { id: "cameras",  label: "CCTV / Cameras",    icon: "📷", devs: cameraGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "" }))) },
            { id: "access",   label: "Access Control",    icon: "🚪", devs: doorGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "" }))) },
            { id: "audio",    label: "Audio / Speakers",  icon: "🔊", devs: speakerGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "" }))) },
            { id: "intrusion",label: "Intrusion / Zones", icon: "🔔", devs: zoneGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || "" }))) },
            { id: "servers",  label: "Server / NVR",      icon: "🖥", devs: serverGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "" }))) },
            { id: "switches", label: "Switching",         icon: "🔀", devs: switchGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "" }))) },
          ].filter(c => c.devs.length > 0);
          const allDevs = catSections.flatMap(c => c.devs);
          const installedCount  = allDevs.filter(d => d.installed).length;
          const programmedCount = allDevs.filter(d => d.programmed).length;
          const instPct = allDevs.length ? Math.round((installedCount / allDevs.length) * 100) : 0;
          const pct     = allDevs.length ? Math.round((programmedCount / allDevs.length) * 100) : 0;
          const totalBudget = LABOR_TYPES.reduce((s, t) => s + (parseFloat(laborBudget[t.key]) || 0), 0);
          const totalActual = LABOR_TYPES.reduce((s, t) => s + (parseFloat(laborActual[t.key]) || 0), 0);

          const logTypeMeta = {
            programmed:   { label: "Programmed",   bg: "#D1FAE5", color: C.success },
            unprogrammed: { label: "Unprogrammed",  bg: "#FEE2E2", color: C.danger },
            group_added:  { label: "Group Added",   bg: "#DBEAFE", color: "#1D4ED8" },
            name_change:  { label: "Renamed",       bg: "#FEF9C3", color: "#92400E" },
            location_set: { label: "Location",      bg: "#E0F2FE", color: "#0369A1" },
            import:       { label: "Import",        bg: "#EDE9FE", color: "#6D28D9" },
          };

          return (
            <div>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Install %",  value: `${instPct}%`, sub: `${installedCount} / ${allDevs.length} devices`, color: instPct === 100 ? C.success : C.warn },
                  { label: "Program %",  value: `${pct}%`,     sub: `${programmedCount} / ${allDevs.length} devices`, color: pct === 100 ? C.success : C.accent },
                  { label: "Budget Hrs", value: `${totalBudget}h`, sub: "from proposal", color: C.navy },
                  { label: "Actual Hrs", value: `${totalActual}h`, sub: totalBudget ? `${totalActual - totalBudget > 0 ? "+" : ""}${totalActual - totalBudget}h variance` : "enter in Labor tab", color: totalActual > totalBudget ? C.danger : C.success },
                ].map(card => (
                  <div key={card.label} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16 }}>
                    <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{card.label}</div>
                    <div style={{ fontWeight: 800, fontSize: 24, color: card.color }}>{card.value}</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Progress bars */}
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Installation</div>
                  <div style={{ fontWeight: 800, color: instPct === 100 ? C.success : C.warn }}>{instPct}%</div>
                </div>
                <div style={{ background: C.bg, borderRadius: 999, height: 10, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", width: `${instPct}%`, background: instPct === 100 ? C.success : C.warn, borderRadius: 999, transition: "width .4s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Programming</div>
                  <div style={{ fontWeight: 800, color: pct === 100 ? C.success : C.accent }}>{pct}%</div>
                </div>
                <div style={{ background: C.bg, borderRadius: 999, height: 10, overflow: "hidden", marginTop: 4 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? C.success : C.accent, borderRadius: 999, transition: "width .4s" }} />
                </div>
              </div>

              {/* Collapsible category device sections */}
              {allDevs.length === 0 ? (
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", color: C.muted, marginBottom: 16 }}>
                  No devices added yet. Go to any category tab and add device groups.
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  {catSections.map(cat => {
                    const done = cat.devs.filter(d => d.programmed).length;
                    const cp = cat.devs.length ? Math.round((done / cat.devs.length) * 100) : 0;
                    const collapsed = dashCollapsed[cat.id];
                    return (
                      <div key={cat.id} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 8 }}>
                        {/* Section header — click to collapse */}
                        <div
                          onClick={() => setDashCollapsed(s => ({ ...s, [cat.id]: !s[cat.id] }))}
                          style={{ background: C.navy, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>{cat.icon} {cat.label}</span>
                            <span style={{ background: "rgba(255,255,255,0.15)", color: C.white, borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{cat.devs.length}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ color: cp === 100 ? C.success : "#FCD34D", fontWeight: 700, fontSize: 12 }}>{done}/{cat.devs.length} programmed</span>
                            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{collapsed ? "▶" : "▼"}</span>
                          </div>
                        </div>
                        {/* Device mini-progress bar */}
                        <div style={{ height: 3, background: C.bg }}>
                          <div style={{ height: "100%", width: `${cp}%`, background: cp === 100 ? C.success : C.accent, transition: "width .4s" }} />
                        </div>
                        {/* Device rows table */}
                        {!collapsed && (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: C.surface }}>
                                <th style={{ padding: "7px 12px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}`, width: 90 }}>Status</th>
                                <th style={{ padding: "7px 12px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>Device Name</th>
                                <th style={{ padding: "7px 12px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}`, width: 140 }}>Blueprint ID</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.devs.map((dev, i) => (
                                <tr key={dev.id} style={{ background: dev.programmed ? "#F0FDF4" : (i % 2 === 0 ? C.white : C.surface) }}>
                                  <td style={{ padding: "6px 12px" }}>
                                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: dev.programmed ? "#D1FAE5" : "#FEF3C7", color: dev.programmed ? C.success : C.warn }}>
                                      {dev.programmed ? "✓ Done" : "Pending"}
                                    </span>
                                  </td>
                                  <td style={{ padding: "6px 12px", fontWeight: 600, color: C.navy }}>
                                    {dev.name}
                                    {dev._grp && <span style={{ fontWeight: 400, color: C.muted, fontSize: 11, marginLeft: 6 }}>({dev._grp})</span>}
                                  </td>
                                  <td style={{ padding: "6px 12px", fontFamily: "monospace", color: C.steel, fontSize: 11 }}>{dev.cableId || <span style={{ color: C.border }}>—</span>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Change Log ────────────────────────────────────────── */}
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
                <div
                  onClick={() => setDashCollapsed(s => ({ ...s, _changelog: !s._changelog }))}
                  style={{ background: C.surface, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", borderBottom: `1px solid ${C.border}` }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>📋 Change Log <span style={{ fontWeight: 400, color: C.muted, fontSize: 11 }}>({changeLog.length} entries)</span></span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {changeLog.length > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); setChangeLog([]); }}
                        style={{ fontSize: 11, padding: "2px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, color: C.danger, cursor: "pointer", fontWeight: 600 }}
                      >Clear</button>
                    )}
                    <span style={{ color: C.muted, fontSize: 14 }}>{dashCollapsed._changelog ? "▶" : "▼"}</span>
                  </div>
                </div>
                {!dashCollapsed._changelog && (
                  changeLog.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 12 }}>No activity yet. Mark devices as programmed/installed to log changes.</div>
                  ) : (
                    <div style={{ maxHeight: 280, overflowY: "auto" }}>
                      {changeLog.map(entry => {
                        const meta = logTypeMeta[entry.type] || { label: entry.type, bg: C.surface, color: C.muted };
                        return (
                          <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                            <span style={{ color: C.muted, fontSize: 11, minWidth: 70, flexShrink: 0 }}>{new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <span style={{ background: meta.bg, color: meta.color, borderRadius: 8, padding: "1px 8px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{meta.label}</span>
                            <span style={{ color: C.navy }}>{entry.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* ── Send Update to AI Agent ───────────────────────────── */}
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div
                  onClick={() => setDashCollapsed(s => ({ ...s, _ai: !s._ai }))}
                  style={{ background: C.surface, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", borderBottom: `1px solid ${C.border}` }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>🤖 Send Update to AI Agent</span>
                  <span style={{ color: C.muted, fontSize: 14 }}>{dashCollapsed._ai ? "▶" : "▼"}</span>
                </div>
                {!dashCollapsed._ai && (
                  <div style={{ padding: 16 }}>
                    <div style={{ color: C.muted, fontSize: 11, marginBottom: 10 }}>
                      Posts the change log + device status counts to your AI agent's webhook. The agent handles Monday.com updates from there.
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <input
                        type="url"
                        placeholder="Webhook URL (https://...)"
                        value={webhookUrl}
                        onChange={e => { setWebhookUrl(e.target.value); localStorage.setItem("agentWebhookUrl", e.target.value); }}
                        style={{ flex: 1, padding: "8px 10px", borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "monospace" }}
                      />
                      <button
                        onClick={async () => {
                          if (!webhookUrl) { showToast("Enter a webhook URL first"); return; }
                          setAiLoading(true);
                          const payload = {
                            project_id:   selectedProject?.id   || null,
                            project_name: selectedProject?.name || info.projectName || null,
                            project_ref:  info.projectRef       || null,
                            sent_at:      new Date().toISOString(),
                            device_summary: catSections.map(c => ({
                              category:   c.label,
                              total:      c.devs.length,
                              programmed: c.devs.filter(d => d.programmed).length,
                              installed:  c.devs.filter(d => d.installed).length,
                              pending:    c.devs.filter(d => !d.programmed).length,
                            })),
                            totals: {
                              devices:    allDevs.length,
                              programmed: programmedCount,
                              installed:  installedCount,
                              program_pct: pct,
                              install_pct: instPct,
                            },
                            labor: {
                              budget_hrs: totalBudget,
                              actual_hrs: totalActual,
                              variance_hrs: totalActual - totalBudget,
                            },
                            change_log: changeLog.slice(0, 100).map(e => ({
                              time: e.ts,
                              type: e.type,
                              description: e.desc,
                            })),
                          };
                          try {
                            const res = await fetch(webhookUrl, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(payload),
                            });
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            showToast("✓ Update sent to AI agent");
                          } catch(e) {
                            showToast(`Webhook error: ${e.message}`);
                          }
                          setAiLoading(false);
                        }}
                        disabled={aiLoading}
                        style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: aiLoading ? C.muted : C.accent, color: C.white, fontWeight: 700, fontSize: 12, cursor: aiLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                      >{aiLoading ? "Sending…" : "Send Update"}</button>
                    </div>
                    <div style={{ background: C.surface, borderRadius: 7, border: `1px solid ${C.border}`, padding: "8px 12px", fontSize: 11, color: C.muted }}>
                      <strong style={{ color: C.navy }}>Payload includes:</strong> project ID &amp; name · device counts per category (total / programmed / installed / pending) · labor hours &amp; variance · last 100 change log entries
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ─ PROCUREMENT ─ */}
        {tab === "procurement" && (() => {
          const procCounts = PROC_STATUSES.map(s => ({
            ...s,
            count: allGroupsForProc.filter(g => (g.procurementStatus || "not_ordered") === s.value).length,
          }));
          const setGrpProc = (g, key, val) => updGrp(g._setter, g.id, key, val);
          return (
            <div>
              {/* Summary bar */}
              <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                {procCounts.map(s => (
                  <div key={s.value} style={{ background: s.bg, border: `1.5px solid ${s.color}33`, borderRadius: 10, padding: "10px 18px", minWidth: 100, textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.color, whiteSpace: "nowrap" }}>{s.label}</div>
                  </div>
                ))}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{allGroupsForProc.length} total groups across all categories</div>
                </div>
              </div>

              {/* Monday sync settings */}
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>📅 Monday.com Write-back</span>
                <Tog label="Auto-push status after save" val={mondaySyncEnabled} set={v => { setMondaySyncEnabled(v); localStorage.setItem("mondaySyncEnabled", v); }} />
                {mondaySyncEnabled && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Status Column ID:</label>
                      <input value={mondaySyncColId} onChange={e => { setMondaySyncColId(e.target.value); localStorage.setItem("mondaySyncColId", e.target.value); }}
                        placeholder="e.g. status or text_abc123"
                        style={{ padding: "4px 8px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 12, width: 180, color: C.navy, background: C.bg }} />
                    </div>
                    <span style={{ fontSize: 11, color: C.muted }}>Find column ID in ⚙ Column Map on the project select screen</span>
                  </>
                )}
              </div>

              {/* Group table */}
              {allGroupsForProc.length === 0 ? (
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", color: C.muted }}>
                  No device groups yet. Add groups under the CCTV, Access, etc. tabs then track them here.
                </div>
              ) : (
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                  <div style={{ background: C.navy, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>📦</span>
                    <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>Device Group Procurement Tracker</span>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginLeft: 4 }}>{allGroupsForProc.length} groups</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: C.surface }}>
                          {["Cat","Group / Model","Qty","Status","Vendor","PO #","ETA","Tracking #"].map(h => (
                            <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allGroupsForProc.map((g, i) => {
                          const status   = g.procurementStatus || "not_ordered";
                          const meta     = procStatusMeta[status] || procStatusMeta["not_ordered"];
                          const rowLabel = g.groupLabel || [g.brand, g.model].filter(Boolean).join(" ") || `${g._label} Group ${i + 1}`;
                          const qty      = g.devices.length || parseInt(g.quantity) || "—";
                          const inpSt    = { padding: "5px 8px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11, background: C.white, color: C.navy, outline: "none", width: "100%", boxSizing: "border-box" };
                          return (
                            <tr key={g.id} style={{ background: i % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                                <span style={{ fontSize: 15 }}>{g._icon}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginLeft: 4 }}>{g._label}</span>
                              </td>
                              <td style={{ padding: "8px 10px", fontWeight: 700, color: C.navy, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {rowLabel}
                              </td>
                              <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: C.navy }}>{qty}</td>
                              <td style={{ padding: "6px 8px", minWidth: 140 }}>
                                <select value={status}
                                  onChange={e => { setGrpProc(g, "procurementStatus", e.target.value); addLog("procurement", `"${rowLabel}" → ${procStatusMeta[e.target.value]?.label || e.target.value}`); }}
                                  style={{ padding: "4px 8px", borderRadius: 6, border: `1.5px solid ${meta.color}`, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                                  {PROC_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: "4px 6px", minWidth: 130 }}>
                                <input value={g.vendor || ""} onChange={e => setGrpProc(g, "vendor", e.target.value)} placeholder="e.g. Anixter" style={inpSt} />
                              </td>
                              <td style={{ padding: "4px 6px", minWidth: 110 }}>
                                <input value={g.poNumber || ""} onChange={e => setGrpProc(g, "poNumber", e.target.value)} placeholder="PO-00000" style={inpSt} />
                              </td>
                              <td style={{ padding: "4px 6px", minWidth: 120 }}>
                                <input type="date" value={g.eta || ""} onChange={e => setGrpProc(g, "eta", e.target.value)} style={{ ...inpSt, colorScheme: "light" }} />
                              </td>
                              <td style={{ padding: "4px 6px", minWidth: 140 }}>
                                <input value={g.trackingNumber || ""} onChange={e => setGrpProc(g, "trackingNumber", e.target.value)} placeholder="1Z…" style={inpSt} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─ PROJECT FILES ─ */}
        {tab === "files" && (() => {
          const FILE_CATS = ["Drawings", "Quotes", "Contracts", "Notes", "Photos", "Other"];
          const catIcon = { Drawings: "📐", Quotes: "💰", Contracts: "📝", Notes: "🗒", Photos: "🖼", Other: "📎" };
          const fmtSize = b => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : b > 1024 ? `${(b/1024).toFixed(0)} KB` : `${b} B`;
          const grouped = FILE_CATS.reduce((acc, cat) => ({ ...acc, [cat]: projectFiles.filter(f => f.category === cat) }), {});

          return (
            <div>
              {/* Upload bar */}
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>📁 Upload File</span>
                <select value={fileUploadCat} onChange={e => setFileUploadCat(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, color: C.navy, background: C.white }}>
                  {FILE_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ background: C.accent, color: C.white, border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  + Choose File
                </button>
                <input ref={fileInputRef} type="file" style={{ display: "none" }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file || !selectedProject) return;
                    e.target.value = "";
                    try {
                      await uploadProjectFile(selectedProject.id, fileUploadCat, file);
                      const rows = await listProjectFiles(selectedProject.id);
                      setProjectFiles(rows);
                      showToast(`✓ ${file.name} uploaded to ${fileUploadCat}`);
                    } catch(err) { showToast(`Upload failed: ${err.message}`); }
                  }} />
                <span style={{ color: C.muted, fontSize: 11 }}>Drawings · Quotes · Contracts · Notes · Photos · Portal.io CSVs</span>
              </div>

              {filesLoading ? (
                <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>Loading files…</div>
              ) : projectFiles.length === 0 ? (
                <div style={{ textAlign: "center", color: C.muted, padding: 40, fontSize: 13 }}>
                  No files yet. Upload drawings, quotes, contracts, or notes for this project.
                </div>
              ) : (
                FILE_CATS.map(cat => {
                  const files = grouped[cat];
                  if (!files.length) return null;
                  return (
                    <div key={cat} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 14 }}>
                      <div style={{ background: C.surface, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 15 }}>{catIcon[cat]}</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{cat}</span>
                        <span style={{ background: C.accent, color: C.white, borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{files.length}</span>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: C.surface }}>
                            <th style={{ padding: "6px 14px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700 }}>File Name</th>
                            <th style={{ padding: "6px 14px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, width: 80 }}>Size</th>
                            <th style={{ padding: "6px 14px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, width: 110 }}>Uploaded</th>
                            <th style={{ padding: "6px 14px", textAlign: "right", color: C.muted, fontSize: 11, fontWeight: 700, width: 110 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {files.map((f, i) => (
                            <tr key={f.id} style={{ background: i % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ padding: "8px 14px", color: C.navy, fontWeight: 600 }}>{f.file_name}</td>
                              <td style={{ padding: "8px 14px", color: C.muted }}>{f.file_size ? fmtSize(f.file_size) : "—"}</td>
                              <td style={{ padding: "8px 14px", color: C.muted }}>{new Date(f.created_at).toLocaleDateString()}</td>
                              <td style={{ padding: "8px 14px", textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <a href={getProjectFileUrl(f.file_path)} target="_blank" rel="noopener noreferrer"
                                  style={{ background: C.accent, color: C.white, borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                                  Open
                                </a>
                                <button onClick={async () => {
                                    if (!confirm(`Delete "${f.file_name}"?`)) return;
                                    try {
                                      await deleteProjectFile(f.id, f.file_path);
                                      setProjectFiles(p => p.filter(x => x.id !== f.id));
                                      showToast("File deleted");
                                    } catch(err) { showToast(`Delete failed: ${err.message}`); }
                                  }}
                                  style={{ background: "#FEE2E2", color: C.danger, border: "none", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })
              )}
            </div>
          );
        })()}

        {/* ─ DEVICE LIBRARY / OEM MANUAL ─ */}
        {tab === "library" && (() => {
          // Build category tree from library rows
          const CAT_META = {
            camera:  { label: "CCTV / Cameras",      icon: "📷" },
            door:    { label: "Access Control",       icon: "🚪" },
            zone:    { label: "Intrusion",            icon: "🔔" },
            speaker: { label: "Audio",                icon: "🔊" },
            switch:  { label: "Network Switching",    icon: "🔀" },
            server:  { label: "Server / NVR",         icon: "🖥" },
          };
          const CAT_ORDER = ["camera","door","zone","speaker","switch","server"];
          // Unique models on this project for matching
          const projectKeys = new Set(
            [...cameraGroups,...doorGroups,...zoneGroups,...speakerGroups,...switchGroups,...serverGroups]
              .map(g => `${g.brand}|${g.model}`.toLowerCase())
              .filter(k => k !== "|")
          );
          const hasProjectDevices = projectKeys.size > 0;
          const matchedRows = library.filter(e => projectKeys.has(`${e.brand}|${e.model}`.toLowerCase()));
          const matchCount  = matchedRows.length;
          // Only show matched entries unless admin toggled "show all"
          const visibleRows = (hasProjectDevices && !libShowAll) ? matchedRows : library;
          // Group visible rows: { category: { brand: [entries] } }
          const tree = {};
          for (const row of visibleRows) {
            if (!tree[row.category]) tree[row.category] = {};
            if (!tree[row.category][row.brand]) tree[row.category][row.brand] = [];
            tree[row.category][row.brand].push(row);
          }

          return (
            <div>
              {/* Upload form modal */}
              {libUploadForm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(7,20,42,0.78)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                  <div style={{ background: C.white, borderRadius: 12, maxWidth: 480, width: "100%", boxShadow: "0 8px 48px rgba(0,0,0,.4)" }}>
                    <div style={{ background: C.navy, borderRadius: "12px 12px 0 0", padding: "14px 18px", display: "flex", alignItems: "center" }}>
                      <span style={{ color: C.white, fontWeight: 800, fontSize: 14, flex: 1 }}>Add to Device Library</span>
                      <button onClick={() => setLibUploadForm(null)} style={{ background: "rgba(255,255,255,0.12)", color: C.white, border: "none", borderRadius: 5, padding: "3px 9px", cursor: "pointer" }}>✕</button>
                    </div>
                    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                      {[
                        ["Category", "category", "select", CAT_ORDER],
                        ["Brand",    "brand",     "text"],
                        ["Model #",  "model",     "text"],
                        ["Display Name (optional)", "displayName", "text"],
                      ].map(([lbl, key, type, opts]) => (
                        <div key={key}>
                          <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>{lbl}</label>
                          {type === "select" ? (
                            <select value={libUploadForm[key] || ""} onChange={e => setLibUploadForm(s => ({ ...s, [key]: e.target.value }))}
                              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, color: C.navy }}>
                              <option value="">— select —</option>
                              {opts.map(v => <option key={v} value={v}>{CAT_META[v]?.label || v}</option>)}
                            </select>
                          ) : (
                            <input value={libUploadForm[key] || ""} onChange={e => setLibUploadForm(s => ({ ...s, [key]: e.target.value }))}
                              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, color: C.navy, boxSizing: "border-box" }} />
                          )}
                        </div>
                      ))}
                      <div>
                        <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Spec Sheet PDF</label>
                        <input ref={libUploadFileRef} type="file" accept=".pdf" style={{ display: "none" }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) setLibUploadForm(s => ({ ...s, file: f })); e.target.value = ""; }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button onClick={() => libUploadFileRef.current?.click()}
                            style={{ background: C.bg, color: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            ⬆ Choose PDF
                          </button>
                          {libUploadForm.file
                            ? <span style={{ color: C.success, fontSize: 12, fontWeight: 600 }}>✓ {libUploadForm.file.name}</span>
                            : <span style={{ color: C.muted, fontSize: 12 }}>No file chosen</span>}
                        </div>
                      </div>
                      {libUploadForm.error && <div style={{ color: C.danger, fontSize: 12 }}>{libUploadForm.error}</div>}
                    </div>
                    <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button onClick={() => setLibUploadForm(null)} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                      <button
                        disabled={libUploadForm.uploading || !libUploadForm.category || !libUploadForm.brand || !libUploadForm.model || !libUploadForm.file}
                        onClick={async () => {
                          setLibUploadForm(s => ({ ...s, uploading: true, error: null }));
                          try {
                            await uploadSpecSheet({
                              category:    libUploadForm.category,
                              brand:       libUploadForm.brand.trim(),
                              model:       libUploadForm.model.trim(),
                              displayName: libUploadForm.displayName?.trim() || libUploadForm.model.trim(),
                              file:        libUploadForm.file,
                            });
                            const rows = await listLibrary();
                            setLibrary(rows);
                            setLibUploadForm(null);
                          } catch (err) {
                            setLibUploadForm(s => ({ ...s, uploading: false, error: err.message || "Upload failed" }));
                          }
                        }}
                        style={{ background: C.accent, color: C.white, border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer",
                          opacity: (libUploadForm.uploading || !libUploadForm.category || !libUploadForm.brand || !libUploadForm.model || !libUploadForm.file) ? 0.5 : 1 }}>
                        {libUploadForm.uploading ? "Uploading…" : "Save to Library"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 800, color: C.navy, fontSize: 16 }}>📚 Device Library</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                    {hasProjectDevices && !libShowAll
                      ? `${matchCount} spec sheet${matchCount !== 1 ? "s" : ""} matched to this project · ${library.length} total in library`
                      : `${library.length} spec sheet${library.length !== 1 ? "s" : ""} stored · shared across all projects`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {hasProjectDevices && (
                    <button onClick={() => setLibShowAll(v => !v)}
                      style={{ background: libShowAll ? C.bg : C.surface, color: libShowAll ? C.muted : C.accent, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {libShowAll ? "Show project only" : `Show all ${library.length}`}
                    </button>
                  )}
                  <button onClick={() => setLibUploadForm({ category: "", brand: "", model: "", displayName: "", file: null, uploading: false, error: null })}
                    style={{ background: C.accent, color: C.white, border: "none", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                    + Add Spec Sheet
                  </button>
                </div>
              </div>

              {/* Library tree */}
              {libraryLoading ? (
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", color: C.muted }}>Loading library…</div>
              ) : visibleRows.length === 0 ? (
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", color: C.muted }}>
                  {library.length === 0
                    ? <>No spec sheets yet. Click <strong>+ Add Spec Sheet</strong> to upload your first PDF.</>
                    : <>No spec sheets in the library match this project's devices. <button onClick={() => setLibShowAll(true)} style={{ background: "none", border: "none", color: C.accent, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>View full library</button></>}
                </div>
              ) : CAT_ORDER.filter(cat => tree[cat]).map(catKey => (
                <div key={catKey} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 12, overflow: "hidden" }}>
                  {/* Category header */}
                  <div style={{ background: C.navy, padding: "9px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{CAT_META[catKey]?.icon}</span>
                    <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>{CAT_META[catKey]?.label}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                      {Object.values(tree[catKey]).flat().length} model{Object.values(tree[catKey]).flat().length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {Object.keys(tree[catKey]).sort().map(brand => (
                    <div key={brand}>
                      {/* Brand sub-header */}
                      <div style={{ background: C.steel, padding: "6px 16px", display: "flex", alignItems: "center" }}>
                        <span style={{ color: C.white, fontWeight: 700, fontSize: 12 }}>{brand}</span>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginLeft: 8 }}>
                          {tree[catKey][brand].length} model{tree[catKey][brand].length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {tree[catKey][brand].map((entry, ei) => {
                        const url         = getSpecSheetUrl(entry.file_path);
                        const onProject   = projectKeys.has(`${entry.brand}|${entry.model}`.toLowerCase());
                        return (
                          <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", background: ei % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: C.navy, fontSize: 13 }}>{entry.display_name || entry.model}</div>
                              <div style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{entry.file_name}</div>
                            </div>
                            {onProject && (
                              <span style={{ background: "#D1FAE5", color: C.success, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>✓ On this project</span>
                            )}
                            {url && (
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                style={{ color: C.accent, fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>🔗 View PDF</a>
                            )}
                            <button onClick={async () => {
                                if (!confirm(`Delete "${entry.display_name || entry.model}" from library?`)) return;
                                await deleteLibraryEntry(entry.id, entry.file_path);
                                setLibrary(l => l.filter(r => r.id !== entry.id));
                              }}
                              style={{ background: "transparent", color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 5, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>
                              Delete
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}

            </div>
          );
        })()}

        {/* ─ EXPORT ─ */}
        {tab === "export" && (
          <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <CardHead icon="📊" title="Reports" color={C.navy} />
            <div style={{ padding: 24 }}>
              {/* Action buttons row */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
                <button onClick={() => importFileRef.current?.click()}
                  style={{ background: C.steel, color: C.white, border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                  ⬆ Import Proposal
                </button>
                <button onClick={handleCSV} disabled={totalDevices === 0}
                  style={{ background: C.success, color: C.white, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: totalDevices === 0 ? 0.5 : 1 }}>
                  ⬇ Export CSV
                </button>
                <button onClick={handleGenerate} disabled={generating || !sdkReady}
                  style={{ background: generating ? C.muted : C.gold, color: C.navy, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                  {generating ? "⏳ Building PDF..." : "⬇ Export PDF Report"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
                {[
                  ["🖥","Servers",srvCount,serverGroups.length],
                  ["🔀","Switches",swCount,switchGroups.length],
                  ["📷","Cameras",camCount,cameraGroups.length],
                  ["🚪","Access Doors",doorCount,doorGroups.length],
                  ["🔔","Intrusion Zones",zoneCount,zoneGroups.length],
                  ["🔊","Audio Zones",spkCount,speakerGroups.length],
                ].map(([ic, lbl, cnt, grps]) => (
                  <div key={lbl} style={{ background: C.bg, borderRadius: 8, padding: 16, textAlign: "center", borderTop: `3px solid ${C.accent}` }}>
                    <div style={{ fontSize: 24 }}>{ic}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>{cnt}</div>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{lbl}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{grps} group{grps !== 1 ? "s" : ""}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: C.bg, borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>Report will include:</div>
                {[
                  srvCount > 0 && `✅ ${serverGroups.length} server group(s), ${srvCount} server(s) — brand/model/role + IP, MAC, serial per unit`,
                  swCount > 0 && `✅ ${switchGroups.length} switch group(s), ${swCount} switch(es) — brand/model/VLAN + per-unit details`,
                  camCount > 0 && `✅ ${cameraGroups.length} camera group(s), ${camCount} camera(s) — model/codec/resolution/lens + IP, MAC, serial per camera`,
                  doorCount > 0 && `✅ ${doorGroups.length} door group(s), ${doorCount} door(s) — reader type/credential/lock + per-door controller & serial`,
                  zoneCount > 0 && `✅ ${zoneGroups.length} zone group(s), ${zoneCount} zone(s) — type/partition + per-zone number & location`,
                  spkCount > 0 && `✅ ${speakerGroups.length} audio group(s), ${spkCount} speaker(s) — zone group/amp + per-unit location`,
                  "📋 Project info header + VMS recorder details + intrusion panel info",
                  "✍️ Technician and customer sign-off section",
                ].filter(Boolean).map((item, i) => (
                  <div key={i} style={{ fontSize: 13, color: C.navy, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>{item}</div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                PDF = full close-out report with signatures &nbsp;·&nbsp; CSV = flat device list for CRM / spreadsheet import
              </div>

              {/* OEM Manual */}
              <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, padding: 22, marginTop: 24 }}>
                <div style={{ fontWeight: 800, color: C.navy, fontSize: 15, marginBottom: 6 }}>📦 OEM Manual</div>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
                  Compiles a single PDF: <strong>Cover page</strong> → <strong>Close-out report</strong> → <strong>Spec sheets</strong> for every model on this project that exists in the library.
                </div>
                {(() => {
                  const projectKeys = new Set(
                    [...cameraGroups,...doorGroups,...zoneGroups,...speakerGroups,...switchGroups,...serverGroups]
                      .map(g => `${g.brand}|${g.model}`.toLowerCase())
                  );
                  const matchCount = library.filter(e => projectKeys.has(`${e.brand}|${e.model}`.toLowerCase())).length;
                  return (
                    <>
                      <div style={{ background: C.surface, borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ color: C.muted, fontSize: 12, fontWeight: 700, minWidth: 90 }}>Cover page</span>
                        <input ref={coverFileRef} type="file" accept=".pdf" style={{ display: "none" }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) setCoverPageFile(f); e.target.value = ""; }} />
                        <button onClick={() => coverFileRef.current?.click()}
                          style={{ background: C.steel, color: C.white, border: "none", borderRadius: 5, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          {coverPageFile ? "↻ Replace" : "⬆ Upload PDF"}
                        </button>
                        {coverPageFile
                          ? <span style={{ color: C.success, fontSize: 12, fontWeight: 600 }}>✓ {coverPageFile.name}</span>
                          : <span style={{ color: C.muted, fontSize: 12 }}>Optional — omitted if not uploaded</span>}
                      </div>
                      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", gap: 12, fontSize: 12, flexWrap: "wrap" }}>
                          <span style={{ color: coverPageFile ? C.success : C.muted }}>{coverPageFile ? "✓" : "○"} Cover page</span>
                          <span style={{ color: C.success }}>✓ Close-out report</span>
                          <span style={{ color: matchCount > 0 ? C.success : C.muted }}>
                            {matchCount > 0 ? `✓ ${matchCount} spec sheet${matchCount !== 1 ? "s" : ""} matched from library` : "○ No library matches for this project's devices"}
                          </span>
                        </div>
                        <button onClick={buildOEMManual} disabled={!pdfLibReady || !sdkReady}
                          style={{ marginLeft: "auto", background: C.gold, color: C.navy, border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: (!pdfLibReady || !sdkReady) ? 0.5 : 1 }}>
                          📦 Export OEM Manual
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ─ PROPOSAL IMPORT PREVIEW MODAL ─ */}
      {importPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7,20,42,0.82)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.white, borderRadius: 12, maxWidth: 780, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 48px rgba(0,0,0,.45)" }}>
            {/* Modal header */}
            <div style={{ background: C.navy, borderRadius: "12px 12px 0 0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.white, fontWeight: 800, fontSize: 15 }}>
                  {importPreview.isChangeOrder ? "Import Change Order Hardware" : "Import Proposal Hardware"}
                  {importPreview.isChangeOrder && <span style={{ background: C.gold, color: C.navy, fontSize: 10, fontWeight: 800, borderRadius: 8, padding: "2px 8px", marginLeft: 8 }}>CHANGE ORDER</span>}
                </div>
                <div style={{ color: C.accent, fontSize: 12, marginTop: 2 }}>
                  Proposal #{importPreview.proposalId}
                  {selectedProject?.projectId && importPreview.proposalId !== selectedProject.projectId && (
                    <span style={{ color: C.warn, marginLeft: 8 }}>⚠ Proposal ID doesn't match project ID ({selectedProject.projectId})</span>
                  )}
                  {importPreview.rows.some(r => r.recurring) && (
                    <span style={{ color: C.gold, marginLeft: 8 }}>· {importPreview.rows.filter(r => r.recurring).length} recurring MRR item{importPreview.rows.filter(r => r.recurring).length !== 1 ? "s" : ""} (shown separately)</span>
                  )}
                </div>
              </div>
              <button onClick={() => setImportPreview(null)} style={{ background: "rgba(255,255,255,0.12)", color: C.white, border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 13, cursor: "pointer" }}>✕</button>
            </div>
            {/* Existing data warning */}
            {(cameraGroups.length + switchGroups.length + serverGroups.length + doorGroups.length + zoneGroups.length + speakerGroups.length) > 0 && (
              <div style={{ background: "#FEF3C7", borderBottom: `1px solid #FDE68A`, padding: "10px 20px", fontSize: 12, color: "#92400E" }}>
                ⚠ This project already has hardware groups. Imported items will be <strong>added</strong> to the existing groups — nothing will be replaced.
              </div>
            )}
            {/* Parts table */}
            <div style={{ overflowY: "auto", flex: 1, padding: "0 0 4px" }}>
              {/* One-time hardware */}
              {importPreview.rows.some(r => !r.recurring) && (
                <>
                  {importPreview.rows.some(r => r.recurring) && (
                    <div style={{ background: C.navy, padding: "6px 12px" }}>
                      <span style={{ color: C.accent, fontWeight: 700, fontSize: 11 }}>ONE-TIME HARDWARE</span>
                    </div>
                  )}
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: C.surface, position: "sticky", top: 0 }}>
                        {["Brand","Model","Description","Qty","Area","Category"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row, i) => {
                        if (row.recurring) return null;
                        const cat = importPreview.overrideCats[i] || row.category;
                        const isUnknown = cat === "unknown";
                        const CAT_OPTIONS = [
                          { value: "camera",  label: "CCTV / Camera" },
                          { value: "door",    label: "Access Control" },
                          { value: "zone",    label: "Intrusion" },
                          { value: "speaker", label: "Audio" },
                          { value: "switch",  label: "Network Switch" },
                          { value: "server",  label: "Server / NVR" },
                          { value: "unknown", label: "Skip this row" },
                        ];
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: "7px 12px", color: C.navy }}>{row.brand || <span style={{ color: C.muted }}>—</span>}</td>
                            <td style={{ padding: "7px 12px", color: C.navy, fontFamily: "monospace", fontSize: 11 }}>{row.model || <span style={{ color: C.muted }}>—</span>}</td>
                            <td style={{ padding: "7px 12px", color: C.muted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label || "—"}</td>
                            <td style={{ padding: "7px 12px", color: C.navy, fontWeight: 700, textAlign: "center" }}>{row.qty}</td>
                            <td style={{ padding: "7px 12px", color: C.muted, fontSize: 11, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.area || "—"}</td>
                            <td style={{ padding: "7px 12px" }}>
                              <select value={cat} onChange={e => setImportPreview(s => ({ ...s, overrideCats: { ...s.overrideCats, [i]: e.target.value } }))}
                                style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${isUnknown ? C.warn : C.border}`, background: isUnknown ? "#FEF3C7" : C.white, color: isUnknown ? "#92400E" : C.navy, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
              {/* Recurring / MRR items (read-only, not imported) */}
              {importPreview.rows.some(r => r.recurring) && (
                <>
                  <div style={{ background: "#78350F", padding: "6px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: C.gold, fontWeight: 700, fontSize: 11 }}>RECURRING / MRR ITEMS</span>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>— not imported as hardware, for reference only</span>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#FEF3C7" }}>
                        {["Brand","Model","Description","Qty","Area"].map(h => (
                          <th key={h} style={{ padding: "7px 12px", textAlign: "left", color: "#92400E", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid #FDE68A` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row, i) => {
                        if (!row.recurring) return null;
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? "#FFFBEB" : "#FEF9E7", borderBottom: `1px solid #FDE68A` }}>
                            <td style={{ padding: "6px 12px", color: "#92400E" }}>{row.brand || "—"}</td>
                            <td style={{ padding: "6px 12px", color: "#92400E", fontFamily: "monospace", fontSize: 11 }}>{row.model || "—"}</td>
                            <td style={{ padding: "6px 12px", color: "#B45309", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label || "—"}</td>
                            <td style={{ padding: "6px 12px", color: "#92400E", fontWeight: 700, textAlign: "center" }}>{row.qty}</td>
                            <td style={{ padding: "6px 12px", color: "#B45309", fontSize: 11 }}>{row.area || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, background: C.surface, borderRadius: "0 0 12px 12px" }}>
              <div style={{ flex: 1, fontSize: 12, color: C.muted }}>
                {importPreview.rows.filter((r, i) => !r.recurring && (importPreview.overrideCats[i] || r.category) !== "unknown").length} hardware items will be imported as device groups.
                {importPreview.rows.some(r => r.recurring) && ` · ${importPreview.rows.filter(r => r.recurring).length} recurring MRR items skipped.`}
                {" "}Devices not generated yet — set IP start + hit Generate in each group.
              </div>
              <button onClick={() => setImportPreview(null)} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 18px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleProposalImport} style={{ background: C.accent, color: C.white, border: "none", borderRadius: 7, padding: "8px 22px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                ⬆ Import Hardware
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
