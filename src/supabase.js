import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nymnjhfpvwxdkxxcxbts.supabase.co";
const SUPABASE_KEY = "sb_publishable_UNqv0h8U6v0C0zo_dPj9BQ_cfDvIckJ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load a work order by Monday.com project ID
export async function loadWorkOrder(mondayProjectId) {
  const { data, error } = await supabase
    .from("work_orders")
    .select("*")
    .eq("monday_project_id", String(mondayProjectId))
    .single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data || null;
}

// Save (upsert) a work order
export async function saveWorkOrder(mondayProjectId, projectName, projectRef, state) {
  const { error } = await supabase
    .from("work_orders")
    .upsert({
      monday_project_id: String(mondayProjectId),
      project_name: projectName,
      project_ref: projectRef,
      state,
      updated_at: new Date().toISOString(),
    }, { onConflict: "monday_project_id" });
  if (error) throw error;
}

// List all saved work orders (for the home screen summary)
export async function listWorkOrders() {
  const { data, error } = await supabase
    .from("work_orders")
    .select("monday_project_id, project_name, project_ref, updated_at, state")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
