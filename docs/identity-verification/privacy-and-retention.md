# Didit privacy, retention, and deletion controls

## Approved retention position

Nakshatra must use data minimization. A provider verification session may
contain identity-document, facial, biometric, device, IP, and decision data.
The application must not copy those categories into its database by default.

Provider retention is a fallback, not the deletion strategy:

1. Configure the shortest retention period the provider offers for both Sandbox
   and Production applications.
2. When a future webhook has verified and the application has recorded the
   approved minimum decision fields, request provider session deletion.
3. Record only the local deletion outcome and timestamp. A `404` may mean the
   session is already deleted and must be handled as an idempotent outcome after
   verifying the provider contract.
4. Reconcile failed deletion requests through a trusted, access-controlled
   maintenance process. Do not include session IDs or subject data in alerts.

Didit's public retention documentation currently describes a console range of
one month to ten years. The implemented worker uses the current V3 operation
`DELETE /v3/session/{session_id}/delete/`, accepts `204` as success, and treats
`404` as an idempotent already-deleted outcome. Revalidate this contract in
Sandbox and against the current provider documentation before live enablement.

## Required evidence before production

- Data processing agreement and current subprocessor list.
- Current processing-region/residency statement and any cross-border transfer
  mechanism needed for Nakshatra's users.
- ISO/SOC evidence, liveness/biometric evaluation evidence, incident
  notification commitment, and provider security contact.
- Retention setting evidence for both applications, plus a Sandbox session
  deletion result using non-production data.
- Provider treatment of backups, derived biometric templates, audit records,
  screening results, and data at account termination.
- Internal decision on legal basis, privacy notice, consent/acknowledgment,
  access/correction/deletion requests, manual review, appeals, and unsupported
  documents.

## Operational restrictions

- No Aadhaar, PAN/database validation, AML, reusable KYC, or optional module
  can be enabled until separately approved.
- No real credentials, raw webhook payloads, session links, provider reports,
  document images, or biometrics may be stored in the repository, Linear, CI,
  test data, screenshots, or routine logs.
- Provider deletion does not remove a Nakshatra record. A later integration
  must connect provider-session deletion with the existing account-deletion and
  retention controls without weakening their transactional safeguards.

## Sandbox deletion check

1. Complete a Sandbox-only verification with approved test material.
2. Retrieve the current session decision through an authenticated, server-only
   request; do not print the response.
3. Call the current documented deletion operation from a temporary untracked
   environment.
4. Confirm the provider reports the expected successful or already-deleted
   result without logging identifiers or payloads.
5. Re-query only as allowed by the provider documentation to confirm the
   deletion outcome, then delete all temporary local material.
6. Record the date, application environment, workflow version, outcome, and
   documentation version in the private evidence store.

## References

- [Didit data retention](https://docs.didit.me/console/data-retention)
- [Didit sessions API](https://docs.didit.me/sessions-api/overview)
- [Didit business terms](https://updates.didit.me/terms/business/)
