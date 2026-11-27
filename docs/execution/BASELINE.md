# CI baseline (T-02)

Source: GitHub Actions run 45926151884 on PR #1, head 086ad53, 2026-11-27, ubuntu-24.04, Node 24.22.3. All numbers copied from the run log.

| Gate | Command | Result |
|---|---|---|
| Unit + HTTP integration | npm test | 110 / 110 |
| Journey e2e | node tests/journey.e2e.mjs | 18 / 18 |
| Comprehensive e2e | node tests/comprehensive.e2e.mjs | 50 / 50 |
| Content parity e2e | node tests/content-parity.e2e.mjs | 457 / 457 |
| Roles e2e | node tests/roles.e2e.mjs | 75 / 75 |
| Entrypoint | node scripts/verify-entrypoint.mjs | 7 / 7 |
| Production build | npm run build | OK |
| Browser | node scripts/verify-browser.mjs | 50 / 50 |
| Routes | node scripts/verify-routes.mjs | 338 visits, 0 issues |
| Forms | node scripts/verify-forms.mjs | 15 / 15 |
| Navigation | node scripts/verify-navigation.mjs | 24 / 24 |
| Docker images through Nginx | npm run verify:docker | 52 / 52 |

Durations: verify job 39m28s (most of it is the route crawl), docker job 1m0s.
The older report (docs/execution/TESTING_AND_QUALITY_REPORT.md) lists 69 unit tests and 38 docker checks from an older commit; this file replaces those numbers.
