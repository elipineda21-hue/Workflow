// ── PDF Parts List Parser ─────────────────────────────────────────────────────
// Extracts brand, model, quantity from procurement/proposal PDFs.
// Strategy: catch EVERY line item, let the user exclude in the preview.

function sectionToCategory(text) {
  const t = (text || "").toLowerCase().trim();
  if (/surveillance|cctv|video\s*surveil|camera\s*system|vss/i.test(t)) return "camera";
  if (/access\s*control/i.test(t))                                      return "door";
  if (/intrusion|alarm|burglar|detection/i.test(t))                     return "zone";
  if (/audio|speaker|sound|intercom|paging/i.test(t))                   return "speaker";
  if (/network|switch|structured|infrastructure/i.test(t))              return "switch";
  if (/server|nvr|dvr|recording|storage|vms/i.test(t))                  return "server";
  if (/^video$/i.test(t))                                               return "camera";
  if (/connector|adapter|cable|wire/i.test(t))                          return "hardware";
  if (/equipment\s*rack|rack/i.test(t))                                 return "hardware";
  if (/installation\s*suppli|suppli|misc/i.test(t))                     return "hardware";
  if (/power\s*manage|power\s*supply/i.test(t))                         return "hardware";
  if (/mount|bracket|enclosure/i.test(t))                               return "hardware";
  if (/software|license/i.test(t))                                      return "hardware";
  return null;
}

const HARDWARE_PATTERNS = [
  /junction/i, /j-?box/i, /mount/i, /bracket/i, /adapter/i,
  /power\s*supply/i, /transformer/i, /conduit/i, /backbox/i,
  /faceplate/i, /patch\s*panel/i, /rack/i, /enclosure/i, /housing/i,
  /wall\s*plate/i, /connector/i, /splitter/i, /^tr-/i, /maximal/i,
];

function isHardwareOnly(model, brand) {
  const combined = `${brand || ""} ${model || ""}`;
  return HARDWARE_PATTERNS.some(p => p.test(combined));
}

// Tokens to completely discard
const NOISE = new Set([
  "required", "in-stock", "instock", "order", "received",
  "qty", "taken", "by", "x", "select", "select...",
  "items", "item", "portal", "-", "=",
]);

function isNoise(text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return true;
  if (NOISE.has(t)) return true;
  if (/^x\.+$/.test(t)) return true;
  if (/^=+$/.test(t)) return true;
  if (/^-+$/.test(t)) return true;
  if (/order\s*received/i.test(t)) return true;
  if (/taken\s*by/i.test(t)) return true;
  if (/pick\s*list/i.test(t)) return true;
  if (/proposal\s*#/i.test(t)) return true;
  if (/options\s*x\s/i.test(t)) return true;
  if (/low\s*voltage\s*r\d/i.test(t)) return true;
  if (/^\d+\s*items?$/i.test(t)) return true;
  if (/^in\s*stock$/i.test(t)) return true;
  return false;
}

// Does this look like a part/model number?
function looksLikeModel(text) {
  const t = (text || "").trim();
  if (t.length < 2) return false;
  if (/^\d{1,3}$/.test(t)) return false;
  // Dashes with alphanumeric = very likely model
  if (/[A-Z0-9]+-[A-Z0-9]/i.test(t)) return true;
  // Mixed letters+digits, 4+ chars
  if (t.length >= 4 && /[A-Z]/i.test(t) && /\d/.test(t)) return true;
  // Pure digits 4+ = part number
  if (/^\d{4,}$/.test(t)) return true;
  // Short codes with digits like "6U", "1G"
  if (/^\d+[A-Z]+$/i.test(t) && t.length >= 2) return true;
  return false;
}

// Extract all text from PDF in reading order
export async function extractPdfText(file) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF.js not loaded yet. Please wait and try again.");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allTokens = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter(i => i.str.trim())
      .map(i => ({ text: i.str.trim(), x: i.transform[4], y: i.transform[5], page: p }))
      .sort((a, b) => {
        const dy = b.y - a.y;
        if (Math.abs(dy) > 2) return dy;
        return a.x - b.x;
      });
    allTokens.push(...items);
  }
  return allTokens;
}

// Main parser
export function parsePdfParts(textItems) {
  const results = [];

  // Get clean token list
  const tokens = textItems.map(t => t.text).filter(t => !isNoise(t));
  console.log("PDF tokens (filtered):", tokens.slice(0, 200));

  // PASS 1: Find all section header positions and their categories
  // This lets us know what category each line item belongs to without
  // the section header detection interfering with item parsing.
  const sectionBreaks = []; // { tokenIndex, category }
  for (let i = 0; i < tokens.length; i++) {
    // Try combining 1-3 tokens to match section headers
    for (let span = 1; span <= 3 && i + span - 1 < tokens.length; span++) {
      const combined = tokens.slice(i, i + span).join(" ");
      const cat = sectionToCategory(combined);
      if (cat) {
        sectionBreaks.push({ idx: i, span, category: cat });
        break;
      }
    }
  }

  // Build a set of token indices that are part of section headers (so we skip them)
  const headerIndices = new Set();
  for (const sb of sectionBreaks) {
    for (let j = sb.idx; j < sb.idx + sb.span; j++) headerIndices.add(j);
    // Also skip any number immediately after (the "4" in "4 Items")
    let after = sb.idx + sb.span;
    while (after < tokens.length && /^\d{1,3}$/.test(tokens[after])) {
      headerIndices.add(after);
      after++;
    }
  }

  // Function to get category for a given token index
  const getCategoryAt = (idx) => {
    let cat = "unknown";
    for (const sb of sectionBreaks) {
      if (sb.idx <= idx) cat = sb.category;
      else break;
    }
    return cat;
  };

  // PASS 2: Find all line items using the simple pattern:
  // lineNumber → brand (1+ text tokens) → model (1 token) → qty (1 number)
  let i = 0;
  while (i < tokens.length) {
    // Skip section header tokens
    if (headerIndices.has(i)) { i++; continue; }

    const t = tokens[i];

    // Look for a line number (1-200)
    if (/^\d{1,3}$/.test(t) && parseInt(t) >= 1 && parseInt(t) <= 200) {
      const lineNum = parseInt(t);

      // Collect brand tokens until we hit a model number
      let j = i + 1;
      const brandParts = [];
      let model = null;
      let qty = 1;

      // Skip any header indices
      while (j < tokens.length && headerIndices.has(j)) j++;

      // Collect brand: text tokens that aren't models or numbers
      while (j < tokens.length && j < i + 15) {
        if (headerIndices.has(j)) { j++; continue; }
        const tok = tokens[j];
        if (isNoise(tok)) { j++; continue; }

        if (looksLikeModel(tok)) {
          model = tok;
          j++;
          break;
        }
        if (/^\d{1,3}$/.test(tok) && brandParts.length > 0) {
          // Could be qty if we haven't found model yet — but brand must come before model
          // This is probably the next line number, so stop
          break;
        }
        if (/[A-Za-z]/.test(tok)) {
          brandParts.push(tok);
          j++;
        } else {
          break;
        }
      }

      // If we found brand but no model, the "model" might be a text-only string
      // (like "VEVOR 6U" where "VEVOR" is brand and "6U" might not pass looksLikeModel)
      // Try: if next token after brand collection is a short alphanumeric, use it as model
      if (brandParts.length > 0 && !model && j < tokens.length) {
        while (j < tokens.length && headerIndices.has(j)) j++;
        if (j < tokens.length && !isNoise(tokens[j])) {
          const candidate = tokens[j];
          if (candidate.length >= 2 && !/^\d{1,3}$/.test(candidate)) {
            model = candidate;
            j++;
          }
        }
      }

      // Now look for quantity: next number
      if (model) {
        while (j < tokens.length && headerIndices.has(j)) j++;
        if (j < tokens.length && /^\d{1,4}$/.test(tokens[j])) {
          qty = parseInt(tokens[j]);
          j++;
        }
      }

      if (brandParts.length > 0 && model) {
        const brand = brandParts.join(" ").trim();
        const category = getCategoryAt(i);
        const isHwSection = category === "hardware";
        results.push({
          lineNum,
          brand,
          model,
          qty: Math.max(1, qty),
          category: isHwSection ? "unknown" : category,
          sectionLabel: category,
          hardware: isHwSection || isHardwareOnly(model, brand),
        });
        i = j;
        continue;
      }
    }

    i++;
  }

  console.log("Parsed results:", results);
  return results;
}
