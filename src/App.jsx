import { useState, useEffect, useRef, useCallback } from "react";
import { loadWorkOrder, saveWorkOrder, listLibrary, getSpecSheetUrl, listProjectFiles } from "./supabase";
import { C } from "./constants";
import { uid } from "./models";
import { fetchProjects, fetchBoardColumns, pushMondayUpdate, MONDAY_BOARD_ID } from "./api/monday";
import { parseCSVLine, parseProposalCSV, buildGroupsFromRows } from "./api/portal";
import { buildCSV } from "./utils/buildCSV";
import { buildPDF } from "./utils/buildPDF";
// UI components used by tab modules — no direct usage in App shell
import MasterDashboard from "./components/MasterDashboard";
import InfoTab from "./tabs/InfoTab";
import DashboardTab from "./tabs/DashboardTab";
import LaborTab from "./tabs/LaborTab";
import ProcurementTab from "./tabs/ProcurementTab";
import AccessTab from "./tabs/AccessTab";
import AudioTab from "./tabs/AudioTab";
import CamerasTab from "./tabs/CamerasTab";
import IntrusionTab from "./tabs/IntrusionTab";
import ServersTab from "./tabs/ServersTab";
import SwitchesTab from "./tabs/SwitchesTab";
import FilesTab from "./tabs/FilesTab";
import LibraryTab from "./tabs/LibraryTab";
import ExportTab from "./tabs/ExportTab";
// ── Toast helper (simple alert fallback) ─────────────────────────────────────
const showToast = (msg) => alert(msg);

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
          <InfoTab info={info} setI={setI} nvrInfo={nvrInfo} setNV={setNV} panelInfo={panelInfo} setPan={setPan} />
        )}
        {/* ─ SERVERS ─ */}
        {tab === "servers" && (
          <ServersTab
            serverGroups={serverGroups} setServerGroups={setServerGroups}
            srvCount={srvCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
          />
        )}
        {/* ─ SWITCHES ─ */}
        {tab === "switches" && (
          <SwitchesTab
            switchGroups={switchGroups} setSwitchGroups={setSwitchGroups}
            swCount={swCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
          />
        )}
        {/* ─ CAMERAS ─ */}
        {tab === "cameras" && (
          <CamerasTab
            cameraGroups={cameraGroups} setCameraGroups={setCameraGroups}
            camCount={camCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
          />
        )}
        {/* ─ ACCESS ─ */}
        {tab === "access" && (
          <AccessTab
            doorGroups={doorGroups} setDoorGroups={setDoorGroups}
            doorCount={doorCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
          />
        )}
        {/* ─ INTRUSION ─ */}
        {tab === "intrusion" && (
          <IntrusionTab
            zoneGroups={zoneGroups} setZoneGroups={setZoneGroups}
            zoneCount={zoneCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
          />
        )}
        {/* ─ AUDIO ─ */}
        {tab === "audio" && (
          <AudioTab
            speakerGroups={speakerGroups} setSpeakerGroups={setSpeakerGroups}
            spkCount={spkCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
          />
        )}
        {/* ─ LABOR ─ */}
        {tab === "labor" && (
          <LaborTab
            laborBudget={laborBudget} setLaborBudget={setLaborBudget}
            laborActual={laborActual} setLaborActual={setLaborActual}
            LABOR_TYPES={LABOR_TYPES} emptyLabor={emptyLabor}
          />
        )}

        {/* ─ DASHBOARD ─ */}
        {tab === "dashboard" && (
          <DashboardTab
            cameraGroups={cameraGroups} doorGroups={doorGroups}
            speakerGroups={speakerGroups} zoneGroups={zoneGroups}
            serverGroups={serverGroups} switchGroups={switchGroups}
            laborBudget={laborBudget} laborActual={laborActual}
            LABOR_TYPES={LABOR_TYPES} changeLog={changeLog} setChangeLog={setChangeLog}
            webhookUrl={webhookUrl} setWebhookUrl={setWebhookUrl}
            aiLoading={aiLoading} setAiLoading={setAiLoading}
            selectedProject={selectedProject} info={info}
            dashCollapsed={dashCollapsed} setDashCollapsed={setDashCollapsed}
            showToast={showToast}
          />
        )}

        {/* ─ PROCUREMENT ─ */}
        {tab === "procurement" && (
          <ProcurementTab
            cameraGroups={cameraGroups} setCameraGroups={setCameraGroups}
            switchGroups={switchGroups} setSwitchGroups={setSwitchGroups}
            serverGroups={serverGroups} setServerGroups={setServerGroups}
            doorGroups={doorGroups} setDoorGroups={setDoorGroups}
            zoneGroups={zoneGroups} setZoneGroups={setZoneGroups}
            speakerGroups={speakerGroups} setSpeakerGroups={setSpeakerGroups}
            mondaySyncEnabled={mondaySyncEnabled} setMondaySyncEnabled={setMondaySyncEnabled}
            mondaySyncColId={mondaySyncColId} setMondaySyncColId={setMondaySyncColId}
            addLog={addLog}
          />
        )}
        {/* ─ FILES ─ */}
        {tab === "files" && (
          <FilesTab
            selectedProject={selectedProject} projectFiles={projectFiles}
            setProjectFiles={setProjectFiles} filesLoading={filesLoading}
            fileUploadCat={fileUploadCat} setFileUploadCat={setFileUploadCat}
            fileInputRef={fileInputRef} showToast={showToast}
          />
        )}
        {/* ─ LIBRARY ─ */}
        {tab === "library" && (
          <LibraryTab
            library={library} setLibrary={setLibrary} libraryLoading={libraryLoading}
            libUploadForm={libUploadForm} setLibUploadForm={setLibUploadForm}
            libShowAll={libShowAll} setLibShowAll={setLibShowAll}
            cameraGroups={cameraGroups} doorGroups={doorGroups} zoneGroups={zoneGroups}
            speakerGroups={speakerGroups} switchGroups={switchGroups} serverGroups={serverGroups}
          />
        )}

        {/* ─ EXPORT ─ */}
        {tab === "export" && (
          <ExportTab
            cameraGroups={cameraGroups} switchGroups={switchGroups} serverGroups={serverGroups}
            doorGroups={doorGroups} zoneGroups={zoneGroups} speakerGroups={speakerGroups}
            camCount={camCount} swCount={swCount} srvCount={srvCount}
            doorCount={doorCount} zoneCount={zoneCount} spkCount={spkCount}
            totalDevices={totalDevices} generating={generating} sdkReady={sdkReady}
            pdfLibReady={pdfLibReady} handleCSV={handleCSV} handleGenerate={handleGenerate}
            buildOEMManual={buildOEMManual} importFileRef={importFileRef}
            coverPageFile={coverPageFile} setCoverPageFile={setCoverPageFile}
            coverFileRef={coverFileRef} library={library}
            importPreview={importPreview} setImportPreview={setImportPreview}
            handleProposalImport={handleProposalImport} selectedProject={selectedProject}
          />
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
