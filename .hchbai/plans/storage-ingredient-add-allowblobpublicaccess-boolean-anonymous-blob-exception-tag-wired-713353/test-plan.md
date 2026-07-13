# Test Plan: User Story 713353

## Story Metadata
- Work Item ID: 713353
- Title: Storage Ingredient > Add allowBlobPublicAccess boolean + anonymous-blob exception tag (wired)
- Repository: azure-bake
- Plan Mode: TEST PLAN CREATION

## Objectives
- Verify optional allowBlobPublicAccess input is handled with omit-when-unset behavior.
- Verify explicit false/true behavior is emitted correctly.
- Verify exception tag behavior is exact and only applied when allowBlobPublicAccess is true.
- Verify Metrics tag preservation and merge behavior across template routes.
- Verify behavior parity across storage.json, storageNetwork.json, and storageDatalake.json.
- Verify omitted path remains behaviorally equivalent to current output.

## In Scope
- Runtime behavior from plugin parameter handling and template rendering/output.
- Regression behavior for omitted-path output and tag merge behavior.
- Repo-local automated/unit/component validation of scenario matrix.

## Out of Scope
- Live Azure deployment validation.
- API/GraphQL/backend service integration testing in ADO-managed environments.

## Scenario Mapping (Runtime ACs Only)

| Scenario ID | Scenario Name | Test Type | Tracking Level | AC Coverage |
|---|---|---|---|---|
| S1 | Omitted allowBlobPublicAccess is not forwarded | Unit | repoOnly | AC1, AC7 |
| S2 | Explicit false is forwarded and no exception tag is added | Unit | repoOnly | AC2 |
| S3 | Explicit true is forwarded and exception tag is merged | Unit | repoOnly | AC3 |
| S4 | Default template omitted-path output equivalence | Component | repoOnly | AC1, AC6, AC7 |
| S5 | Default template explicit false output and Metrics preservation | Component | repoOnly | AC2, AC5, AC6 |
| S6 | Default template explicit true output and exception tag + Metrics preservation | Component | repoOnly | AC3, AC5, AC6 |
| S7 | Network template omitted/false/true matrix behavior | Component | repoOnly | AC1, AC2, AC3, AC5, AC6, AC7 |
| S8 | Datalake template omitted/false/true matrix behavior | Component | repoOnly | AC1, AC2, AC3, AC5, AC6, AC7 |
| S9 | Existing custom tags are preserved while true-path exception tag is enforced | Unit + Component | repoOnly | AC3, AC5 |

Rationale for Tracking Level:
- All scenarios are shift-left repository tests (unit/component/template rendering). No backend service, API, or UI E2E path is exercised; therefore all scenarios are repoOnly.

## Scenario Details

### S1 - Omitted allowBlobPublicAccess is not forwarded
- Test Type: Unit
- Tracking Level: repoOnly
- Automation: Required
- Manual: Optional spot-check only
- Preconditions:
  - Plugin input does not include allowBlobPublicAccess.
- Test Data:
  - Recipe params with representative tags and without allowBlobPublicAccess.
- Steps:
  1. Execute plugin path that builds deployment params.
  2. Inspect outbound params before template deployment.
- Expected Results:
  - Outbound params do not contain allowBlobPublicAccess.
  - No exception tag is introduced.

### S2 - Explicit false is forwarded and no exception tag is added
- Test Type: Unit
- Tracking Level: repoOnly
- Automation: Required
- Manual: Optional spot-check only
- Preconditions:
  - Plugin input includes allowBlobPublicAccess: false.
- Test Data:
  - Recipe params with allowBlobPublicAccess=false and baseline tags.
- Steps:
  1. Execute plugin path that builds deployment params.
  2. Inspect outbound params.
- Expected Results:
  - allowBlobPublicAccess is present with value false.
  - allow-anonymous-blob-access tag is absent.

### S3 - Explicit true is forwarded and exception tag is merged
- Test Type: Unit
- Tracking Level: repoOnly
- Automation: Required
- Manual: Optional spot-check only
- Preconditions:
  - Plugin input includes allowBlobPublicAccess: true.
- Test Data:
  - Recipe params with allowBlobPublicAccess=true and existing tag set.
- Steps:
  1. Execute plugin path that builds deployment params.
  2. Inspect outbound params and tags.
- Expected Results:
  - allowBlobPublicAccess is present with value true.
  - allow-anonymous-blob-access=true is present in tags.
  - Existing user tags are preserved.

### S4 - Default template omitted-path output equivalence
- Test Type: Component
- Tracking Level: repoOnly
- Automation: Required
- Manual: Optional diff review
- Preconditions:
  - Template route resolves to storage.json.
  - Baseline omitted-path snapshot exists.
- Test Data:
  - Input fixture omitting allowBlobPublicAccess.
- Steps:
  1. Render template payload for omitted case.
  2. Compare with omitted-path baseline artifact.
- Expected Results:
  - properties.allowBlobPublicAccess is not written.
  - Output is equivalent to baseline for omitted path.

### S5 - Default template explicit false output and Metrics preservation
- Test Type: Component
- Tracking Level: repoOnly
- Automation: Required
- Manual: Optional spot-check only
- Preconditions:
  - Template route resolves to storage.json.
- Test Data:
  - Input fixture with allowBlobPublicAccess=false and custom tags.
- Steps:
  1. Render template payload.
  2. Inspect properties and tags.
- Expected Results:
  - properties.allowBlobPublicAccess=false is written.
  - Metrics tag remains present.
  - Exception tag is absent.

### S6 - Default template explicit true output and exception tag + Metrics preservation
- Test Type: Component
- Tracking Level: repoOnly
- Automation: Required
- Manual: Optional spot-check only
- Preconditions:
  - Template route resolves to storage.json.
- Test Data:
  - Input fixture with allowBlobPublicAccess=true and custom tags.
- Steps:
  1. Render template payload.
  2. Inspect properties and tags.
- Expected Results:
  - properties.allowBlobPublicAccess=true is written.
  - allow-anonymous-blob-access=true is present.
  - Metrics tag remains present.
  - Existing custom tags remain present.

### S7 - Network template omitted/false/true matrix behavior
- Test Type: Component
- Tracking Level: repoOnly
- Automation: Required
- Manual: Optional diff review
- Preconditions:
  - Template route resolves to storageNetwork.json.
- Test Data:
  - Three fixtures: omitted, false, true; each with representative tags.
- Steps:
  1. Render omitted/false/true variants.
  2. Validate property presence/value and tags per variant.
  3. Validate omitted-path equivalence to baseline.
- Expected Results:
  - Omitted: no allowBlobPublicAccess property; baseline equivalent.
  - False: property=false; no exception tag.
  - True: property=true; exception tag present.
  - Metrics tag preserved in all cases.

### S8 - Datalake template omitted/false/true matrix behavior
- Test Type: Component
- Tracking Level: repoOnly
- Automation: Required
- Manual: Optional diff review
- Preconditions:
  - Template route resolves to storageDatalake.json.
- Test Data:
  - Three fixtures: omitted, false, true; each with representative tags.
- Steps:
  1. Render omitted/false/true variants.
  2. Validate property presence/value and tags per variant.
  3. Validate omitted-path equivalence to baseline.
- Expected Results:
  - Omitted: no allowBlobPublicAccess property; baseline equivalent.
  - False: property=false; no exception tag.
  - True: property=true; exception tag present.
  - Metrics tag preserved in all cases.

### S9 - Existing custom tags are preserved while true-path exception tag is enforced
- Test Type: Unit + Component
- Tracking Level: repoOnly
- Automation: Required
- Manual: Optional spot-check only
- Preconditions:
  - Input includes existing custom tags, including potential conflicting value for exception tag key.
- Test Data:
  - Fixture A: allowBlobPublicAccess=false + custom tags.
  - Fixture B: allowBlobPublicAccess=true + custom tags (including conflicting exception-tag value).
- Steps:
  1. Execute plugin merge behavior for both fixtures.
  2. Render template output for both fixtures.
  3. Validate final tags.
- Expected Results:
  - Custom tags are preserved in both fixtures.
  - Metrics tag is preserved.
  - Exception tag appears only for true path.
  - For true path, final exception tag value is true.

## Verification for Non-Runtime ACs
- AC4 (constantized tag name/value):
  - Verify tests assert behavior through canonical constants usage path and do not require recipe author raw tag literals.
  - Verification method: static review + unit tests guarding exception-tag semantics.
- AC8 (README semantics/example):
  - Verify documentation includes parameter semantics for omitted/false/true and true-path exception tag behavior.
  - Verification method: documentation review checklist in PR.

## Automation and Manual Guidance
- Automated coverage is the source of truth for S1-S9.
- Manual validation is limited to:
  - Reviewing omitted-path artifact diffs when snapshots change.
  - Spot-checking README wording for clarity and parity with behavior.
- No ADO-managed test case creation is required for these repoOnly scenarios.

## Data Requirements
- Deterministic local fixtures for omitted/false/true states.
- Tag fixtures including:
  - Empty/absent tag set.
  - Existing custom tags.
  - Conflicting exception-tag key value to validate true-path enforcement.
- Existing omitted-path baseline artifacts for all three routes.

## Environment Requirements
- Local Node/npm toolchain compatible with repository test scripts.
- ingredient-storage test harness and fixture files.
- No external Azure resources required.

## Entry Criteria
- Story scope and ACs confirmed.
- Baseline omitted-path artifacts available for all template routes.
- Local test environment can execute ingredient-storage unit/component tests.

## Exit Criteria
- All automated scenarios S1-S9 implemented and passing.
- Runtime AC coverage is complete via scenario mapping.
- Omitted-path equivalence validated across storage.json, storageNetwork.json, storageDatalake.json.
- Non-runtime AC verification completed for AC4 and AC8.
- Evidence captured in PR/test output for each scenario.

## Risks and Mitigations
- Risk: Tag merge precedence drift can break expected tag outcomes.
  - Mitigation: explicit conflict fixture coverage in S9.
- Risk: Template route parity regressions across three files.
  - Mitigation: route-matrix scenarios S7 and S8 plus baseline equivalence checks.
- Risk: Snapshot churn obscures real behavioral regressions.
  - Mitigation: enforce focused assertions (property presence/value and tag invariants) in addition to snapshot comparisons.
