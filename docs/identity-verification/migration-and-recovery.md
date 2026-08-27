# Identity verification migration and recovery

## Migration boundary

`20260827023906_identity_verification_perimeter.sql` creates the Phase 1
perimeter. It does not create Didit sessions, accept webhooks, issue
invitations, or display a verification control. Those operations arrive in
later phases and must use the atomic functions rather than direct table writes.

The migration creates one random provider-subject reference per candidate. It
does not backfill verification as successful: existing candidates remain
`pending` and cannot be published for the first time until a later authorized
verification flow projects a current verified status.

## Safe recovery procedure

1. Stop the worker and session-creation deployment before changing the schema.
2. Run the migration in a staging copy and verify the pgTAP perimeter suite.
3. If a deployment fails before the migration commits, PostgreSQL rolls back
   atomically; correct the migration and retry. Do not mark it as applied.
4. If it has committed, do not delete private verification rows to recover.
   Add a forward-only migration that preserves token hashes, event digests, and
   audit timing while correcting the faulty constraint or function.
5. Treat a worker claim as abandoned only after its lease expires. A replacement
   worker must claim it through `claim_identity_verification_work`, never by
   clearing a claim directly.
6. A provider identifier, document metadata, token plaintext, webhook payload,
   or evidence image discovered in a log or database field is an incident. Do
   not copy it into this repository, Linear, or a support ticket; revoke or
   redact through the approved provider and incident process.

## Validation

Run `supabase db reset --local`, `npm run test:db`, generated-type validation,
and the application test suite before requesting review. The local database
must use a Supabase CLI version compatible with `supabase/config.toml`.
