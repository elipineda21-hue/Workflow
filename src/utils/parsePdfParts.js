// ── PDF Parts List Parser ─────────────────────────────────────────────────────
// Extracts brand, model, quantity, and category from procurement/proposal PDFs
// like Portal.io printouts with section headers and line items.

// Category detection from section headers
function sectionToCategory(text) {
  const t = (text || "").toLowerCase();
  if (/surveillance|cctv|video\s*surveil|camera\s*system|vss/.test(t)) return "camera";
  if (/access\s*control|door\s*control/.test(t))                      return "door";
  if (/intrusion|alarm|burglar|panel/.test(t))                        return "zone";
  if (/audio|speaker|sound|intercom|paging/.test(t))                  return "speaker";
  if (/network|switch|structured|infrastructure/.test(t))             return "switch";
  if (/server|nvr|dvr|recording|storage|vms/.test(t))                 return "server";
  if (/^video$/.test(t.trim()))                                       return "camera";
  return null;
}

// Known hardware-only items (no programming needed)
const HARDWARE_PATTERNS = [
  /junction\s*box/i, /j-?box/i, /mount/i, /bracket/i, /adapter/i,
  /power\s*supply/i, /transformer/i, /cable/i, /conduit/i,
  /backbox/i, /gang\s*box/i, /faceplate/i, /patch\s*panel/i,
  /rack/i, /shelf/i, /rail/i, /enclosure/i, /housing/i,
  /wall\s*plate/i, /connector/i, /splitter/i, /^tr-/i,
  /maximal/i, /al\d{3}/i, /^ps-/i,
];

function isHardwareOnly(model, brand) {
  const combined = `${brand || ""} ${model || ""}`;
  return HARDWARE_PATTERNS.some(p => p.test(combined));
}

// Known noise text to filter out
const NOISE_PATTERNS = [
  /^required$/i, /^in-?stock$/i, /^order$/i, /^received$/i,
  /^qty$/i, /^taken\s*by$/i, /^x\.+/i, /^page\s/i,
  /^pathways/i, /^proposal/i, /^\d+\s*of\s*\d+$/i,
  /^select\.*/i, /^=$/,  /^-$/,
];

function isNoise(text) {
  const t = (text || "").trim();
  if (!t) return true;
  return NOISE_PATTERNS.some(p => p.test(t));
}

// Check if a string looks like a model number (has letters+digits or has dashes)
function isModelNumber(text) {
  const t = (text || "").trim();
  if (t.length < 2) return false;
  // Model numbers: contain digits AND letters, or contain dashes
  // Examples: BOS-DS160, B-ACS6100-DB, MAXIMAL33, 832028, QNV-C8083R
  if (/^[A-Z0-9]+-[A-Z0-9-]+$/i.test(t)) return true;  // dash-separated
  if (/[A-Z].*\d|\d.*[A-Z]/i.test(t) && t.length >= 3) return true;  // mixed alpha+digit
  if (/^\d{4,}$/.test(t)) return true;  // pure number 4+ digits (part numbers like 832028)
  return false;
}

// Check if a string looks like a brand name
function isBrandName(text) {
  const t = (text || "").trim();
  if (t.length < 2 || t.length > 60) return false;
  if (/^\d+$/.test(t)) return false;  // pure numbers
  if (isNoise(t)) return false;
  // Brands are typically title-case words, possibly with parenthetical
  if (/^[A-Z][a-z]/.test(t)) return true;  // starts with capital letter
  if (/^[A-Z]{2,}/.test(t) && !/^\d/.test(t)) return true;  // all caps like "RCI"
  return false;
}

// Extract text from all pages of a PDF, preserving position info
export async function extractPdfText(file) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF.js not loaded yet. Please wait a moment and try again.");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allItems = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Collect all text items with positions
    for (const item of content.items) {
      const text = item.str.trim();
      if (!text) continue;
      allItems.push({
        text,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        page: pageNum,
        fontSize: Math.round(item.transform[0]),  // approximate font size
      });
    }
  }

  return allItems;
}

// Parse text items into structured parts
export function parsePdfParts(textItems) {
  const items = [];
  let currentCategory = "unknown";

  // Group by approximate Y position (within 3px = same line)
  // Sort by page then Y (descending = top to bottom) then X
  const sorted = [...textItems].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (Math.abs(a.y - b.y) > 3) return b.y - a.y; // top to bottom
    return a.x - b.x; // left to right
  });

  // Build lines by grouping items within 3px Y
  const lines = [];
  let currentLine = [];
  let currentY = null;
  let currentPage = null;

  for (const item of sorted) {
    if (currentY === null || item.page !== currentPage || Math.abs(item.y - currentY) > 3) {
      if (currentLine.length > 0) lines.push(currentLine);
      currentLine = [item];
      currentY = item.y;
      currentPage = item.page;
    } else {
      currentLine.push(item);
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);

  // Now process lines looking for the pattern:
  // Section header: "Access Control" ... "9 Items"
  // Item lines come in pairs:
  //   Line A (brand line): lineNum + brand text (smaller font)
  //   Line B (model line): model number (larger/bold font)
  // Quantity is on a nearby line or same line as brand

  let pendingBrand = null;
  let pendingLineNum = null;
  let pendingQty = null;

  for (let li = 0; li < lines.length; li++) {
    const lineItems = lines[li].sort((a, b) => a.x - b.x);
    const fullText = lineItems.map(i => i.text).join(" ").trim();

    // Skip noise
    if (isNoise(fullText)) continue;
    if (/^x\.+$/.test(fullText)) continue;

    // Check for section headers: "Access Control  9 Items" or just "Surveillance"
    const sectionMatch = fullText.match(/^([A-Za-z][A-Za-z &/]+?)\s+(\d+)\s*Items?\s*$/i);
    if (sectionMatch) {
      const cat = sectionToCategory(sectionMatch[1]);
      if (cat) { currentCategory = cat; pendingBrand = null; continue; }
    }
    const standaloneSection = sectionToCategory(fullText);
    if (standaloneSection && fullText.length < 30) {
      currentCategory = standaloneSection;
      pendingBrand = null;
      continue;
    }

    // Look for line number at the start (leftmost item)
    const firstItem = lineItems[0];
    const lineNumMatch = firstItem.text.match(/^(\d{1,3})$/);

    if (lineNumMatch) {
      const lineNum = parseInt(lineNumMatch[1]);
      // Rest of the line after the line number
      const restItems = lineItems.slice(1).filter(i => !isNoise(i.text));
      const restText = restItems.map(i => i.text).join(" ").trim();

      if (!restText) {
        // Just a line number alone — skip
        continue;
      }

      // Check if rest contains both brand and model on same line
      // Pattern: "Brivo B-ACS6100-DB" or "Altronix MAXIMAL33"
      // Or just brand: "Brivo" with model on next line
      // Or brand + qty: "Brivo 5"

      // Try to find a model number in the rest
      const words = restText.split(/\s+/);
      let foundModel = null;
      let foundBrand = null;
      let foundQty = null;

      for (let w = 0; w < words.length; w++) {
        if (isModelNumber(words[w]) && !foundModel) {
          foundModel = words[w];
          foundBrand = words.slice(0, w).join(" ").trim();
        } else if (/^\d{1,3}$/.test(words[w]) && w > 0) {
          foundQty = parseInt(words[w]);
        }
      }

      if (foundModel && foundBrand) {
        // Complete item on one line
        items.push({
          lineNum,
          brand: foundBrand || "Unknown",
          model: foundModel,
          qty: foundQty || 1,
          category: currentCategory,
          sectionLabel: currentCategory,
          hardware: isHardwareOnly(foundModel, foundBrand),
        });
        pendingBrand = null;
      } else {
        // Likely just the brand on this line, model on next
        // Filter out numbers that look like quantities
        const brandParts = [];
        for (const w of words) {
          if (/^\d{1,3}$/.test(w)) {
            foundQty = parseInt(w);
          } else if (!isNoise(w)) {
            brandParts.push(w);
          }
        }
        pendingBrand = brandParts.join(" ").trim() || null;
        pendingLineNum = lineNum;
        pendingQty = foundQty;
      }
    } else if (pendingBrand) {
      // No line number — this might be the model line for the pending brand
      const restItems = lineItems.filter(i => !isNoise(i.text));
      const restText = restItems.map(i => i.text).join(" ").trim();

      if (restText && !isNoise(restText)) {
        // Check for quantity in this line too
        const words = restText.split(/\s+/);
        let model = null;
        let qty = pendingQty || 1;

        for (const w of words) {
          if (isModelNumber(w) && !model) {
            model = w;
          } else if (/^\d{1,3}$/.test(w) && !model) {
            qty = parseInt(w);
          } else if (/^\d{1,3}$/.test(w) && model) {
            qty = parseInt(w);
          }
        }

        if (model) {
          items.push({
            lineNum: pendingLineNum || 0,
            brand: pendingBrand,
            model,
            qty: Math.max(1, qty),
            category: currentCategory,
            sectionLabel: currentCategory,
            hardware: isHardwareOnly(model, pendingBrand),
          });
          pendingBrand = null;
          pendingLineNum = null;
          pendingQty = null;
        } else if (isModelNumber(restText)) {
          // The whole line is the model number
          items.push({
            lineNum: pendingLineNum || 0,
            brand: pendingBrand,
            model: restText,
            qty: Math.max(1, qty),
            category: currentCategory,
            sectionLabel: currentCategory,
            hardware: isHardwareOnly(restText, pendingBrand),
          });
          pendingBrand = null;
          pendingLineNum = null;
          pendingQty = null;
        }
      }
    } else {
      // No line number, no pending brand — check if this is a standalone quantity
      // or other metadata we should capture
      // Skip for now
    }
  }

  // Deduplicate: if same model appears twice (from different parsing paths), keep the one with higher qty
  const seen = new Map();
  const deduped = [];
  for (const item of items) {
    const key = `${item.brand}|${item.model}`;
    if (seen.has(key)) {
      const existing = seen.get(key);
      if (item.qty > existing.qty) {
        existing.qty = item.qty;
      }
    } else {
      seen.set(key, item);
      deduped.push(item);
    }
  }

  return deduped;
}
