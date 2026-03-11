import { useState, useEffect, useRef } from "react";
// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy: "#0B1F3A", steel: "#1A3355", accent: "#00AEEF", gold: "#F4A300",
  bg: "#EEF2F7", white: "#FFFFFF", muted: "#6B7E96", border: "#CBD5E1",
  success: "#10B981", warn: "#F59E0B", danger: "#EF4444",
  surface: "#F8FAFD", dark: "#07142A",
};
// ── Monday API ────────────────────────────────────────────────────────────────
const MONDAY_BOARD_ID = "18394052747";
async function fetchProjects() {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are a monday.com API assistant. When given a task, call the monday.com MCP tool to get board items and return ONLY a JSON array (no markdown, no explanation) with objects: {id, name, projectId, techLead, techResource, programmingStatus, schedule}. Use "—" for missing values.`,
      messages: [{ role: "user", content: `Get all items from monday.com board ID ${MONDAY_BOARD_ID} for the "(6) Project Programming" board. Return the project name, project ID (text_mm0vkgrq), tech lead (multiple_person_mm01ew1v), tech resource (multiple_person_mm01eyxg), programming status label (status column), and programming schedule (timerange_mm034yws). Return as a clean JSON array only.` }],
      mcp_servers: [{ type: "url", url: "https://mcp.monday.com/mcp", name: "monday-mcp" }]
    })
  });
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("[");
    return JSON.parse(clean.slice(start));
  } catch { return []; }
}
// ── Field helpers ─────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const mkCamera = () => ({ id: uid(), name: "", location: "", ip: "", mac: "", serial: "", codec: "H.265", resolution: "4MP", lens: "2.8mm", type: "Outdoor Dome", port: "80", rtspPort: "554", fps: "15", bitrate: "", storageGroup: "", username: "", password: "", ptz: false, notes: "" });
const mkDoor = () => ({ id: uid(), name: "", location: "", controllerName: "", controllerIP: "", controllerSerial: "", readerType: "OSDP", readerSerial: "", credentialType: "Smart Card", lockType: "Electric Strike", cardFormat: "", facilityCode: "", accessGroup: "", schedule: "", rex: false, doorContact: false, notes: "" });
const mkZone = () => ({ id: uid(), name: "", location: "", zoneNumber: "", zoneType: "Motion", partitions: "", bypassable: false, notes: "" });
const mkSpeaker = () => ({ id: uid(), name: "", location: "", ip: "", zoneGroup: "", volume: "70", ampZone: "", notes: "" });
const mkSwitch = () => ({ id: uid(), name: "", location: "", ip: "", mac: "", serial: "", model: "", ports: "", vlan: "", uplink: "", notes: "" });
const mkServer = () => ({ id: uid(), name: "", role: "", ip: "", mac: "", serial: "", os: "", storage: "", notes: "" });
const CODECS = ["H.264","H.265","H.265+","MJPEG"];
const RESS = ["1MP (720p)","2MP (1080p)","4MP","5MP","6MP","8MP (4K)","12MP"];
const LENSES = ["2.8mm","4mm","6mm","8mm","2.8–12mm VF","Motorized VF","Other"];
const CAM_TYPES = ["Indoor Dome","Outdoor Dome","Bullet","PTZ","Fisheye","Multi-Sensor","Box"];
const READER_TYPES = ["Wiegand","OSDP","RS-485","Bluetooth","Biometric","Keypad","Multi-Tech"];
const CRED_TYPES = ["Prox Card","Smart Card","Mobile","PIN","Biometric","Dual Auth"];
const LOCK_TYPES = ["Mag Lock","Electric Strike","Electronic Deadbolt","Other"];
const ZONE_TYPES = ["Motion","Door Contact","Glass Break","Smoke","CO","Heat","Panic","Tamper"];
const PANEL_BRANDS = ["DSC","Bosch","Honeywell","Napco","DMP","Elk","Other"];
const SERVER_ROLES = ["VMS Server","NVR","DVR","Access Control Server","Video Analytics","Storage Array","Workstation","Other"];
// ── Small UI components ───────────────────────────────────────────────────────
const F = ({ label, children, span = 1 }) => (
  <div style={{ gridColumn: `span ${span}`, display: "flex", flexDirection: "column", gap: 3 }}>
    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</label>
    {children}
  </div>
);
const Inp = (props) => (
  <input {...props} style={{ padding: "7px 9px", borderRadius: 5, border: `1.5px solid ${C.border}`, fontSize: 12, background: C.white, color: C.navy, outline: "none", ...props.style }}
    onFocus={e => e.target.style.borderColor = C.accent}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);
const Sel = ({ children, ...props }) => (
  <select {...props} style={{ padding: "7px 9px", borderRadius: 5, border: `1.5px solid ${C.border}`, fontSize: 12, background: C.white, color: C.navy, outline: "none" }}>{children}</select>
);
const TA = (props) => (
  <textarea {...props} rows={2} style={{ padding: "7px 9px", borderRadius: 5, border: `1.5px solid ${C.border}`, fontSize: 12, background: C.white, color: C.navy, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
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
const ItemHdr = ({ title, idx, onRemove }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${C.accent}22` }}>
    <span style={{ fontWeight: 700, fontSize: 12, color: C.steel }}>{title} #{idx + 1}</span>
    <button onClick={onRemove} style={{ background: "#FEE2E2", color: C.danger, border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✕</button>
  </div>
);
const DevCard = ({ children }) => (
  <div style={{ marginBottom: 14, padding: 14, background: C.surface, borderRadius: 7, border: `1px solid ${C.border}` }}>
    {children}
  </div>
);
const Empty = ({ icon, msg }) => (
  <div style={{ textAlign: "center", padding: 32, color: C.muted }}>
    <div style={{ fontSize: 36, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontWeight: 600, fontSize: 13 }}>{msg}</div>
  </div>
);
// ── PDF GENERATOR ─────────────────────────────────────────────────────────────
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
  // ─ Cover ─
  doc.setFillColor(11, 31, 58); doc.rect(0, 0, W, 62, "F");
  doc.setFillColor(0, 174, 239); doc.rect(0, 62, W, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0, 174, 239);
  doc.text("PROGRAMMING & CONFIGURATION WORK ORDER", M, 18);
  doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text(projectMeta.name, M, 30);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 200, 220);
  doc.text(`Project ID: ${projectMeta.projectId}   |   Date: ${state.date}   |   Tech Lead: ${state.techLead}   |   Tech(s): ${state.techs}`, M, 40);
  // Summary tiles
  const tiles = [
    { label: "Servers", val: state.servers.length },
    { label: "Switches", val: state.switches.length },
    { label: "Cameras", val: state.cameras.length },
    { label: "Access Doors", val: state.doors.length },
    { label: "Intrusion Zones", val: state.zones.length },
    { label: "Audio Zones", val: state.speakers.length },
  ];
  const tW = CW / tiles.length;
  tiles.forEach((t, i) => {
    const x = M + i * tW;
    doc.setFillColor(255, 255, 255, 15);
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
  const infoLeft = [["Project Name:", projectMeta.name],["Project ID:", projectMeta.projectId],["Customer:", state.customer],["Site Address:", state.siteAddress]];
  const infoRight = [["Tech Lead:", state.techLead],["Tech(s):", state.techs],["Date:", state.date],["Submitted By:", state.submittedBy]];
  infoLeft.forEach(([k, v], i) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(107, 126, 150); doc.text(k, M + 4, y + i * 7);
    doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20); doc.text(v || "—", M + 36, y + i * 7);
  });
  infoRight.forEach(([k, v], i) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(107, 126, 150); doc.text(k, M + CW / 2 + 4, y + i * 7);
    doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20); doc.text(v || "—", M + CW / 2 + 28, y + i * 7);
  });
  y += 38;
  // ─ SERVERS ─
  if (state.servers.length) {
    np();
    sectionBanner("SERVERS & COMPUTING INFRASTRUCTURE", "🖥");
    state.servers.forEach((s, i) => {
      chk(28);
      doc.setFillColor(i % 2 === 0 ? 240 : 248, i % 2 === 0 ? 244 : 250, i % 2 === 0 ? 248 : 252);
      doc.roundedRect(M, y, CW, 26, 1.5, 1.5, "F");
      y += 4;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(11, 31, 58);
      doc.text(`SERVER ${i + 1}${s.name ? " — " + s.name : ""}`, M + 3, y);
      y += 5;
      row([["Role:", s.role], ["IP Address:", s.ip], ["MAC:", s.mac], ["Serial #:", s.serial]]);
      row([["OS / Platform:", s.os], ["Storage:", s.storage], ["Location:", s.location]]);
      noteRow(s.notes);
      divider();
    });
  }
  // ─ SWITCHING ─
  if (state.switches.length) {
    np();
    sectionBanner("NETWORK SWITCHING", "🔀");
    state.switches.forEach((sw, i) => {
      chk(28);
      doc.setFillColor(i % 2 === 0 ? 240 : 248, i % 2 === 0 ? 244 : 250, i % 2 === 0 ? 248 : 252);
      doc.roundedRect(M, y, CW, 26, 1.5, 1.5, "F");
      y += 4;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(11, 31, 58);
      doc.text(`SWITCH ${i + 1}${sw.name ? " — " + sw.name : ""}`, M + 3, y);
      y += 5;
      row([["Model:", sw.model], ["IP Address:", sw.ip], ["MAC:", sw.mac], ["Serial #:", sw.serial]]);
      row([["Port Count:", sw.ports], ["VLAN Config:", sw.vlan], ["Uplink:", sw.uplink], ["Location:", sw.location]]);
      noteRow(sw.notes);
      divider();
    });
  }
  // ─ CAMERAS ─
  if (state.cameras.length) {
    np();
    sectionBanner("CCTV / VMS CAMERA PROGRAMMING LOG", "📷");
    if (state.nvrBrand) {
      doc.setFillColor(235, 244, 255); doc.roundedRect(M, y, CW, 14, 1.5, 1.5, "F");
      y += 3;
      row([["NVR/DVR Brand:", state.nvrBrand], ["Model:", state.nvrModel], ["IP:", state.nvrIp], ["Serial:", state.nvrSerial]]);
      row([["Firmware:", state.nvrFirmware], ["Storage:", state.nvrStorage], ["Retention:", state.nvrRetention], ["VMS Software:", state.vmsSoftware]]);
      y += 2;
    }
    state.cameras.forEach((cam, i) => {
      chk(42);
      doc.setFillColor(i % 2 === 0 ? 240 : 248, i % 2 === 0 ? 244 : 250, i % 2 === 0 ? 248 : 252);
      doc.roundedRect(M, y, CW, 40, 1.5, 1.5, "F");
      y += 4;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(11, 31, 58);
      doc.text(`CAMERA ${i + 1}${cam.name ? " — " + cam.name : ""}`, M + 3, y);
      y += 5;
      row([["Location:", cam.location], ["IP Address:", cam.ip], ["MAC:", cam.mac], ["Serial #:", cam.serial]]);
      row([["Codec:", cam.codec], ["Resolution:", cam.resolution], ["Lens:", cam.lens], ["Type:", cam.type]]);
      row([["HTTP Port:", cam.port], ["RTSP Port:", cam.rtspPort], ["FPS:", cam.fps], ["Bitrate:", cam.bitrate]]);
      row([["Username:", cam.username], ["Password:", cam.password], ["Storage Group:", cam.storageGroup], ["PTZ:", cam.ptz ? "Yes" : "No"]]);
      noteRow(cam.notes);
      divider();
    });
  }
  // ─ ACCESS CONTROL ─
  if (state.doors.length) {
    np();
    sectionBanner("ACCESS CONTROL PROGRAMMING LOG", "🚪");
    state.doors.forEach((d, i) => {
      chk(38);
      doc.setFillColor(i % 2 === 0 ? 240 : 248, i % 2 === 0 ? 244 : 250, i % 2 === 0 ? 248 : 252);
      doc.roundedRect(M, y, CW, 36, 1.5, 1.5, "F");
      y += 4;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(11, 31, 58);
      doc.text(`DOOR ${i + 1}${d.name ? " — " + d.name : ""}`, M + 3, y);
      y += 5;
      row([["Location:", d.location], ["Controller:", d.controllerName], ["Controller IP:", d.controllerIP], ["Controller S/N:", d.controllerSerial]]);
      row([["Reader Type:", d.readerType], ["Reader S/N:", d.readerSerial], ["Credential:", d.credentialType], ["Lock Type:", d.lockType]]);
      row([["Card Format:", d.cardFormat], ["Facility Code:", d.facilityCode], ["Access Group:", d.accessGroup], ["Schedule:", d.schedule]]);
      row([["REX Installed:", d.rex ? "Yes" : "No"], ["Door Contact:", d.doorContact ? "Yes" : "No"]]);
      noteRow(d.notes);
      divider();
    });
  }
  // ─ INTRUSION ─
  if (state.zones.length) {
    np();
    sectionBanner("INTRUSION SYSTEM PROGRAMMING LOG", "🔔");
    if (state.panelBrand) {
      doc.setFillColor(235, 244, 255); doc.roundedRect(M, y, CW, 12, 1.5, 1.5, "F");
      y += 3;
      row([["Panel Brand:", state.panelBrand], ["Model:", state.panelModel], ["Serial:", state.panelSerial], ["Firmware:", state.panelFirmware]]);
      y += 4;
    }
    state.zones.forEach((z, i) => {
      chk(22);
      doc.setFillColor(i % 2 === 0 ? 240 : 248, i % 2 === 0 ? 244 : 250, i % 2 === 0 ? 248 : 252);
      doc.roundedRect(M, y, CW, 20, 1.5, 1.5, "F");
      y += 4;
      row([["Zone #:", z.zoneNumber], ["Name:", z.name], ["Location:", z.location], ["Type:", z.zoneType]]);
      row([["Partitions:", z.partitions], ["Bypassable:", z.bypassable ? "Yes" : "No"]]);
      noteRow(z.notes);
      divider();
    });
  }
  // ─ AUDIO ─
  if (state.speakers.length) {
    np();
    sectionBanner("AUDIO SYSTEM PROGRAMMING LOG", "🔊");
    state.speakers.forEach((sp, i) => {
      chk(20);
      doc.setFillColor(i % 2 === 0 ? 240 : 248, i % 2 === 0 ? 244 : 250, i % 2 === 0 ? 248 : 252);
      doc.roundedRect(M, y, CW, 18, 1.5, 1.5, "F");
      y += 4;
      row([["Zone/Speaker:", sp.name], ["Location:", sp.location], ["IP/Address:", sp.ip], ["Zone Group:", sp.zoneGroup]]);
      row([["Volume (%):", sp.volume], ["Amp Zone:", sp.ampZone]]);
      noteRow(sp.notes);
      divider();
    });
  }
  // ─ Sign-off ─
  np();
  sectionBanner("SIGN-OFF & CERTIFICATION", "✅");
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
  doc.text("The undersigned certifies all programming listed in this document has been completed, tested, verified, and customer training provided.", M, y);
  y += 12;
  [["Lead Technician", state.techLead], ["Customer Representative", state.customer]].forEach(([lbl, name], i) => {
    const x = M + i * (CW / 2 + 2);
    doc.setDrawColor(200, 210, 220); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, CW / 2 - 2, 30, 2, 2, "S");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(107, 126, 150); doc.text(lbl, x + 4, y + 7);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(11, 31, 58); doc.text(name || "___________________________", x + 4, y + 16);
    doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.text("Date: __________________", x + 4, y + 24);
  });
  // Page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(160, 160, 160);
    doc.text(`Page ${i} of ${totalPages}`, W - M - 18, 270);
    doc.text("CONFIDENTIAL — Programming & Configuration Work Order", M, 270);
  }
  const fname = `PCWO_${(projectMeta.name).replace(/\s+/g, "_").substring(0, 40)}_${state.date}.pdf`;
  doc.save(fname);
}
// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("select"); // select | build
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tab, setTab] = useState("info");
  const [generating, setPDF] = useState(false);
  const [sdkReady, setSDK] = useState(false);
  const [info, setInfo] = useState({ customer: "", siteAddress: "", techLead: "", techs: "", date: new Date().toISOString().split("T")[0], submittedBy: "" });
  const [nvrInfo, setNVR] = useState({ nvrBrand: "", nvrModel: "", nvrIp: "", nvrSerial: "", nvrFirmware: "", nvrStorage: "", nvrRetention: "", vmsSoftware: "" });
  const [panelInfo, setPanel] = useState({ panelBrand: "", panelModel: "", panelSerial: "", panelFirmware: "" });
  const [cameras, setCameras] = useState([]);
  const [doors, setDoors] = useState([]);
  const [zones, setZones] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [switches, setSwitches] = useState([]);
  const [servers, setServers] = useState([]);
  useEffect(() => {
    // Idempotency guard: avoid double-appending in React 18 StrictMode
    if (window.jspdf) { setSDK(true); return; }
    if (document.querySelector('script[src*="jspdf"]')) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => setSDK(true);
    document.head.appendChild(s);
    fetchProjects().then(p => { setProjects(p); setLoadingProjects(false); }).catch(() => setLoadingProjects(false));
  }, []);
  const setI = (k, v) => setInfo(x => ({ ...x, [k]: v }));
  const setNV = (k, v) => setNVR(x => ({ ...x, [k]: v }));
  const setPan = (k, v) => setPanel(x => ({ ...x, [k]: v }));
  const upd = (setter, id, k, v) => setter(arr => arr.map(x => x.id === id ? { ...x, [k]: v } : x));
  const rem = (setter, id) => setter(arr => arr.filter(x => x.id !== id));
  const handleGenerate = async () => {
    if (!sdkReady) return;
    setPDF(true);
    try {
      await buildPDF({ ...info, ...nvrInfo, ...panelInfo, cameras, doors, zones, speakers, switches, servers }, { name: selectedProject?.name || "Project", projectId: selectedProject?.projectId || "—" });
    } catch (e) { alert("PDF error: " + e.message); }
    setPDF(false);
  };
  const TABS = [
    { id: "info", label: "Project Info", icon: "📋" },
    { id: "servers", label: "Servers", icon: "🖥", count: servers.length },
    { id: "switches", label: "Switching", icon: "🔀", count: switches.length },
    { id: "cameras", label: "CCTV", icon: "📷", count: cameras.length },
    { id: "access", label: "Access", icon: "🚪", count: doors.length },
    { id: "intrusion", label: "Intrusion", icon: "🔔", count: zones.length },
    { id: "audio", label: "Audio", icon: "🔊", count: speakers.length },
    { id: "export", label: "Export PDF", icon: "📤" },
  ];
  // ─ PROJECT SELECT PHASE ─
  if (phase === "select") {
    return (
      <div style={{ minHeight: "100vh", background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 720, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 22, letterSpacing: "0.02em" }}>PROGRAMMING & CONFIG WORK ORDER</div>
            <div style={{ color: C.accent, fontSize: 13, marginTop: 4, letterSpacing: "0.06em" }}>Select a project from monday.com to begin</div>
          </div>
          {loadingProjects ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <div>Loading projects from monday.com...</div>
            </div>
          ) : projects.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedProject(p);
                    setInfo(x => ({ ...x, techLead: p.techLead || "", techs: p.techResource || "" }));
                    setPhase("build");
                  }}
                  style={{
                    background: "rgba(255,255,255,0.06)", border: `1.5px solid rgba(255,255,255,0.1)`,
                    borderRadius: 10, padding: "14px 18px", cursor: "pointer", transition: "all .15s",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,174,239,0.15)"; e.currentTarget.style.borderColor = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                >
                  <div>
                    <div style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>
                      ID: {p.projectId || "—"}  ·  Tech Lead: {p.techLead || "—"}  ·  Status: {p.programmingStatus || "—"}
                    </div>
                  </div>
                  <span style={{ color: C.accent, fontSize: 18 }}>→</span>
                </div>
              ))}
            </div>
          ) : (
            // Fallback: manual entry
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 24 }}>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 16, textAlign: "center" }}>
                Could not load monday.com projects. Enter project details manually.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[["Project Name","name"],["Project ID","projectId"]].map(([lbl, k]) => (
                  <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{lbl}</label>
                    <input placeholder={lbl} style={{ padding: "8px 10px", borderRadius: 6, border: `1.5px solid rgba(255,255,255,0.15)`, background: "rgba(255,255,255,0.08)", color: C.white, fontSize: 13, outline: "none" }}
                      onChange={e => {
                        const proj = { ...(selectedProject || { id: "manual", name: "", projectId: "" }) };
                        proj[k] = e.target.value;
                        setSelectedProject(proj);
                      }}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPhase("build")}
                style={{ width: "100%", marginTop: 16, background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Continue →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  // ─ BUILD PHASE ─
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Topbar */}
      <div style={{ background: C.navy, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 18px", height: 48 }}>
          <button onClick={() => setPhase("select")} style={{ background: "rgba(255,255,255,0.1)", color: C.white, border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>← Back</button>
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.15)" }} />
          <div>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 13 }}>{selectedProject?.name || "Project"}</div>
            <div style={{ color: C.accent, fontSize: 10 }}>ID: {selectedProject?.projectId || "—"}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            {[servers, switches, cameras, doors, zones, speakers].flat().length > 0 && (
              <span style={{ background: C.accent, color: C.white, borderRadius: 10, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                {[servers, switches, cameras, doors, zones, speakers].flat().length} devices
              </span>
            )}
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
                  {[["NVR/DVR Brand","nvrBrand","e.g. Hikvision"],["Model","nvrModel","DS-9632NI"],["IP Address","nvrIp","192.168.x.x"],["Serial Number","nvrSerial",""],["Firmware","nvrFirmware",""],["Storage","nvrStorage","e.g. 4×4TB"],["Retention","nvrRetention","e.g. 30 days"],["VMS Software","vmsSoftware","e.g. iVMS-4200"]].map(([lbl, k, ph]) => (
                    <F key={k} label={lbl}><Inp value={nvrInfo[k]} onChange={e => setNV(k, e.target.value)} placeholder={ph} /></F>
                  ))}
                </G>
              </div>
            </div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <CardHead icon="🔔" title="Intrusion Panel Details" color={C.steel} />
              <div style={{ padding: 18 }}>
                <G cols={4}>
                  <F label="Panel Brand"><Sel value={panelInfo.panelBrand} onChange={e => setPan("panelBrand", e.target.value)}><option value="">Select...</option>{PANEL_BRANDS.map(b => <option key={b}>{b}</option>)}</Sel></F>
                  {[["Model","panelModel"],["Serial #","panelSerial"],["Firmware","panelFirmware"]].map(([lbl, k]) => (
                    <F key={k} label={lbl}><Inp value={panelInfo[k]} onChange={e => setPan(k, e.target.value)} /></F>
                  ))}
                </G>
              </div>
            </div>
          </div>
        )}
        {/* ─ SERVERS ─ */}
        {tab === "servers" && (
          <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <CardHead icon="🖥" title="Servers & Computing" count={servers.length} onAdd={() => setServers(a => [...a, mkServer()])} addLabel="Add Server" color={C.navy} />
            <div style={{ padding: 18 }}>
              {servers.length === 0 && <Empty icon="🖥" msg="No servers added" />}
              {servers.map((s, i) => (
                <DevCard key={s.id}>
                  <ItemHdr title="Server" idx={i} onRemove={() => rem(setServers, s.id)} />
                  <G cols={3}>
                    <F label="Server Name / Label"><Inp value={s.name} onChange={e => upd(setServers, s.id, "name", e.target.value)} placeholder="e.g. VMS-01" /></F>
                    <F label="Role / Function">
                      <Sel value={s.role} onChange={e => upd(setServers, s.id, "role", e.target.value)}>
                        <option value="">Select role...</option>{SERVER_ROLES.map(r => <option key={r}>{r}</option>)}
                      </Sel>
                    </F>
                    <F label="Location"><Inp value={s.location} onChange={e => upd(setServers, s.id, "location", e.target.value)} placeholder="e.g. Server Room, Rack 1" /></F>
                    <F label="IP Address"><Inp value={s.ip} onChange={e => upd(setServers, s.id, "ip", e.target.value)} placeholder="192.168.x.x" /></F>
                    <F label="MAC Address"><Inp value={s.mac} onChange={e => upd(setServers, s.id, "mac", e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" /></F>
                    <F label="Serial Number"><Inp value={s.serial} onChange={e => upd(setServers, s.id, "serial", e.target.value)} /></F>
                    <F label="OS / Platform"><Inp value={s.os} onChange={e => upd(setServers, s.id, "os", e.target.value)} placeholder="e.g. Windows Server 2022" /></F>
                    <F label="Storage Config"><Inp value={s.storage} onChange={e => upd(setServers, s.id, "storage", e.target.value)} placeholder="e.g. RAID 5 / 8TB" /></F>
                    <F label="Notes"><Inp value={s.notes} onChange={e => upd(setServers, s.id, "notes", e.target.value)} /></F>
                  </G>
                </DevCard>
              ))}
            </div>
          </div>
        )}
        {/* ─ SWITCHES ─ */}
        {tab === "switches" && (
          <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <CardHead icon="🔀" title="Network Switching" count={switches.length} onAdd={() => setSwitches(a => [...a, mkSwitch()])} addLabel="Add Switch" color={C.navy} />
            <div style={{ padding: 18 }}>
              {switches.length === 0 && <Empty icon="🔀" msg="No switches added" />}
              {switches.map((sw, i) => (
                <DevCard key={sw.id}>
                  <ItemHdr title="Switch" idx={i} onRemove={() => rem(setSwitches, sw.id)} />
                  <G cols={3}>
                    <F label="Switch Name"><Inp value={sw.name} onChange={e => upd(setSwitches, sw.id, "name", e.target.value)} placeholder="e.g. CCTV-SW-01" /></F>
                    <F label="Model"><Inp value={sw.model} onChange={e => upd(setSwitches, sw.id, "model", e.target.value)} placeholder="e.g. Cisco SG350-28P" /></F>
                    <F label="Location"><Inp value={sw.location} onChange={e => upd(setSwitches, sw.id, "location", e.target.value)} placeholder="e.g. IDF Room B" /></F>
                    <F label="IP Address"><Inp value={sw.ip} onChange={e => upd(setSwitches, sw.id, "ip", e.target.value)} placeholder="192.168.x.x" /></F>
                    <F label="MAC Address"><Inp value={sw.mac} onChange={e => upd(setSwitches, sw.id, "mac", e.target.value)} /></F>
                    <F label="Serial Number"><Inp value={sw.serial} onChange={e => upd(setSwitches, sw.id, "serial", e.target.value)} /></F>
                    <F label="Port Count"><Inp value={sw.ports} onChange={e => upd(setSwitches, sw.id, "ports", e.target.value)} placeholder="e.g. 24 PoE" /></F>
                    <F label="VLAN Config"><Inp value={sw.vlan} onChange={e => upd(setSwitches, sw.id, "vlan", e.target.value)} placeholder="e.g. VLAN 10 CCTV, 20 AC" /></F>
                    <F label="Uplink Port/Speed"><Inp value={sw.uplink} onChange={e => upd(setSwitches, sw.id, "uplink", e.target.value)} placeholder="e.g. G1 1Gbps to core" /></F>
                    <F label="Notes" span={3}><TA value={sw.notes} onChange={e => upd(setSwitches, sw.id, "notes", e.target.value)} /></F>
                  </G>
                </DevCard>
              ))}
            </div>
          </div>
        )}
        {/* ─ CAMERAS ─ */}
        {tab === "cameras" && (
          <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <CardHead icon="📷" title="CCTV Camera Programming" count={cameras.length} onAdd={() => setCameras(a => [...a, mkCamera()])} addLabel="Add Camera" color={C.navy} />
            <div style={{ padding: 18 }}>
              {cameras.length === 0 && <Empty icon="📷" msg="No cameras added" />}
              {cameras.map((cam, i) => (
                <DevCard key={cam.id}>
                  <ItemHdr title="Camera" idx={i} onRemove={() => rem(setCameras, cam.id)} />
                  <G cols={3}>
                    <F label="Camera Name"><Inp value={cam.name} onChange={e => upd(setCameras, cam.id, "name", e.target.value)} placeholder="e.g. North Entry" /></F>
                    <F label="Location" span={2}><Inp value={cam.location} onChange={e => upd(setCameras, cam.id, "location", e.target.value)} placeholder="e.g. NE corner lobby ceiling" /></F>
                    <F label="IP Address"><Inp value={cam.ip} onChange={e => upd(setCameras, cam.id, "ip", e.target.value)} placeholder="192.168.x.x" /></F>
                    <F label="MAC Address"><Inp value={cam.mac} onChange={e => upd(setCameras, cam.id, "mac", e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" /></F>
                    <F label="Serial Number"><Inp value={cam.serial} onChange={e => upd(setCameras, cam.id, "serial", e.target.value)} /></F>
                    <F label="Codec"><Sel value={cam.codec} onChange={e => upd(setCameras, cam.id, "codec", e.target.value)}>{CODECS.map(o => <option key={o}>{o}</option>)}</Sel></F>
                    <F label="Resolution"><Sel value={cam.resolution} onChange={e => upd(setCameras, cam.id, "resolution", e.target.value)}>{RESS.map(o => <option key={o}>{o}</option>)}</Sel></F>
                    <F label="Lens"><Sel value={cam.lens} onChange={e => upd(setCameras, cam.id, "lens", e.target.value)}>{LENSES.map(o => <option key={o}>{o}</option>)}</Sel></F>
                    <F label="Camera Type"><Sel value={cam.type} onChange={e => upd(setCameras, cam.id, "type", e.target.value)}>{CAM_TYPES.map(o => <option key={o}>{o}</option>)}</Sel></F>
                    <F label="HTTP Port"><Inp value={cam.port} onChange={e => upd(setCameras, cam.id, "port", e.target.value)} placeholder="80" /></F>
                    <F label="RTSP Port"><Inp value={cam.rtspPort} onChange={e => upd(setCameras, cam.id, "rtspPort", e.target.value)} placeholder="554" /></F>
                    <F label="FPS"><Inp value={cam.fps} onChange={e => upd(setCameras, cam.id, "fps", e.target.value)} placeholder="15" /></F>
                    <F label="Bitrate"><Inp value={cam.bitrate} onChange={e => upd(setCameras, cam.id, "bitrate", e.target.value)} placeholder="e.g. 4096 kbps" /></F>
                    <F label="Storage Group"><Inp value={cam.storageGroup} onChange={e => upd(setCameras, cam.id, "storageGroup", e.target.value)} /></F>
                    <F label="Username"><Inp value={cam.username} onChange={e => upd(setCameras, cam.id, "username", e.target.value)} /></F>
                    <F label="Password"><Inp value={cam.password} onChange={e => upd(setCameras, cam.id, "password", e.target.value)} /></F>
                    <F label="PTZ"><div style={{ paddingTop: 6 }}><Tog label="PTZ Enabled" val={cam.ptz} set={v => upd(setCameras, cam.id, "ptz", v)} /></div></F>
                    <F label="Notes" span={3}><TA value={cam.notes} onChange={e => upd(setCameras, cam.id, "notes", e.target.value)} /></F>
                  </G>
                </DevCard>
              ))}
            </div>
          </div>
        )}
        {/* ─ ACCESS ─ */}
        {tab === "access" && (
          <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <CardHead icon="🚪" title="Access Control Door Programming" count={doors.length} onAdd={() => setDoors(a => [...a, mkDoor()])} addLabel="Add Door" color={C.navy} />
            <div style={{ padding: 18 }}>
              {doors.length === 0 && <Empty icon="🚪" msg="No doors added" />}
              {doors.map((d, i) => (
                <DevCard key={d.id}>
                  <ItemHdr title="Door" idx={i} onRemove={() => rem(setDoors, d.id)} />
                  <G cols={3}>
                    <F label="Door Name"><Inp value={d.name} onChange={e => upd(setDoors, d.id, "name", e.target.value)} placeholder="e.g. Main Entrance" /></F>
                    <F label="Location" span={2}><Inp value={d.location} onChange={e => upd(setDoors, d.id, "location", e.target.value)} /></F>
                    <F label="Controller"><Inp value={d.controllerName} onChange={e => upd(setDoors, d.id, "controllerName", e.target.value)} /></F>
                    <F label="Controller IP"><Inp value={d.controllerIP} onChange={e => upd(setDoors, d.id, "controllerIP", e.target.value)} placeholder="192.168.x.x" /></F>
                    <F label="Controller S/N"><Inp value={d.controllerSerial} onChange={e => upd(setDoors, d.id, "controllerSerial", e.target.value)} /></F>
                    <F label="Reader Type"><Sel value={d.readerType} onChange={e => upd(setDoors, d.id, "readerType", e.target.value)}>{READER_TYPES.map(o => <option key={o}>{o}</option>)}</Sel></F>
                    <F label="Reader S/N"><Inp value={d.readerSerial} onChange={e => upd(setDoors, d.id, "readerSerial", e.target.value)} /></F>
                    <F label="Credential Type"><Sel value={d.credentialType} onChange={e => upd(setDoors, d.id, "credentialType", e.target.value)}>{CRED_TYPES.map(o => <option key={o}>{o}</option>)}</Sel></F>
                    <F label="Lock Type"><Sel value={d.lockType} onChange={e => upd(setDoors, d.id, "lockType", e.target.value)}>{LOCK_TYPES.map(o => <option key={o}>{o}</option>)}</Sel></F>
                    <F label="Card Format"><Inp value={d.cardFormat} onChange={e => upd(setDoors, d.id, "cardFormat", e.target.value)} placeholder="e.g. 26-bit Wiegand" /></F>
                    <F label="Facility Code"><Inp value={d.facilityCode} onChange={e => upd(setDoors, d.id, "facilityCode", e.target.value)} /></F>
                    <F label="Access Group"><Inp value={d.accessGroup} onChange={e => upd(setDoors, d.id, "accessGroup", e.target.value)} /></F>
                    <F label="Schedule"><Inp value={d.schedule} onChange={e => upd(setDoors, d.id, "schedule", e.target.value)} placeholder="e.g. 24/7 or M-F 7a-6p" /></F>
                    <F label="Hardware">
                      <div style={{ display: "flex", gap: 16, paddingTop: 4 }}>
                        <Tog label="REX" val={d.rex} set={v => upd(setDoors, d.id, "rex", v)} />
                        <Tog label="Door Contact" val={d.doorContact} set={v => upd(setDoors, d.id, "doorContact", v)} />
                      </div>
                    </F>
                    <F label="Notes" span={3}><TA value={d.notes} onChange={e => upd(setDoors, d.id, "notes", e.target.value)} /></F>
                  </G>
                </DevCard>
              ))}
            </div>
          </div>
        )}
        {/* ─ INTRUSION ─ */}
        {tab === "intrusion" && (
          <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <CardHead icon="🔔" title="Intrusion Zone Programming" count={zones.length} onAdd={() => setZones(a => [...a, mkZone()])} addLabel="Add Zone" color={C.navy} />
            <div style={{ padding: 18 }}>
              {zones.length === 0 && <Empty icon="🔔" msg="No zones added" />}
              {zones.map((z, i) => (
                <DevCard key={z.id}>
                  <ItemHdr title="Zone" idx={i} onRemove={() => rem(setZones, z.id)} />
                  <G cols={3}>
                    <F label="Zone #"><Inp value={z.zoneNumber} onChange={e => upd(setZones, z.id, "zoneNumber", e.target.value)} placeholder="01" /></F>
                    <F label="Zone Name"><Inp value={z.name} onChange={e => upd(setZones, z.id, "name", e.target.value)} placeholder="e.g. Back Door PIR" /></F>
                    <F label="Location"><Inp value={z.location} onChange={e => upd(setZones, z.id, "location", e.target.value)} /></F>
                    <F label="Zone Type"><Sel value={z.zoneType} onChange={e => upd(setZones, z.id, "zoneType", e.target.value)}>{ZONE_TYPES.map(o => <option key={o}>{o}</option>)}</Sel></F>
                    <F label="Partitions"><Inp value={z.partitions} onChange={e => upd(setZones, z.id, "partitions", e.target.value)} placeholder="e.g. 1, 2" /></F>
                    <F label="Options"><div style={{ paddingTop: 4 }}><Tog label="Bypassable" val={z.bypassable} set={v => upd(setZones, z.id, "bypassable", v)} /></div></F>
                    <F label="Notes" span={3}><TA value={z.notes} onChange={e => upd(setZones, z.id, "notes", e.target.value)} placeholder="EOL value, wiring notes..." /></F>
                  </G>
                </DevCard>
              ))}
            </div>
          </div>
        )}
        {/* ─ AUDIO ─ */}
        {tab === "audio" && (
          <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <CardHead icon="🔊" title="Audio Zone Programming" count={speakers.length} onAdd={() => setSpeakers(a => [...a, mkSpeaker()])} addLabel="Add Zone" color={C.navy} />
            <div style={{ padding: 18 }}>
              {speakers.length === 0 && <Empty icon="🔊" msg="No audio zones added" />}
              {speakers.map((sp, i) => (
                <DevCard key={sp.id}>
                  <ItemHdr title="Audio Zone" idx={i} onRemove={() => rem(setSpeakers, sp.id)} />
                  <G cols={3}>
                    <F label="Zone/Speaker Name"><Inp value={sp.name} onChange={e => upd(setSpeakers, sp.id, "name", e.target.value)} placeholder="e.g. Lobby PA" /></F>
                    <F label="Location"><Inp value={sp.location} onChange={e => upd(setSpeakers, sp.id, "location", e.target.value)} /></F>
                    <F label="IP / Address"><Inp value={sp.ip} onChange={e => upd(setSpeakers, sp.id, "ip", e.target.value)} placeholder="192.168.x.x or N/A" /></F>
                    <F label="Zone Group"><Inp value={sp.zoneGroup} onChange={e => upd(setSpeakers, sp.id, "zoneGroup", e.target.value)} /></F>
                    <F label="Volume (%)"><Inp type="number" min="0" max="100" value={sp.volume} onChange={e => upd(setSpeakers, sp.id, "volume", e.target.value)} /></F>
                    <F label="Amp Zone / Tap"><Inp value={sp.ampZone} onChange={e => upd(setSpeakers, sp.id, "ampZone", e.target.value)} placeholder="e.g. Amp 1 Zone A" /></F>
                    <F label="Notes" span={3}><TA value={sp.notes} onChange={e => upd(setSpeakers, sp.id, "notes", e.target.value)} /></F>
                  </G>
                </DevCard>
              ))}
            </div>
          </div>
        )}
        {/* ─ EXPORT ─ */}
        {tab === "export" && (
          <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <CardHead icon="📤" title="Review & Export PDF Report" color={C.navy} />
            <div style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
                {[["🖥","Servers",servers.length],["🔀","Switches",switches.length],["📷","Cameras",cameras.length],["🚪","Access Doors",doors.length],["🔔","Intrusion Zones",zones.length],["🔊","Audio Zones",speakers.length]].map(([ic, lbl, cnt]) => (
                  <div key={lbl} style={{ background: C.bg, borderRadius: 8, padding: 16, textAlign: "center", borderTop: `3px solid ${C.accent}` }}>
                    <div style={{ fontSize: 24 }}>{ic}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>{cnt}</div>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: C.bg, borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>Report will include:</div>
                {[
                  servers.length > 0 && `✅ ${servers.length} server(s) — names, IPs, roles, serials, OS`,
                  switches.length > 0 && `✅ ${switches.length} switch(es) — IPs, MACs, VLANs, uplinks`,
                  cameras.length > 0 && `✅ ${cameras.length} camera(s) — full config: IP, MAC, serial, codec, resolution, lens, ports`,
                  doors.length > 0 && `✅ ${doors.length} access door(s) — controllers, readers, card format, schedules`,
                  zones.length > 0 && `✅ ${zones.length} intrusion zone(s) — zone numbers, types, partitions`,
                  speakers.length > 0 && `✅ ${speakers.length} audio zone(s) — zones, volumes, amp config`,
                  "📋 Project info header + VMS recorder details + panel info",
                  "✍️ Technician and customer sign-off section",
                ].filter(Boolean).map((item, i) => (
                  <div key={i} style={{ fontSize: 13, color: C.navy, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>{item}</div>
                ))}
              </div>
              <div style={{ textAlign: "center" }}>
                <button onClick={handleGenerate} disabled={generating || !sdkReady}
                  style={{ background: generating ? C.muted : C.gold, color: C.navy, border: "none", borderRadius: 10, padding: "16px 52px", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 18px rgba(244,163,0,.4)", letterSpacing: "0.03em" }}>
                  {generating ? "⏳ Building PDF..." : "⬇ Export Programming & Config Report"}
                </button>
                <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
                  PDF named by project + date. Ready for customer submittal.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
