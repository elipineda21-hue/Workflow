import { uid, mkCamGroup, mkSwGrp, mkSrvGrp, mkDoorGrp, mkZoneGrp, mkSpkGrp } from "../models";

// ── Portal.io Proposal CSV Import ─────────────────────────────────────────────
export function parseCSVLine(line) {
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

export function areaToCategory(area) {
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
export function detectPortalHeaders(cols) {
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

export function parseProposalCSV(csvText) {
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

export function buildGroupsFromRows(rows, overrideCats = {}) {
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
