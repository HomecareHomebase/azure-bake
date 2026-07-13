# Implementation Plan: User Story 713353

## Story Summary
- Work Item: 713353
- Title: Storage Ingredient > Add allowBlobPublicAccess boolean + anonymous-blob exception tag (wired)
- Goal: Add optional allowBlobPublicAccess support in @azbake/ingredient-storage with omit-when-unset behavior, true/false passthrough, and automatic exception tag stamping only when true.

## Scope and Constraints
- In scope:
  - ingredient/ingredient-storage plugin parameter handling
  - ARM template wiring in storage.json, storageNetwork.json, storageDatalake.json
  - canonical constant for tag name/value
  - README updates
  - validation for omitted/false/true behavior and tag merge behavior
- Out of scope:
  - allowPublicNetworkAccess parameter/sibling tag story
  - private endpoint/publicNetworkAccess enforcement work
  - baseline behavior flip to false by default
- Constraints:
  - Non-breaking behavior required
  - Omit-when-unset must be preserved
  - Preserve existing Metrics tag behavior
  - No API version bump and no new dependencies

## Current State (Repository Read)
- Plugin currently includes:
  - Explicit boolean normalization logic for allowBlobPublicAccess
  - Omit-when-unset deletion of parameter
  - Exception tag constants at top of plugin.ts
  - Tag merge logic that preserves existing tags
- ARM templates currently include:
  - allowBlobPublicAccess parameter declarations
  - Conditional dual-resource pattern:
    - Resource with allowBlobPublicAccess property when deployment parameters contain it
    - Resource without property when omitted
  - Tags merged with Metrics via union(parameters('tags'), createObject('Metrics', '*'))
- README currently does not document allowBlobPublicAccess semantics in parameter table/examples.
- Test folder currently contains integration artifacts (yaml/arm), but no dedicated automated test coverage for omitted/false/true/tag merge scenarios.

## Implementation Approach
1. Confirm plugin implementation matches contract exactly
- Verify allowBlobPublicAccess parsing accepts only explicit true/false and treats anything else as unset.
- Verify unset removes parameter from deployment payload before template deployment.
- Verify true stamps tag allow-anonymous-blob-access=true via canonical constant, without requiring recipe author to pass raw tag key/value.
- Verify false does not stamp exception tag.
- Verify existing tags are merged (not overwritten).

2. Confirm template wiring across all 3 templates
- Files:
  - ingredient/ingredient-storage/src/storage.json
  - ingredient/ingredient-storage/src/storageNetwork.json
  - ingredient/ingredient-storage/src/storageDatalake.json
- Validate each template:
  - Has omit path that does not write properties.allowBlobPublicAccess.
  - Has explicit path that writes properties.allowBlobPublicAccess from parameter.
  - Keeps Metrics tag merge behavior intact.
- Ensure no apiVersion changes and no other behavioral drift.

3. Documentation update in README
- Add parameter row for allowBlobPublicAccess:
  - optional boolean
  - omitted: property not written, Azure default behavior applies
  - false: writes allowBlobPublicAccess=false
  - true: writes allowBlobPublicAccess=true and stamps exception tag automatically
- Add short usage example showing true/false and resulting tag behavior.
- Add note that recipe authors should not supply the exception tag directly.

4. Test strategy and implementation
- Add/extend automated tests for storage ingredient behavior (preferred at plugin level, plus template payload assertions).
- Minimum scenario matrix:
  - omitted allowBlobPublicAccess
    - deployment payload does not include allowBlobPublicAccess
    - no exception tag stamped
    - Metrics tag preserved
  - allowBlobPublicAccess=false
    - deployment payload includes false
    - no exception tag stamped
    - Metrics tag preserved
  - allowBlobPublicAccess=true
    - deployment payload includes true
    - exception tag present with value true
    - existing custom tags preserved
    - Metrics tag preserved
- Execute tests against all template selection paths:
  - default storage template path
  - NetworkAcls template path
  - IsHnsEnabled template path

5. Final verification and release hygiene
- Run package compile/tests for ingredient-storage and relevant repo test task.
- Confirm no dependency changes.
- Add CHANGELOG entry if repo conventions require it for feature addition.

## Acceptance Criteria Traceability
- AC1 Optional boolean accepted and omitted means property not written:
  - plugin normalization + template conditional resource paths
- AC2 false writes properties.allowBlobPublicAccess=false:
  - explicit parameter path in each template
- AC3 true writes property=true and stamps exception tag:
  - plugin ApplyAnonymousBlobExceptionTag + template explicit path
- AC4 tag key/value held as Bake constant:
  - canonical constant in plugin/constants module
- AC5 default tags preserved and merged:
  - template union for Metrics + plugin merge for exception tag with existing tags
- AC6 works across 3 templates:
  - storage.json, storageNetwork.json, storageDatalake.json validation/tests
- AC7 no default flip:
  - omitted path removes property, maintaining current effective output contract
- AC8 README documents semantics and example:
  - README parameter table and usage section updates

## Risks and Mitigations
- Risk: Dual-resource conditional pattern may introduce drift between resource definitions.
  - Mitigation: Keep properties aligned except allowBlobPublicAccess; add regression checks comparing key fields.
- Risk: Tag merge order may unintentionally override user-provided values.
  - Mitigation: Define expected precedence explicitly (exception tag must be true when feature is true); test with conflicting input tags.
- Risk: Template path branching (NetworkAcls/IsHnsEnabled/default) could miss one scenario.
  - Mitigation: Scenario matrix includes all three deployment paths.
- Risk: Existing recipes relying on implicit defaults could regress.
  - Mitigation: Preserve omit-when-unset and verify payload omission in tests.

## Dependencies
- No external package dependencies required.
- Uses existing @azbake/core + ARM helper flow and current ARM template versions.
- Requires existing test framework approach used by ingredient-storage package/repo.

## Validation Plan
- Static validation:
  - TypeScript compile for ingredient-storage.
  - Lint/format checks per repo standard if configured.
- Behavioral validation:
  - Automated tests for omitted/false/true + tag merge matrix.
  - Assert deploy payload parameter set before helper.DeployTemplate invocation.
  - Assert template-selected path behavior across default/network/datalake.
- Documentation validation:
  - README parameter table contains allowBlobPublicAccess semantics and example.

## Rollback Plan
- Revert storage ingredient plugin/tag handling changes and template parameter/property additions in one commit if production issue appears.
- Keep rollback bounded to ingredient/ingredient-storage package to minimize blast radius.
- Post-rollback check:
  - Omitted behavior returns to prior output
  - No exception tag stamping
  - Existing Metrics tag behavior remains intact

## Execution Sequence
1. Implement/confirm plugin parameter and tag constant behavior.
2. Implement/confirm template conditional property wiring in all three templates.
3. Add/extend tests for omitted/false/true and tag merge across all template paths.
4. Update README and examples.
5. Run compile/tests and finalize changelog/release notes if required.

## Clarifying Questions
1. Should the exception tag force value true when user passes allow-anonymous-blob-access with a different value and allowBlobPublicAccess=true, or should user value win?
2. Is changelog update required as part of this story, or handled by release tooling only?
3. Should validation include integration deployment in a live Azure environment, or is unit/integration-test payload validation sufficient for story completion?
