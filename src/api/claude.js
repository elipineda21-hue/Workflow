// ── Claude Submittal API ─────────────────────────────────────────────────────
const EDGE_URL = import.meta.env.VITE_CLAUDE_EDGE_URL || "https://nymnjhfpvwxdkxxcxbts.supabase.co/functions/v1/claude-submittal";

export async function generateSubmittal(projectData, systemType = "security") {
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectData, systemType, action: "submittal" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Submittal generation failed");
  return data.text;
}

export async function generateSpecSummary(deviceData) {
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectData: deviceData, action: "spec-summary" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Spec summary failed");
  return data.text;
}

/**
 * Generate a structured submittal package with spec sheets
 * @param {object} projectData - Project metadata
 * @param {array} specSheets - Array of {filePath, brand, model, category}
 * @param {string} systemFilter - "all" or specific system type
 * @returns {Promise<object>} Parsed JSON response with sections, projectSummary, etc.
 */
export async function generateSubmittalPackage(projectData, specSheets, systemFilter = "all") {
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectData,
      specSheets,
      systemFilter,
      action: "submittal-package",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Submittal package generation failed");
  return data;
}
