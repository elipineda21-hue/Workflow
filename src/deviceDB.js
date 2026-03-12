// ── Device Database ───────────────────────────────────────────────────────────
// Central catalog of brands/models with default specs.
// Add entries here to make them available in the model picker and Device Library.

export const CAM_DB = [
  { brand: "Uniview", models: [
    { model: "IPC3618SE-ADF28KM-WL-I0", name: "OWL View 8MP ColorHunter Dome", resolution: "8MP (4K)", lens: "2.8\u201312mm VF", type: "Outdoor Dome", codec: "H.265", fps: "20", bitrate: "8192", port: "80", rtspPort: "554", ptz: false, specSheet: "https://www.uniview.com/Products/Cameras/Dome-Camera/IPC3618SE-ADF28KM-WL-I0" },
    { model: "IPC3615SE-ADF28KM-WL-I0", name: "OWL View 5MP ColorHunter Dome", resolution: "5MP", lens: "2.8\u201312mm VF", type: "Outdoor Dome", codec: "H.265", fps: "20", bitrate: "4096", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "IPC2228SE-DF40K-WL-I0", name: "OWL View 8MP ColorHunter Bullet", resolution: "8MP (4K)", lens: "4mm", type: "Bullet", codec: "H.265", fps: "20", bitrate: "8192", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "IPC3614SS-ADF28KM", name: "Pro 4MP Vandal-Resistant Dome", resolution: "4MP", lens: "2.8\u201312mm VF", type: "Outdoor Dome", codec: "H.265", fps: "20", bitrate: "4096", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "IPC6858EF-ISZX-NF40", name: "EasyStar 8MP Dual-Zoom PTZ", resolution: "8MP (4K)", lens: "Motorized VF", type: "PTZ", codec: "H.265", fps: "25", bitrate: "8192", port: "80", rtspPort: "554", ptz: true, specSheet: "" },
  ]},
  { brand: "Hikvision", models: [
    { model: "DS-2CD2143G2-I", name: "AcuSense 4MP WDR Fixed Dome", resolution: "4MP", lens: "2.8mm", type: "Outdoor Dome", codec: "H.265+", fps: "30", bitrate: "4096", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "DS-2CD2347G2-LU", name: "ColorVu 4MP Smart Hybrid Turret", resolution: "4MP", lens: "2.8mm", type: "Outdoor Dome", codec: "H.265+", fps: "30", bitrate: "4096", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "DS-2CD2T47G2-L", name: "ColorVu 4MP Smart Hybrid Bullet", resolution: "4MP", lens: "4mm", type: "Bullet", codec: "H.265+", fps: "30", bitrate: "4096", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "DS-2CD2183G2-I", name: "AcuSense 8MP WDR Fixed Dome", resolution: "8MP (4K)", lens: "2.8mm", type: "Outdoor Dome", codec: "H.265+", fps: "20", bitrate: "8192", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "DS-2DE4425IWG-E", name: "4MP 25x IR Network Speed Dome", resolution: "4MP", lens: "Motorized VF", type: "PTZ", codec: "H.265+", fps: "30", bitrate: "4096", port: "80", rtspPort: "554", ptz: true, specSheet: "" },
  ]},
  { brand: "Axis", models: [
    { model: "P3245-V", name: "2MP Fixed Dome (Indoor)", resolution: "2MP (1080p)", lens: "2.8mm", type: "Indoor Dome", codec: "H.265", fps: "30", bitrate: "2048", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "P3245-VE", name: "2MP Fixed Dome (Outdoor)", resolution: "2MP (1080p)", lens: "2.8mm", type: "Outdoor Dome", codec: "H.265", fps: "30", bitrate: "2048", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "Q3536-LVE", name: "4MP IR Fixed Mini Dome", resolution: "4MP", lens: "Motorized VF", type: "Outdoor Dome", codec: "H.265", fps: "30", bitrate: "4096", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "Q6135-LE", name: "2MP IR Speed Dome", resolution: "2MP (1080p)", lens: "Motorized VF", type: "PTZ", codec: "H.265", fps: "30", bitrate: "4096", port: "80", rtspPort: "554", ptz: true, specSheet: "" },
  ]},
  { brand: "Hanwha", models: [
    { model: "QNV-8080R", name: "5MP Vandal Dome IR", resolution: "5MP", lens: "2.8mm", type: "Outdoor Dome", codec: "H.265", fps: "30", bitrate: "4096", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "PNV-9300RW", name: "4K Wisenet P Dome", resolution: "8MP (4K)", lens: "2.8mm", type: "Outdoor Dome", codec: "H.265", fps: "20", bitrate: "8192", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "XNV-8080R", name: "5MP IR AI Outdoor Dome", resolution: "5MP", lens: "2.8mm", type: "Outdoor Dome", codec: "H.265", fps: "30", bitrate: "4096", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
  ]},
  { brand: "Dahua", models: [
    { model: "IPC-HDW2849H-S-IL", name: "8MP Smart Dual Light Eyeball", resolution: "8MP (4K)", lens: "2.8mm", type: "Outdoor Dome", codec: "H.265+", fps: "15", bitrate: "8192", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "IPC-HFW2849S-S-IL", name: "8MP Smart Dual Light Bullet", resolution: "8MP (4K)", lens: "2.8mm", type: "Bullet", codec: "H.265+", fps: "15", bitrate: "8192", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "IPC-HDW3849H-ZAS-PV", name: "8MP Active Deterrence Eyeball", resolution: "8MP (4K)", lens: "Motorized VF", type: "Outdoor Dome", codec: "H.265+", fps: "15", bitrate: "8192", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
  ]},
  { brand: "Avigilon", models: [
    { model: "5MP-HD-DO1-IR", name: "5MP H5A Dome Outdoor IR", resolution: "5MP", lens: "2.8mm", type: "Outdoor Dome", codec: "H.265", fps: "30", bitrate: "4096", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
    { model: "4K-H4A-DO1-IR", name: "4K H4A Dome Outdoor IR", resolution: "8MP (4K)", lens: "2.8mm", type: "Outdoor Dome", codec: "H.265", fps: "15", bitrate: "8192", port: "80", rtspPort: "554", ptz: false, specSheet: "" },
  ]},
];

export const SWITCH_DB = [
  { brand: "Cisco", models: [
    { model: "SG350-28P", name: "28-Port Gigabit PoE Managed", ports: "28", specSheet: "" },
    { model: "SG350-10P", name: "10-Port Gigabit PoE Managed", ports: "10", specSheet: "" },
    { model: "CBS350-24P-4G", name: "24-Port PoE+ Managed Switch", ports: "24", specSheet: "" },
    { model: "Catalyst 1000-24P", name: "Catalyst 1000 24-Port PoE+", ports: "24", specSheet: "" },
  ]},
  { brand: "Ubiquiti", models: [
    { model: "USW-Pro-24-POE", name: "UniFi Pro 24-Port PoE", ports: "24", specSheet: "" },
    { model: "USW-Pro-48-POE", name: "UniFi Pro 48-Port PoE", ports: "48", specSheet: "" },
    { model: "USW-16-POE", name: "UniFi 16-Port PoE", ports: "16", specSheet: "" },
    { model: "USW-Flex-Mini", name: "UniFi Flex Mini 5-Port", ports: "5", specSheet: "" },
  ]},
  { brand: "Aruba", models: [
    { model: "JL675A", name: "Aruba CX 6200F 24G 4SFP", ports: "24", specSheet: "" },
    { model: "JL660A", name: "Aruba CX 6300M 24G 4SFP+", ports: "24", specSheet: "" },
  ]},
  { brand: "Netgear", models: [
    { model: "GS324TP", name: "24-Port PoE+ Smart Managed", ports: "24", specSheet: "" },
    { model: "GS308EP", name: "8-Port PoE+ Plus Smart", ports: "8", specSheet: "" },
    { model: "GS748T", name: "48-Port Gigabit Smart Managed", ports: "48", specSheet: "" },
  ]},
  { brand: "TP-Link", models: [
    { model: "TL-SG3428XMP", name: "28-Port Gigabit PoE+ Managed", ports: "28", specSheet: "" },
    { model: "TL-SG2428P", name: "24-Port Gigabit PoE+ Smart", ports: "24", specSheet: "" },
  ]},
];

export const SERVER_DB = [
  { brand: "Dell", models: [
    { model: "PowerEdge R350", name: "R350 1U Rack Server", os: "Windows Server 2022", specSheet: "" },
    { model: "PowerEdge R450", name: "R450 1U Rack Server", os: "Windows Server 2022", specSheet: "" },
    { model: "PowerEdge T150", name: "T150 Tower Server", os: "Windows Server 2022", specSheet: "" },
    { model: "PowerEdge T350", name: "T350 Tower Server", os: "Windows Server 2022", specSheet: "" },
  ]},
  { brand: "HP", models: [
    { model: "ProLiant DL360 Gen11", name: "DL360 1U Rack Server", os: "Windows Server 2022", specSheet: "" },
    { model: "ProLiant ML110 Gen11", name: "ML110 Tower Server", os: "Windows Server 2022", specSheet: "" },
  ]},
  { brand: "Milestone", models: [
    { model: "HDDH350R-M", name: "Husky M350R NVR Appliance", os: "Milestone XProtect", specSheet: "" },
    { model: "HDDH500R-M", name: "Husky M500R NVR Appliance", os: "Milestone XProtect", specSheet: "" },
  ]},
  { brand: "Genetec", models: [
    { model: "Stratocast-4T", name: "Stratocast Hybrid 4TB NVR", os: "Genetec Security Center", specSheet: "" },
  ]},
];

export const ACCESS_DB = [
  { brand: "HID", models: [
    { model: "EDGE EVO Solo", name: "EVO Solo Controller/Reader", readerType: "OSDP", credentialType: "Smart Card", specSheet: "" },
    { model: "VertX V100", name: "V100 Single-Door Controller", readerType: "Wiegand", credentialType: "Prox Card", specSheet: "" },
    { model: "VertX V200", name: "V200 Two-Door Controller", readerType: "Wiegand", credentialType: "Prox Card", specSheet: "" },
    { model: "iCLASS SE RW400", name: "iCLASS SE Multiclass Reader", readerType: "OSDP", credentialType: "Smart Card", specSheet: "" },
  ]},
  { brand: "Lenel", models: [
    { model: "LNL-1300", name: "Single-Door Intelligent Controller", readerType: "Wiegand", credentialType: "Prox Card", specSheet: "" },
    { model: "LNL-2220", name: "Two-Reader Interface Module", readerType: "Wiegand", credentialType: "Prox Card", specSheet: "" },
    { model: "LNL-X2210", name: "Two-Reader Intelligent Controller", readerType: "OSDP", credentialType: "Smart Card", specSheet: "" },
  ]},
  { brand: "Verkada", models: [
    { model: "AC41", name: "AC41 Door Controller", readerType: "OSDP", credentialType: "Smart Card", specSheet: "" },
    { model: "AC42", name: "AC42 Door Controller (PoE+)", readerType: "OSDP", credentialType: "Smart Card", specSheet: "" },
  ]},
  { brand: "Bosch", models: [
    { model: "AMC2-4WCF", name: "AMC2 4-Door Controller", readerType: "Wiegand", credentialType: "Prox Card", specSheet: "" },
  ]},
  { brand: "Mercury", models: [
    { model: "MR50", name: "Single Door Controller", readerType: "Wiegand", credentialType: "Prox Card", specSheet: "" },
    { model: "MR52", name: "Single Door IP Controller", readerType: "OSDP", credentialType: "Smart Card", specSheet: "" },
  ]},
];

export const PANEL_DB = [
  { brand: "DSC", models: [
    { model: "HS2128", name: "PowerSeries Neo 128-Zone", specSheet: "" },
    { model: "HS3128", name: "PowerSeries Pro 128-Zone", specSheet: "" },
    { model: "PC1864", name: "PowerSeries Classic 64-Zone", specSheet: "" },
  ]},
  { brand: "Honeywell", models: [
    { model: "VISTA-128BPT", name: "Vista 128-Zone Commercial Panel", specSheet: "" },
    { model: "VISTA-20P", name: "Vista 20-Zone Residential", specSheet: "" },
    { model: "VISTA-250BPT", name: "Vista 250-Zone Commercial Panel", specSheet: "" },
  ]},
  { brand: "Bosch", models: [
    { model: "B9512G", name: "9000-Series 599-Point Panel", specSheet: "" },
    { model: "D7412GV4", name: "D7000-Series 75-Zone Panel", specSheet: "" },
    { model: "B4512", name: "4000-Series 48-Zone Panel", specSheet: "" },
  ]},
  { brand: "DMP", models: [
    { model: "XR550", name: "XR550 Full-Featured Panel", specSheet: "" },
    { model: "XR150", name: "XR150 Fire & Burg Panel", specSheet: "" },
  ]},
  { brand: "Elk", models: [
    { model: "M1 Gold", name: "M1 Gold Control", specSheet: "" },
    { model: "M1EZ8", name: "M1EZ8 8-Zone Control", specSheet: "" },
  ]},
  { brand: "Napco", models: [
    { model: "GEM-P9600", name: "Gemini 9600 Panel", specSheet: "" },
    { model: "GEM-P816", name: "Gemini P816 8-Zone Panel", specSheet: "" },
  ]},
];
