// ── PDF Parts List Parser ─────────────────────────────────────────────────────
// Extracts brand, model, quantity from procurement/proposal PDFs.
// Portal.io token order: brand → qty → lineNum → model (due to PDF Y positions)

function sectionToCategory(text) {
  const t = (text || "").toLowerCase().trim();
  if (/surveillance|cctv|video\s*surveil|camera\s*system|vss/i.test(t)) return "camera";
  if (/access\s*control/i.test(t))                                      return "door";
  if (/intrusion|alarm|burglar|detection/i.test(t))                     return "zone";
  if (/audio|speaker|sound|intercom|paging/i.test(t))                   return "speaker";
  if (/network/i.test(t))                                               return "switch";
  if (/server|nvr|dvr|recording|storage|vms/i.test(t))                  return "server";
  if (/^video$/i.test(t))                                               return "camera";
  if (/connector|adapter|cable/i.test(t))                               return "hardware";
  if (/equipment\s*rack|rack/i.test(t))                                 return "hardware";
  if (/installation\s*suppli|suppli|misc/i.test(t))                     return "hardware";
  if (/power\s*manage|power\s*supply/i.test(t))                         return "hardware";
  if (/mount|bracket|enclosure/i.test(t))                               return "hardware";
  if (/software|license/i.test(t))                                      return "hardware";
  if (/wire/i.test(t))                                                  return "hardware";
  return null;
}

const HARDWARE_PATTERNS = [
  /junction/i, /j-?box/i, /mount/i, /bracket/i, /adapter/i,
  /power\s*supply/i, /transformer/i, /conduit/i, /backbox/i,
  /faceplate/i, /patch\s*panel/i, /rack/i, /enclosure/i, /housing/i,
  /wall\s*plate/i, /connector/i, /splitter/i, /^tr-/i, /maximal/i,
  /vevor/i, /cat6/i, /plenum/i, /pdu/i,
];

function isHardwareOnly(model, brand) {
  const combined = `${brand || ""} ${model || ""}`;
  return HARDWARE_PATTERNS.some(p => p.test(combined));
}

const NOISE = new Set([
  "required", "in-stock", "instock", "order", "received",
  "qty", "taken", "by", "x", "select", "select...",
  "items", "item", "-", "=", "|",
]);

function isNoise(text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return true;
  if (NOISE.has(t)) return true;
  if (/^x\.+$/.test(t)) return true;
  if (/^=+$|^-+$/.test(t)) return true;
  if (/order\s*received/i.test(t)) return true;
  if (/taken\s*by/i.test(t)) return true;
  if (/pick\s*list/i.test(t)) return true;
  if (/proposal\s*#/i.test(t)) return true;
  if (/^\d+\s*items?$/i.test(t)) return true;
  if (/^in\s*stock$/i.test(t)) return true;
  if (/^\d+\s+of\s+\d+$/i.test(t)) return true; // "1 of 3" page numbers
  return false;
}

function looksLikeModel(text) {
  const t = (text || "").trim();
  if (t.length < 2) return false;
  if (/^\d{1,3}$/.test(t)) return false;
  if (/[A-Z0-9]+-[A-Z0-9]/i.test(t)) return true;
  if (t.length >= 4 && /[A-Z]/i.test(t) && /\d/.test(t)) return true;
  if (/^\d{4,}$/.test(t)) return true;
  return false;
}

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

// Main parser — works with the actual Portal.io token order:
// brand → qty → lineNum → model
export function parsePdfParts(textItems) {
  const results = [];

  const tokens = textItems.map(t => t.text).filter(t => !isNoise(t));
  console.log("PDF tokens (filtered):", tokens);

  // PASS 1: Find section header positions
  const sectionBreaks = [];
  for (let i = 0; i < tokens.length; i++) {
    for (let span = 1; span <= 3 && i + span - 1 < tokens.length; span++) {
      const combined = tokens.slice(i, i + span).join(" ");
      const cat = sectionToCategory(combined);
      if (cat) {
        sectionBreaks.push({ idx: i, span, category: cat });
        break;
      }
    }
  }

  const headerIndices = new Set();
  for (const sb of sectionBreaks) {
    for (let j = sb.idx; j < sb.idx + sb.span; j++) headerIndices.add(j);
    // Skip trailing number (the "4" in "4 Items")
    let after = sb.idx + sb.span;
    while (after < tokens.length && /^\d{1,3}$/.test(tokens[after])) {
      headerIndices.add(after);
      after++;
    }
  }

  const getCategoryAt = (idx) => {
    let cat = "unknown";
    for (const sb of sectionBreaks) {
      if (sb.idx <= idx) cat = sb.category;
      else break;
    }
    return cat;
  };

  // PASS 2: Find line numbers (two-digit patterns like "01", "02" or small numbers)
  // Then look BEFORE for brand+qty and AFTER for model
  // Portal.io order: brand → qty → lineNum → model
  const lineNumIndices = [];
  for (let i = 0; i < tokens.length; i++) {
    if (headerIndices.has(i)) continue;
    const t = tokens[i];
    // Line numbers: "01"-"99" (zero-padded) or plain 1-200
    if (/^0\d$/.test(t) || (/^\d{1,3}$/.test(t) && parseInt(t) >= 1 && parseInt(t) <= 200)) {
      lineNumIndices.push(i);
    }
  }

  // For each line number, look backward for brand+qty and forward for model
  for (const lnIdx of lineNumIndices) {
    const lineNum = parseInt(tokens[lnIdx]);

    // Look FORWARD for model (next non-header, non-noise token that looks like a model)
    let model = null;
    let modelIdx = lnIdx + 1;
    while (modelIdx < tokens.length && modelIdx < lnIdx + 5) {
      if (headerIndices.has(modelIdx)) { modelIdx++; continue; }
      const tok = tokens[modelIdx];
      if (isNoise(tok)) { modelIdx++; continue; }
      // Accept as model: has dashes, or mixed alpha+digits, or is non-numeric text
      if (looksLikeModel(tok) || (tok.length >= 2 && !/^\d{1,3}$/.test(tok) && /[A-Za-z]/.test(tok))) {
        model = tok;
        break;
      }
      break; // if next token isn't model-like, stop
    }

    if (!model) continue;

    // Look BACKWARD for brand and qty
    // The pattern before lineNum is: brand → qty (or just brand)
    let brand = null;
    let qty = 1;

    // Walk backwards from lineNum, skipping headers and noise
    let j = lnIdx - 1;
    let backTokens = [];
    while (j >= 0 && backTokens.length < 5) {
      if (headerIndices.has(j)) { j--; continue; }
      const tok = tokens[j];
      if (isNoise(tok)) { j--; continue; }
      backTokens.unshift({ tok, idx: j });
      j--;
    }

    // In backTokens, the last token before lineNum should be qty (a number)
    // and everything before that is brand
    if (backTokens.length >= 2) {
      const lastBack = backTokens[backTokens.length - 1];
      if (/^\d{1,4}$/.test(lastBack.tok) && !headerIndices.has(lastBack.idx)) {
        qty = parseInt(lastBack.tok);
        // Check if this "qty" is actually another line's lineNum — if it matches a lineNumIndex, skip it
        if (!lineNumIndices.includes(lastBack.idx)) {
          brand = backTokens.slice(0, -1).map(b => b.tok).join(" ").trim();
        } else {
          // The number is another line number, not qty
          brand = backTokens.map(b => b.tok).join(" ").trim();
          qty = 1;
        }
      } else {
        // No qty found, all back tokens are brand
        brand = backTokens.map(b => b.tok).join(" ").trim();
      }
    } else if (backTokens.length === 1) {
      // Just one token — it's the brand (no separate qty)
      brand = backTokens[0].tok;
    }

    // Clean up brand — remove parenthetical aliases but keep the main name
    if (brand) {
      // Don't let brand be just a number
      if (/^\d+$/.test(brand)) continue;
      // Don't let brand be page text like "Sisler and Sisler"
      // (This will be caught because it appears before any section header)
    }

    if (brand && model) {
      const category = getCategoryAt(lnIdx);
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
    }
  }

  // Deduplicate by lineNum (keep first occurrence)
  const seen = new Set();
  const deduped = results.filter(r => {
    if (seen.has(r.lineNum)) return false;
    seen.add(r.lineNum);
    return true;
  });

  console.log("Parsed results:", deduped);
  return deduped;
}
