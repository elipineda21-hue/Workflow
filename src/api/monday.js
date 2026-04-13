// ── Monday API ────────────────────────────────────────────────────────────────
export const MONDAY_BOARD_ID = import.meta.env.VITE_MONDAY_BOARD_ID || "18394052747";

export async function fetchProjects(token, colMap = {}) {
  if (!token) return [];
  const query = `{ boards(ids: ${MONDAY_BOARD_ID}) { items_page(limit: 100) { items { id name column_values { id text } } } } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  const items = data?.data?.boards?.[0]?.items_page?.items || [];
  return items.map(item => {
    const col = id => item.column_values.find(c => c.id === id)?.text || "";
    return {
      id: item.id,
      name: item.name,
      projectId:         col("text_mm0vkgrq"),
      techLead:          col("multiple_person_mm01ew1v"),
      programmingStatus: col("status"),
      projectStatus:     col("color_mm22v2tq"),
      schedule:          col("timerange_mm034yws"),
      customer:    colMap.customer    ? col(colMap.customer)    : "",
      siteAddress: colMap.siteAddress ? col(colMap.siteAddress) : "",
      pm:          colMap.pm          ? col(colMap.pm)          : "",
    };
  });
}

// Fetch raw column list from first board item for mapping UI
export async function fetchBoardColumns(token) {
  if (!token) return [];
  const query = `{ boards(ids: ${MONDAY_BOARD_ID}) { columns { id title } items_page(limit: 1) { items { column_values { id text } } } } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  const board = data?.data?.boards?.[0];
  const cols  = board?.columns || [];
  const vals  = board?.items_page?.items?.[0]?.column_values || [];
  return cols.map(c => ({
    id:    c.id,
    title: c.title,
    sample: vals.find(v => v.id === c.id)?.text || "",
  }));
}

// ── Monday Write-back ─────────────────────────────────────────────────────────
export async function pushMondayUpdate(token, itemId, colId, textValue) {
  if (!token || !itemId || !colId || !textValue) return;
  const mutation = `mutation { change_simple_column_value(board_id: ${MONDAY_BOARD_ID}, item_id: "${itemId}", column_id: "${colId}", value: ${JSON.stringify(String(textValue))}) { id } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({ query: mutation }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data;
}
