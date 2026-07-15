# Test Plan: Work Item 713355

## Story Under Test
- Work Item: 713355
- Title: Storage Ingredient > Add allowPublicNetworkAccess boolean (Pass 1 stub) + public-network exception tag + tag-assertion tests
- Pass Scope: Pass 1 tag-only behavior for storage public network access signaling

## Objectives
- Verify runtime behavior for optional `allowPublicNetworkAccess` handling in the storage ingredient.
- Verify pass-1 constraints: no emitted `publicNetworkAccess` ARM property for any input.
- Verify exact tag outcomes, including preservation of existing `Metrics` tag and additive co-existence behavior.

## Runtime Scope
- In scope runtime behavior:
- `allowPublicNetworkAccess=true` stamps `allow-public-network-access=true` tag.
- `allowPublicNetworkAccess=false` or omitted stamps no public-network tag.
- Deployed storage account does not include `publicNetworkAccess` property.
- Existing tags remain intact, specifically `Metrics`, and can co-exist with sibling tags.
- Representative deployment combinations assert exact resulting tag set.

## Non-Runtime Coverage Notes
- AC4 (constant ownership of tag name/value) is implementation-contract verification, not runtime behavior.
- AC7 (README updates) is documentation verification, not runtime behavior.
- These are excluded from runtime scenario tracking and should be validated in code review/checklist.

## Entry Criteria
- Story implementation for `ingredient/ingredient-storage/src/plugin.ts` is present on test branch.
- Storage templates remain in current repo locations and deploy path is functional:
- `ingredient/ingredient-storage/src/storage.json`
- `ingredient/ingredient-storage/src/storageNetwork.json`
- `ingredient/ingredient-storage/src/storageDatalake.json`
- Test credentials are available for deployment validation:
- `BAKE_AUTH_SUBSCRIPTION_ID`
- `BAKE_AUTH_TENANT_ID`
- `BAKE_AUTH_SERVICE_ID`
- `BAKE_AUTH_SERVICE_KEY`
- Optional image push target if needed by harness: `CONTAINER_URI`.

## Exit Criteria
- All runtime scenarios marked Pass.
- AC1, AC2, AC3, AC5, and AC6 each have at least one passing scenario.
- No failing evidence of `publicNetworkAccess` in deployed resource properties.
- Exact tag assertions pass for true/false/omitted/co-existence representative cases.

## Environment and Setup
- Repo root with dependencies installed and ingredient packages buildable.
- Storage harness entrypoint available: `ingredient/ingredient-storage/test/run.ps1`.
- Baseline recipe available: `ingredient/ingredient-storage/test/test.yaml`.
- Azure subscription with permission to deploy resource groups and storage accounts.

## Test Data Matrix
| Data Set | allowPublicNetworkAccess Input | Additional Inputs | Expected Tags on Storage Account | Expected Property Outcome |
|---|---|---|---|---|
| DS1 | `true` (boolean) | none | `Metrics=*`, `allow-public-network-access=true` | No `publicNetworkAccess` property |
| DS2 | `false` (boolean) | none | `Metrics=*` only | No `publicNetworkAccess` property |
| DS3 | omitted | none | `Metrics=*` only | No `publicNetworkAccess` property |
| DS4 | `"true"` (string) if accepted normalization path exists | none | same as DS1 | No `publicNetworkAccess` property |
| DS5 | `"false"` (string) if accepted normalization path exists | none | same as DS2 | No `publicNetworkAccess` property |
| DS6 | `true` | co-existence fixture includes `allow-anonymous-blob-access=true` | `Metrics=*`, `allow-public-network-access=true`, `allow-anonymous-blob-access=true` | No `publicNetworkAccess` property |
| DS7 | invalid type (for example `1`, `{}`) | none | deployment blocked or explicit validation failure | No deployment with mutated network property |

## AC to Scenario Mapping
| Acceptance Criterion | Runtime Relevant | Covered By Scenarios | Notes |
|---|---|---|---|
| AC1: Optional boolean accepted; pass-1 must not emit `publicNetworkAccess` | Yes | S1, S2, S3, S6 | Includes no-property verification for every branch |
| AC2: True stamps `allow-public-network-access=true` | Yes | S3, S6 | Exact tag assertion required |
| AC3: False/omitted produce no tag and no property | Yes | S4, S6 | Exact tag assertion required |
| AC4: Tag key/value as Bake constant | No | Excluded from runtime scenarios | Verify via code review/static check |
| AC5: Metrics preserved; co-exists with anonymous-blob tag | Yes | S5, S6 | Additive merge behavior |
| AC6: Deployment tag-assertion test with representative combinations | Yes | S6 | Integration matrix is primary acceptance evidence |
| AC7: README documents parameter and semantics | No | Excluded from runtime scenarios | Verify via doc review/static check |

## Scenario Catalog

### S1 - Parameter normalization and pass-through stripping
- Tracking Level: `repoOnly`
- Test Type: Unit
- AC Coverage: AC1
- Automation: Automated
- Purpose: Validate optional parameter handling and that `allowPublicNetworkAccess` does not remain in ARM params payload.
- Preconditions: Unit test harness can invoke plugin parameter normalization path.
- Steps:
1. Execute plugin path with DS1, DS2, DS3, DS4, DS5 inputs.
2. Capture resulting deployment params object prior to `DeployTemplate` call.
3. Assert `allowPublicNetworkAccess` key is removed for each input.
- Expected Results:
1. Boolean and supported string forms normalize consistently.
2. ARM params payload does not contain `allowPublicNetworkAccess`.
3. No logic introduces `publicNetworkAccess` property into template properties.

### S2 - Invalid type validation behavior
- Tracking Level: `repoOnly`
- Test Type: Unit
- AC Coverage: AC1
- Automation: Automated
- Purpose: Ensure non-boolean unsupported input types are rejected or handled deterministically per implementation contract.
- Preconditions: Validation logic implemented for parameter type checking.
- Steps:
1. Execute plugin path with DS7 values.
2. Observe thrown error or defined failure response.
3. Confirm no deploy call is made with malformed parameter.
- Expected Results:
1. Invalid types fail with explicit actionable error.
2. No ARM deployment mutation occurs.

### S3 - True path tag stamping and no network property mutation
- Tracking Level: `repoOnly`
- Test Type: Component
- AC Coverage: AC1, AC2
- Automation: Automated
- Purpose: Verify true-path tag injection into selected storage template while preserving existing tags and not adding `publicNetworkAccess`.
- Preconditions: Component test can inspect mutated template object before deployment.
- Steps:
1. Run plugin execution path with DS1 and default template branch.
2. Inspect storage account resource tags in deployed template object.
3. Inspect storage account resource properties object.
- Expected Results:
1. Tags include `Metrics=*` and `allow-public-network-access=true`.
2. `publicNetworkAccess` is absent from resource properties.

### S4 - False and omitted path no-op behavior
- Tracking Level: `repoOnly`
- Test Type: Component
- AC Coverage: AC1, AC3
- Automation: Automated
- Purpose: Verify false and omitted inputs do not stamp new public-network tag and do not mutate network property.
- Preconditions: Same as S3.
- Steps:
1. Run plugin execution path with DS2 and DS3.
2. Inspect resulting storage account tags.
3. Inspect storage account properties.
- Expected Results:
1. Tags remain `Metrics=*` only.
2. `allow-public-network-access` tag is absent.
3. `publicNetworkAccess` property is absent.

### S5 - Tag co-existence and preservation
- Tracking Level: `repoOnly`
- Test Type: Component
- AC Coverage: AC5
- Automation: Automated
- Purpose: Confirm additive merge semantics preserve existing tags and support sibling tag co-existence.
- Preconditions: Fixture/template includes `allow-anonymous-blob-access=true` tag prior to merge, or equivalent branch behavior is simulated.
- Steps:
1. Execute true-path tagging with DS6 fixture.
2. Inspect resulting tag map.
3. Compare against expected exact set.
- Expected Results:
1. `Metrics=*` preserved.
2. `allow-anonymous-blob-access=true` preserved.
3. `allow-public-network-access=true` present.
4. No existing tag keys are removed or overwritten unexpectedly.

### S6 - Deployment tag-assertion matrix (representative combinations)
- Tracking Level: `ADO`
- Test Type: Integration (deployment)
- AC Coverage: AC1, AC2, AC3, AC5, AC6
- Automation: Automated preferred, manual fallback supported
- Purpose: Validate end-to-end deployed resource tag set and no-property guarantee across representative combinations.
- Preconditions:
1. Azure deployment credentials configured.
2. Test recipes/cases available for DS1, DS2, DS3, DS6.
3. Harness can query deployed storage account tags and properties after deployment.
- Steps:
1. Deploy representative cases through storage test harness.
2. For each case, query storage account tags and properties from Azure.
3. Assert exact tag set equality for each data set.
4. Assert `publicNetworkAccess` property does not exist in deployed resource for all cases.
5. Record result artifacts per case (deployment output, queried JSON, assertion log).
- Expected Results:
1. DS1 exact tags: `Metrics=*`, `allow-public-network-access=true`.
2. DS2 exact tags: `Metrics=*` only.
3. DS3 exact tags: `Metrics=*` only.
4. DS6 exact tags include all three expected tags with correct values.
5. No case includes deployed `publicNetworkAccess` property.

## Automation and Manual Guidance
- Unit and component scenarios (S1-S5) should run in repo CI as `repoOnly` checks.
- Integration scenario (S6) should run in ADO pipeline/stage that has Azure credentials and cleanup controls.
- If ADO automation is unavailable, execute S6 manually with `ingredient/ingredient-storage/test/run.ps1` and explicit post-deploy ARM queries; retain evidence logs and resource snapshots.

## Evidence Requirements
- Unit/component run output with passing assertions for S1-S5.
- Deployment logs and queried storage account JSON for each S6 case.
- Explicit assertion evidence that `publicNetworkAccess` is absent in all S6 case outputs.
- Exact tag map assertion output for each representative case.

## Tracking Level Distribution
- `repoOnly`: 5 scenarios (S1-S5)
- `ADO`: 1 scenario (S6)
- Rationale: Only end-to-end Azure deployment validation hits backend services; all unit/component checks remain repository-local.

## Risks and Open Questions
- Co-existence fixture dependency: If sibling `allow-anonymous-blob-access` behavior is not present on branch, S5/S6 DS6 must use a controlled fixture to simulate pre-existing tag state.
- Validation contract detail: If implementation chooses coercion vs strict rejection for string forms, DS4/DS5 expectations should be finalized to match code contract before execution.