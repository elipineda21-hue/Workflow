// ── PDF Parts List Parser ─────────────────────────────────────────────────────
// Extracts brand, model, quantity, and category from procurement/proposal PDFs
// like Portal.io printouts with section headers (Surveillance, Access Control, etc.)

// Category detection from section headers
function sectionToCategory(text) {
  const t = (text || "").toLowerCase();
  if (/surveillance|cctv|video|camera|vss/.test(t))            return "camera";
  if (/access\s*control|door|credential|reader/.test(t))       return "door";
  if (/intrusion|alarm|burglar|panel/.test(t))                 return "zone";
  if (/audio|speaker|sound|intercom|paging/.test(t))           return "speaker";
  if (/network|switch|structured|infrastructure|it\b/.test(t)) return "switch";
  if (/server|nvr|dvr|recording|storage|vms/.test(t))          return "server";
  return "unknown";
}

// Known hardware-only items (no programming needed)
const HARDWARE_PATTERNS = [
  /junction\s*box/i, /j-?box/i, /mount/i, /bracket/i, /adapter/i,
  /power\s*supply/i, /transformer/i, /cable/i, /conduit/i,
  /backbox/i, /gang\s*box/i, /faceplate/i, /patch\s*panel/i,
  /rack/i, /shelf/i, /rail/i, /enclosure/i, /housing/i,
  /^tr-/i, /^al\d/i,  // common part prefixes for mounts/power supplies
  /wall\s*plate/i, /connector/i, /splitter/i,
];

function isHardwareOnly(model, brand) {
  const combined = `${brand || ""} ${model || ""}`;
  return HARDWARE_PATTERNS.some(p => p.test(combined));
}

// Extract text from all pages of a PDF file
export async function extractPdfText(file) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF.js not loaded yet. Please wait a moment and try again.");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Group text items by Y position to reconstruct lines
    const lines = {};
    for (const item of content.items) {
      const y = Math.round(item.transform[5]); // Y position
      if (!lines[y]) lines[y] = [];
      lines[y].push({ x: item.transform[4], text: item.str });
    }
    // Sort lines top to bottom, items left to right
    const sortedYs = Object.keys(lines).map(Number).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const lineItems = lines[y].sort((a, b) => a.x - b.x);
      const lineText = lineItems.map(i => i.text).join(" ").trim();
      if (lineText) pages.push(lineText);
    }
    pages.push("---PAGE_BREAK---");
  }
  return pages.filter(l => l !== "---PAGE_BREAK---" || true);
}

// Parse extracted text lines into structured items
export function parsePdfParts(lines) {
  const items = [];
  let currentCategory = "unknown";
  let currentSectionLabel = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === "---PAGE_BREAK---") continue;

    // Detect section headers: "Surveillance  8 Items" or "Access Control  12 Items"
    const sectionMatch = line.match(/^([A-Za-z][A-Za-z &/]+?)\s+(\d+)\s*Items?\s*$/i);
    if (sectionMatch) {
      const detected = sectionToCategory(sectionMatch[1]);
      if (detected !== "unknown") {
        currentCategory = detected;
        currentSectionLabel = sectionMatch[1].trim();
        continue;
      }
    }

    // Also detect standalone section headers without item count
    const standaloneSec = line.match(/^(Surveillance|Access Control|Intrusion|Audio|Network|Server|Switching)\s*$/i);
    if (standaloneSec) {
      const detected = sectionToCategory(standaloneSec[1]);
      if (detected !== "unknown") {
        currentCategory = detected;
        currentSectionLabel = standaloneSec[1].trim();
        continue;
      }
    }

    // Detect line items: starts with a line number, has brand text, model text, and quantity
    // Pattern: "31 Altronix AL400ACM220 2 Required In-Stock Order Received..."
    // Or multiline: line number + brand on one line, model on next
    const lineNumMatch = line.match(/^(\d{1,4})\s+(.+)/);
    if (!lineNumMatch) continue;

    const rest = lineNumMatch[2];

    // Try to extract brand and model from the text
    // Look for pattern: "Brand (Parenthetical) MODEL-NUMBER qty"
    // or "Brand MODEL qty"
    const parsed = parseItemLine(rest, lines, i);
    if (parsed) {
      items.push({
        lineNum: parseInt(lineNumMatch[1]),
        brand: parsed.brand,
        model: parsed.model,
        qty: parsed.qty,
        category: currentCategory,
        sectionLabel: currentSectionLabel,
        hardware: isHardwareOnly(parsed.model, parsed.brand),
      });
    }
  }

  return items;
}

function parseItemLine(text, allLines, lineIdx) {
  // Skip footer/header lines
  if (/^Pathways|^Proposal|^Page\s/i.test(text)) return null;
  if (/Required.*In-Stock.*Order/i.test(text) && !/\w{3,}/.test(text.split(/Required/)[0])) return null;

  // Strategy: find the quantity (a standalone number typically 1-999)
  // The text before qty contains brand + model
  // Format variations:
  //   "Altronix AL400ACM220 2 Required..."
  //   "Hanwha Techwin (Vision) QNV-C8083R 1 Required..."
  //   "UniView Technologies (UniView Tec) (ATV) IPC3628SR-ADF28KM-WP 4 Required..."

  // Strip trailing "Required In-Stock Order Received Qty Taken by" and similar
  const cleaned = text
    .replace(/\s+(Required|In-Stock|In Stock|Order|Received|Qty|Taken\s*by|x\.+).*$/i, "")
    .replace(/\s+$/, "");

  if (!cleaned || cleaned.length < 3) return null;

  // Find the quantity: last standalone number in the cleaned string
  // Model numbers contain letters+digits, so we look for a number preceded by space
  const qtyMatch = cleaned.match(/\s+(\d{1,4})\s*$/);
  let qty = 1;
  let brandModel = cleaned;

  if (qtyMatch) {
    qty = parseInt(qtyMatch[1]);
    brandModel = cleaned.substring(0, qtyMatch.index).trim();
  }

  // Now split brand from model
  // Model numbers typically contain: uppercase letters + digits + hyphens
  // Brand is the text before the model number
  const modelMatch = brandModel.match(/\b([A-Z0-9][A-Z0-9]+-[A-Z0-9-]+(?:-[A-Z0-9]+)*)\b/i)
    || brandModel.match(/\b([A-Z][A-Z0-9]{3,}[A-Z0-9-]*)\b/i);

  if (modelMatch) {
    const model = modelMatch[1];
    const modelIdx = brandModel.indexOf(model);
    const brand = brandModel.substring(0, modelIdx).trim()
      .replace(/\s*\(.*?\)\s*/g, " ")  // clean up parentheticals for display
      .replace(/\s+/g, " ")
      .trim();

    if (brand && model) {
      return { brand: brand || "Unknown", model, qty: Math.max(1, qty) };
    }
  }

  // Fallback: treat last word as model, rest as brand
  const parts = brandModel.split(/\s+/);
  if (parts.length >= 2) {
    const model = parts.pop();
    const brand = parts.join(" ").replace(/\s*\(.*?\)\s*/g, " ").trim();
    return { brand: brand || "Unknown", model, qty: Math.max(1, qty) };
  }

  return null;
}
