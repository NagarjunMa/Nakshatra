const DELETION_BUCKETS = ["photos", "horoscopes"];

function workerError(code) {
  return new Error(code);
}

function isAlreadyDeleted(error) {
  return error?.status === 404 || error?.code === "user_not_found";
}

/** Builds a service-role-only deletion worker without retaining or logging subject data. */
export function createAccountDeletionWorker(supabase, { now = () => new Date() } = {}) {
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
        if (error) throw workerError("STORAGE_LIST_FAILED");
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

  async function removeUserStorage(bucket, userId) {
    const paths = await listStoragePaths(bucket, userId);
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await supabase.storage.from(bucket).remove(paths.slice(index, index + 100));
      if (error) throw workerError("STORAGE_REMOVE_FAILED");
    }
  }

  async function removeAllUserStorage(userId) {
    await Promise.all(DELETION_BUCKETS.map((bucket) => removeUserStorage(bucket, userId)));
  }

  async function rpcBoolean(name, args, code) {
    const { data, error } = await supabase.rpc(name, args);
    if (error || data !== true) throw workerError(code);
  }

  /** Persists a retryable pre-Auth failure, otherwise terminates the worker non-zero. */
  async function markFailed(request, code) {
    await rpcBoolean("fail_account_deletion", {
      p_request_id: request.request_id,
      p_claim_token: request.claim_token,
      p_error_code: code,
    }, "FAILURE_STATE_PERSISTENCE_FAILED");
  }

  async function complete(request) {
    await rpcBoolean("complete_account_deletion", {
      p_request_id: request.request_id,
      p_claim_token: request.claim_token,
    }, "RECEIPT_PERSISTENCE_FAILED");
  }

  async function recordAuthDeletion(request) {
    await rpcBoolean("record_account_deletion_auth_deleted", {
      p_request_id: request.request_id,
      p_claim_token: request.claim_token,
    }, "AUTH_DELETION_STATE_PERSISTENCE_FAILED");
  }

  /** Processes exactly one owned claim, resuming from its durable stage after interruption. */
  async function processDeletion(request) {
    let authDeletionMayHaveSucceeded = request.user_id == null;
    try {
      let stage = request.processing_stage;

      // A previous attempt may have deleted the Auth row before persisting its
      // stage. Foreign-key SET NULL is the durable, non-identifying evidence.
      if (request.user_id == null) {
        if (stage !== "auth_deleted") await recordAuthDeletion(request);
        await complete(request);
        return { completed: true };
      }

      if (stage === "claimed") {
        await removeAllUserStorage(request.user_id);
        await rpcBoolean("advance_account_deletion_stage", {
          p_request_id: request.request_id,
          p_claim_token: request.claim_token,
          p_stage: "initial_storage_cleaned",
        }, "INITIAL_STORAGE_TRANSITION_FAILED");
        stage = "initial_storage_cleaned";
      }

      if (stage === "initial_storage_cleaned") {
        const { error } = await supabase.rpc("prepare_account_deletion", {
          p_request_id: request.request_id,
          p_user_id: request.user_id,
          p_claim_token: request.claim_token,
        });
        if (error) throw workerError("DATABASE_PURGE_FAILED");
        stage = "database_prepared";
      }

      if (stage === "database_prepared") {
        await removeAllUserStorage(request.user_id);
        await rpcBoolean("advance_account_deletion_stage", {
          p_request_id: request.request_id,
          p_claim_token: request.claim_token,
          p_stage: "final_storage_cleaned",
        }, "FINAL_STORAGE_TRANSITION_FAILED");
        stage = "final_storage_cleaned";
      }

      if (stage !== "final_storage_cleaned") throw workerError("DELETION_STAGE_INVALID");

      const { error: authError } = await supabase.auth.admin.deleteUser(request.user_id);
      if (authError && !isAlreadyDeleted(authError)) throw workerError("AUTH_DELETE_FAILED");
      authDeletionMayHaveSucceeded = true;

      await recordAuthDeletion(request);
      await complete(request);
      return { completed: true };
    } catch (error) {
      if (authDeletionMayHaveSucceeded) {
        // Do not move a potentially deleted user back to retryable work. The
        // expired lease will resume receipt completion from its null user_id.
        throw error;
      }
      const code = error instanceof Error ? error.message : "PROCESSING_FAILED";
      await markFailed(request, /^[A-Z_]{3,64}$/.test(code) ? code : "PROCESSING_FAILED");
      return { completed: false };
    }
  }

  /** Claims a bounded batch and returns aggregate counts only. */
  async function run(limit) {
    const { data: requests, error } = await supabase.rpc("claim_account_deletion_batch", { p_limit: limit });
    if (error) throw workerError("CLAIM_FAILED");

    let completed = 0;
    let deferred = 0;
    for (const request of requests ?? []) {
      const result = await processDeletion(request);
      if (result.completed) completed += 1;
      else deferred += 1;
    }
    return { completed, deferred, claimed: requests?.length ?? 0, completedAt: now().toISOString() };
  }

  return { listStoragePaths, removeUserStorage, processDeletion, run };
}
