// ── Palette ───────────────────────────────────────────────────────────────────
export const C = {
  navy: "#0B1F3A", steel: "#1A3355", accent: "#00AEEF", gold: "#F4A300",
  bg: "#EEF2F7", white: "#FFFFFF", muted: "#6B7E96", border: "#CBD5E1",
  success: "#10B981", warn: "#F59E0B", danger: "#EF4444",
  surface: "#F8FAFD", dark: "#07142A",
};

// ── Option lists ──────────────────────────────────────────────────────────────
export const CODECS = ["H.264","H.265","H.265+","MJPEG"];
export const RESS   = ["1MP (720p)","2MP (1080p)","4MP","5MP","6MP","8MP (4K)","12MP"];
export const LENSES = ["2.8mm","4mm","6mm","8mm","2.8–12mm VF","Motorized VF","Other"];
export const CAM_TYPES = ["Indoor Dome","Outdoor Dome","Bullet","PTZ","Fisheye","Multi-Sensor","Box"];
export const READER_TYPES = ["Wiegand","OSDP","RS-485","Bluetooth","Biometric","Keypad","Multi-Tech"];
export const CRED_TYPES = ["Prox Card","Smart Card","Mobile","PIN","Biometric","Dual Auth"];
export const LOCK_TYPES = ["Mag Lock","Electric Strike","Electronic Deadbolt","Other"];
export const ZONE_TYPES = ["Motion","Door Contact","Glass Break","Smoke","CO","Heat","Panic","Tamper"];
export const SERVER_ROLES = ["VMS Server","NVR","DVR","Access Control Server","Video Analytics","Storage Array","Workstation","Other"];

// ── Platform lists per system type ───────────────────────────────────────────
export const CCTV_PLATFORMS = ["Avigilon (Motorola)","Milestone","Genetec","Digital Watchdog","Hanwha WAVE","Verkada","Rhombus","ExacqVision","Hikvision iVMS","UniView EZStation","Other"];
export const ACCESS_PLATFORMS = ["Brivo","PDK (ProdataKey)","Genetec Synergis","LenelS2","Honeywell Pro-Watch","AMAG Symmetry","Verkada","Avigilon Alta","Salto","Allegion","Other"];
export const INTRUSION_PLATFORMS = ["Ajax","Alarm.com","DMP","Honeywell Vista","Honeywell Lyric","DSC PowerSeries","Bosch","Qolsys","Elk Products","Napco","Other"];
export const AUDIO_PLATFORMS = ["Control4","Crestron","Savant","QSC Q-SYS","Bogen","AtlasIED","Sonance","Sonos Pro","Biamp","RTI","Other"];
export const NETWORK_PLATFORMS = ["Ubiquiti (UniFi)","Cisco Meraki","Aruba","Ruckus","Fortinet","SonicWall","Juniper Mist","TP-Link Omada","Netgear Insight","Other"];

// ── Network SOP Defaults (Calidad Projects) ──────────────────────────────────
export const SOP_VLANS = [
  { id: "mgmt",      vlanId: "1",  name: "Default (Mgmt)",  subnet: "192.168.0.0/24", dhcp: true, poolSize: 249, purpose: "Management network for infrastructure devices: switches, access points, controller." },
  { id: "employee",  vlanId: "10", name: "Employee",         subnet: "10.30.10.0/24",  dhcp: true, poolSize: 249, purpose: "Internal staff devices including workstations, laptops, phones, and printers." },
  { id: "guest",     vlanId: "20", name: "Guest & Tenants",  subnet: "10.30.20.0/24",  dhcp: true, poolSize: 249, purpose: "Isolated internet-only access for visitors, contractors, and tenant devices." },
  { id: "av",        vlanId: "30", name: "AV",               subnet: "10.30.30.0/24",  dhcp: true, poolSize: 249, purpose: "Audio-visual systems including displays, conferencing equipment, and streaming devices." },
  { id: "vms",       vlanId: "40", name: "VMS",              subnet: "10.30.40.0/23",  dhcp: true, poolSize: 500, purpose: "Video management / surveillance system. IP cameras and NVRs." },
  { id: "intrusion", vlanId: "50", name: "Intrusion",        subnet: "10.30.50.0/24",  dhcp: true, poolSize: 249, purpose: "Intrusion detection and alarm panel systems. Fully isolated with outbound-only internet." },
];

export const SOP_SSIDS = [
  { id: "staff",    pattern: "[SITE]-STAFF",        mappedVlan: "Employee (10)",    band: "2.4 + 5 GHz", security: "WPA2/WPA3" },
  { id: "guest",    pattern: "[SITE]-GUEST",        mappedVlan: "Guest & Tenants (20)", band: "2.4 + 5 GHz", security: "WPA2" },
  { id: "av",       pattern: "[SITE]-AV",           mappedVlan: "AV (30)",          band: "2.4 + 5 GHz", security: "WPA2" },
  { id: "failover", pattern: "[SITE]-SEC-FAILOVER", mappedVlan: "Intrusion (50)",   band: "2.4 + 5 GHz", security: "WPA2/WPA3" },
  { id: "calidad",  pattern: "Calidad.Emp",         mappedVlan: "Native Network",   band: "2.4 + 5 GHz", security: "WPA2/WPA3" },
];

// Firewall matrix: from (row) → to (col). "ALLOW" | "DENY" | "—"
export const SOP_FIREWALL = {
  rows: ["Default (1)", "Employee (10)", "Guest (20)", "AV (30)", "VMS (40)", "Intrusion (50)"],
  cols: ["Default (1)", "Employee (10)", "Guest (20)", "AV (30)", "VMS (40)"],
  matrix: [
    ["—",    "ALLOW", "DENY", "ALLOW", "ALLOW"],  // Default
    ["DENY", "—",     "DENY", "ALLOW", "ALLOW"],  // Employee
    ["DENY", "DENY",  "—",    "DENY",  "DENY"],   // Guest
    ["DENY", "DENY",  "DENY", "—",     "DENY"],   // AV
    ["DENY", "DENY",  "DENY", "DENY",  "—"],      // VMS
    ["DENY", "DENY",  "DENY", "DENY",  "DENY"],   // Intrusion
  ],
};
