import { useState, useEffect, useRef, useCallback } from "react";
import { CAM_DB, SWITCH_DB, SERVER_DB, ACCESS_DB, PANEL_DB } from "./deviceDB";
import { loadWorkOrder, saveWorkOrder } from "./supabase";
// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy: "#0B1F3A", steel: "#1A3355", accent: "#00AEEF", gold: "#F4A300",
  bg: "#EEF2F7", white: "#FFFFFF", muted: "#6B7E96", border: "#CBD5E1",
  success: "#10B981", warn: "#F59E0B", danger: "#EF4444",
  surface: "#F8FAFD", dark: "#07142A",
};
// ── Monday API ────────────────────────────────────────────────────────────────
const MONDAY_BOARD_ID = "18394052747";
async function fetchProjects(token) {
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
    const col = id => item.column_values.find(c => c.id === id)?.text || "—";
    return {
      id: item.id,
      name: item.name,
      projectId: col("text_mm0vkgrq"),
      techLead: col("multiple_person_mm01ew1v"),
      programmingStatus: col("status"),
      schedule: col("timerange_mm034yws"),
    };
  });
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
const mkCamGroup = () => ({ id: uid(), groupLabel: "", brand: "", model: "", codec: "H.265", resolution: "4MP", lens: "2.8mm", type: "Outdoor Dome", port: "80", rtspPort: "554", fps: "15", bitrate: "", ptz: false, username: "", password: "", storageGroup: "", quantity: "4", ipStart: "", devices: [] });
const mkCamDev = (ip = "", idx = 0) => ({ id: uid(), name: `Camera ${String(idx + 1).padStart(2, "0")}`, location: "", ip, mac: "", serial: "", notes: "", programmed: false });
const mkSwGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", vlan: "", uplink: "", quantity: "1", ipStart: "", devices: [] });
const mkSwDev = (ip = "", idx = 0) => ({ id: uid(), name: `Switch ${String(idx + 1).padStart(2, "0")}`, location: "", ip, mac: "", serial: "", ports: "", notes: "", programmed: false });
const mkSrvGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", role: "VMS Server", os: "", storage: "", quantity: "1", ipStart: "", devices: [] });
const mkSrvDev = (ip = "", idx = 0) => ({ id: uid(), name: `Server ${String(idx + 1).padStart(2, "0")}`, location: "", ip, mac: "", serial: "", notes: "", programmed: false });
const mkDoorGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", readerType: "OSDP", credentialType: "Smart Card", lockType: "Electric Strike", cardFormat: "", facilityCode: "", accessGroup: "", schedule: "", quantity: "1", devices: [] });
const mkDoorDev = (idx = 0) => ({ id: uid(), name: `Door ${String(idx + 1).padStart(2, "0")}`, location: "", controllerName: "", controllerIP: "", controllerSerial: "", readerSerial: "", rex: false, doorContact: false, notes: "", programmed: false });
const mkZoneGrp = () => ({ id: uid(), groupLabel: "", zoneType: "Motion", partitions: "", bypassable: false, quantity: "1", startNumber: "1", devices: [] });
const mkZoneDev = (idx = 0, g = {}) => ({ id: uid(), name: `Zone ${String(idx + 1).padStart(2, "0")}`, location: "", zoneNumber: String((parseInt(g.startNumber) || 1) + idx), zoneType: g.zoneType || "Motion", partitions: g.partitions || "", bypassable: g.bypassable || false, notes: "", programmed: false });
const mkSpkGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", zoneGroup: "", ampZone: "", volume: "70", quantity: "1", ipStart: "", devices: [] });
const mkSpkDev = (ip = "", idx = 0) => ({ id: uid(), name: `Speaker ${String(idx + 1).padStart(2, "0")}`, location: "", ip, notes: "", programmed: false });
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
function DevRow({ num, dev, cols, onRemove, onUpd }) {
  const inpSt = { padding: "5px 7px", borderRadius: 4, border: `1.5px solid ${C.border}`, fontSize: 11, background: C.white, color: C.navy, outline: "none", width: "100%", boxSizing: "border-box" };
  const focus = e => e.target.style.borderColor = C.accent;
  const blur  = e => e.target.style.borderColor = C.border;
  const rowBg = dev.programmed ? "#F0FDF4" : (num % 2 === 0 ? C.white : C.surface);
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
              onFocus={focus}
              onBlur={blur}
            />
          )}
        </td>
      ))}
      <td style={{ padding: "4px 8px", textAlign: "center", width: 60 }}>
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: "pointer" }}>
          <input type="checkbox" checked={!!dev.programmed} onChange={e => onUpd("programmed", e.target.checked)}
            style={{ cursor: "pointer", accentColor: C.success, width: 15, height: 15 }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: dev.programmed ? C.success : C.muted }}>
            {dev.programmed ? "✓ Done" : "Pending"}
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
function DevTable({ cols, devices, gid, setter, newDevFn }) {
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
              <th style={{ padding: "5px 8px", color: C.success, fontSize: 10, fontWeight: 700, textAlign: "center", width: 60, whiteSpace: "nowrap" }}>Pgmd</th>
              <th style={{ padding: "5px 8px", width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {devices.map((dev, i) => (
              <DevRow key={dev.id} num={i + 1} dev={dev} cols={cols}
                onRemove={() => remDev(setter, gid, dev.id)}
                onUpd={(k, v) => updDev(setter, gid, dev.id, k, v)}
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
async function buildPDF(state, projectMeta) {
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
  doc.save(fname);
}
// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("select");
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [mondayToken, setMondayToken] = useState(() => import.meta.env.VITE_MONDAY_TOKEN || localStorage.getItem("mondayToken") || "");
  const [tokenDraft, setTokenDraft] = useState("");
  const [tab, setTab] = useState("info");
  const [generating, setPDF] = useState(false);
  const [sdkReady, setSDK] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const saveTimerRef = useRef(null);
  // project info
  const [info, setInfo] = useState({ customer: "", siteAddress: "", techLead: "", techs: "", date: new Date().toISOString().split("T")[0], submittedBy: "" });
  const [nvrInfo, setNVR] = useState({ nvrBrand: "", nvrModel: "", nvrIp: "", nvrSerial: "", nvrFirmware: "", nvrStorage: "", nvrRetention: "", vmsSoftware: "" });
  const [panelInfo, setPanel] = useState({ panelBrand: "", panelModel: "", panelSerial: "", panelFirmware: "" });
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
  const flushSave = useCallback(async (project) => {
    if (!project?.id || !pendingSnapRef.current) return;
    const snap = pendingSnapRef.current;
    pendingSnapRef.current = null;
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    try {
      await saveWorkOrder(project.id, project.name, project.projectId, snap);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
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
    const snap = { info, nvrInfo, panelInfo, cameraGroups, switchGroups, serverGroups, doorGroups, zoneGroups, speakerGroups };
    triggerSave(snap, selectedProject);
  }, [info, nvrInfo, panelInfo, cameraGroups, switchGroups, serverGroups, doorGroups, zoneGroups, speakerGroups]); // eslint-disable-line
  // Flush save on tab close / refresh
  useEffect(() => {
    const handleUnload = () => { if (selectedProject) flushSave(selectedProject); };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [selectedProject, flushSave]);
  useEffect(() => {
    if (window.jspdf) { setSDK(true); return; }
    if (document.querySelector('script[src*="jspdf"]')) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => setSDK(true);
    document.head.appendChild(s);
  }, []);
  useEffect(() => {
    if (!mondayToken) return;
    setLoadingProjects(true);
    setProjectsError("");
    fetchProjects(mondayToken)
      .then(ps => { setProjects(ps); setLoadingProjects(false); })
      .catch(e => { setProjectsError(e.message || "Failed to load projects"); setLoadingProjects(false); });
  }, [mondayToken]);
  const stateSnapshot = () => ({ ...info, ...nvrInfo, ...panelInfo, cameraGroups, switchGroups, serverGroups, doorGroups, zoneGroups, speakerGroups });
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
  const TABS = [
    { id: "info",      label: "Project Info",  icon: "📋" },
    { id: "servers",   label: "Servers",        icon: "🖥", count: srvCount },
    { id: "switches",  label: "Switching",      icon: "🔀", count: swCount },
    { id: "cameras",   label: "CCTV",           icon: "📷", count: camCount },
    { id: "access",    label: "Access",         icon: "🚪", count: doorCount },
    { id: "intrusion", label: "Intrusion",      icon: "🔔", count: zoneCount },
    { id: "audio",     label: "Audio",          icon: "🔊", count: spkCount },
    { id: "dashboard", label: "Dashboard",       icon: "📊" },
    { id: "library",   label: "Device Library", icon: "📚" },
    { id: "export",    label: "Export PDF",     icon: "📤" },
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

          {/* Refresh token */}
          {mondayToken && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, gap: 8, alignItems: "center" }}>
              <span style={{ color: C.success, fontSize: 11, fontWeight: 600 }}>✓ Connected to monday.com</span>
              <button onClick={() => { localStorage.removeItem("mondayToken"); setMondayToken(""); setProjects([]); }}
                style={{ background: "rgba(255,255,255,0.07)", color: C.muted, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 5, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>
                Change Token
              </button>
            </div>
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
                        if (s.info)          setInfo(s.info);
                        if (s.nvrInfo)       setNVR(s.nvrInfo);
                        if (s.panelInfo)     setPanel(s.panelInfo);
                        if (s.cameraGroups)  setCameraGroups(s.cameraGroups);
                        if (s.switchGroups)  setSwitchGroups(s.switchGroups);
                        if (s.serverGroups)  setServerGroups(s.serverGroups);
                        if (s.doorGroups)    setDoorGroups(s.doorGroups);
                        if (s.zoneGroups)    setZoneGroups(s.zoneGroups);
                        if (s.speakerGroups) setSpeakerGroups(s.speakerGroups);
                      }
                    } catch (e) { console.warn("Could not load saved work order:", e); }
                    setPhase("build");
                  }}
                  style={{ background: selectedProject?.id === p.id ? C.accent : "rgba(255,255,255,0.05)", border: `1px solid ${selectedProject?.id === p.id ? C.accent : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "14px 18px", cursor: "pointer", transition: "background .15s" }}>
                  <div style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>ID: {p.projectId}  |  Lead: {p.techLead}  |  Status: {p.programmingStatus}</div>
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
            setCollapsed({}); setSaveStatus("idle");
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
            <button onClick={handleCSV} disabled={totalDevices === 0}
              style={{ background: C.success, color: C.white, border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", opacity: totalDevices === 0 ? 0.5 : 1 }}>
              ⬇ CSV
            </button>
            <button onClick={handleGenerate} disabled={generating || !sdkReady}
              style={{ background: generating ? C.muted : C.gold, color: C.navy, border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
              {generating ? "⏳ Generating..." : "⬇ Export PDF"}
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
              <CardHead icon="🖥" title="Servers & Computing" count={srvCount} onAdd={() => setServerGroups(g => [...g, mkSrvGrp()])} addLabel="Add Server Group" color={C.navy} />
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
                      cols={[
                        { key: "name", label: "Server Name", ph: "e.g. VMS-01" },
                        { key: "location", label: "Location", ph: "e.g. Server Room" },
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
              <CardHead icon="🔀" title="Network Switching" count={swCount} onAdd={() => setSwitchGroups(g => [...g, mkSwGrp()])} addLabel="Add Switch Group" color={C.navy} />
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
                      cols={[
                        { key: "name", label: "Switch Name", ph: "e.g. CCTV-SW-01" },
                        { key: "location", label: "Location", ph: "e.g. IDF Room B" },
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
              <CardHead icon="📷" title="CCTV Camera Programming" count={camCount} onAdd={() => setCameraGroups(g => [...g, mkCamGroup()])} addLabel="Add Camera Group" color={C.navy} />
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
                        cols={[
                          { key: "name", label: "Camera Name", ph: "e.g. NE Entry" },
                          { key: "location", label: "Location", ph: "e.g. NE Corner Lobby" },
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
              <CardHead icon="🚪" title="Access Control Door Programming" count={doorCount} onAdd={() => setDoorGroups(g => [...g, mkDoorGrp()])} addLabel="Add Door Group" color={C.navy} />
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
                      cols={[
                        { key: "name", label: "Door Name", ph: "e.g. Main Entry" },
                        { key: "location", label: "Location", ph: "e.g. Lobby" },
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
              <CardHead icon="🔔" title="Intrusion Zone Programming" count={zoneCount} onAdd={() => setZoneGroups(g => [...g, mkZoneGrp()])} addLabel="Add Zone Group" color={C.navy} />
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
                      cols={[
                        { key: "zoneNumber", label: "Zone #", ph: "01" },
                        { key: "name", label: "Zone Name", ph: "e.g. Back Door PIR" },
                        { key: "location", label: "Location", ph: "" },
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
              <CardHead icon="🔊" title="Audio Zone Programming" count={spkCount} onAdd={() => setSpeakerGroups(g => [...g, mkSpkGrp()])} addLabel="Add Audio Group" color={C.navy} />
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
                      cols={[
                        { key: "name", label: "Speaker / Zone", ph: "e.g. Lobby 01" },
                        { key: "location", label: "Location", ph: "" },
                        { key: "ip", label: "IP / Address", ph: "192.168.x.x" },
                        { key: "notes", label: "Notes", ph: "" },
                      ]} />
                  </GroupCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─ DASHBOARD ─ */}
        {tab === "dashboard" && (() => {
          const allDevs = [
            ...cameraGroups.flatMap(g => g.devices.map(d => ({ ...d, category: "Camera", group: g.groupLabel || g.brand || "Unnamed", icon: "📷" }))),
            ...switchGroups.flatMap(g => g.devices.map(d => ({ ...d, category: "Switch", group: g.groupLabel || g.brand || "Unnamed", icon: "🔀" }))),
            ...serverGroups.flatMap(g => g.devices.map(d => ({ ...d, category: "Server", group: g.groupLabel || g.brand || "Unnamed", icon: "🖥" }))),
            ...doorGroups.flatMap(g => g.devices.map(d => ({ ...d, category: "Door", group: g.groupLabel || g.brand || "Unnamed", icon: "🚪" }))),
            ...zoneGroups.flatMap(g => g.devices.map(d => ({ ...d, category: "Zone", group: g.groupLabel || "Unnamed", icon: "🔔" }))),
            ...speakerGroups.flatMap(g => g.devices.map(d => ({ ...d, category: "Speaker", group: g.groupLabel || g.brand || "Unnamed", icon: "🔊" }))),
          ];
          const programmedCount = allDevs.filter(d => d.programmed).length;
          const pct = allDevs.length ? Math.round((programmedCount / allDevs.length) * 100) : 0;
          const categories = [
            { label: "Cameras", icon: "📷", devs: cameraGroups.flatMap(g => g.devices) },
            { label: "Switches", icon: "🔀", devs: switchGroups.flatMap(g => g.devices) },
            { label: "Servers", icon: "🖥", devs: serverGroups.flatMap(g => g.devices) },
            { label: "Doors", icon: "🚪", devs: doorGroups.flatMap(g => g.devices) },
            { label: "Zones", icon: "🔔", devs: zoneGroups.flatMap(g => g.devices) },
            { label: "Speakers", icon: "🔊", devs: speakerGroups.flatMap(g => g.devices) },
          ].filter(c => c.devs.length > 0);
          return (
            <div>
              {/* Overall progress */}
              <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>Overall Programming Progress</div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: pct === 100 ? C.success : C.navy }}>{pct}%</div>
                </div>
                <div style={{ background: C.bg, borderRadius: 999, height: 12, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? C.success : C.accent, borderRadius: 999, transition: "width .4s" }} />
                </div>
                <div style={{ marginTop: 8, color: C.muted, fontSize: 12 }}>{programmedCount} of {allDevs.length} devices programmed</div>
              </div>

              {/* Category breakdown */}
              {categories.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
                  {categories.map(cat => {
                    const done = cat.devs.filter(d => d.programmed).length;
                    const cp = cat.devs.length ? Math.round((done / cat.devs.length) * 100) : 0;
                    return (
                      <div key={cat.label} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 14, borderTop: `3px solid ${cp === 100 ? C.success : C.accent}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{cat.icon} {cat.label}</div>
                          <div style={{ fontWeight: 800, color: cp === 100 ? C.success : C.navy, fontSize: 14 }}>{cp}%</div>
                        </div>
                        <div style={{ background: C.bg, borderRadius: 999, height: 7, overflow: "hidden", marginBottom: 6 }}>
                          <div style={{ height: "100%", width: `${cp}%`, background: cp === 100 ? C.success : C.accent, borderRadius: 999, transition: "width .4s" }} />
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>{done}/{cat.devs.length} done</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Full device list */}
              {allDevs.length === 0 ? (
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", color: C.muted }}>
                  No devices added yet. Go to any category tab and add device groups.
                </div>
              ) : (
                <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                  <div style={{ background: C.navy, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>All Devices — {allDevs.length} total</span>
                    <span style={{ color: C.success, fontWeight: 700, fontSize: 12 }}>{programmedCount} done  ·  {allDevs.length - programmedCount} pending</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: C.surface }}>
                          <th style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>Status</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>Category</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>Group</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>Device Name</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>Location</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allDevs.map((dev, i) => (
                          <tr key={dev.id} style={{ background: dev.programmed ? "#F0FDF4" : (i % 2 === 0 ? C.white : C.surface) }}>
                            <td style={{ padding: "7px 10px", textAlign: "center" }}>
                              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: dev.programmed ? "#D1FAE5" : "#FEF3C7", color: dev.programmed ? C.success : C.warn }}>
                                {dev.programmed ? "✓ Done" : "Pending"}
                              </span>
                            </td>
                            <td style={{ padding: "7px 10px", color: C.navy }}>{dev.icon} {dev.category}</td>
                            <td style={{ padding: "7px 10px", color: C.muted, fontSize: 11 }}>{dev.group}</td>
                            <td style={{ padding: "7px 10px", fontWeight: 600, color: C.navy }}>{dev.name}</td>
                            <td style={{ padding: "7px 10px", color: C.muted }}>{dev.location || "—"}</td>
                            <td style={{ padding: "7px 10px", fontFamily: "monospace", color: C.steel }}>{dev.ip || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─ DEVICE LIBRARY ─ */}
        {tab === "library" && (
          <div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20 }}>
              <CardHead icon="📚" title="Device Library" color={C.navy} />
              <div style={{ padding: 18 }}>
                <p style={{ color: C.muted, fontSize: 13, marginTop: 0 }}>
                  Reference catalog of supported brands and models. Select a model in any device tab to auto-fill specs.
                  Spec Sheet links open the manufacturer page in a new tab.
                </p>
                {[
                  { label: "Cameras", icon: "📷", db: CAM_DB, specCols: ["resolution","lens","type","codec","fps"] },
                  { label: "Network Switches", icon: "🔀", db: SWITCH_DB, specCols: ["ports"] },
                  { label: "Servers / NVRs", icon: "🖥", db: SERVER_DB, specCols: ["os"] },
                  { label: "Access Controllers", icon: "🚪", db: ACCESS_DB, specCols: ["readerType","credentialType"] },
                  { label: "Intrusion Panels", icon: "🔔", db: PANEL_DB, specCols: [] },
                ].map(cat => (
                  <div key={cat.label} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.navy, borderRadius: "6px 6px 0 0", padding: "8px 14px" }}>
                      <span style={{ fontSize: 16 }}>{cat.icon}</span>
                      <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>{cat.label}</span>
                      <span style={{ color: C.accent, fontSize: 11, marginLeft: 4 }}>{cat.db.reduce((s, b) => s + b.models.length, 0)} models</span>
                    </div>
                    {cat.db.map(brand => (
                      <div key={brand.brand} style={{ border: `1px solid ${C.border}`, borderTop: "none" }}>
                        <div style={{ background: C.steel, padding: "6px 14px", display: "flex", alignItems: "center" }}>
                          <span style={{ color: C.white, fontWeight: 700, fontSize: 12 }}>{brand.brand}</span>
                          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginLeft: 8 }}>{brand.models.length} model{brand.models.length !== 1 ? "s" : ""}</span>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: C.bg }}>
                              <th style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Model #</th>
                              <th style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Name</th>
                              {cat.specCols.map(sc => (
                                <th key={sc} style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{sc}</th>
                              ))}
                              <th style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Spec Sheet</th>
                            </tr>
                          </thead>
                          <tbody>
                            {brand.models.map((m, mi) => (
                              <tr key={m.model} style={{ background: mi % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ padding: "7px 10px", color: C.navy, fontWeight: 600, fontFamily: "monospace", fontSize: 11 }}>{m.model}</td>
                                <td style={{ padding: "7px 10px", color: C.navy }}>{m.name}</td>
                                {cat.specCols.map(sc => (
                                  <td key={sc} style={{ padding: "7px 10px", color: C.steel }}>{m[sc] !== undefined ? String(m[sc]) : "—"}</td>
                                ))}
                                <td style={{ padding: "7px 10px" }}>
                                  {m.specSheet ? (
                                    <a href={m.specSheet} target="_blank" rel="noopener noreferrer"
                                      style={{ color: C.accent, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                                      🔗 View
                                    </a>
                                  ) : (
                                    <span style={{ color: C.muted, fontSize: 11 }}>—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─ EXPORT ─ */}
        {tab === "export" && (
          <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <CardHead icon="📤" title="Review & Export PDF Report" color={C.navy} />
            <div style={{ padding: 24 }}>
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
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                  <button onClick={handleGenerate} disabled={generating || !sdkReady}
                    style={{ background: generating ? C.muted : C.gold, color: C.navy, border: "none", borderRadius: 10, padding: "16px 44px", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 18px rgba(244,163,0,.4)", letterSpacing: "0.03em" }}>
                    {generating ? "⏳ Building PDF..." : "⬇ Export PDF Report"}
                  </button>
                  <button onClick={handleCSV} disabled={totalDevices === 0}
                    style={{ background: C.success, color: C.white, border: "none", borderRadius: 10, padding: "16px 44px", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 18px rgba(16,185,129,.3)", letterSpacing: "0.03em", opacity: totalDevices === 0 ? 0.5 : 1 }}>
                    ⬇ Export CSV for CRM
                  </button>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
                  PDF = full close-out report with signatures. CSV = flat device list for CRM / spreadsheet import.
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
