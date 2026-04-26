import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
if (!SUPABASE_URL) console.error("VITE_SUPABASE_URL not set — Supabase will not work");
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
if (!SUPABASE_KEY) console.error("VITE_SUPABASE_KEY not set — Supabase will not work");

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

// Save a work order with optimistic locking (checks updated_at before saving)
export async function saveWorkOrder(mondayProjectId, projectName, projectRef, state) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("work_orders")
    .select("updated_at")
    .eq("monday_project_id", String(mondayProjectId))
    .single();

  const row = {
    monday_project_id: String(mondayProjectId),
    project_name: projectName,
    project_ref: projectRef,
    state,
    updated_at: now,
  };

  if (existing) {
    // Update only if our version is newer or matches
    const { error } = await supabase
      .from("work_orders")
      .update(row)
      .eq("monday_project_id", String(mondayProjectId))
      .gte("updated_at", existing.updated_at);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("work_orders")
      .insert(row);
    if (error) throw error;
  }
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

// Get download URL for a stored spec sheet
// Uses public URL for now (sync) — signed URLs require async refactor of all callers
export function getSpecSheetUrl(filePath) {
  if (!filePath) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || null;
}

// ── Project Files ──────────────────────────────────────────────────────────────
const FILES_BUCKET = "project-files";

export async function uploadProjectFile(mondayProjectId, category, file) {
  const ext      = file.name.split(".").pop() || "bin";
  const safeName = `${mondayProjectId}/${category}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: upErr } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(safeName, file, { upsert: false });
  if (upErr) throw upErr;
  const { error: dbErr } = await supabase
    .from("project_files")
    .insert({
      monday_project_id: String(mondayProjectId),
      category,
      file_name:  file.name,
      file_path:  safeName,
      file_size:  file.size,
      created_at: new Date().toISOString(),
    });
  if (dbErr) throw dbErr;
}

export async function listProjectFiles(mondayProjectId) {
  const { data, error } = await supabase
    .from("project_files")
    .select("*")
    .eq("monday_project_id", String(mondayProjectId))
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteProjectFile(id, filePath) {
  const { error: stErr } = await supabase.storage.from(FILES_BUCKET).remove([filePath]);
  if (stErr) throw stErr;
  const { error: dbErr } = await supabase.from("project_files").delete().eq("id", id);
  if (dbErr) throw dbErr;
}

export function getProjectFileUrl(filePath) {
  if (!filePath) return null;
  const { data } = supabase.storage.from(FILES_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || null;
}

// ── User Settings (stored in Supabase Auth user_metadata) ─────────────────────

export async function saveUserSettings(settings) {
  const { error } = await supabase.auth.updateUser({
    data: settings,
  });
  if (error) throw error;
}

export async function getUserSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata || {};
}

// ── Device Catalog (auto-growing model list) ──────────────────────────────────

// Upsert a brand/model into the catalog (increments seen_count if exists)
export async function catalogDevice(category, brand, model) {
  if (!brand || !model) return;
  const { error } = await supabase.rpc('upsert_device_catalog', { p_category: category, p_brand: brand, p_model: model });
  // Fallback if RPC doesn't exist: try insert, ignore conflict
  if (error) {
    await supabase.from("device_catalog").upsert({
      category, brand, model,
      display_name: model,
      seen_count: 1,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "brand,model", ignoreDuplicates: false });
  }
}

// Bulk upsert multiple devices into catalog
export async function catalogDevices(items) {
  if (!items.length) return;
  const rows = items.filter(i => i.brand && i.model).map(i => ({
    category: i.category || "unknown",
    brand: i.brand,
    model: i.model,
    display_name: i.model,
    seen_count: 1,
    last_seen_at: new Date().toISOString(),
  }));
  if (!rows.length) return;
  await supabase.from("device_catalog").upsert(rows, { onConflict: "brand,model" });
}

// Fetch all catalog entries (for model dropdowns)
export async function listCatalog() {
  const { data, error } = await supabase
    .from("device_catalog")
    .select("*")
    .order("brand")
    .order("model");
  if (error) throw error;
  return data || [];
}

// Delete a catalog entry
export async function deleteCatalogEntry(id) {
  const { error } = await supabase.from("device_catalog").delete().eq("id", id);
  if (error) throw error;
}

// Update a catalog entry in place (no delete+recreate)
export async function updateCatalogEntry(id, updates) {
  const { error } = await supabase.from("device_catalog").update({
    ...updates,
    last_seen_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw error;
}

// Update a library entry metadata (brand, model, category, display_name)
export async function updateLibraryEntry(id, updates) {
  const { error } = await supabase.from("device_library").update(updates).eq("id", id);
  if (error) throw error;
}

// ── Project ↔ Device Associations ─────────────────────────────────────────────

// Add a device to a project (by library or catalog ID)
export async function addDeviceToProject(mondayProjectId, libraryEntryId, catalogEntryId) {
  const row = { monday_project_id: String(mondayProjectId) };
  if (libraryEntryId) row.library_entry_id = libraryEntryId;
  if (catalogEntryId) row.catalog_entry_id = catalogEntryId;
  const { error } = await supabase.from("project_devices").upsert(row, {
    onConflict: libraryEntryId ? "monday_project_id,library_entry_id" : "monday_project_id,catalog_entry_id",
  });
  if (error) throw error;
}

// Remove a device from a project
export async function removeDeviceFromProject(mondayProjectId, libraryEntryId, catalogEntryId) {
  let query = supabase.from("project_devices").delete().eq("monday_project_id", String(mondayProjectId));
  if (libraryEntryId) query = query.eq("library_entry_id", libraryEntryId);
  else if (catalogEntryId) query = query.eq("catalog_entry_id", catalogEntryId);
  const { error } = await query;
  if (error) throw error;
}

// List all device IDs associated with a project
export async function listProjectDeviceIds(mondayProjectId) {
  const { data, error } = await supabase
    .from("project_devices")
    .select("library_entry_id, catalog_entry_id")
    .eq("monday_project_id", String(mondayProjectId));
  if (error) throw error;
  return data || [];
}
