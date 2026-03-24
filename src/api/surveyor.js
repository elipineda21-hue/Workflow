import * as XLSX from "xlsx";
import { uid, mkCamGroup, mkSwGrp, mkSrvGrp, mkDoorGrp, mkZoneGrp, mkSpkGrp } from "../models";

// ── System Surveyor BOM Excel Import ─────────────────────────────────────────

// Category detection — reuses same logic as Portal.io for consistency
function elementToCategory(name, area) {
  const t = `${name || ""} ${area || ""}`.toLowerCase();
  // Camera / CCTV
  if (/camera|cam\b|ipc|bullet|dome|turret|ptz|lpr|lnr|anpr|fisheye|panoramic|video surveil|cctv/.test(t)) return "camera";
  // Access control
  if (/reader|access control|door\b|credential|card reader|controller.*door|hid|osdp|wiegand/.test(t)) return "door";
  // Intrusion / Alarm
  if (/intrusion|alarm|motion detect|glass break|contact.*sensor|panel.*zone|pir\b|siren|keypad.*alarm/.test(t)) return "zone";
  // Audio
  if (/speaker|audio|amplifier|amp\b|intercom|paging|distributed a/.test(t)) return "speaker";
  // Networking
  if (/switch|poe\b|network|router|access point|ap\b.*poe|managed switch|unmanaged|fiber.*conv/.test(t)) return "switch";
  // Servers / NVR / VMS
  if (/server|nvr|dvr|recorder|vms|nas\b|storage.*video|milestone|genetec|exacq|avigilon/.test(t)) return "server";
  // Broader fallbacks
  if (/video|surveillance/.test(t)) return "camera";
  if (/access/.test(t)) return "door";
  return "unknown";
}

// Detect header row from a sheet — looks for columns matching System Surveyor BOM patterns
function detectSurveyorHeaders(row) {
  const norm = row.map(c => (c == null ? "" : String(c)).toLowerCase().replace(/[^a-z0-9 ]/g, "").trim());
  const find = (...keys) => {
    for (const k of keys) {
      const idx = norm.findIndex(n => n.includes(k));
      if (idx !== -1) return idx;
    }
    return -1;
  };
  return {
    element:     find("element", "product", "item", "device", "component"),
    brand:       find("manufacturer", "brand", "mfr", "make", "vendor"),
    model:       find("model", "part number", "partnum", "part no", "sku", "catalog"),
    description: find("description", "desc", "name", "short desc"),
    qty:         find("qty", "quantity", "count", "total qty", "units"),
    area:        find("area", "location", "floor", "zone", "building", "room", "layer", "survey"),
    unitCost:    find("unit cost", "unit price", "price", "cost"),
    totalCost:   find("total cost", "ext cost", "extended", "total price", "line total"),
    accessories: find("accessor", "included", "add-on"),
  };
}

// Check if a header map looks valid (needs at least element/description + qty OR brand)
function isValidHeaderMap(hm) {
  const hasIdentifier = hm.element !== -1 || hm.description !== -1 || hm.model !== -1;
  const hasDetail = hm.qty !== -1 || hm.brand !== -1;
  return hasIdentifier && hasDetail;
}

/** Parse a System Surveyor BOM .xlsx ArrayBuffer → { surveyName, rows } */
export function parseSurveyorBOM(buffer) {
  const wb = XLSX.read(buffer, { type: "array" });

  // Try each sheet — BOM may be on the first sheet or a sheet named "BOM" / "Bill of Materials"
  const sheetOrder = [
    wb.SheetNames.find(n => /bom|bill of material/i.test(n)),
    wb.SheetNames.find(n => /element|device|product|hardware/i.test(n)),
    wb.SheetNames[0],
  ].filter(Boolean);

  // Deduplicate while preserving order
  const sheetsToTry = [...new Set(sheetOrder)];

  for (const sheetName of sheetsToTry) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!data.length) continue;

    // Find header row (scan first 10 rows)
    let headerMap = null;
    let headerIdx = -1;
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const candidate = detectSurveyorHeaders(data[i]);
      if (isValidHeaderMap(candidate)) {
        headerMap = candidate;
        headerIdx = i;
        break;
      }
    }
    if (!headerMap) continue;

    const rows = [];
    const g = (row, idx) => idx !== -1 && idx < row.length ? String(row[idx] ?? "").trim() : "";

    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every(c => c === "" || c == null)) continue;

      const element     = g(row, headerMap.element);
      const brand       = g(row, headerMap.brand);
      const model       = g(row, headerMap.model);
      const description = g(row, headerMap.description);
      const qtyRaw      = g(row, headerMap.qty);
      const area        = g(row, headerMap.area);
      const unitCost    = g(row, headerMap.unitCost);
      const totalCost   = g(row, headerMap.totalCost);

      // Need at least a name/model and qty to be a real line item
      const label = element || description || model;
      if (!label) continue;

      const qty = Math.max(1, parseInt(qtyRaw) || 1);

      // Skip rows that look like section headers or totals
      if (/^total$|^subtotal$|^grand total$/i.test(label)) continue;
      if (/^section|^category/i.test(label) && !model && !brand) continue;

      rows.push({
        brand,
        model,
        label,
        qty,
        area,
        category: elementToCategory(label + " " + model + " " + brand, area),
        unitCost,
        totalCost,
        recurring: false,
      });
    }

    if (rows.length > 0) {
      return { surveyName: sheetName, rows };
    }
  }

  return { surveyName: null, rows: [] };
}

/** Convert parsed rows → equipment groups (same shape as Portal.io buildGroupsFromRows) */
export function buildSurveyorGroups(rows, overrideCats = {}) {
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
      default: break;
    }
  }
  return result;
}
