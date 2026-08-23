import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before processing deletions.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Returns every object below a user's private bucket prefix without logging object names. */
async function listStoragePaths(bucket, prefix) {
  const paths = [];
  const directories = [prefix];
  while (directories.length > 0) {
    const directory = directories.pop();
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabase.storage.from(bucket).list(directory, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error("STORAGE_LIST_FAILED");
      for (const entry of data ?? []) {
        const path = directory ? `${directory}/${entry.name}` : entry.name;
        if (entry.id) paths.push(path);
        else directories.push(path);
      }
      if (!data || data.length < 100) break;
    }
  }
  return paths;
}

/** Removes private objects in bounded batches through the Storage API. */
async function removeUserStorage(bucket, userId) {
  const paths = await listStoragePaths(bucket, userId);
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await supabase.storage.from(bucket).remove(paths.slice(index, index + 100));
    if (error) throw new Error("STORAGE_REMOVE_FAILED");
  }
}

/** Marks a claimed deletion for a bounded retry without persisting provider details. */
async function markFailed(requestId) {
  await supabase
    .from("account_deletion_requests")
    .update({
      status: "failed",
      claimed_at: null,
      scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      last_error_code: "PROCESSING_FAILED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
}

/** Completes one deletion in Storage, application data, and Supabase Auth order. */
async function processDeletion(request) {
  let authDeleted = false;
  try {
    await Promise.all([
      removeUserStorage("photos", request.user_id),
      removeUserStorage("horoscopes", request.user_id),
    ]);
    const { error: prepareError } = await supabase.rpc("prepare_account_deletion", {
      p_request_id: request.request_id,
      p_user_id: request.user_id,
    });
    if (prepareError) throw new Error("DATABASE_PURGE_FAILED");

    const { error: authError } = await supabase.auth.admin.deleteUser(request.user_id);
    if (authError) throw new Error("AUTH_DELETE_FAILED");
    authDeleted = true;

    const completedAt = new Date();
    const { error: receiptError } = await supabase
      .from("account_deletion_requests")
      .update({
        status: "completed",
        completed_at: completedAt.toISOString(),
        retention_until: new Date(completedAt.getTime() + 30 * 86_400_000).toISOString(),
        last_error_code: null,
        updated_at: completedAt.toISOString(),
      })
      .eq("id", request.request_id);
    if (receiptError) throw new Error("RECEIPT_UPDATE_FAILED");
    return true;
  } catch {
    if (authDeleted) return true;
    await markFailed(request.request_id);
    return false;
  }
}

const limit = Math.min(Math.max(Number.parseInt(process.env.DELETION_BATCH_SIZE || "10", 10) || 10, 1), 50);
const { data: requests, error } = await supabase.rpc("claim_account_deletion_batch", { p_limit: limit });
if (error) throw new Error("Could not claim account deletion work.");

let completed = 0;
for (const request of requests ?? []) {
  if (await processDeletion(request)) completed += 1;
}
console.log(`Account deletion run complete: ${completed} completed, ${(requests?.length ?? 0) - completed} deferred.`);
