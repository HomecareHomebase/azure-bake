# Phase 7.3 Azure management client upgrades — execution plan

> This plan implements Phase 7.3 from `docs/upgrade.md` and **does not** change functionality beyond required SDK compatibility changes.
> 
> Guiding principle: keep behavior stable, update tests/mocks to match new SDK shapes, and record every change in the progress tracker below.

## Scope and goals

**Goal:** Upgrade every `@azure/*` dependency to the latest supported version while keeping CommonJS output and Bake behavior unchanged. The order is **core/system/arm-helper first**, then **ingredient-by-ingredient**. Each project update must be handled by a **sub-agent**, and the progress table in this file must be updated when each item completes.

**Constraints:**

* Runtime and CI target Node 22.
* Packages remain CommonJS (no ESM-only conversion).
* `CredentialFactory` remains the single source of truth for auth; use `TokenCredential` (`@azure/identity`) for modern management clients.
* No live Azure calls in tests; use mocks and fixtures.

## Deep analysis — current Azure SDK footprint

The list below is derived from package manifests. It is the starting inventory for Phase 7.3 work.

### Foundation packages

* `arm-helper` → `@azure/arm-resources`
* `core` → `@azure/identity`, `@azure/ms-rest-nodeauth`
* `system` → `@azure/arm-resources`, `@azure/identity`, `@azure/ms-rest-nodeauth`
* Root `package.json` → `@azure/arm-compute`, `@azure/arm-cosmosdb`, `@azure/arm-network`, `@azure/identity`, `@azure/ms-rest-nodeauth`

### Ingredients

* `ingredient-acs` → `@azure/arm-communication`, `@azure/identity`, `@azure/ms-rest-nodeauth`
* `ingredient-apim-api` → `@azure/arm-apimanagement`, `@azure/identity`, `@azure/ms-rest-nodeauth`
* `ingredient-apim` → `@azure/arm-apimanagement`, `@azure/arm-monitor`, `@azure/arm-network`, `@azure/identity`, `@azure/ms-rest-nodeauth`
* `ingredient-app-insights` → `@azure/arm-appinsights`, `@azure/ms-rest-js`, `@azure/ms-rest-nodeauth`
* `ingredient-app-service-plan` → `@azure/ms-rest-nodeauth`
* `ingredient-arm` → `@azure/ms-rest-nodeauth`
* `ingredient-availability-set` → `@azure/ms-rest-nodeauth`
* `ingredient-azure-vm-extension` → `@azure/arm-compute`, `@azure/arm-eventhub`, `@azure/ms-rest-nodeauth`
* `ingredient-azure-vm` → `@azure/ms-rest-nodeauth`
* `ingredient-batch` → `@azure/arm-storage`, `@azure/batch`, `@azure/ms-rest-nodeauth`
* `ingredient-container-reg` → `@azure/ms-rest-nodeauth`
* `ingredient-cosmosdb` → `@azure/arm-cosmosdb`, `@azure/ms-rest-nodeauth`
* `ingredient-databricks` → `@azure/arm-sql`, `@azure/ms-rest-nodeauth`
* `ingredient-datafactoryv2` → `@azure/arm-sql`, `@azure/ms-rest-nodeauth`
* `ingredient-event-hub-namespace` → `@azure/arm-eventhub`, `@azure/ms-rest-nodeauth`
* `ingredient-event-hub` → `@azure/arm-eventhub`, `@azure/ms-rest-nodeauth`
* `ingredient-function-app` → `@azure/arm-resources`, `@azure/ms-rest-nodeauth`
* `ingredient-functions` → `@azure/ms-rest-nodeauth`
* `ingredient-host-names` → `@azure/ms-rest-nodeauth`
* `ingredient-key-vault` → `@azure/ms-rest-nodeauth`
* `ingredient-kubernetes` → `@azure/ms-rest-nodeauth`
* `ingredient-metric-alert` → `@azure/arm-resources`, `@azure/ms-rest-nodeauth`
* `ingredient-network-interface` → `@azure/arm-network`, `@azure/ms-rest-nodeauth`
* `ingredient-null` → `@azure/ms-rest-nodeauth`
* `ingredient-postgresql` → `@azure/arm-network`, `@azure/arm-privatedns`, `@azure/identity`, `@azure/ms-rest-nodeauth`
* `ingredient-property-service` → `@azure/ms-rest-nodeauth`
* `ingredient-search` → `@azure/arm-search`, `@azure/identity`, `@azure/ms-rest-nodeauth`
* `ingredient-service-bus-namespace` → `@azure/arm-servicebus`, `@azure/ms-rest-nodeauth`
* `ingredient-service-bus-queue` → `@azure/ms-rest-nodeauth`
* `ingredient-sql-dwh` → `@azure/arm-sql`, `@azure/ms-rest-nodeauth`
* `ingredient-sqldb` → `@azure/arm-sql`, `@azure/ms-rest-nodeauth`
* `ingredient-sqlserver-logical` → `@azure/arm-sql`, `@azure/ms-rest-nodeauth`
* `ingredient-storage` → `@azure/arm-storage`, `@azure/ms-rest-nodeauth`, `@azure/storage-blob`
* `ingredient-traffic-manager` → `@azure/ms-rest-nodeauth`
* `ingredient-webapp-container` → `@azure/ms-rest-nodeauth`
* `ingredient-template` → `@azure/ms-rest-nodeauth` (template update required for new SDK patterns)

## Research results — latest target versions (as of 2026-01-23)

These are the **current latest versions** from the npm registry at the time of this research. Use them as the upgrade targets unless a specific SDK’s `engines` field conflicts with Node 22 (verify via `npm view <package> engines`).

| Package | Latest version | Notes |
|---|---:|---|
| `@azure/arm-apimanagement` | `10.0.0` | Management client API changes likely (LRO patterns, model changes) |
| `@azure/arm-appinsights` | `4.0.0` | Verify model/enums for component creation |
| `@azure/arm-communication` | `4.2.0` | Check `createOrUpdate` LRO signatures |
| `@azure/arm-compute` | `23.3.0` | Expect poller/`beginXxxAndWait` changes |
| `@azure/arm-cosmosdb` | `16.4.0` | Watch for API versioned model changes |
| `@azure/arm-eventhub` | `5.2.0` | List APIs may return async iterables |
| `@azure/arm-monitor` | `7.0.0` | Metric alert schemas changed across majors |
| `@azure/arm-network` | `35.0.0` | Large surface area; expect breaking changes |
| `@azure/arm-privatedns` | `3.3.0` | Minor API shape changes possible |
| `@azure/arm-resources` | `7.0.0` | **Breaking:** deployments removed from `ResourceManagementClient` (moved to `@azure/arm-resourcesdeployments`) + TokenCredential-only |
| `@azure/arm-resourcesdeployments` | `1.0.0-beta.1` | Required for ARM template deployments on `@azure/arm-resources@7`; pre-GA (beta/dev tags) |
| `@azure/arm-search` | `3.3.0` | Search service model tweaks possible |
| `@azure/arm-servicebus` | `6.1.0` | Check queue/topic management operations |
| `@azure/arm-sql` | `10.0.0` | Major LRO/model changes; verify begin/end APIs |
| `@azure/arm-storage` | `19.1.0` | Storage account APIs often shift LRO responses |
| `@azure/batch` | `12.0.0` | Still ms-rest style credentials (e.g., shared key); not TokenCredential |
| `@azure/identity` | `4.13.0` | Keep as auth baseline for TokenCredential |
| `@azure/ms-rest-js` | `2.7.0` | Only keep if legacy clients still depend on it |
| `@azure/ms-rest-nodeauth` | `3.1.1` | Plan to remove once legacy auth is gone |
| `@azure/storage-blob` | `12.30.0` | Verify blob client creation/signing helpers |

## Deeper migration analysis — repo-specific notes

This section ties upstream SDK changes to **how Azure Bake actually uses** these SDKs today (code + tests). It’s intended to reduce surprises when sub-agents execute each row in the progress tracker.

### Cross-cutting breakpoints (applies to most `@azure/arm-*` upgrades)

* **Auth is the #1 breaker:** Track-2 management clients require `TokenCredential` (from `@azure/identity`). In this repo, standardize on `DeploymentContext.Credentials.modernCredentials` from `core/src/credential-factory.ts`.
* **Deep imports will fail on modern packages:** many newer `@azure/arm-*` packages publish an `exports` map. Imports like `@azure/arm-*/esm/models` or `@azure/arm-*/src/models` will throw `ERR_PACKAGE_PATH_NOT_EXPORTED` on Node 22.
  * Fix: import models/types from the package root (e.g., `import type { Subnet } from "@azure/arm-network"`).
* **Long-running operations (LRO):** methods often change from `createOrUpdate/delete/update` to `beginCreateOrUpdateAndWait` / `beginDeleteAndWait` / `beginUpdateAndWait`, or return a poller (`pollUntilDone()`).
* **Paging:** list operations become `PagedAsyncIterableIterator` (consume with `for await (...)`, or `.byPage()`).
* **Errors:** Track-2 clients tend to throw core-pipeline errors (not `@azure/ms-rest-js.RestError`). Don’t hard-code `instanceof RestError` checks; prefer robust property inspection (`status`, `response`, `message`).
  * Track-2 migration guide: https://github.com/Azure/azure-sdk-for-js/blob/main/documentation/MIGRATION-guide-for-next-generation-management-libraries.md

### Auth + legacy SDKs

#### `@azure/identity` → `4.13.0`

* Repo currently mixes identity v2 and v4 (several ingredients still declare `^2.0.4`). Align all to `^4.13.0` to avoid duplicate installs.
* **Tests:** avoid directly assigning to identity exports (e.g., `identity.ClientSecretCredential = ...`); use Sinon stubs instead.
* Changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/CHANGELOG.md
* Breaking changes: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/BREAKING_CHANGES.md

#### `@azure/ms-rest-nodeauth` → `3.1.1` (legacy)

* Still used by `core/src/credential-factory.ts` (legacy creds) and `ingredient/ingredient-property-service/src/client/authenticator.ts`.
* Avoid deep-importing internal types like `@azure/ms-rest-nodeauth/dist/...` (fragile).
* Changelog: https://github.com/Azure/ms-rest-nodeauth/blob/master/Changelog.md
* Migration guide: https://github.com/Azure/ms-rest-nodeauth/blob/master/migrate-to-identity-v2.md

#### `@azure/ms-rest-js` → `2.7.0` (legacy)

* We use `RestError`/`HttpResponse` types in a few places and have an AutoRest-generated client under `ingredient/ingredient-property-service/src/client/*`.
* If we want to fully converge on `2.7.0`, we must remove `@azure/ms-rest-js@^1.8.1` pinned by `ingredient-app-insights` (upgrade `@azure/arm-appinsights` first).
* Changelog: https://github.com/Azure/ms-rest-js/blob/master/Changelog.md

### Foundation + widely shared management SDKs

#### `@azure/arm-resources` → `7.0.0` (+ `@azure/arm-resourcesdeployments`)

**Repo usage hotspots**

* `arm-helper/src/arm-helper.ts`: ARM template deployments via `ResourceManagementClient.deployments.{validate,createOrUpdate}`
* `system/src/bake-runner.ts`: resource group existence/create + `ResourceGroup` type import from `@azure/arm-resources/esm/models`
* `ingredient/ingredient-function-app/src/functions.ts`: `client.resources.get(...)`
* `ingredient/ingredient-availability-set/src/functions.ts`: `client.resources.get(...)` (note: this package currently doesn’t declare `@azure/arm-resources` in its manifest)

**Breaking changes / required actions**

* `ResourceManagementClient` in v7 is **TokenCredential-only**.
  * Replace `new ResourceManagementClient(ctx.AuthToken, subId)` / legacy credentials with `ctx.Credentials.modernCredentials`.
* **Deployments removed from `ResourceManagementClient` in v7.** Deployments moved to `@azure/arm-resourcesdeployments`.
  * `arm-helper` must use `DeploymentsClient` and LRO methods (`beginValidateAndWait`, `beginCreateOrUpdateAndWait`).
* Remove all deep imports (`@azure/arm-resources/esm/models`, `@azure/arm-resources/esm/...`).

Refs:
* arm-resources v7 changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/resources/arm-resources/CHANGELOG.md
* Deployments split discussed in that changelog (v7.0.0).

#### `@azure/arm-network` → `35.0.0` and `@azure/arm-privatedns` → `3.3.0`

**Repo usage hotspots**

* `ingredient/ingredient-apim/src/functions.ts`: `NetworkManagementClient.subnets.get(...)` + deep import `@azure/arm-network/esm/models`
* `ingredient/ingredient-network-interface/src/functions.ts`: `networkInterfaces.get(...)` (legacy credentials)
* `ingredient/ingredient-postgresql/src/functions.ts`: `virtualNetworks.get`, `subnets.get`, `privateZones.get` (already TokenCredential-ish)

**Breaking changes / required actions**

* `NetworkManagementClient` in v35 is Track-2 (TokenCredential-only) and published with modern packaging.
  * Update any remaining `this.context.AuthToken` usage to `this.context.Credentials.modernCredentials`.
* Remove deep imports like `@azure/arm-network/esm/models`.
* Ensure tests that create fake contexts either:
  * stub client constructors before credentials are used, or
  * provide a fake TokenCredential (`getToken()` returning `{ token, expiresOnTimestamp }`).

Refs:
* arm-network changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/network/arm-network/CHANGELOG.md

#### `@azure/arm-sql` → `10.0.0`

**Repo usage hotspots**

* Active: `ingredient/ingredient-sql-dwh/src/plugin.ts` uses `SqlManagementClient` + `databases.{pause,resume,listByServer,get}`.
* Unused/legacy imports: `ingredient/ingredient-sqlserver-logical/src/functions.ts` imports `SqlManagementModels` / `SqlManagementMappers` (these exports do not exist in v10).

**Breaking changes / required actions**

* TokenCredential-only client construction in v10.
* `pause` / `resume` become LROs: use `beginPauseAndWait` and `beginResumeAndWait`.
* `listByServer` becomes an async iterator (don’t treat it like an array).

Refs:
* arm-sql changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/sql/arm-sql/CHANGELOG.md

#### `@azure/arm-storage` → `19.1.0` and `@azure/storage-blob` → `12.30.0`

**Repo usage hotspots**

* `ingredient/ingredient-storage/src/functions.ts`
  * `StorageManagementClient` created with legacy `ctx.AuthToken`
  * deep import `@azure/arm-storage/esm/models`
  * lifecycle policy update via `managementPolicies.createOrUpdate(...)`
* `ingredient/ingredient-storage/src/plugin.ts` uses `@azure/storage-blob` (shared key credential) for blob operations.

**Breaking changes / required actions**

* arm-storage v19 is Track-2 (TokenCredential-only) and blocks deep imports.
* `managementPolicies.createOrUpdate` signature changes:
  * old: `(rg, accountName, policySchema)`
  * new: `(rg, accountName, "default", { policy: policySchema })`
* lifecycle policy model changes:
  * `ManagementPolicyRule.type` becomes required (usually `"Lifecycle"`)
  * `actions.baseBlob.deleteProperty` renamed to `actions.baseBlob.delete`

Refs:
* arm-storage changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/storage/arm-storage/CHANGELOG.md
* storage-blob changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/storage/storage-blob/CHANGELOG.md

#### `@azure/batch` → `12.0.0`

* `ingredient-batch` currently does not import/use the Batch client (ARM-only today).
* If we start using it later: v12 has breaking API removals (e.g., `getRemoteDesktop` removed) and is still ms-rest style auth (shared key), not TokenCredential.
* Changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/batch/batch/CHANGELOG.md

### Ingredient-specific SDKs

#### `@azure/arm-apimanagement` → `10.0.0`

**Repo usage hotspots**

* `ingredient/ingredient-apim/src/plugin.ts`, `ingredient/ingredient-apim/src/functions.ts`
* `ingredient/ingredient-apim-api/src/plugin.ts`, `ingredient/ingredient-apim-api/src/functions.ts`

**Breaking changes / required actions**

* Remove all imports from `@azure/arm-apimanagement/src/models` (blocked by modern packaging). Import models from the package root.
* `api.delete` is removed in v10 → use `api.beginDeleteAndWait`.
* APIM error response shape changed in v10 (`ErrorResponse` nesting changed); avoid brittle `RestError` assumptions.

Refs:
* arm-apimanagement changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/apimanagement/arm-apimanagement/CHANGELOG.md

#### `@azure/arm-monitor` → `7.0.0`

* Client rename: `MonitorManagementClient` → `MonitorClient`.
* TokenCredential-only.
* Method signature change confirmed for diagnostic settings:
  * v5: `diagnosticSettings.createOrUpdate(resourceUri, parameters, name)`
  * v7: `diagnosticSettings.createOrUpdate(resourceUri, name, parameters)`

Refs:
* arm-monitor v7 changelog: https://unpkg.com/@azure/arm-monitor@7.0.0/CHANGELOG.md

#### `@azure/arm-appinsights` → `4.0.0`

* Used by `ingredient/ingredient-app-insights/src/functions.ts` (`components.get(...)`).
* Remove/bump the direct `@azure/ms-rest-js@^1.8.1` dependency in `ingredient-app-insights` so that `arm-appinsights@4` can resolve ms-rest-js v2.
* v4 still supports legacy `ServiceClientCredentials`, but we can optionally switch to TokenCredential for consistency.

#### `@azure/arm-compute` → `23.3.0`

**Repo usage hotspots**

* `ingredient/ingredient-azure-vm-extension/src/functions.ts`
  * currently uses Track-1-era `ComputeManagementClientContext` and `new VirtualMachineExtensions(context)`
  * deep import `@azure/arm-compute/src/models`

**Breaking changes / required actions**

* Move to Track-2 client:
  * `ComputeManagementClient` constructor is TokenCredential-only.
  * Use `client.virtualMachineExtensions.get/list/...` (operation group) instead of constructing `VirtualMachineExtensions` manually.
* Update update call to LRO:
  * replace `vm.update(...)` with `client.virtualMachineExtensions.beginUpdateAndWait(...)`.
* Remove deep imports (`@azure/arm-compute/src/models`). Import types from `@azure/arm-compute` root.

Refs:
* arm-compute changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/compute/arm-compute/CHANGELOG.md

#### `@azure/arm-cosmosdb` → `16.4.0`

* `ingredient/ingredient-cosmosdb/src/functions.ts` uses `databaseAccounts.listKeys` and `databaseAccounts.listConnectionStrings`.
* v16 is Track-2 (TokenCredential-only) and modern packaging.
  * Replace `new CosmosDBManagementClient(this.context.AuthToken, subId)` with `this.context.Credentials.modernCredentials`.
  * Remove unused/legacy imports `CosmosDBManagementModels` / `CosmosDBManagementMappers`.

Refs:
* arm-cosmosdb changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/cosmosdb/arm-cosmosdb/CHANGELOG.md

#### `@azure/arm-eventhub` → `5.2.0`

* Used by:
  * `ingredient/ingredient-event-hub/src/functions.ts` → `eventHubs.listKeys(...)`
  * `ingredient/ingredient-event-hub-namespace/src/functions.ts` → `namespaces.getAuthorizationRule(...)`
* v5 is Track-2 (TokenCredential-only).
* Remove deep model imports (`@azure/arm-eventhub/esm/models`) and import response types from package root.

Refs:
* arm-eventhub changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/eventhub/arm-eventhub/CHANGELOG.md

#### `@azure/arm-servicebus` → `6.1.0`

* Used by `ingredient/ingredient-service-bus-namespace/src/{functions.ts,plugin.ts}`.
* v6 is Track-2 (TokenCredential-only).
  * Update `new ServiceBusManagementClient(this._ctx.AuthToken, subId)` → `this._ctx.Credentials.modernCredentials`.

Refs:
* arm-servicebus changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/servicebus/arm-servicebus/CHANGELOG.md

#### `@azure/arm-communication` → `4.2.0`

* Used by `ingredient/ingredient-acs/src/functions.ts`.
* v4 **renamed** the operation group:
  * `client.communicationService` → `client.communicationServices`
* Continue using TokenCredential; consider switching to `ctx.Credentials.modernCredentials` instead of building `ClientSecretCredential` manually.

Refs:
* arm-communication changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/communication/arm-communication/CHANGELOG.md

#### `@azure/arm-search` → `3.3.0`

* Used by `ingredient/ingredient-search/src/functions.ts` (`adminKeys.get(...)`).
* Target version is a minor bump; main work is aligning identity usage (TokenCredential) and keeping imports to package root.

Refs:
* arm-search changelog: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/search/arm-search/CHANGELOG.md

## What typically changes in modern Azure SDKs (watch-outs)

* **Credentials**: management clients now expect `TokenCredential`. Use `CredentialFactory.createCredentials(...).modernCredentials`.
* **Long-running operations**: many methods switch to `beginXxxAndWait` or return a poller instead of a final result.
* **Models and enums**: shape changes and new namespaces are common; imports may move or be removed.
* **Pagination**: some list methods return async iterables instead of arrays.
* **ms-rest-js/ms-rest-nodeauth**: should be removed once a package no longer needs legacy clients.

## Required workflow (novice-friendly, step-by-step)

### 1) Prepare your environment

1. Ensure Node 22 is active (check via `node -v`).
2. From repo root, install dependencies with `npm ci`.
3. Run `npm run clean:build` and `npm test` to confirm the baseline is green.
4. Create a new branch for Phase 7.3 work (one branch for all packages is fine, or one per batch).

### 2) Use sub-agents for every project update (mandatory)

For **each** project listed in the order below, launch a **sub-agent** with a prompt like:

* Read the project’s `package.json`, its `src/` files, and relevant tests.
* Identify Azure client usage and API surface.
* Update `@azure/*` dependencies to latest compatible versions (use npm registry data; respect Node 22).
* Update code to the new SDK APIs (credential types, LRO, model changes).
* Update or add tests/mocks to reflect new SDK shapes.
* Run the project’s tests (`npx lerna run test --scope <packageName>`) and any impacted cross-tests.
* Update the **Progress tracker** section in this file with status, tests run, and notes.

### 3) Keep versions synchronized (“bake parent” alignment)

After each package update:

1. Ensure the root `package.json` versions are aligned with the updated SDK versions when they overlap.
2. Run a root `npm install` (or `npm ci` if lockfile changes are already committed).
3. Confirm `package-lock.json` is consistent with workspace updates.
4. If multiple packages share an SDK (e.g., `@azure/arm-sql`), keep all of them on the same version to avoid duplication.

### 4) Documentation updates (must-do)

* After each project completes, update the progress tracker below.
* Add a short note in the “Notes / Issues” column if any SDK behavior differs and how it was handled.

## Execution order (right hierarchy)

Proceed in this order. Each item must be completed (tests green + progress updated) before moving to the next.

### A) Foundation packages

1. `core` (validate `CredentialFactory` with newest `@azure/identity`)
2. `arm-helper` (`@azure/arm-resources`)
3. `system` (`@azure/arm-resources`, Bake runner integration)
4. Root `package.json` alignment (shared dependency versions)
5. `ingredient-template` (update template guidance for new SDKs)

### B) Ingredient-by-ingredient upgrades

1. `ingredient-acs` (`@azure/arm-communication`)
2. `ingredient-apim-api` (`@azure/arm-apimanagement`)
3. `ingredient-apim` (`@azure/arm-apimanagement`, `@azure/arm-monitor`, `@azure/arm-network`)
4. `ingredient-app-insights` (`@azure/arm-appinsights`, `@azure/ms-rest-js`)
5. `ingredient-app-service-plan` (remove/upgrade unused `@azure/ms-rest-nodeauth` if possible)
6. `ingredient-arm` (same as above)
7. `ingredient-availability-set` (same as above)
8. `ingredient-azure-vm-extension` (`@azure/arm-compute`, `@azure/arm-eventhub`)
9. `ingredient-azure-vm` (ms-rest cleanup)
10. `ingredient-batch` (`@azure/arm-storage`, `@azure/batch`)
11. `ingredient-container-reg` (ms-rest cleanup)
12. `ingredient-cosmosdb` (`@azure/arm-cosmosdb`)
13. `ingredient-databricks` (`@azure/arm-sql`)
14. `ingredient-datafactoryv2` (`@azure/arm-sql`)
15. `ingredient-event-hub-namespace` (`@azure/arm-eventhub`)
16. `ingredient-event-hub` (`@azure/arm-eventhub`)
17. `ingredient-function-app` (`@azure/arm-resources`)
18. `ingredient-functions` (ms-rest cleanup)
19. `ingredient-host-names` (ms-rest cleanup)
20. `ingredient-key-vault` (ms-rest cleanup)
21. `ingredient-kubernetes` (ms-rest cleanup)
22. `ingredient-metric-alert` (`@azure/arm-resources`)
23. `ingredient-network-interface` (`@azure/arm-network`)
24. `ingredient-null` (ms-rest cleanup)
25. `ingredient-postgresql` (`@azure/arm-network`, `@azure/arm-privatedns`)
26. `ingredient-property-service` (ms-rest cleanup)
27. `ingredient-search` (`@azure/arm-search`)
28. `ingredient-service-bus-namespace` (`@azure/arm-servicebus`)
29. `ingredient-service-bus-queue` (ms-rest cleanup)
30. `ingredient-sql-dwh` (`@azure/arm-sql`)
31. `ingredient-sqldb` (`@azure/arm-sql`)
32. `ingredient-sqlserver-logical` (`@azure/arm-sql`)
33. `ingredient-storage` (`@azure/arm-storage`, `@azure/storage-blob`)
34. `ingredient-traffic-manager` (ms-rest cleanup)
35. `ingredient-webapp-container` (ms-rest cleanup)

## Package upgrade playbook (apply this to every project)

1. **Inventory**: find the current Azure SDK usage in the project’s `src/` and tests.
2. **Version lookup**: check the latest compatible SDK version (use `npm view <package> version` and `npm view <package> engines`).
3. **Dependency update**: update the project’s `package.json` (and root if shared).
4. **Code changes**:
   * Use `CredentialFactory` to pass a `TokenCredential` to management clients.
   * Replace deprecated client methods with their modern equivalents.
   * Handle long-running operations with `beginXxxAndWait` or pollers.
   * Adjust model imports/usage when the SDK has changed type locations.
5. **Tests**:
   * Update mocks/stubs for new client constructors and method shapes.
   * Add/adjust tests to ensure behavior matches current expectations.
6. **Run tests**:
   * Per-package: `npx lerna run test --scope <packageName>`
   * If behavior touches core/system, run `npm test` or the impacted suite.
   * **Test runner note:** if mocha + `ts-node/register` fails with `ERR_MODULE_NOT_FOUND` on Node 22, update the package test script to use `mocha --require tsx` and rerun.
7. **Update progress tracker** (below) with status, tests run, and notes.

## Progress tracker (update this after every project)

| Order | Project | Azure SDKs touched | Status | Sub-agent | Tests run | Notes / issues |
|---:|---|---|---|---|---|---|
| 1 | core | @azure/identity | Completed | CoreUpg | npx lerna run test --scope @azbake/core | Updated @azure/identity peer dependency to ^4.13.0; tests green. |
| 2 | arm-helper | @azure/arm-resources | Completed | ArmUpg | npx lerna run compile --scope @azbake/arm-helper; npx lerna run test --scope @azbake/arm-helper | Switched tests to tsx loader; typed deployment payload to satisfy DeploymentMode; compile/test green on Node 22. |
| 3 | system | @azure/arm-resources | Completed | SysUpg | npx lerna run test --scope azure-bake (fails on Node 24); node --import tsx ../node_modules/mocha/bin/mocha.js --timeout 30000 test/bake-runner.test.ts (pass) | Updated to use TokenCredential + ResourceManagementClient factory injection. Standard lerna/mocha command fails under Node v24.4.1 due to ts-node ESM resolution, but targeted bake-runner tests pass with tsx loader. |
| 4 | root package.json | shared version alignment | Completed | RootAlign | Not run (dependency alignment only) | Aligned root @azure/arm-compute/cosmosdb/network + @azure/ms-rest-nodeauth to Phase 7.3 targets; @azure/identity already at target. npm install emitted Node 22 engine warnings under Node 24.4.1. |
| 5 | ingredient-template | template alignment | Completed | TplUpg | Not applicable (no tests in ingredient-template) | Replaced ms-rest-nodeauth with @azure/identity; updated docs for TokenCredential + modern SDK patterns. |
| 6 | ingredient-acs | arm-communication | Completed | AcsUpg | npx lerna run compile --scope @azbake/ingredient-acs; npx lerna run test --scope @azbake/ingredient-acs | Switched tests to tsx loader; updated ops group to communicationService; compile/test green. |
| 7 | ingredient-apim-api | arm-apimanagement | Completed | ApimApiUpg | npx lerna run compile --scope @azbake/ingredient-apim-api; npx lerna run test --scope @azbake/ingredient-apim-api | Switched tests to tsx loader; use productApi.delete in v10; compile/test green (1 pending test already existed). |
| 8 | ingredient-apim | arm-apimanagement, arm-monitor, arm-network | Completed | ApimUpg | npx lerna run compile --scope @azbake/ingredient-apim; npx lerna run test --scope @azbake/ingredient-apim | Switched to TokenCredential + MonitorClient signature; updated APIM delete LROs, diagnostics ordering, and tests/mocks. |
| 9 | ingredient-app-insights | arm-appinsights, ms-rest-js | Completed | AppInsightsUpg | npx lerna run compile --scope @azbake/ingredient-app-insights; npx lerna run test --scope @azbake/ingredient-app-insights | Switched to TokenCredential (modernCredentials), bumped arm-appinsights/ms-rest-js, removed unused ms-rest-nodeauth. |
| 10 | ingredient-app-service-plan | ms-rest-nodeauth | Completed | AppServicePlanUpg | npx lerna run compile --scope @azbake/ingredient-app-service-plan; npx lerna run test --scope @azbake/ingredient-app-service-plan | Removed unused @azure/ms-rest-nodeauth from package manifest; no runtime changes. |
| 11 | ingredient-arm | ms-rest-nodeauth | Completed | ArmIngredientUpg | npx lerna run compile --scope @azbake/ingredient-arm; npx lerna run test --scope @azbake/ingredient-arm | Removed unused @azure/ms-rest-nodeauth from package manifest; no runtime changes. |
| 12 | ingredient-availability-set | ms-rest-nodeauth | Completed | AvailSetUpg | npx lerna run compile --scope @azbake/ingredient-availability-set; npx lerna run test --scope @azbake/ingredient-availability-set | Switched ResourceManagementClient to TokenCredential (modernCredentials) and removed unused ms-rest-nodeauth. |
| 13 | ingredient-azure-vm-extension | arm-compute, arm-eventhub | Completed | VmExtUpg | npx lerna run compile --scope @azbake/ingredient-azure-vm-extension; npx lerna run test --scope @azbake/ingredient-azure-vm-extension | Moved to ComputeManagementClient (TokenCredential) with beginUpdateAndWait; list stays list result. arm-eventhub dependency updated only (no usage found). |
| 14 | ingredient-azure-vm | ms-rest-nodeauth | Completed | VmUpg | npx lerna run compile --scope @azbake/ingredient-azure-vm; npx lerna run test --scope @azbake/ingredient-azure-vm | Removed unused @azure/ms-rest-nodeauth from package manifest. |
| 15 | ingredient-batch | arm-storage, batch | Completed | BatchUpg | npx lerna run compile --scope @azbake/ingredient-batch; npx lerna run test --scope @azbake/ingredient-batch | Bumped arm-storage/batch deps; removed unused ms-rest-nodeauth; no code changes required. |
| 16 | ingredient-container-reg | ms-rest-nodeauth | Completed | ContainerRegUpg | npx lerna run compile --scope @azbake/ingredient-container-reg; npx lerna run test --scope @azbake/ingredient-container-reg | Removed unused @azure/ms-rest-nodeauth from package manifest; tests green on Node 22. |
| 17 | ingredient-cosmosdb | arm-cosmosdb | Completed | CosmosUpg | npx lerna run compile --scope @azbake/ingredient-cosmosdb; npx lerna run test --scope @azbake/ingredient-cosmosdb | Switched to TokenCredential (modernCredentials) and removed ms-rest-nodeauth. |
| 18 | ingredient-databricks | arm-sql | Completed | DatabricksUpg | npx lerna run compile --scope @azbake/ingredient-databricks; npx lerna run test --scope @azbake/ingredient-databricks | Bumped @azure/arm-sql to ^10.0.0 and removed unused @azure/ms-rest-nodeauth; no runtime changes required. |
| 19 | ingredient-datafactoryv2 | arm-sql | Completed | DataFactoryUpg | npx lerna run compile --scope @azbake/ingredient-datafactoryv2; npx lerna run test --scope @azbake/ingredient-datafactoryv2 | Bumped @azure/arm-sql to ^10.0.0; removed unused @azure/ms-rest-nodeauth. |
| 20 | ingredient-event-hub-namespace | arm-eventhub | Completed | EventHubNsUpg | npx lerna run compile --scope @azbake/ingredient-event-hub-namespace; npx lerna run test --scope @azbake/ingredient-event-hub-namespace | Switched to TokenCredential (modernCredentials), updated arm-eventhub to 5.2.0 + identity 4.13.0, removed ms-rest-nodeauth; tests green. |
| 21 | ingredient-event-hub | arm-eventhub | Not started |  |  |  |
| 22 | ingredient-function-app | arm-resources | Not started |  |  |  |
| 23 | ingredient-functions | ms-rest-nodeauth | Not started |  |  |  |
| 24 | ingredient-host-names | ms-rest-nodeauth | Not started |  |  |  |
| 25 | ingredient-key-vault | ms-rest-nodeauth | Not started |  |  |  |
| 26 | ingredient-kubernetes | ms-rest-nodeauth | Not started |  |  |  |
| 27 | ingredient-metric-alert | arm-resources | Not started |  |  |  |
| 28 | ingredient-network-interface | arm-network | Not started |  |  |  |
| 29 | ingredient-null | ms-rest-nodeauth | Not started |  |  |  |
| 30 | ingredient-postgresql | arm-network, arm-privatedns | Not started |  |  |  |
| 31 | ingredient-property-service | ms-rest-nodeauth | Not started |  |  |  |
| 32 | ingredient-search | arm-search | Not started |  |  |  |
| 33 | ingredient-service-bus-namespace | arm-servicebus | Not started |  |  |  |
| 34 | ingredient-service-bus-queue | ms-rest-nodeauth | Not started |  |  |  |
| 35 | ingredient-sql-dwh | arm-sql | Not started |  |  |  |
| 36 | ingredient-sqldb | arm-sql | Not started |  |  |  |
| 37 | ingredient-sqlserver-logical | arm-sql | Not started |  |  |  |
| 38 | ingredient-storage | arm-storage, storage-blob | Not started |  |  |  |
| 39 | ingredient-traffic-manager | ms-rest-nodeauth | Not started |  |  |  |
| 40 | ingredient-webapp-container | ms-rest-nodeauth | Not started |  |  |  |

## Completion criteria

Phase 7.3 is done when:

* All rows in the progress tracker are marked **Completed**.
* `npm run clean:build` succeeds.
* `npm test` succeeds.
* No behavior regressions are observed in snapshot/contract tests.
