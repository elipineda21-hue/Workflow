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

// ── Device Library ─────────────────────────────────────────────────────────────
const BUCKET = "device-specs";

// Upload a spec sheet PDF and upsert the metadata row.
// Replaces any existing entry for the same brand+model.
export async function uploadSpecSheet({ category, brand, model, displayName, uploadedBy, file }) {
  const ext      = file.name.split(".").pop() || "pdf";
  const safeName = `${category}/${brand}/${model}.${ext}`
    .replace(/[^a-zA-Z0-9/_.-]/g, "_");

  // Upload file (upsert overwrites existing)
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(safeName, file, { upsert: true, contentType: "application/pdf" });
  if (upErr) throw upErr;

  // Upsert metadata row
  const { error: dbErr } = await supabase
    .from("device_library")
    .upsert({
      category,
      brand,
      model,
      display_name: displayName || model,
      file_path:    safeName,
      file_name:    file.name,
      uploaded_by:  uploadedBy || null,
      created_at:   new Date().toISOString(),
    }, { onConflict: "brand,model" });
  if (dbErr) throw dbErr;
}

// Fetch all library entries ordered for tree display
export async function listLibrary() {
  const { data, error } = await supabase
    .from("device_library")
    .select("*")
    .order("category")
    .order("brand")
    .order("model");
  if (error) throw error;
  return data || [];
}

// Delete a library entry and its stored file
export async function deleteLibraryEntry(id, filePath) {
  const { error: stErr } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (stErr) throw stErr;
  const { error: dbErr } = await supabase.from("device_library").delete().eq("id", id);
  if (dbErr) throw dbErr;
}

// Get the public download URL for a stored spec sheet
export function getSpecSheetUrl(filePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || null;
}
