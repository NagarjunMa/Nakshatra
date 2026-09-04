# Identity verification production readiness

Live identity verification remains disabled until every gate below has an
owner and dated evidence in the approved private compliance store. Do not put
provider credentials, session identifiers, identity evidence, or personal data
in this repository, GitHub issues, Linear, or routine logs.

## Deployment gate

- The linked Supabase project must be `Nakshatra` with project host
  `xizzzczzhqzabcipbgep.supabase.co`.
- Apply all pending migrations only through the protected `CD` workflow on
  `main`. The workflow must complete its dry run before its actual database
  push. A repository-local `supabase db push` is not an approved substitute.
- After deployment, verify `npx supabase migration list --linked` shows NAK-51
  versions `20260902141433` and `20260902143932` in the remote column before
  enabling the worker.

## Trusted worker schedule

The `Identity Verification Worker` GitHub Actions workflow runs every five
minutes and may also be dispatched manually. It is fail-closed by default:
the repository variable `DIDIT_WORKER_ENABLED` must equal `true` before the job
runs.

Create an isolated GitHub environment named
`identity-verification-worker-production` with these environment secrets:

- `DIDIT_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Set the repository variable `DIDIT_ALERT_ASSIGNEE` to the GitHub username of
the accountable on-call operator. Worker alerts use a bot-controlled
`ops-worker-failure` label and that assignee; title-only matching is not trusted
because this repository accepts public issues.

Restrict environment deployment branches to `main`. Scheduled jobs cannot
wait for a human reviewer, so this environment must use branch restrictions
and narrowly scoped secrets instead of a required-reviewer gate. Limit console
and repository administration to named operators with MFA.

The worker claims at most 25 items per run. Normal provider `pending` decisions
do not fail the run. Provider, network, or persistence deferrals fail the run
and create one deduplicated GitHub issue containing only the run URL. The issue
must be closed by an operator only after a successful retry and backlog-health
review; an unrelated empty run does not auto-resolve it. GitHub Actions
scheduling can be delayed, so operators must also alert on absence of completed
workflow runs for 15 minutes using the organization's external uptime/monitoring
system.

## Provider and retention gate

- [ ] Sandbox and Production use separate Didit applications, keys, workflows,
      webhook secrets, and webhook destinations.
- [ ] The Production workflow contains exactly one ID-document verification,
      passive liveness, face match, and device/IP analysis; optional modules
      remain disabled.
- [ ] The shortest available retention period is configured independently in
      both Sandbox and Production.
- [ ] A Sandbox terminal session was deleted through the server-only
      `DELETE /v3/session/{session_id}/delete/` operation; `204` and an
      already-deleted `404` were recorded without retaining the identifier.
- [ ] Process-and-purge recovery was exercised: a terminal decision queues
      provider redaction, the worker deletes it, and only normalized local
      status and deletion time remain.
- [ ] Production webhook signing, five-minute freshness, application,
      environment, workflow, subject, and session binding were validated.
- [ ] Billing auto-top-up and pay-as-you-go remain disabled.

## Legal and governance gate

- [ ] The current DPA, technical and organizational measures, and subprocessor
      list are approved by the accountable legal/privacy owner.
- [ ] Processing region, data residency, cross-border transfers, backup
      treatment, biometric-template handling, incident notification, and
      termination deletion are documented and approved.
- [ ] The privacy notice and verification consent/acknowledgment describe the
      provider, purposes, data categories, retention, deletion, and user rights.
- [ ] Manual review, appeal, access/correction/deletion, age handling, and
      unsupported-document procedures have named operational owners.
- [ ] A security owner approved credential rotation, incident response, and
      least-privilege console access.

## Enablement sequence

1. Complete the provider, retention, and legal gates with private evidence.
2. Run the protected production `CD` workflow from `main`.
3. Confirm both NAK-51 migration versions in the remote migration ledger.
4. Configure and validate the isolated worker environment secrets.
5. Manually dispatch the worker with `DIDIT_WORKER_ENABLED` still unset and
   confirm it remains skipped.
6. Set `DIDIT_WORKER_ENABLED=true`, dispatch once, and verify aggregate-only
   output and the alert recovery path.
7. Enable the live Didit workflow only after the scheduler and external
   missing-run monitor are healthy.
