// ── Icon mapping — replaces all emoji with Lucide SVG icons ──────────────────
import {
  Camera, MonitorCog, Network, DoorOpen, ShieldAlert, Volume2,
  Package, ClipboardList, LayoutDashboard, FolderOpen, BookOpen,
  FileBarChart, Wrench, Zap, Globe, Wifi, Shield, CheckSquare,
  FileText, Upload, Settings, ChevronDown, ChevronRight,
  Plus, X, Search, Download, ArrowLeft, Timer, Truck,
} from "lucide-react";

// Size presets
const S = 14;  // small (badges, inline)
const M = 16;  // medium (tabs, headers)
const L = 20;  // large (card headers)

// Category icons — used in tabs, group cards, dashboard
export const CategoryIcon = {
  camera:  (size = M) => <Camera size={size} />,
  switch:  (size = M) => <Network size={size} />,
  server:  (size = M) => <MonitorCog size={size} />,
  door:    (size = M) => <DoorOpen size={size} />,
  zone:    (size = M) => <ShieldAlert size={size} />,
  speaker: (size = M) => <Volume2 size={size} />,
};

// Tab icons
export const TabIcon = {
  info:        <ClipboardList size={S} />,
  dashboard:   <LayoutDashboard size={S} />,
  labor:       <Timer size={S} />,
  procurement: <Truck size={S} />,
  access:      <DoorOpen size={S} />,
  audio:       <Volume2 size={S} />,
  cameras:     <Camera size={S} />,
  intrusion:   <ShieldAlert size={S} />,
  servers:     <MonitorCog size={S} />,
  switches:    <Network size={S} />,
  network:     <Globe size={S} />,
  files:       <FolderOpen size={S} />,
  library:     <BookOpen size={S} />,
  export:      <FileBarChart size={S} />,
};

// Action icons
export const ActionIcon = {
  plus:     <Plus size={S} />,
  close:    <X size={S} />,
  search:   <Search size={S} />,
  download: <Download size={S} />,
  upload:   <Upload size={S} />,
  settings: <Settings size={S} />,
  back:     <ArrowLeft size={S} />,
  file:     <FileText size={S} />,
};

// Feature icons
export const FeatureIcon = {
  network:   <Globe size={L} />,
  wifi:      <Wifi size={L} />,
  firewall:  <Shield size={L} />,
  checklist: <CheckSquare size={L} />,
  wrench:    <Wrench size={L} />,
  zap:       <Zap size={28} />,
  package:   <Package size={L} />,
};

export { S, M, L };
