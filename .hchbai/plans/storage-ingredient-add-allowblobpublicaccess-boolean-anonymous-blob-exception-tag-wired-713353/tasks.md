# Tasks: User Story 713353

## Tasking Scope
- Story: Storage Ingredient > Add allowBlobPublicAccess boolean + anonymous-blob exception tag (wired)
- Constraint: Omitted allowBlobPublicAccess must be a no-op (no emitted property, no behavior flip)
- Source of truth: plan.md and test-plan.md in this story folder
- Repo context used for granularity: ingredient/ingredient-storage/src, ingredient/ingredient-storage/test, ingredient/ingredient-storage/README.md

## Delivery Tasks

### [x] T001 - Baseline omitted-path output snapshots for all template routes
- Activity: Testing
- Goal: Capture current omitted behavior before code edits for strict equivalence checks.
- Actions:
1. Generate baseline rendered payload output for default route (storage.json path).
2. Generate baseline rendered payload output for NetworkAcls route (storageNetwork.json path).
3. Generate baseline rendered payload output for IsHnsEnabled route (storageDatalake.json path).
4. Save/record comparison artifacts for later byte-for-byte assertions.
- Primary files/context:
1. ingredient/ingredient-storage/src/storage.json
2. ingredient/ingredient-storage/src/storageNetwork.json
3. ingredient/ingredient-storage/src/storageDatalake.json
4. ingredient/ingredient-storage/test/run.ps1
5. ingredient/ingredient-storage/test/test.yaml
- AC coverage: AC6, AC7
- Test coverage linkage: S4, S7, S8
- Done when:
1. Three baseline omitted-path outputs are available and attributable to each route.
2. Comparison method is defined and repeatable.

### [x] T002 - Add constantized anonymous-blob exception tag contract in plugin logic
- Activity: Development
- Goal: Eliminate raw string usage for exception tag key/value in behavior logic.
- Actions:
1. Define constants for tag key allow-anonymous-blob-access and value true.
2. Ensure all new tag behavior references constants only.
3. Keep existing plugin flow and template-selection behavior unchanged.
- Primary files/context:
1. ingredient/ingredient-storage/src/plugin.ts
- AC coverage: AC4
- Test coverage linkage: S3 (indirect runtime check)
- Done when:
1. No raw key/value literals are used in decision logic for this feature.
2. Existing route selection behavior remains unchanged.

### [x] T003 - Implement explicit boolean forwarding semantics for allowBlobPublicAccess
- Activity: Development
- Goal: Forward only explicit boolean values; omitted remains absent.
- Actions:
1. Inspect incoming params and treat only true/false booleans as set.
2. If omitted/unset, do not pass allowBlobPublicAccess into outgoing ARM params.
3. If false, pass allowBlobPublicAccess as false.
4. If true, pass allowBlobPublicAccess as true.
- Primary files/context:
1. ingredient/ingredient-storage/src/plugin.ts
- AC coverage: AC1, AC2, AC3, AC7
- Test coverage linkage: S1, S2, S3
- Done when:
1. Omitted path has no outgoing allowBlobPublicAccess parameter.
2. False and true paths both pass explicit value to templates.

### [x] T004 - Add plugin tag merge behavior for true-path exception tag
- Activity: Development
- Goal: Add exception tag only when allowBlobPublicAccess is true and preserve existing tags.
- Actions:
1. Add/merge outgoing tags payload only when feature logic requires it.
2. For true path, include allow-anonymous-blob-access=true via constants.
3. For omitted/false paths, do not add exception tag.
4. Merge non-destructively if tags already exist in outbound params.
- Primary files/context:
1. ingredient/ingredient-storage/src/plugin.ts
- AC coverage: AC3, AC5
- Test coverage linkage: S3, S6, S7, S8, S9
- Done when:
1. Exception tag appears only on true-path payload.
2. Existing custom tags (if present) are not dropped.

### [x] T005 - Update storage.json for conditional property emission and tag merge
- Activity: Development
- Goal: Support omitted/false/true behavior while preserving Metrics tag.
- Actions:
1. Add template parameter support needed for allowBlobPublicAccess optional handling.
2. Ensure property allowBlobPublicAccess is conditionally emitted only when explicitly set.
3. Ensure false emits false and true emits true.
4. Update tags expression to preserve Metrics and merge optional incoming tags.
- Primary files/context:
1. ingredient/ingredient-storage/src/storage.json
- AC coverage: AC1, AC2, AC3, AC5, AC6, AC7
- Test coverage linkage: S4, S5, S6
- Done when:
1. Omitted path emits no allowBlobPublicAccess property.
2. False/true paths emit exact boolean value.
3. Metrics tag remains present after merge.

### [x] T006 - Update storageNetwork.json for parity with default template behavior
- Activity: Development
- Goal: Apply identical behavioral contract for network template route.
- Actions:
1. Add optional allowBlobPublicAccess handling with omit semantics.
2. Ensure false and true emit exact values.
3. Apply tag merge expression preserving Metrics and accepting incoming tags.
- Primary files/context:
1. ingredient/ingredient-storage/src/storageNetwork.json
- AC coverage: AC1, AC2, AC3, AC5, AC6, AC7
- Test coverage linkage: S7
- Done when:
1. Omitted/false/true matrix passes for network route.
2. Metrics retained across all matrix runs.

### [x] T007 - Update storageDatalake.json for parity with default template behavior
- Activity: Development
- Goal: Apply identical behavioral contract for datalake template route.
- Actions:
1. Add optional allowBlobPublicAccess handling with omit semantics.
2. Ensure false and true emit exact values.
3. Apply tag merge expression preserving Metrics and accepting incoming tags.
- Primary files/context:
1. ingredient/ingredient-storage/src/storageDatalake.json
- AC coverage: AC1, AC2, AC3, AC5, AC6, AC7
- Test coverage linkage: S8
- Done when:
1. Omitted/false/true matrix passes for datalake route.
2. Metrics retained across all matrix runs.

### T008 - Add/extend unit tests for plugin forwarding and tag behavior
- Activity: Testing
- Goal: Prove plugin-level semantics independent of template route details.
- Actions:
1. Add test for omitted parameter resulting in no outbound allowBlobPublicAccess.
2. Add test for explicit false forwarding with no exception tag.
3. Add test for explicit true forwarding with exception tag present.
4. Add test for non-destructive tag merge when existing tags exist.
- Primary files/context:
1. ingredient/ingredient-storage/test
2. ingredient/ingredient-storage/src/plugin.ts
- AC coverage: AC1, AC2, AC3, AC5
- Test coverage linkage: S1, S2, S3, S9
- Done when:
1. Plugin-focused tests pass and cover omitted/false/true paths.
2. Tag merge preservation behavior is asserted.

### T009 - Add/extend template-route component tests for default route
- Activity: Testing
- Goal: Validate rendered payload behavior for storage.json route.
- Actions:
1. Omitted case assertion: no allowBlobPublicAccess property in emitted properties.
2. Omitted case assertion: output equivalence against baseline snapshot.
3. False case assertion: property exists and equals false.
4. True case assertion: property exists and equals true.
5. Tag assertions: Metrics always present; exception tag present only for true.
- Primary files/context:
1. ingredient/ingredient-storage/test
2. ingredient/ingredient-storage/src/storage.json
- AC coverage: AC1, AC2, AC3, AC5, AC6, AC7
- Test coverage linkage: S4, S5, S6
- Done when:
1. Default-route matrix test passes with strict omitted equivalence assertion.

### T010 - Add/extend template-route component tests for network route
- Activity: Testing
- Goal: Validate rendered payload behavior for storageNetwork.json route.
- Actions:
1. Parameterize omitted/false/true cases under NetworkAcls route trigger.
2. Assert property presence/absence and value per case.
3. Assert Metrics preservation in every case.
4. Assert exception tag only in true case.
5. Assert omitted-case output equivalence to baseline.
- Primary files/context:
1. ingredient/ingredient-storage/test
2. ingredient/ingredient-storage/src/storageNetwork.json
- AC coverage: AC1, AC2, AC3, AC5, AC6, AC7
- Test coverage linkage: S7
- Done when:
1. Network-route matrix test passes with strict omitted equivalence assertion.

### T011 - Add/extend template-route component tests for datalake route
- Activity: Testing
- Goal: Validate rendered payload behavior for storageDatalake.json route.
- Actions:
1. Parameterize omitted/false/true cases under IsHnsEnabled route trigger.
2. Assert property presence/absence and value per case.
3. Assert Metrics preservation in every case.
4. Assert exception tag only in true case.
5. Assert omitted-case output equivalence to baseline.
- Primary files/context:
1. ingredient/ingredient-storage/test
2. ingredient/ingredient-storage/src/storageDatalake.json
- AC coverage: AC1, AC2, AC3, AC5, AC6, AC7
- Test coverage linkage: S8
- Done when:
1. Datalake-route matrix test passes with strict omitted equivalence assertion.

### T012 - Add regression test for tag merge with existing custom tags
- Activity: Testing
- Goal: Ensure Metrics and pre-existing tags survive merge behavior.
- Actions:
1. Build fixture with existing custom tags and allowBlobPublicAccess=false.
2. Build fixture with existing custom tags and allowBlobPublicAccess=true.
3. Assert existing custom tags remain unchanged.
4. Assert Metrics remains present.
5. Assert exception tag only appears for true.
- Primary files/context:
1. ingredient/ingredient-storage/test
2. ingredient/ingredient-storage/src/plugin.ts
3. ingredient/ingredient-storage/src/storage.json
- AC coverage: AC5
- Test coverage linkage: S9
- Done when:
1. Merge behavior is proven non-destructive for custom tags.

### T013 - Update README with parameter contract and side effects
- Activity: Documentation
- Goal: Document feature usage and omit/false/true semantics.
- Actions:
1. Add allowBlobPublicAccess to parameter table.
2. Document omitted semantics: property not written.
3. Document false semantics: property written as false.
4. Document true semantics: property written as true plus allow-anonymous-blob-access=true tag.
5. Add concise usage examples for true and false.
- Primary files/context:
1. ingredient/ingredient-storage/README.md
- AC coverage: AC8
- Test coverage linkage: Documentation-only (non-runtime)
- Done when:
1. README clearly describes behavior and side effects for all three input states.

### T014 - Execute targeted tests and capture evidence
- Activity: Testing
- Goal: Validate unit and component scenarios before story completion.
- Actions:
1. Run ingredient-storage targeted tests.
2. Run repository test command for regression confidence if feasible.
3. Record pass/fail evidence mapped to scenario IDs.
4. If failures occur, capture root-cause notes and fix-forward tasks.
- Primary files/context:
1. ingredient/ingredient-storage/test
2. package.json
- AC coverage: Supports AC1, AC2, AC3, AC5, AC6, AC7 validation
- Test coverage linkage: S1-S9
- Done when:
1. Scenario evidence exists for S1 through S9.
2. No unresolved failures remain, or explicit follow-up tasks are logged.

## AC Coverage Matrix

| AC | Acceptance Criterion Summary | Covered By Tasks |
|---|---|---|
| AC1 | Optional allowBlobPublicAccess with omitted no-op | T003, T005, T006, T007, T008, T009, T010, T011 |
| AC2 | false writes property false | T003, T005, T006, T007, T008, T009, T010, T011 |
| AC3 | true writes property true plus exception tag | T003, T004, T005, T006, T007, T008, T009, T010, T011 |
| AC4 | Constantized tag contract | T002 |
| AC5 | Preserve Metrics tag | T004, T005, T006, T007, T009, T010, T011, T012 |
| AC6 | Support all 3 templates | T001, T005, T006, T007, T009, T010, T011 |
| AC7 | No default flip and omitted equivalence | T001, T003, T005, T006, T007, T009, T010, T011 |
| AC8 | README docs | T013 |

## Test Activity Coverage Matrix

| Scenario | Coverage Intent | Covered By Tasks |
|---|---|---|
| S1 | Plugin omitted no-op forwarding | T008 |
| S2 | Plugin explicit false forwarding | T008 |
| S3 | Plugin explicit true plus exception tag | T008 |
| S4 | Default route omitted equivalence | T001, T009 |
| S5 | Default route false plus Metrics preserved | T009 |
| S6 | Default route true plus exception tag and Metrics preserved | T009 |
| S7 | Network route omitted/false/true matrix and equivalence | T001, T010 |
| S8 | Datalake route omitted/false/true matrix and equivalence | T001, T011 |
| S9 | Tag merge robustness with existing custom tags | T008, T012 |

## Suggested Execution Order
1. T001
2. T002-T007
3. T008-T012
4. T013
5. T014
