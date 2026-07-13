# Tasks: User Story 713353

## Execution Rules
- Story ID: 713353
- Story: Storage Ingredient > Add allowBlobPublicAccess boolean + anonymous-blob exception tag (wired)
- Source inputs: plan.md and test-plan.md in this folder
- Scope: create executable implementation and validation tasks only
- Constraint carried into all tasks: omitted allowBlobPublicAccess must be a no-op and non-breaking

## Task List

### [x] T001 - Establish omitted-path baselines for all storage template routes
- Type: Testing Foundation
- Depends on: none
- Targets:
1. ingredient/ingredient-storage/src/storage.json
2. ingredient/ingredient-storage/src/storageNetwork.json
3. ingredient/ingredient-storage/src/storageDatalake.json
4. ingredient/ingredient-storage/test
- Steps:
1. Generate deterministic render/output artifacts for omitted allowBlobPublicAccess on default route.
2. Generate deterministic render/output artifacts for omitted allowBlobPublicAccess on NetworkAcls route.
3. Generate deterministic render/output artifacts for omitted allowBlobPublicAccess on IsHnsEnabled route.
4. Store baseline references used by later equivalence assertions.
- Acceptance checks:
1. Three route-specific omitted baselines exist.
2. Baselines are reproducible by the same test command.
- Coverage: AC6, AC7; S4, S7, S8

### [x] T002 - Implement canonical constants for anonymous blob exception tag
- Type: Development
- Depends on: none
- Targets:
1. ingredient/ingredient-storage/src/plugin.ts
2. constants location for allow-anonymous-blob-access tag
- Steps:
1. Define canonical constant for tag key allow-anonymous-blob-access.
2. Define canonical constant for tag value true.
3. Replace feature logic literals with canonical constants.
- Acceptance checks:
1. No raw literal key/value remains in allowBlobPublicAccess exception-tag logic.
2. Constant usage is centralized and referenced by plugin behavior.
- Coverage: AC4; supports S3 and S9

### [x] T003 - Wire plugin boolean normalization and omit-when-unset forwarding behavior
- Type: Development
- Depends on: T002
- Targets:
1. ingredient/ingredient-storage/src/plugin.ts
- Steps:
1. Accept only explicit booleans true or false for allowBlobPublicAccess.
2. Treat unset/non-boolean input as omitted.
3. Remove allowBlobPublicAccess from outbound deployment parameters when omitted.
4. Forward explicit false and explicit true exactly as provided.
- Acceptance checks:
1. Omitted path has no outbound allowBlobPublicAccess parameter.
2. False path forwards false.
3. True path forwards true.
- Coverage: AC1, AC2, AC3, AC7; S1, S2, S3

### [x] T004 - Implement plugin tag merge logic for true-path exception stamp
- Type: Development
- Depends on: T002, T003
- Targets:
1. ingredient/ingredient-storage/src/plugin.ts
- Steps:
1. Merge into outbound tags only when allowBlobPublicAccess is true.
2. Stamp allow-anonymous-blob-access=true for true path.
3. Do not stamp exception tag for omitted or false paths.
4. Preserve all existing user-provided tags during merge.
- Acceptance checks:
1. Exception tag appears only on true path.
2. Existing tags are preserved across omitted/false/true flows.
- Coverage: AC3, AC5; S3, S9

### [x] T005 - Update default template route for conditional property emission
- Type: Development
- Depends on: T003
- Targets:
1. ingredient/ingredient-storage/src/storage.json
- Steps:
1. Ensure allowBlobPublicAccess parameter is optional in template contract.
2. Ensure properties.allowBlobPublicAccess is emitted only when explicitly set.
3. Ensure explicit false renders false.
4. Ensure explicit true renders true.
5. Preserve Metrics tag merge behavior.
- Acceptance checks:
1. Omitted path does not emit properties.allowBlobPublicAccess.
2. False and true paths emit exact boolean value.
3. Metrics remains present post-merge.
- Coverage: AC1, AC2, AC3, AC5, AC6, AC7; S4, S5, S6

### [x] T006 - Update network template route for parity with default behavior
- Type: Development
- Depends on: T003
- Targets:
1. ingredient/ingredient-storage/src/storageNetwork.json
- Steps:
1. Apply optional allowBlobPublicAccess parameter handling.
2. Apply omit-when-unset property behavior.
3. Render explicit false/true values correctly.
4. Preserve Metrics tag merge behavior.
- Acceptance checks:
1. Omitted/false/true matrix matches default-route contract.
2. Metrics remains present in each matrix case.
- Coverage: AC1, AC2, AC3, AC5, AC6, AC7; S7

### [x] T007 - Update datalake template route for parity with default behavior
- Type: Development
- Depends on: T003
- Targets:
1. ingredient/ingredient-storage/src/storageDatalake.json
- Steps:
1. Apply optional allowBlobPublicAccess parameter handling.
2. Apply omit-when-unset property behavior.
3. Render explicit false/true values correctly.
4. Preserve Metrics tag merge behavior.
- Acceptance checks:
1. Omitted/false/true matrix matches default-route contract.
2. Metrics remains present in each matrix case.
- Coverage: AC1, AC2, AC3, AC5, AC6, AC7; S8

### [x] T008 - Add plugin unit tests for omitted, false, and true forwarding behavior
- Type: Testing
- Depends on: T003, T004
- Targets:
1. ingredient/ingredient-storage/test
2. ingredient/ingredient-storage/src/plugin.ts
- Steps:
1. Add test: omitted allowBlobPublicAccess is not forwarded.
2. Add test: false is forwarded and exception tag is absent.
3. Add test: true is forwarded and exception tag is present.
4. Add test: existing tags survive merge behavior.
- Acceptance checks:
1. Unit tests cover omitted/false/true plus tag merge behavior.
2. Tests fail if exception tag appears on omitted/false paths.
- Coverage: AC1, AC2, AC3, AC5; S1, S2, S3, S9

### [x] T009 - Add default-route component tests (storage.json)
- Type: Testing
- Depends on: T001, T005
- Targets:
1. ingredient/ingredient-storage/test
2. ingredient/ingredient-storage/src/storage.json
- Steps:
1. Add omitted case assertions for property absence.
2. Add omitted equivalence assertion against baseline.
3. Add false case assertion for property=false and no exception tag.
4. Add true case assertion for property=true and exception tag present.
5. Assert Metrics tag remains present for all cases.
- Acceptance checks:
1. Default route matrix passes omitted/false/true assertions.
2. Omitted baseline equivalence passes.
- Coverage: AC1, AC2, AC3, AC5, AC6, AC7; S4, S5, S6

### [x] T010 - Add network-route component tests (storageNetwork.json)
- Type: Testing
- Depends on: T001, T006
- Targets:
1. ingredient/ingredient-storage/test
2. ingredient/ingredient-storage/src/storageNetwork.json
- Steps:
1. Add omitted/false/true matrix under NetworkAcls routing preconditions.
2. Assert property absence/value behavior for each matrix row.
3. Assert exception tag only on true row.
4. Assert Metrics tag preserved in all rows.
5. Assert omitted row equivalence to baseline.
- Acceptance checks:
1. Network route matrix passes.
2. Omitted equivalence and tag invariants pass.
- Coverage: AC1, AC2, AC3, AC5, AC6, AC7; S7

### [x] T011 - Add datalake-route component tests (storageDatalake.json)
- Type: Testing
- Depends on: T001, T007
- Targets:
1. ingredient/ingredient-storage/test
2. ingredient/ingredient-storage/src/storageDatalake.json
- Steps:
1. Add omitted/false/true matrix under IsHnsEnabled routing preconditions.
2. Assert property absence/value behavior for each matrix row.
3. Assert exception tag only on true row.
4. Assert Metrics tag preserved in all rows.
5. Assert omitted row equivalence to baseline.
- Acceptance checks:
1. Datalake route matrix passes.
2. Omitted equivalence and tag invariants pass.
- Coverage: AC1, AC2, AC3, AC5, AC6, AC7; S8

### [x] T012 - Add conflict-fixture regression test for tag precedence and preservation
- Type: Testing
- Depends on: T004, T008, T009
- Targets:
1. ingredient/ingredient-storage/test
2. ingredient/ingredient-storage/src/plugin.ts
- Steps:
1. Build fixture with existing custom tags and allowBlobPublicAccess=false.
2. Build fixture with existing custom tags and allowBlobPublicAccess=true including conflicting exception-tag input value.
3. Assert custom tags remain present.
4. Assert Metrics remains present.
5. Assert true path resolves exception tag to value true.
- Acceptance checks:
1. Regression test verifies non-destructive merge semantics.
2. True-path exception-tag value enforcement is proven.
- Coverage: AC3, AC5; S9

### [x] T013 - Update README for feature semantics and usage guidance
- Type: Documentation
- Depends on: T003, T004, T005, T006, T007
- Targets:
1. ingredient/ingredient-storage/README.md
- Steps:
1. Add allowBlobPublicAccess parameter entry with optional boolean type.
2. Document omitted behavior as property not written.
3. Document false behavior as explicit false emission.
4. Document true behavior as explicit true emission plus exception-tag stamping.
5. Add example snippets for false and true.
6. Note that recipe authors should not set the exception tag manually.
- Acceptance checks:
1. README covers omitted/false/true behavior clearly.
2. README explicitly describes true-path exception tag side effect.
- Coverage: AC8

### [ ] T014 - Execute validation suite and collect story evidence
- Type: Verification
- Depends on: T008, T009, T010, T011, T012, T013
- Targets:
1. ingredient/ingredient-storage/test
2. repository test command outputs
- Steps:
1. Run targeted ingredient-storage unit/component tests.
2. Run broader repository test command if required by team workflow.
3. Capture scenario-level pass evidence for S1-S9.
4. Record any failure follow-ups as blocking or non-blocking.
- Acceptance checks:
1. Evidence exists mapping S1-S9 to passing test runs.
2. No unresolved high-severity failures remain.
- Coverage: AC1, AC2, AC3, AC5, AC6, AC7; S1-S9

## Acceptance Criteria Coverage Matrix

| AC | Description | Tasks |
|---|---|---|
| AC1 | Optional allowBlobPublicAccess with omit-when-unset no-op | T003, T005, T006, T007, T008, T009, T010, T011 |
| AC2 | Explicit false is emitted as false | T003, T005, T006, T007, T008, T009, T010, T011 |
| AC3 | Explicit true is emitted as true and exception tag is stamped | T003, T004, T005, T006, T007, T008, T009, T010, T011, T012 |
| AC4 | Exception tag key/value is constantized | T002 |
| AC5 | Existing tags plus Metrics are preserved through merge | T004, T005, T006, T007, T008, T009, T010, T011, T012 |
| AC6 | Behavior works across default, network, and datalake templates | T001, T005, T006, T007, T009, T010, T011 |
| AC7 | No default behavior flip for omitted path | T001, T003, T005, T006, T007, T009, T010, T011 |
| AC8 | README documents semantics and examples | T013 |

## Validation Scenario Coverage Matrix

| Scenario | Description | Tasks |
|---|---|---|
| S1 | Omitted value is not forwarded | T008 |
| S2 | False is forwarded and exception tag is absent | T008 |
| S3 | True is forwarded and exception tag is present | T008 |
| S4 | Default route omitted-path equivalence | T001, T009 |
| S5 | Default route false and Metrics preservation | T009 |
| S6 | Default route true plus exception tag and Metrics preservation | T009 |
| S7 | Network route omitted/false/true matrix | T001, T010 |
| S8 | Datalake route omitted/false/true matrix | T001, T011 |
| S9 | Custom-tag preservation and true-path exception enforcement | T008, T012 |

## Recommended Execution Order
1. T001
2. T002-T004
3. T005-T007
4. T008-T012
5. T013
6. T014
