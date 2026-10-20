# Dependency maintenance automations

Dependabot checks npm and GitHub Actions versions weekly on Mondays at 06:00
Europe/Berlin. It opens pull requests and does not merge them. Related React
packages, where used, are grouped; development tools have a separate group.
Review compatibility and run the application checks before merging updates.

Dependabot alerts and security updates are separate repository settings. With
both enabled and the dependency graph enabled, security fix PRs respond to
advisories independently of the weekly version-update schedule. All three
settings were verified enabled in GitHub on 20 October 2026.

The daily full dependency audit runs at 06:23 UTC on the default branch.
Manual dispatch is also available on that branch. It audits production and
development dependencies from package-lock.json without installing packages or
running dependency lifecycle scripts. The audit reporter's tests run first.

New or changed findings (including severity, advisory/range information and fix
availability) fail the workflow. Unchanged findings remain visible in each job
summary without repeated failures; they have not been accepted or suppressed.
Resolved findings are recorded and removed from the comparison baseline.
Registry errors or invalid reports fail without replacing the baseline.

The first run reports existing findings as new. An Actions cache holds the
previous completed audit; eviction can cause existing findings to alert again.
JSON and Markdown reports are retained as workflow artifacts for 30 days.
Notifications follow each user's GitHub Actions notification settings.

For a local check:

```sh
mkdir -p reports
npm audit --include=dev --json > reports/security-audit.json
# npm exits nonzero for findings; still run the reporter for a valid JSON report.
node scripts/security-audit-summary.mjs
node --test scripts/security-audit-summary.test.mjs
```

The reporter updates an ignored local baseline in reports/. A reported fix may
involve breaking changes or a downgrade; review and test it before applying.
Schedules become active once the workflow/configuration is on the default branch.
