# Tasks — Work Item 713355

## Scope
Implement pass-1 support for optional `allowPublicNetworkAccess` in Storage ingredient as tag-only behavior, with no ARM `publicNetworkAccess` property emission and no API version changes.

## Task List

### [x] T001 — Baseline storage ingredient flow and template branch points
- Owner/Scope: Storage ingredient implementation
- Actions:
1. Review `ingredient/ingredient-storage/src/plugin.ts` deploy path selection (default/network/datalake templates).
2. Identify where ingredient parameters are read and where params are passed to `DeployTemplate`.
3. Confirm storage account resource tag structure in all three templates.
- Done Criteria:
1. Concrete edit points are identified for parameter normalization, param stripping, and tag merge.
2. No code changes made outside storage ingredient scope.

### [x] T002 — Add constants for public-network tag key/value
- Owner/Scope: Storage ingredient implementation
- Actions:
1. Add storage constants module (or extend existing constant location) under `ingredient/ingredient-storage/src/`.
2. Define exported constants for tag name `allow-public-network-access` and tag value `true`.
3. Replace inline literals in plugin logic with constants.
- Done Criteria:
1. Tag key/value are sourced from constants only.
2. No duplicated hard-coded tag literals remain in updated storage plugin path.

### [x] T003 — Implement optional input normalization for allowPublicNetworkAccess
- Owner/Scope: Storage ingredient implementation
- Actions:
1. Parse `allowPublicNetworkAccess` as optional input from ingredient parameters.
2. Normalize supported boolean forms used by Bake inputs (boolean values; string forms if contract allows).
3. Define deterministic behavior for invalid types/unsupported values and surface a clear error if rejected.
- Done Criteria:
1. True/false/omitted branches are explicit in code.
2. Invalid input behavior is deterministic and testable.

### [x] T004 — Strip allowPublicNetworkAccess from ARM params payload
- Owner/Scope: Storage ingredient implementation
- Actions:
1. Ensure `allowPublicNetworkAccess` is removed from params passed to ARM deploy calls in all template branches.
2. Verify no undeclared parameter can reach template deployment.
- Done Criteria:
1. Deployment parameter object does not include `allowPublicNetworkAccess` in any branch.
2. Existing unrelated params continue passing through unchanged.

### T005 — Implement additive tag merge on selected storage template
- Owner/Scope: Storage ingredient implementation
- Actions:
1. Clone selected template object before mutation to prevent cross-run leakage.
2. Locate `Microsoft.Storage/storageAccounts` resource and merge tags additively.
3. Add `allow-public-network-access=true` only when normalized input is true.
4. Preserve existing tags (including `Metrics`) and co-exist with pre-existing sibling tags such as `allow-anonymous-blob-access`.
- Done Criteria:
1. True path adds only the expected tag key/value.
2. False/omitted paths do not add the tag.
3. Existing tags are preserved and not overwritten.

### T006 — Guard pass-1 constraint: never emit publicNetworkAccess and never bump apiVersion
- Owner/Scope: Storage ingredient implementation
- Actions:
1. Ensure no code path injects `publicNetworkAccess` into any storage ARM template object.
2. Confirm no edits introduce API version changes in `storage.json`, `storageNetwork.json`, or `storageDatalake.json`.
- Done Criteria:
1. `publicNetworkAccess` is absent from story changes.
2. Storage template API versions remain unchanged.

### T007 — Add/extend repo-local tests for normalization and template mutation behavior
- Owner/Scope: Storage ingredient test code (repo-only)
- Actions:
1. Add tests (or equivalent harness assertions) covering DS1/DS2/DS3 and optional DS4/DS5 normalization behavior from test plan.
2. Assert param stripping, tag outcomes, and absence of `publicNetworkAccess` in mutated template object.
3. Add invalid input test (DS7) consistent with chosen validation contract.
- Done Criteria:
1. Automated repo-local assertions validate true/false/omitted outcomes.
2. Tests explicitly verify no `publicNetworkAccess` property is introduced.
3. Invalid input behavior is covered by assertion.

### T008 — Add deployment tag-assertion cases in storage integration harness
- Owner/Scope: Storage integration tests
- Actions:
1. Add representative deployment cases for true, false, omitted, and co-existence scenario in `ingredient/ingredient-storage/test/`.
2. Update run script assertions to query deployed storage account tags/properties.
3. Assert exact expected tag map per case and absence of `publicNetworkAccess` in deployed resource properties.
- Done Criteria:
1. Integration harness can execute all representative combinations.
2. Each case has deterministic pass/fail assertions with clear output.
3. Co-existence case verifies additive tag behavior.

### T009 — Update storage README for parameter and pass-1 semantics
- Owner/Scope: Documentation
- Actions:
1. Add `allowPublicNetworkAccess` to README parameter documentation as optional.
2. Document pass-1 semantics: tag-only behavior, tag stamped only when true, none when false/omitted.
3. Explicitly document that ARM `publicNetworkAccess` is not written in this pass.
4. Add concise usage example.
- Done Criteria:
1. README reflects implemented behavior and constraints.
2. Example aligns with accepted input contract.

### T010 — Execute validation and capture evidence
- Owner/Scope: Validation
- Actions:
1. Run storage ingredient build/tests required for changed code paths.
2. Run storage integration harness for representative combinations when Azure credentials are available.
3. Collect assertion outputs showing tag expectations and no `publicNetworkAccess` property.
- Done Criteria:
1. Repo-local tests pass for changed behavior.
2. Integration evidence is captured or blocked status is recorded with reason.
3. Final verification notes map outcomes to AC1-AC7.

## Sequencing and Dependencies
1. T001
2. T002, T003
3. T004, T005
4. T006
5. T007
6. T008
7. T009
8. T010

## Acceptance Criteria Coverage Matrix
| AC | Covered By | Coverage Notes |
|---|---|---|
| AC1 Optional input; no `publicNetworkAccess` | T003, T004, T006, T007, T008 | Input handling + param stripping + no-property assertions |
| AC2 Tag when true | T002, T005, T007, T008 | Constant-backed true-path tag stamping |
| AC3 No tag when false/omitted | T003, T005, T007, T008 | Branch assertions for false and omitted |
| AC4 Constant for tag name/value | T002 | Centralized constants usage |
| AC5 Preserve `Metrics` and co-existence | T005, T007, T008 | Additive merge + co-existence assertions |
| AC6 Tag-assertion deployment tests | T008, T010 | Representative deployment matrix + evidence |
| AC7 README updates | T009 | Parameter + pass-1 semantics documented |

## Notes
- This task set intentionally excludes creating ADO work items.
- This task set preserves story constraints: no API version bump and no ARM `publicNetworkAccess` property in this pass.
