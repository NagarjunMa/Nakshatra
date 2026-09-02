# Engineering Standards

## Tests and Coverage

- Add or update tests in the same change as application behavior.
- `npm test` runs Vitest with V8 coverage and fails when an individual feature mapper, service, or contract falls below 80% for statements, branches, functions, or lines.
- Unit tests cover validation, transformations, feature decisions, and error paths. Repository code is exercised by Supabase integration tests because mocking query builders would not validate RLS or database behavior.
- CI runs linting, type checking, the coverage-enforced test suite, and a production build. It uploads the coverage report for every run.

## Supabase migrations and pgTAP

- Migrations are forward-only after they have reached a shared environment. Correct an applied migration with a new migration; do not rewrite history.
- Every schema, RLS, trigger, or RPC change must include the relevant pgTAP coverage. Auth-sensitive changes must cover the intended actor, a non-owner, anonymous access where applicable, and revoked or mismatched session behavior.
- Use the repository-owned helpers in `supabase/tests/support/auth-fixtures.sql` for test Auth users and sessions. Create fixtures under the pgTAP runner role, use the actual runtime role for behavior assertions, and `reset role` before test-only setup or `app_private` inspection. Literal authenticated JWT claims must match a declared fixture user/session pair; use `-- db:smoke: allow-invalid-auth-claims` immediately before an intentional missing, malformed, revoked, or cross-user session test.
- `npm run db:smoke` is the Docker-free structural gate. `npm run db:verify` starts an isolated local stack, replays all migrations with `supabase db reset --local`, runs pgTAP, and stops the stack. It is destructive to the local database only.
- Pull-request CI never runs `supabase db push`. A protected post-merge deployment first runs `supabase db push --dry-run`, then applies pending migrations to the approved remote environment.
- When a public database contract changes, regenerate and commit `src/types/database.generated.ts` with `npm run db:types`.

## Code Documentation

- Document public feature functions and classes with a short JSDoc comment that states their responsibility, inputs, and outputs.
- Keep comments focused on behavior and contracts. Do not restate self-evident syntax.
