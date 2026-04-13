import { useState, useEffect, useRef, useCallback } from "react";
import { saveWorkOrder, listLibrary, getSpecSheetUrl, listProjectFiles, catalogDevices } from "./supabase";
import { C, SOP_VLANS, SOP_SSIDS, SOP_FIREWALL, normalizeBrand } from "./constants";
import NetworkTab from "./components/NetworkTab";
import { uid, mkCamGroup, mkSwGrp, mkSrvGrp, mkDoorGrp, mkZoneGrp, mkSpkGrp, getNextIpStart } from "./models";
import { fetchProjects, pushMondayUpdate } from "./api/monday";
import { parseCSVLine, parseProposalCSV, buildGroupsFromRows } from "./api/portal";
import { buildCSV } from "./utils/buildCSV";
import { buildPDF } from "./utils/buildPDF";
import SelectProjectPage from "./components/SelectProjectPage";
import TopBar from "./components/TopBar";
import ImportPreviewModal from "./components/ImportPreviewModal";
import MasterDashboard from "./components/MasterDashboard";
import PdfImportModal from "./components/PdfImportModal";
import Sidebar from "./components/Sidebar";
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
  const [accessInfo, setAccess] = useState({ accessPlatform: "", controllerBrand: "", controllerModel: "", controllerIp: "", controllerSerial: "", firmware: "", totalDoors: "", credentialFormat: "" });
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
  // move group between categories
  const categorySetters = {
    camera: setCameraGroups, switch: setSwitchGroups, server: setServerGroups,
    door: setDoorGroups, zone: setZoneGroups, speaker: setSpeakerGroups,
  };
  const moveGroup = (group, fromCat, toCat) => {
    if (fromCat === toCat) return;
    const fromSetter = categorySetters[fromCat];
    const toSetter = categorySetters[toCat];
    if (!fromSetter || !toSetter) return;
    fromSetter(gs => gs.filter(g => g.id !== group.id));
    toSetter(gs => [...gs, { ...group }]);
    const label = group.groupLabel || group.brand || group.model || "Group";
    addLog("move", `Moved "${label}" from ${fromCat} → ${toCat}`);
  };
  // All groups with category tags (for IP allocation)
  const allGroupsTagged = [
    ...cameraGroups.map(g => ({ ...g, _cat: "camera" })),
    ...switchGroups.map(g => ({ ...g, _cat: "switch" })),
    ...serverGroups.map(g => ({ ...g, _cat: "server" })),
    ...doorGroups.map(g => ({ ...g, _cat: "door" })),
    ...zoneGroups.map(g => ({ ...g, _cat: "zone" })),
    ...speakerGroups.map(g => ({ ...g, _cat: "speaker" })),
  ];
  // proposal import
  const [importPreview, setImportPreview] = useState(null); // { proposalId, rows, overrideCats: {index: category} }
  const [pdfImportOpen, setPdfImportOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  // network config
  const emptyNetworkConfig = () => ({ useDefaults: true, sitePrefix: "", routerModel: "", apCount: "", isp: "", itContact: "", controllerType: "cloud", vlans: SOP_VLANS.map(v => ({ ...v })), ssids: SOP_SSIDS.map(s => ({ ...s })), firewall: { rows: SOP_FIREWALL.rows, cols: SOP_FIREWALL.cols, matrix: SOP_FIREWALL.matrix.map(r => [...r]) }, checklist: {} });
  const [networkConfig, setNetworkConfig] = useState(emptyNetworkConfig());
  const [miscHardware, setMiscHardware] = useState([]);
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
  const setAcc = (k, v) => setAccess(s => ({ ...s, [k]: v }));
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
    const snap = { info, nvrInfo, panelInfo, accessInfo, cameraGroups, switchGroups, serverGroups, doorGroups, zoneGroups, speakerGroups, laborBudget, laborActual, specSheetUrls, changeLog, networkConfig, miscHardware };
    triggerSave(snap, selectedProject);
  }, [info, nvrInfo, panelInfo, accessInfo, cameraGroups, switchGroups, serverGroups, doorGroups, zoneGroups, speakerGroups, laborBudget, laborActual, specSheetUrls, changeLog, networkConfig, miscHardware]); // eslint-disable-line
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
    // pdf.js for text extraction from procurement PDFs
    if (!window.pdfjsLib) {
      if (!document.querySelector('script[src*="pdf.min"]')) {
        const s3 = document.createElement("script");
        s3.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
        s3.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        };
        document.head.appendChild(s3);
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
  const stateSnapshot = () => ({ ...info, ...nvrInfo, ...panelInfo, ...accessInfo, cameraGroups, switchGroups, serverGroups, doorGroups, zoneGroups, speakerGroups, specSheetUrls, changeLog, networkConfig, miscHardware });
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
    catalogDevices(hardwareRows.map(r => ({ category: overrideCats[r._idx] || r.category, brand: normalizeBrand(r.brand), model: r.model }))).catch(e => console.warn("Catalog update failed:", e));
  };
  // Switch project from sidebar (save current, load new)
  const switchProject = async (p) => {
    if (p.id === selectedProject?.id) return;
    // Save current project first
    if (selectedProject?.id) {
      const snap = { info, nvrInfo, panelInfo, accessInfo, cameraGroups, switchGroups, serverGroups, doorGroups, zoneGroups, speakerGroups, laborBudget, laborActual, specSheetUrls, changeLog, networkConfig, miscHardware };
      await flushSave(selectedProject, snap);
    }
    // Load new project
    setSelectedProject(p);
    try {
      const { loadWorkOrder } = await import("./supabase");
      const saved = await loadWorkOrder(p.id);
      if (saved?.state) {
        const s = saved.state;
        setInfo({ customer: p.customer || "", siteAddress: p.siteAddress || "", techLead: p.techLead || "", ...(s.info || {}), ...(p.customer && !s.info?.customer ? { customer: p.customer } : {}), ...(p.siteAddress && !s.info?.siteAddress ? { siteAddress: p.siteAddress } : {}), ...(p.techLead && !s.info?.techLead ? { techLead: p.techLead } : {}) });
        if (s.nvrInfo) setNVR(s.nvrInfo);
        if (s.panelInfo) setPanel(s.panelInfo);
        if (s.accessInfo) setAccess(s.accessInfo);
        setCameraGroups(s.cameraGroups || []);
        setSwitchGroups(s.switchGroups || []);
        setServerGroups(s.serverGroups || []);
        setDoorGroups(s.doorGroups || []);
        setZoneGroups(s.zoneGroups || []);
        setSpeakerGroups(s.speakerGroups || []);
        if (s.laborBudget) setLaborBudget(s.laborBudget);
        if (s.laborActual) setLaborActual(s.laborActual);
        if (s.specSheetUrls) setSpecSheetUrls(s.specSheetUrls);
        if (s.changeLog) setChangeLog(s.changeLog);
        if (s.networkConfig) setNetworkConfig(s.networkConfig);
        if (s.miscHardware) setMiscHardware(s.miscHardware);
      } else {
        // New project — reset state, prefill from Monday
        setInfo(s => ({ ...emptyLabor(), customer: p.customer || "", siteAddress: p.siteAddress || "", techLead: p.techLead || "", techs: "", date: new Date().toISOString().split("T")[0], submittedBy: "" }));
        setNVR({ nvrBrand: "", nvrModel: "", nvrIp: "", nvrSerial: "", nvrFirmware: "", nvrStorage: "", nvrRetention: "", vmsSoftware: "" });
        setPanel({ panelBrand: "", panelModel: "", panelSerial: "", panelFirmware: "" });
        setCameraGroups([]); setSwitchGroups([]); setServerGroups([]);
        setAccess({ accessPlatform: "", controllerBrand: "", controllerModel: "", controllerIp: "", controllerSerial: "", firmware: "", totalDoors: "", credentialFormat: "" });
        setDoorGroups([]); setZoneGroups([]); setSpeakerGroups([]);
        setLaborBudget(emptyLabor()); setLaborActual(emptyLabor());
        setSpecSheetUrls({}); setChangeLog([]); setNetworkConfig(emptyNetworkConfig()); setMiscHardware([]);
      }
    } catch (e) { console.warn("Could not load project:", e); }
    setCollapsed({}); setDashCollapsed({}); setSaveStatus("idle");
    setTab("info");
  };
  // PDF parts import handler
  const handlePdfImport = (items) => {
    const makers = { camera: mkCamGroup, switch: mkSwGrp, server: mkSrvGrp, door: mkDoorGrp, zone: mkZoneGrp, speaker: mkSpkGrp };
    const setters = { camera: setCameraGroups, switch: setSwitchGroups, server: setServerGroups, door: setDoorGroups, zone: setZoneGroups, speaker: setSpeakerGroups };
    for (const item of items) {
      const mk = makers[item.category];
      const setter = setters[item.category];
      if (!mk || !setter) continue;
      const ip = getNextIpStart(item.category, networkConfig, allGroupsTagged);
      const grp = { ...mk(), brand: normalizeBrand(item.brand), model: item.model, quantity: String(item.qty), groupLabel: "", noProgramming: !!item.hardware, ...(ip ? { ipStart: ip } : {}) };
      setter(gs => [...gs, grp]);
    }
    addLog("import", `PDF import — ${items.length} groups added (${items.filter(i => i.hardware).length} hardware-only)`);
    // Auto-catalog imported devices for the growing model library
    catalogDevices(items.map(i => ({ ...i, brand: normalizeBrand(i.brand) }))).catch(e => console.warn("Catalog update failed:", e));
  };
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
    // ── Network ───────────────────────────────────────────────────────────────
    { id: "network",   label: "Network",       icon: "🌐" },
    // ── Resources ─────────────────────────────────────────────────────────────
    { id: "files",     label: "Project Files", icon: "📁" },
    { id: "library",   label: "Device Library",icon: "📚" },
    { id: "export",    label: "Reports",        icon: "📊" },
  ];
  // ─ PROJECT SELECT ─────────────────────────────────────────────────────────
  if (phase === "select") {
    return (
      <SelectProjectPage
        mondayToken={mondayToken} setMondayToken={setMondayToken}
        tokenDraft={tokenDraft} setTokenDraft={setTokenDraft}
        colMap={colMap} setColMap={setColMap}
        colMapperOpen={colMapperOpen} setColMapperOpen={setColMapperOpen}
        colMapperCols={colMapperCols} setColMapperCols={setColMapperCols}
        colMapperLoading={colMapperLoading} setColMapperLoading={setColMapperLoading}
        colMapDraft={colMapDraft} setColMapDraft={setColMapDraft}
        projects={projects} setProjects={setProjects}
        loadingProjects={loadingProjects} setLoadingProjects={setLoadingProjects}
        projectsError={projectsError}
        selectedProject={selectedProject} setSelectedProject={setSelectedProject}
        setPhase={setPhase}
        setInfo={setInfo} setNVR={setNVR} setPanel={setPanel} setAccess={setAccess}
        setCameraGroups={setCameraGroups} setSwitchGroups={setSwitchGroups}
        setServerGroups={setServerGroups} setDoorGroups={setDoorGroups}
        setZoneGroups={setZoneGroups} setSpeakerGroups={setSpeakerGroups}
        setLaborBudget={setLaborBudget} setLaborActual={setLaborActual}
        setSpecSheetUrls={setSpecSheetUrls} setChangeLog={setChangeLog}
        setNetworkConfig={setNetworkConfig}
      />
    );
  }
  // ─ MASTER DASHBOARD ───────────────────────────────────────────────────────
  if (phase === "master") {
    return <MasterDashboard onBack={() => setPhase("select")} laborTypes={LABOR_TYPES} />;
  }
  // ─ BUILD PHASE ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
        onSelectProject={switchProject}
      />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <TopBar
        selectedProject={selectedProject} saveStatus={saveStatus}
        totalDevices={totalDevices} importFileRef={importFileRef}
        handleProposalFileChange={handleProposalFileChange}
        tab={tab} setTab={setTab} TABS={TABS}
        onBack={async () => {
          await flushSave(selectedProject);
          setPhase("select");
          setInfo({ customer: "", siteAddress: "", techLead: "", techs: "", date: new Date().toISOString().split("T")[0], submittedBy: "" });
          setNVR({ nvrBrand: "", nvrModel: "", nvrIp: "", nvrSerial: "", nvrFirmware: "", nvrStorage: "", nvrRetention: "", vmsSoftware: "" });
          setPanel({ panelBrand: "", panelModel: "", panelSerial: "", panelFirmware: "" });
          setCameraGroups([]); setSwitchGroups([]); setServerGroups([]);
          setAccess({ accessPlatform: "", controllerBrand: "", controllerModel: "", controllerIp: "", controllerSerial: "", firmware: "", totalDoors: "", credentialFormat: "" });
          setDoorGroups([]); setZoneGroups([]); setSpeakerGroups([]);
          setLaborBudget(emptyLabor()); setLaborActual(emptyLabor());
          setCollapsed({}); setDashCollapsed({}); setSaveStatus("idle"); setSpecSheetUrls({}); setCoverPageFile(null); setLibUploadForm(null); setChangeLog([]); setNetworkConfig(emptyNetworkConfig()); setMiscHardware([]);
        }}
        onReports={() => setTab("export")}
        onPdfImport={() => setPdfImportOpen(true)}
      />
      <div className="flex-1 overflow-y-auto" style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 16px", width: "100%" }}>

        {/* ─ INFO ─ */}
        {tab === "info" && (
          <InfoTab info={info} setI={setI} nvrInfo={nvrInfo} setNV={setNV} panelInfo={panelInfo} setPan={setPan} accessInfo={accessInfo} setAcc={setAcc}
            cameraGroups={cameraGroups} switchGroups={switchGroups} serverGroups={serverGroups}
            doorGroups={doorGroups} zoneGroups={zoneGroups} speakerGroups={speakerGroups}
            camCount={camCount} swCount={swCount} srvCount={srvCount}
            doorCount={doorCount} zoneCount={zoneCount} spkCount={spkCount}
            totalDevices={totalDevices} networkConfig={networkConfig}
          />
        )}
        {/* ─ SERVERS ─ */}
        {tab === "servers" && (
          <ServersTab
            serverGroups={serverGroups} setServerGroups={setServerGroups}
            srvCount={srvCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
            moveGroup={moveGroup} networkConfig={networkConfig} allGroupsTagged={allGroupsTagged}
          />
        )}
        {/* ─ SWITCHES ─ */}
        {tab === "switches" && (
          <SwitchesTab
            switchGroups={switchGroups} setSwitchGroups={setSwitchGroups}
            swCount={swCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
            moveGroup={moveGroup} networkConfig={networkConfig} allGroupsTagged={allGroupsTagged}
          />
        )}
        {/* ─ CAMERAS ─ */}
        {tab === "cameras" && (
          <CamerasTab
            cameraGroups={cameraGroups} setCameraGroups={setCameraGroups}
            camCount={camCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
            moveGroup={moveGroup} networkConfig={networkConfig} allGroupsTagged={allGroupsTagged}
          />
        )}
        {/* ─ ACCESS ─ */}
        {tab === "access" && (
          <AccessTab
            doorGroups={doorGroups} setDoorGroups={setDoorGroups}
            doorCount={doorCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
            moveGroup={moveGroup} networkConfig={networkConfig} allGroupsTagged={allGroupsTagged}
          />
        )}
        {/* ─ INTRUSION ─ */}
        {tab === "intrusion" && (
          <IntrusionTab
            zoneGroups={zoneGroups} setZoneGroups={setZoneGroups}
            zoneCount={zoneCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
            moveGroup={moveGroup} networkConfig={networkConfig} allGroupsTagged={allGroupsTagged}
          />
        )}
        {/* ─ AUDIO ─ */}
        {tab === "audio" && (
          <AudioTab
            speakerGroups={speakerGroups} setSpeakerGroups={setSpeakerGroups}
            spkCount={spkCount} collapsed={collapsed} toggleCollapse={toggleCollapse}
            addLog={addLog}
            moveGroup={moveGroup} networkConfig={networkConfig} allGroupsTagged={allGroupsTagged}
          />
        )}
        {/* ─ NETWORK ─ */}
        {tab === "network" && (
          <NetworkTab
            networkConfig={networkConfig} setNetworkConfig={setNetworkConfig}
            sitePrefix={networkConfig.sitePrefix}
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
            addLog={addLog} selectedProject={selectedProject}
            miscHardware={miscHardware} setMiscHardware={setMiscHardware}
            moveGroup={moveGroup}
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
      </div>

      <PdfImportModal
        open={pdfImportOpen}
        onClose={() => setPdfImportOpen(false)}
        onImport={handlePdfImport}
      />
      <ImportPreviewModal
        importPreview={importPreview} setImportPreview={setImportPreview}
        handleProposalImport={handleProposalImport}
        selectedProject={selectedProject}
        cameraGroups={cameraGroups} switchGroups={switchGroups}
        serverGroups={serverGroups} doorGroups={doorGroups}
        zoneGroups={zoneGroups} speakerGroups={speakerGroups}
      />
    </div>
  );
}
