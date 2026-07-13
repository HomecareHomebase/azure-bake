# CP06 — Validation And Evidence Collection (US 713353)

## Targeted suite: `@azbake/ingredient-storage`
- Command: `npm test` (runs `node test/baseline.js --check && node test/run-tests.js`)
- Working dir: `ingredient/ingredient-storage`
- Result: **16 passed, 0 failed** — exit code `0`
- Baseline check: "All omitted-path baselines are up to date."

## Broader repo test/build
- Root build/test is lerna-based (`npm run build` = `lerna bootstrap --hoist && lerna run compile`).
- **Not runnable in this environment**: repo is not bootstrapped (no `node_modules` at root or in `ingredient/ingredient-storage`; tsc/jest not installed).
- Per plan, dependencies were NOT installed. The ingredient-storage Node-only suite is the authoritative evidence.

## Scenario → test evidence (S1–S9)
| Scenario | Passing test(s) |
|----------|-----------------|
| S1 (omitted not forwarded, no tag) | T008 S1 "omitted allowBlobPublicAccess is not forwarded and stamps no exception tag"; T008 S1 "non-explicit allowBlobPublicAccess values are treated as omitted" |
| S2 (false, no tag) | T008 S2 "explicit false is forwarded as false and stamps no exception tag" |
| S3 (true + tag) | T008 S3 "explicit true is forwarded as true and stamps the exception tag" |
| S4 (default route omit) | T009 S4 "default route omitted: property absent, matches baseline, Metrics preserved" |
| S5 (default route false) | T009 S5 "default route false: property forwarded, no exception tag, Metrics preserved" |
| S6 (default route true) | T009 S6 "default route true: property forwarded, exception tag present, Metrics preserved" |
| S7 (network route matrix) | T010 S7 network route omitted / false / true |
| S8 (datalake route matrix) | T011 S8 datalake route omitted / false / true |
| S9 (tag preservation + conflict enforcement) | T008 S9 "existing tags survive the exception-tag merge"; T012 S9 false path preserves custom tags and Metrics without an exception tag; T012 S9 true path enforces exception tag to 'true' and preserves custom tags/Metrics |

All S1–S9 mapped to passing tests.

## Follow-ups
- None. No unresolved high-severity failures.
