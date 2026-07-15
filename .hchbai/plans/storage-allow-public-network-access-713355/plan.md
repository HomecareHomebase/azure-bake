# Work Item 713355 Plan

## Story
Storage Ingredient > Add allowPublicNetworkAccess boolean (Pass 1 stub) + public-network exception tag + tag-assertion tests

## Planning Mode Scope
Implement pass-1, tag-only behavior for storage public network access signaling.

In scope:
- Accept optional `allowPublicNetworkAccess` input in storage ingredient flow.
- Stamp tag `allow-public-network-access=true` only when input is true.
- Do not emit `publicNetworkAccess` ARM property in this pass.
- Store public-network tag name/value as Bake constants.
- Preserve existing tags (including `Metrics`) and support co-existence with sibling anonymous-blob tag behavior.
- Add deployment test coverage for tag assertions across representative combinations.
- Update storage ingredient README documentation.

Out of scope:
- Any storage account `apiVersion` change.
- Any ARM template `publicNetworkAccess` property introduction.
- Any behavior change that enforces network policy directly in ARM for this story.

## Current Repo Findings (Read-Only)
- Storage deployment entrypoint is `ingredient/ingredient-storage/src/plugin.ts`.
- Storage ARM templates are:
  - `ingredient/ingredient-storage/src/storage.json`
  - `ingredient/ingredient-storage/src/storageNetwork.json`
  - `ingredient/ingredient-storage/src/storageDatalake.json`
- Templates currently include a static `Metrics: *` tag on the storage account resource.
- No current `allowPublicNetworkAccess` or `publicNetworkAccess` handling exists in storage ingredient.
- ARM helper appends standard Bake tags by merging onto resource tags, so story-specific tags must be preserved in the template object prior to deployment.
- Existing storage test assets are integration-style under `ingredient/ingredient-storage/test/` (recipe plus run scripts), not unit tests.

## Acceptance Criteria Mapping

### AC1: Accept optional allowPublicNetworkAccess boolean; pass 1 must never emit publicNetworkAccess ARM property
Implementation plan:
1. Add optional parsing in `ingredient/ingredient-storage/src/plugin.ts` for `params['allowPublicNetworkAccess']`.
2. Normalize to boolean with safe coercion for Bake values (`true`/`false` booleans and string equivalents) and treat omitted as undefined.
3. Immediately remove `allowPublicNetworkAccess` from ARM params before `DeployTemplate` calls to avoid undeclared-parameter validation failures.
4. Do not add `publicNetworkAccess` to any storage ARM template (`storage.json`, `storageNetwork.json`, `storageDatalake.json`).
5. Add regression validation steps in tests to assert deployed storage account does not contain `publicNetworkAccess` due to this story logic.

### AC2: If true, stamp allow-public-network-access=true tag
Implementation plan:
1. Introduce constants for the tag key/value (see AC4).
2. In `plugin.ts`, when normalized `allowPublicNetworkAccess === true`, create extra tag map with the constant key/value.
3. Apply tag map to whichever template is selected (`ARMTemplate`, `ARMTemplateNetwork`, `ARMTemplateDataLake`) before deployment.

### AC3: If false/omitted, stamp no tag and write no property
Implementation plan:
1. If normalized value is false or undefined, do not add the story tag.
2. Keep template tags unchanged except existing tags already present.
3. Ensure `allowPublicNetworkAccess` parameter is still removed from ARM params in all cases.

### AC4: Tag name/value stored as Bake constant
Implementation plan:
1. Add a new constants module for storage ingredient, for example `ingredient/ingredient-storage/src/constants.ts`.
2. Define exported constants:
   - Public network tag name: `allow-public-network-access`
   - Public network tag value: `true`
3. Import and use these constants in `plugin.ts` tag composition logic (avoid inline literals).

### AC5: Preserve Metrics tag and co-exist with allow-anonymous-blob-access
Implementation plan:
1. Implement a targeted tag merge helper in `plugin.ts` that:
   - Locates `Microsoft.Storage/storageAccounts` resource in the selected template object.
   - Merges new story tags with existing `resource.tags` rather than replacing the tag object.
2. Guarantee existing `Metrics` tag survives unchanged.
3. Merge behavior must be additive so any existing anonymous-blob tag (for example `allow-anonymous-blob-access`) remains when present.
4. Prefer immutable template handling (clone imported template object before mutation) to prevent cross-run tag leakage between deployments.

### AC6: Add tag-assertion deployment tests for representative combinations
Implementation plan:
1. Add storage integration test recipes under `ingredient/ingredient-storage/test/` for representative combinations:
   - Case A: `allowPublicNetworkAccess: true`.
   - Case B: `allowPublicNetworkAccess: false`.
   - Case C: omitted `allowPublicNetworkAccess`.
   - Case D: co-existence scenario with anonymous-blob public access behavior (if supported on branch).
2. Add/extend test runner scripts (`run.ps1` and optionally `run.sh`) to:
   - Deploy each case.
   - Query resulting storage account tags.
   - Assert expected tag presence/absence.
   - Assert no `publicNetworkAccess` property was introduced by this story path.
3. Keep assertions deterministic and fail-fast with clear output per case.

### AC7: README documents parameter and pass-1 semantics
Implementation plan:
1. Update `ingredient/ingredient-storage/README.md` parameter table with `allowPublicNetworkAccess`.
2. Document pass-1 behavior explicitly:
   - Parameter is optional and tag-only in this story.
   - When true, tag is stamped.
   - When false/omitted, no tag is stamped.
   - No ARM `publicNetworkAccess` property is written in pass 1.
3. Add a concise YAML example showing usage.

## Detailed Implementation Steps
1. Add storage constants module and export story tag constants.
2. In storage plugin, parse and normalize `allowPublicNetworkAccess` from Bake params.
3. Remove `allowPublicNetworkAccess` from `params` prior to any `DeployTemplate` call.
4. Clone selected ARM template object before mutation.
5. Merge story tag (conditional) into storage account resource tags using additive merge logic.
6. Deploy cloned template object (existing deployment flow remains otherwise unchanged).
7. Add integration-style tag assertion test cases and runner assertions.
8. Update README parameter docs and pass-1 explanation.
9. Run compile and targeted storage test execution for validation.

## Validation Strategy
Code-level validation:
- Compile `ingredient-storage` TypeScript after changes.
- Verify no TS errors introduced.

Behavior validation (deployment/integration):
- Execute storage test cases for true/false/omitted combinations.
- Assert tags:
  - `allow-public-network-access=true` only for true case.
  - Tag absent for false and omitted cases.
  - `Metrics=*` remains in all cases.
  - Co-existence case retains anonymous-blob tag and public-network tag simultaneously where applicable.
- Assert `publicNetworkAccess` is not present in deployed resource properties for pass-1 scenarios.

Regression validation:
- Confirm no template `apiVersion` changes.
- Confirm no `publicNetworkAccess` property additions in storage ARM JSON templates.
- Confirm existing deploy paths (default, network ACL, data lake) remain functional.

## Dependencies
- Access to Azure test subscription/service principal for deployment assertions.
- Existing storage test harness under `ingredient/ingredient-storage/test/`.
- Any sibling anonymous-blob tag behavior expected by co-existence scenario (if in same branch scope).

## Assumptions
- `allowPublicNetworkAccess` is provided as a parameter under storage ingredient `properties.parameters`.
- Deployment tests in this repo are integration-style and can be extended with script assertions instead of introducing a new unit test framework.
- Co-existence with anonymous-blob tag means additive merge and no overwrites; if the tag is not produced in this branch, co-existence will be validated by non-destructive merge logic and representative test fixture support.

## Risks and Mitigations
- Risk: Extra undeclared ARM parameter causes deployment validation failure.
  - Mitigation: Always delete `allowPublicNetworkAccess` from ARM params before deployment.
- Risk: Mutating imported JSON templates leaks tags across runs.
  - Mitigation: Deep-clone selected template before applying story tags.
- Risk: Tag merge accidentally overwrites existing tags.
  - Mitigation: Additive merge helper with explicit preservation checks for `Metrics` and existing keys.
- Risk: Boolean coercion inconsistency from Bake variable typing.
  - Mitigation: Centralized normalization logic and test cases for bool/string inputs.

## Scope Boundaries
- No apiVersion upgrades in storage ARM templates.
- No implementation of ARM-level `publicNetworkAccess` toggling.
- No unrelated refactors in storage diagnostics, upload flow, or alert deployment.

## Definition of Done (Plan Exit Criteria)
- All 7 acceptance criteria are implemented and validated.
- Storage templates retain current apiVersion values.
- No `publicNetworkAccess` property is emitted by this story changeset.
- Tag behavior verified for true/false/omitted and co-existence scenario.
- README updated with pass-1 semantics and usage example.
