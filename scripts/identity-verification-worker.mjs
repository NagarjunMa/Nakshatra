const DIDIT_BASE_URL = "https://verification.didit.me/v3/session";
const PROVIDER_REQUEST_TIMEOUT_MS = 10_000;

function workerError(code) {
  return new Error(code);
}

function normalizeStatus(value) {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/[\s-]+/g, "_") : "";
}

function normalizedName(value) {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US")
    : "";
}

function allApproved(decision, field) {
  const checks = decision?.[field];
  return Array.isArray(checks) && checks.length > 0 && checks.every((check) => normalizeStatus(check?.status) === "APPROVED");
}

function exactlyOneApproved(decision, field) {
  const checks = decision?.[field];
  return Array.isArray(checks)
    && checks.length === 1
    && normalizeStatus(checks[0]?.status) === "APPROVED";
}

/** Reduces an unretained Didit decision to the policy booleans required by the database. */
export function evaluateDiditDecision(decision, claim) {
  if (!decision || typeof decision !== "object" || decision.session_id !== claim.provider_session_ref) {
    throw workerError("DIDIT_DECISION_MISMATCH");
  }

  // Nakshatra's approved Didit workflow has exactly one identity document.
  // Treat a changed or ambiguous workflow as a failed policy result rather
  // than selecting an arbitrary document's name and date of birth.
  const idVerified = exactlyOneApproved(decision, "id_verifications");
  const faceMatchVerified = allApproved(decision, "face_matches");
  const passiveLivenessVerified = Array.isArray(decision.liveness_checks)
    && decision.liveness_checks.length > 0
    && decision.liveness_checks.every((check) => (
      normalizeStatus(check?.status) === "APPROVED"
      && normalizeStatus(check?.method).includes("PASSIVE")
    ));
  const firstIdentityCheck = Array.isArray(decision.id_verifications) ? decision.id_verifications[0] : null;
  const decisionName = [firstIdentityCheck?.first_name, firstIdentityCheck?.last_name].filter(Boolean).join(" ");
  const nameMatches = normalizedName(decisionName) === normalizedName(claim.legal_name);
  const birthDateMatches = typeof firstIdentityCheck?.date_of_birth === "string"
    && firstIdentityCheck.date_of_birth === claim.birth_date;
  const status = normalizeStatus(decision.status);
  const checksPass = idVerified && passiveLivenessVerified && faceMatchVerified && nameMatches && birthDateMatches;

  let outcome = "pending";
  if (status === "APPROVED") outcome = checksPass ? "verified" : "declined";
  else if (status === "DECLINED") outcome = "declined";
  else if (["ABANDONED", "EXPIRED", "KYC_EXPIRED"].includes(status)) outcome = "expired";

  return {
    outcome,
    idVerified,
    passiveLivenessVerified,
    faceMatchVerified,
    nameMatches,
    birthDateMatches,
  };
}

/** Builds a service-role worker that fetches Didit decisions transiently and stores only derived state. */
export function createIdentityVerificationWorker(supabase, {
  apiKey = process.env.DIDIT_API_KEY,
  fetchImpl = fetch,
  now = () => new Date(),
  requestTimeoutMs = PROVIDER_REQUEST_TIMEOUT_MS,
} = {}) {
  if (!apiKey) throw workerError("DIDIT_PROVIDER_UNAVAILABLE");
  if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs < 1 || requestTimeoutMs > 60_000) {
    throw workerError("DIDIT_PROVIDER_UNAVAILABLE");
  }

  async function rpcBoolean(name, args, code) {
    const { data, error } = await supabase.rpc(name, args);
    if (error || data !== true) throw workerError(code);
  }

  async function fetchDecision(providerSessionRef) {
    let response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      response = await fetchImpl(`${DIDIT_BASE_URL}/${encodeURIComponent(providerSessionRef)}/decision/`, {
        headers: { Accept: "application/json", "x-api-key": apiKey },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      throw workerError("DIDIT_DECISION_FETCH_FAILED");
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw workerError("DIDIT_DECISION_FETCH_FAILED");
    try {
      return await response.json();
    } catch {
      throw workerError("DIDIT_DECISION_FETCH_FAILED");
    }
  }

  async function deleteSession(providerSessionRef) {
    let response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      response = await fetchImpl(`${DIDIT_BASE_URL}/${encodeURIComponent(providerSessionRef)}/delete/`, {
        method: "DELETE",
        headers: { "x-api-key": apiKey },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      throw workerError("DIDIT_SESSION_PURGE_FAILED");
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok && response.status !== 404) throw workerError("DIDIT_SESSION_PURGE_FAILED");
  }

  async function defer(claim, errorCode) {
    await rpcBoolean("defer_identity_verification_work", {
      p_attempt_id: claim.attempt_id,
      p_claim_token: claim.claim_token,
      p_error_code: errorCode,
      p_task_type: claim.task_type,
    }, "IDENTITY_VERIFICATION_DEFERRAL_FAILED");
  }

  async function process(claim) {
    try {
      if (!claim.provider_session_ref) throw workerError("DIDIT_SESSION_REFERENCE_MISSING");
      if (claim.task_type === "provider_redaction") {
        await deleteSession(claim.provider_session_ref);
        await rpcBoolean("complete_identity_verification_provider_redaction", {
          p_attempt_id: claim.attempt_id,
          p_claim_token: claim.claim_token,
        }, "IDENTITY_VERIFICATION_REDACTION_COMPLETION_FAILED");
        return { completed: true };
      }
      if (claim.task_type !== "reconcile") throw workerError("IDENTITY_VERIFICATION_WORK_TYPE_INVALID");

      const decision = await fetchDecision(claim.provider_session_ref);
      const result = evaluateDiditDecision(decision, claim);
      await rpcBoolean("complete_identity_verification_reconciliation", {
        p_attempt_id: claim.attempt_id,
        p_claim_token: claim.claim_token,
        p_outcome: result.outcome,
        p_id_verified: result.idVerified,
        p_passive_liveness_verified: result.passiveLivenessVerified,
        p_face_match_verified: result.faceMatchVerified,
        p_name_matches: result.nameMatches,
        p_birth_date_matches: result.birthDateMatches,
      }, "IDENTITY_VERIFICATION_RECONCILIATION_COMPLETION_FAILED");
      return { completed: result.outcome !== "pending" };
    } catch (error) {
      const code = error instanceof Error && /^[A-Z_]{3,64}$/.test(error.message)
        ? error.message
        : "IDENTITY_VERIFICATION_PROCESSING_FAILED";
      await defer(claim, code);
      return { completed: false };
    }
  }

  /** Claims a bounded batch and returns only aggregate, non-identifying execution counts. */
  async function run(limit) {
    const { data: claims, error } = await supabase.rpc("claim_identity_verification_work", { p_limit: limit });
    if (error) throw workerError("IDENTITY_VERIFICATION_CLAIM_FAILED");

    let completed = 0;
    let deferred = 0;
    for (const claim of claims ?? []) {
      const result = await process(claim);
      if (result.completed) completed += 1;
      else deferred += 1;
    }
    return { claimed: claims?.length ?? 0, completed, deferred, completedAt: now().toISOString() };
  }

  return { evaluateDiditDecision, process, run };
}
