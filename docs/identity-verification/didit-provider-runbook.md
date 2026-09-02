# Didit provider readiness runbook

This runbook is the Phase 0 control plane for a future Didit integration. It
does not authorize application code to collect, transmit, or store identity
documents until every required production gate below has an owner and evidence.

## Scope and data boundary

- Use a Didit-hosted verification session; do not upload identity documents or
  selfies through Nakshatra application routes.
- Nakshatra remains the data controller and Didit is a processor. Do not send
  candidate profile fields, family data, or other unnecessary data in
  `vendor_data`, metadata, callback URLs, logs, or support tickets.
- Persist only the minimum application record needed for an eventual decision:
  local verification ID, provider session ID, workflow version, final status,
  timestamps, and deletion outcome. Do not persist document images, document
  numbers, extracted identity fields, biometric material, raw webhook payloads,
  or provider reports unless a separately approved legal requirement exists.
- Never display a provider decision as an absolute identity guarantee. Treat it
  as one input to the product's explicitly defined verification policy.

## Required account separation

1. Create one **Sandbox** Didit Application and one **Production** Didit
   Application in the Didit Business Console. Do not reuse keys, workflows,
   webhook destinations, or retention settings between them.
2. Disable billing auto-top-up and do not add a payment method during Phase 0.
   Record the available free quota and its expiry in the private operations
   record, not in this repository or Linear.
3. Restrict Production console access to named operators with MFA. Record the
   responsible owner and emergency rotation contact in the private credential
   inventory.

## Approved workflow baseline

Create one Sandbox workflow before creating Production. It must be a hosted KYC
workflow with exactly these required checks:

- ID document verification;
- passive liveness;
- face match; and
- Device and IP analysis.

Keep the following disabled unless a separate reviewed issue changes the
privacy assessment: Aadhaar verification, PAN or other database validation,
AML/sanctions screening, reusable-network KYC, questionnaires, NFC, phone and
email verification, proof of address, blocklists, and all other optional
modules.

Before Production, take a non-secret configuration record showing the workflow
name/version and enabled modules. Store it in the approved private compliance
location; do not attach document images, session links, API keys, webhook
secrets, or raw identity data to Linear.

## Credential and webhook handling

- An API key is scoped to a Didit Application and authenticates server-to-server
  requests. Keep it only in the production secret manager under
  `DIDIT_API_KEY`; never add it to `.env.example`, `NEXT_PUBLIC_*` variables,
  browser code, test fixtures, CI logs, screenshots, or Linear.
- Store the webhook signing secret separately as `DIDIT_WEBHOOK_SECRET`. Rotate
  it through the provider console/API after every suspected exposure and at the
  cadence recorded in the private credential inventory.
- The deployed webhook endpoint at `/api/webhooks/didit` verifies
  `X-Signature-V2` over Didit's canonical JSON form, enforces a five-minute
  freshness window for both the signed envelope and `X-Timestamp`, and dedupes
  hashed provider event IDs before queueing work. It resolves an attempt only
  when its server-stored provider subject reference and provider session ID both
  match; it never stores the webhook body or decision object.
- Run `npm run identity-verification:process` every five minutes from the
  trusted scheduler. It fetches a provider decision transiently, projects only
  the normalized result, and deletes terminal provider sessions. It must run
  with the service-role key and must never log decision data, provider URLs, or
  provider credentials.
- Attaching a provider session also queues a delayed reconciliation fallback.
  This recovers a missed provider webhook without trusting an unauthenticated
  caller. Provider calls time out after ten seconds; transient failures retry
  with database-controlled exponential backoff from five minutes up to one
  hour. Alert when the scheduler fails or a work item reaches repeated retries.
- The approved workflow must contain exactly one identity-document result. A
  changed or ambiguous workflow fails closed rather than allowing the worker to
  select an arbitrary name or date-of-birth result. Validate the configured
  workflow and a signed test delivery in Didit sandbox before enabling live
  webhooks.
- The repository secret scan detects high-entropy values assigned to
  `DIDIT_API_KEY` or `DIDIT_WEBHOOK_SECRET`. Didit does not publish a stable
  credential prefix in its public documentation, so this detector is purposely
  assignment-bound rather than claiming an unverified provider format.

## Sandbox validation procedure

1. Use only consented test material and synthetic test identities where Didit
   supports them. Never place real identity documents in source control,
   fixtures, screenshots, Linear, or shared developer folders.
2. Create a hosted session using the Sandbox workflow and confirm each approved
   check runs and returns a testable result.
3. Validate the document matrix in
   [india-document-matrix.md](india-document-matrix.md). Record the provider
   application, workflow version, date, test-material source category, outcome,
   and error class in the approved private evidence store.
4. Configure a Sandbox webhook endpoint and send provider test events. Verify
   signature rejection, stale-event rejection, duplicate-event handling, and
   the absence of raw payload logging before a real integration is proposed.
5. Query the provider's current retention setting. Set the shortest available
   retention as a fallback; Didit's public documentation currently states one
   month is the shortest console option. Complete the deletion test in
   [privacy-and-retention.md](privacy-and-retention.md).

## Production go/no-go gate

All of the following must be complete before enabling a Production workflow or
processing an identity document:

- Sandbox evidence shows all four approved checks and each approved Indian
  document variant behaves as recorded.
- The DPA, subprocessors, security evidence, biometric/liveness evidence,
  processing region, retention, deletion, incident-notification, and
  termination/deletion commitments are reviewed by the appropriate owner.
- A data-protection and product decision establishes the legal basis, user
  notice, consent/acknowledgment language where needed, appeal/manual-review
  path, age handling, and unsupported-document behavior.
- The process-and-purge deletion path is tested from a server-only environment
  without logging a provider key, webhook secret, document, session URL, or raw
  response.
- Production keys and webhook secret exist only in the approved secret manager;
  the TruffleHog synthetic-detector test and the GitHub PR scan pass.
- A separate implementation issue has added and reviewed the server-only
  session-creation, webhook-verification, authorization, retention, and
  observability code.

## Provider references

- [Didit API authentication](https://docs.didit.me/getting-started/api-authentication)
- [Didit hosted sessions overview](https://docs.didit.me/api-reference/overview)
- [Didit webhook verification](https://docs.didit.me/integration/webhooks)
- [Didit data retention and deletion](https://docs.didit.me/console/data-retention)
