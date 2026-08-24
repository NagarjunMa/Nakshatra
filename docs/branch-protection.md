# Main Branch Protection

Protect `main` in GitHub before merging production work.

## Required GitHub Settings

- Require a pull request before merging.
- Require approvals.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Required status checks: `Lint, Test, Coverage & Build` and `TruffleHog Secret Scan`.
- Block force pushes.
- Block branch deletion.
- Include administrators.

## Apply With GitHub CLI

Refresh GitHub CLI auth first:

```bash
gh auth login -h github.com
```

Then apply protection:

```bash
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/NagarjunMa/Nakshatra/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Lint, Test, Coverage & Build", "TruffleHog Secret Scan"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false
}
JSON
```

The local `.husky/pre-push` hook blocks pushes from local `main` and `master`, then runs typecheck and unit tests. TruffleHog runs on GitHub when a pull request targets `main`; the `TruffleHog Secret Scan` check must be required in branch protection before merge. This keeps secret scanning independent of a contributor's local Docker installation.
