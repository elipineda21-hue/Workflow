// ── PDF Parts List Parser ─────────────────────────────────────────────────────
// Extracts brand, model, quantity from procurement/proposal PDFs.
// Portal.io PDFs have: section header → line items (lineNum, brand, model, qty)

function sectionToCategory(text) {
  const t = (text || "").toLowerCase().trim();
  if (/surveillance|cctv|video\s*surveil|camera\s*system|vss/i.test(t)) return "camera";
  if (/access\s*control/i.test(t))                                      return "door";
  if (/intrusion|alarm|burglar/i.test(t))                               return "zone";
  if (/audio|speaker|sound|intercom|paging/i.test(t))                   return "speaker";
  if (/network|switch|structured|infrastructure/i.test(t))              return "switch";
  if (/server|nvr|dvr|recording|storage|vms/i.test(t))                  return "server";
  if (/^video$/i.test(t))                                               return "camera";
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

// Skip these tokens entirely
const SKIP_WORDS = new Set([
  "required", "in-stock", "instock", "in stock", "order", "received",
  "qty", "taken", "by", "x", "select", "select...",
]);

function shouldSkip(text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return true;
  if (SKIP_WORDS.has(t)) return true;
  if (/^x\.+$/.test(t)) return true;
  if (/^=+$/.test(t)) return true;
  if (/^-+$/.test(t)) return true;
  if (/^page\s+\d/i.test(t)) return true;
  if (/^\d+\s+of\s+\d+$/.test(t)) return true;
  if (/^pathways\s/i.test(t)) return true;
  if (/^proposal\s/i.test(t)) return true;
  return false;
}

// Is this likely a model/part number?
function looksLikeModel(text) {
  const t = (text || "").trim();
  if (t.length < 2) return false;
  if (/^\d{1,3}$/.test(t)) return false; // small numbers are line nums or qty
  // Contains dash + alphanumeric = very likely model
  if (/[A-Z0-9]+-[A-Z0-9]/i.test(t)) return true;
  // Mixed letters and digits, 4+ chars
  if (t.length >= 4 && /[A-Z]/i.test(t) && /\d/.test(t)) return true;
  // Pure digits 4+ = part number
  if (/^\d{4,}$/.test(t)) return true;
  return false;
}

// Extract all text from PDF preserving reading order
export async function extractPdfText(file) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF.js not loaded yet. Please wait and try again.");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allTokens = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Sort by Y (top to bottom) then X (left to right)
    const items = content.items
      .filter(i => i.str.trim())
      .map(i => ({ text: i.str.trim(), x: i.transform[4], y: i.transform[5], fs: i.transform[0], page: p }))
      .sort((a, b) => {
        const dy = b.y - a.y; // top to bottom
        if (Math.abs(dy) > 2) return dy;
        return a.x - b.x; // left to right
      });
    allTokens.push(...items);
  }

  return allTokens;
}

// Main parser: processes sequential tokens
export function parsePdfParts(textItems) {
  const results = [];
  let currentCategory = "unknown";

  // Flatten to just an ordered list of text strings
  const tokens = textItems.map(t => t.text).filter(t => !shouldSkip(t));

  console.log("PDF tokens (filtered):", tokens);

  // Scan for section headers and items
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];

    // Check for section header: "Access Control" or "Surveillance"
    // Try single token, then combine with next 1-2 tokens for multi-word headers
    {
      let foundSection = false;
      let headerText = "";
      for (let look = 0; look <= 2 && i + look < tokens.length; look++) {
        headerText = (look === 0) ? t : headerText + " " + tokens[i + look];
        const cleaned = headerText.replace(/\s+\d+\s*Items?\s*$/i, "").trim();
        const cat = sectionToCategory(cleaned);
        if (cat) {
          currentCategory = cat;
          // Skip past header + any "N Items" tokens
          let skip = i + look + 1;
          while (skip < tokens.length && (/^\d+$/.test(tokens[skip]) || /^items?$/i.test(tokens[skip]))) skip++;
          i = skip;
          foundSection = true;
          break;
        }
      }
      if (foundSection) continue;
    }

    // Check for line number (1-999)
    if (/^\d{1,3}$/.test(t)) {
      const lineNum = parseInt(t);
      // Line numbers should be reasonable (1-200)
      if (lineNum >= 1 && lineNum <= 200) {
        // Look ahead for brand then model
        // Pattern: lineNum → brand text → model number → quantity
        // Brand: next non-skip token that has letters
        // Model: next token that looks like a model/part number
        // Qty: next small number

        let brand = null;
        let model = null;
        let qty = 1;
        let j = i + 1;
        const MAX_LOOKAHEAD = 12; // don't look too far ahead

        while (j < tokens.length && j < i + MAX_LOOKAHEAD) {
          const tok = tokens[j];

          // Skip noise
          if (shouldSkip(tok)) { j++; continue; }

          // Section header? Stop.
          if (sectionToCategory(tok)) break;

          // If we have brand+model, the very next number is the quantity
          if (brand && model && /^\d{1,4}$/.test(tok)) {
            qty = parseInt(tok);
            j++;
            break; // done with this item
          }

          // If we already have brand+model and hit non-qty text, stop
          if (brand && model) break;

          if (!brand && !looksLikeModel(tok) && /[A-Za-z]/.test(tok)) {
            // This is the brand
            // Brand might span multiple tokens: "UniView Technologies (UniView Tec) (ATV)"
            // Keep collecting until we find a model number
            let brandParts = [tok];
            let k = j + 1;
            while (k < tokens.length && k < i + MAX_LOOKAHEAD) {
              const nextTok = tokens[k];
              if (shouldSkip(nextTok)) { k++; continue; }
              if (looksLikeModel(nextTok)) break;
              if (/^\d{1,3}$/.test(nextTok)) break;
              if (sectionToCategory(nextTok)) break;
              // If it looks like more brand text (has letters, no digits or parenthetical)
              if (/[A-Za-z]/.test(nextTok) && !looksLikeModel(nextTok)) {
                brandParts.push(nextTok);
                k++;
              } else {
                break;
              }
            }
            brand = brandParts.join(" ").trim();
            j = k;
            continue;
          }

          if (brand && !model && looksLikeModel(tok)) {
            model = tok;
            j++;
            continue;
          }

          j++;
        }

        if (brand && model) {
          results.push({
            lineNum,
            brand,
            model,
            qty: Math.max(1, qty),
            category: currentCategory,
            sectionLabel: currentCategory,
            hardware: isHardwareOnly(model, brand),
          });
          i = j; // skip past what we consumed
          continue;
        }
      }
    }

    i++;
  }

  console.log("Parsed results:", results);
  return results;
}
