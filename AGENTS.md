# AGENTS.md

## Project Identity

This repository is the **Nakshatra** project.

Repository:

- `nakshatra`

Product / project name:

- Nakshatra

Linear workspace:

- Phoenix works

Linear project:

- Nakshatra

Linear MCP server:

- `linear_phoenix`

## Linear Routing Rules

All Linear operations for this repository must use:

`linear_phoenix`

Never use:

- `linear_aletheia`
- `linear_prismpro`

Do not create, modify, comment on, move, close, or otherwise update issues in another Linear workspace from this repository.

Before performing any Linear write operation, verify that the active Linear connection corresponds to:

- Workspace: Phoenix works
- Project: Nakshatra

If the workspace or project does not match, stop and report the mismatch.

## Linear as Durable Project Context

Linear is the durable source of truth for:

- approved implementation plans
- feature development plans
- security remediation plans
- technical decisions
- implementation progress
- blockers
- unresolved questions
- architectural deviations
- acceptance criteria

Codex chat history should not be treated as the only source of project context.

When an implementation plan has been reviewed or approved, store the relevant plan in the corresponding Linear issue.

## Creating New Issues

When creating a Linear issue for this repository:

1. Use `linear_phoenix`.
2. Create the issue in the Phoenix works workspace.
3. Associate it with the Nakshatra project.
4. Use a clear title describing the feature, bug, security fix, or engineering task.
5. Include enough implementation context for a future Codex session to resume the work without depending on the current chat.

For implementation-heavy issues, use this structure when appropriate:

### Problem

Describe the problem being solved.

### Goal

Describe the intended outcome.

### Implementation Plan

Document the approved technical approach.

### Security Considerations

Document relevant security implications, trust boundaries, validation requirements, authorization rules, sensitive-data considerations, or abuse cases.

### Expected Files / Components

List important files, modules, services, APIs, database objects, or infrastructure expected to change.

### Acceptance Criteria

Define verifiable completion conditions.

### Implementation Progress

Track meaningful implementation milestones.

### Decisions / Deviations

Record architectural decisions or deviations from the original plan.

## Resuming Existing Work

When asked to continue work from a Linear issue:

1. Read the Linear issue through `linear_phoenix`.
2. Treat the approved implementation plan in Linear as durable planning context.
3. Inspect the current `nakshatra` repository state.
4. Inspect relevant git history, branch state, and existing implementation.
5. Compare the repository state against the Linear plan and progress.
6. Determine what has already been completed.
7. Continue from the next incomplete implementation step.
8. Do not redo completed work unnecessarily.
9. Update Linear when meaningful progress, blockers, or architectural decisions occur.

Never assume the Linear issue perfectly reflects the repository state. Verify against the code before continuing.

## Implementation Planning

When asked to investigate or plan a feature, bug, or security fix:

1. Inspect the existing codebase before proposing changes.
2. Identify the relevant architecture and established repository patterns.
3. Identify dependencies and affected components.
4. Identify security, data integrity, reliability, and backward-compatibility concerns.
5. Produce an implementation plan before modifying code when planning is requested.
6. Do not create a Linear issue until explicitly asked or until the workflow clearly requires it.
7. When storing an approved plan in Linear, preserve enough technical detail for another Codex session to continue later.

## Progress Updates

Do not create excessive Linear comments for trivial actions.

Update Linear for meaningful events such as:

- implementation of a major plan step
- discovery of an unexpected architectural constraint
- change to the approved implementation approach
- security-related finding
- significant blocker
- completion of acceptance criteria
- important testing outcome

Prefer updating durable issue context instead of scattering important implementation knowledge across unrelated comments.

## Safety Rules

Before any destructive or high-impact Linear action:

- verify the workspace
- verify the project
- verify the issue
- verify that the requested action belongs to Nakshatra

Do not delete Linear issues unless explicitly instructed.

Do not move issues to another workspace or project unless explicitly instructed.

If an issue appears to belong to Aletheia, PrismPro, or another unrelated project, stop and report the mismatch instead of modifying it.

## Git Branch Naming

All branches created or pushed for this repository must use a conventional,
purpose-based prefix. Do not use agent, tool, person, or vendor prefixes such
as `codex/`.

Use this format:

`<type>/nak-<issue-number>-<short-kebab-case-description>`

Allowed types are:

- `feat` for product features
- `fix` for defects
- `security` for security changes
- `chore` for maintenance, tooling, or configuration
- `docs` for documentation-only work
- `refactor` for behavior-preserving restructuring
- `test` for test-only work

Examples:

- `security/nak-45-trufflehog-pr-scan`
- `feat/nak-41-fresh-reauthentication`
- `fix/nak-52-session-expiry`

Before opening a pull request, verify the local and remote branch name follows
this convention. If a branch was created with a noncompliant prefix, rename it
and push the compliant branch before creating the pull request. Do not create
new noncompliant remote branches.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
