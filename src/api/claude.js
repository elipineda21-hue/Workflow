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
