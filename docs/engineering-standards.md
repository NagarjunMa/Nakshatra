# Engineering Standards

## Tests and Coverage

- Add or update tests in the same change as application behavior.
- `npm test` runs Vitest with V8 coverage and fails when an individual feature mapper, service, or contract falls below 80% for statements, branches, functions, or lines.
- Unit tests cover validation, transformations, feature decisions, and error paths. Repository code is exercised by Supabase integration tests because mocking query builders would not validate RLS or database behavior.
- CI runs linting, type checking, the coverage-enforced test suite, and a production build. It uploads the coverage report for every run.

## Code Documentation

- Document public feature functions and classes with a short JSDoc comment that states their responsibility, inputs, and outputs.
- Keep comments focused on behavior and contracts. Do not restate self-evident syntax.
