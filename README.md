# Self Approve Action

![CI](https://github.com/ocavue/self-approve-action/actions/workflows/ci.yml/badge.svg)

Approve your own pull requests as `github-actions[bot]`.

GitHub does not let a user approve their own pull request. On a repository with
a single maintainer, that makes a "require 1 approval" branch ruleset impossible
to satisfy. This action closes the gap: it creates an approving review as
`github-actions[bot]`, but only when both of these hold:

1. The pull request is not a draft.
1. The pull request author is a code owner: listed as a user in the repository's
   `CODEOWNERS` file (read from the base branch), or, when a user-owned
   repository has no `CODEOWNERS` file, the repository owner.

Everyone else's pull requests still need a real review.

## Usage

```yaml
name: Self Approve

on:
  pull_request:
    types: [opened, reopened, ready_for_review, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  approve:
    runs-on: ubuntu-latest
    steps:
      - uses: ocavue/self-approve-action@v1
```

## Requirements

- A `CODEOWNERS` file (`.github/CODEOWNERS`, `CODEOWNERS`, or `docs/CODEOWNERS`)
  listing the authors whose pull requests may be self-approved. Optional for a
  repository owned by a user account, where the repository owner counts as the
  code owner without the file; required for organization repositories.
- Settings > Actions > General > "Allow GitHub Actions to create and approve
  pull requests" must be enabled.
- The branch ruleset must not enable "Require review from Code Owners", because
  `github-actions[bot]` is not a code owner.

## Inputs

| Name           | Default               | Description                      |
| -------------- | --------------------- | -------------------------------- |
| `github-token` | `${{ github.token }}` | Token used to create the review. |

With the default token, the approver is `github-actions[bot]`. Passing a
personal access token of another account changes the approver identity; that
account must not be the pull request author.

## Outputs

| Name       | Description                                           |
| ---------- | ----------------------------------------------------- |
| `approved` | `"true"` when this run created an approving review    |
| `reason`   | Why the pull request was not approved, when `"false"` |

## Limitations

- Teams (`@org/team`) and email addresses in `CODEOWNERS` are ignored; list
  authors as `@username`.
- Pull requests from forks run with a read-only token, so they cannot be
  self-approved. This is intentional.
