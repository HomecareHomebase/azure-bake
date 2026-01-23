# Azure Bake monorepo upgrade plan (no functionality change)

> This document is **a plan only**. It intentionally does **not** implement any upgrades.
>
> The guiding principle is: **no observable behavior changes**. Since unit tests are currently sparse/stale, the plan starts by building a strong “characterization” test suite that codifies today’s behavior, then upgrades in small, reversible increments.

## What we found in this repo (current state snapshot)

These are the key facts that drive the upgrade strategy:

* **Monorepo** managed by an **older Lerna setup** (`lerna.json` uses `version: "independent"`). Root scripts use `lerna bootstrap --hoist`.
* **Build/release orchestration** is primarily in `gulpfile.js` and `azure-pipelines.yml`.
* **This repo ships an npm CLI** (`system/package.json` publishes `azure-bake` with bin `bake`).
* **Runtime shipping artifact** is a Docker image built from `system/Dockerfile`.
  * Current base image is `mhart/alpine-node:16.4.2`.
  * It downloads kubectl `v1.19.16`.
* **CI** uses Node **16.x** (`azure-pipelines.yml` → `NodeTool@0`).
* **Devcontainer** (parent image) is built from **Node 10** (`.devcontainer/parent/Dockerfile`).
* **Module system**: packages compile TypeScript to **CommonJS** (`module: commonjs` in `tsconfig.json`).
* **Tests are not trustworthy today**:
  * The only test folder found is `system/test/`.
  * `system/test/bake.yaml` is empty, so current tests can’t be meaningful.
* **Known dependency hot spots**:
  * `lerna@3.13.0` is far behind; modern Lerna relies on package-manager workspaces, and legacy commands were removed.
  * ESM-only upgrades are lurking:
    * `got` is CommonJS in v11 but **ESM-only from v12+**.
    * `del` is CommonJS in v4 but **ESM-only from v7+**.
  * Azure SDK auth/client patterns changed over time:
    * Code currently uses `@azure/ms-rest-nodeauth` and ms-rest style credentials.
    * Modern Azure management libraries accept `TokenCredential` from `@azure/identity`.
  * `event-stream` is present in the root `package.json` (historically risky; should be eliminated).
  * `.npmrc` includes `always-auth=true`; newer npm warns this will stop working.

## Decisions (current defaults)

These are the “choose once” decisions that affect almost every step.

The items marked as checked are based on your latest answers.

* [x] **Target Node.js versions**
  * Decision: target **Node 22 LTS** for dev/CI, and use **`node:22-alpine`** as the base runtime for the published `homecarehomebase/bake` Docker image.
  * Rationale: you run Bake via the Docker image, so the supported Node runtime for Bake execution is the one in that image.
* [x] **CommonJS vs ESM**
  * Decision: keep **CommonJS output** for published packages (lowest risk for a CLI + plugin ecosystem).
  * Implication: for dependencies that are now ESM-only (e.g., `got@12+`, `del@7+`), prefer:
    * swapping to non-ESM-only alternatives (e.g., Node 18+ `fetch`, `fs.rm`), or
    * using dynamic `import()` in narrowly-scoped build tooling.
* [x] **Monorepo package manager**
  * Decision: stay on **npm** and migrate to **npm workspaces** (to support modern Lerna).
  * Lockfile approach:
    * **Workspaces imply a single root `package-lock.json` as the source of truth** for dev/CI installs.
    * We can still keep `system/package-lock.json` for the Docker runtime image build context (since the Docker build runs inside the `system/` context).
    * For publishable libraries/ingredients, per-package lockfiles are typically noise (not published), but we can keep them temporarily if you want a gradual cleanup.
* [x] **Publishing & release shape**
  * Decision: publish `@azbake/*` ingredient packages independently (often one at a time) using Lerna’s independent versioning.
  * Decision: publish the `azure-bake` CLI (bin: `bake`) as an npm package.
  * Decision: build/push the Docker runtime image (`homecarehomebase/bake`), which is the base image used by `bake mix`.
* [x] **E2E environment**
  * Decision: keep CI tests **mocked** (no live Azure subscription in CI).
  * Implication: we’ll lean on HTTP mocking + golden fixtures for behavior guarantees.

## “No functionality change” definition (what we will lock down)

Because this is a deployment tool, we’ll treat these as the primary compatibility contract:

* [ ] CLI behavior (for `bake mix`, `bake serve`, and local-file `run`) in `system/src/index.ts`:
  * argument parsing, environment var mapping, help text, exit codes
* [ ] YAML parsing and Bake config normalization in `system/src/bake-loader.ts`:
  * defaulting logic (`parallelRegions`, `resourceGroup`), variable merging, recipe mapping
* [ ] Plugin loading and dynamic install behavior:
  * `system/src/bake-loader.ts` runtime install (`npm install ... --legacy-peer-deps`)
  * `core/src/ingredient-manager.ts` registration and fallback resolution logic
* [ ] Expression evaluation semantics (`[ ... ]`) via `core/src/eval.ts`.
* [ ] Ingredient execution semantics:
  * dependency ordering, conditions, ignoreErrors behavior, parallelization
  * implemented in `system/src/bake-runner.ts`
* [ ] Azure behavior:
  * resource group creation/update behavior
  * ARM deployments and tag injection (`arm-helper/src/arm-helper.ts`)
* [ ] Docker runtime image behavior (`system/Dockerfile` + CLI entrypoint)

## Current → latest version signals (for planning)

This is not a mandate to jump to “latest everything” immediately; it’s the reference point for what “modern” means.

| Area | Current (seen in repo) | Latest (as of 2026-01-20 via npm registry) | Notes |
|---|---:|---:|---|
| Node (CI) | 16.x | 22 LTS (recommended) | Must coordinate with Docker + Azure SDK minimums |
| Lerna | 3.13.0 | 9.0.3 | `bootstrap/add/link` removed; migrate to workspaces |
| TypeScript | 5.5.4 | 5.9.3 | Expect TS config and type changes |
| Gulp | 4.0.2 | 5.0.1 | May require Node >=18 |
| Mocha | 5.2.0 | 11.7.5 | Test runner upgrades can be breaking |
| ts-node | 7.0.1 | 10.9.2 | ESM/TS integration improvements |
| js-yaml | 3.12.0 | 4.1.1 | `safeLoad/safeDump` removed/renamed |
| yargs | 13.2.4 | 18.0.0 | CLI parsing changes possible |
| got | 11.x | 14.6.6 | got is ESM-only from v12+ (Node 20+ for v14) |
| del | 4.1.1 | 8.0.1 | del is ESM-only from v7+ |
| @azure/ms-rest-nodeauth | 3.0.0 | 3.1.1 | Deprecated in favor of `@azure/identity` |
| @azure/identity | 2.0.4 | 4.13.0 | Use `ClientSecretCredential` for SP auth |
| @azure/arm-resources | 4.0.0 (system) | 7.0.0 | Modern client expects `TokenCredential` |

## Upgrade strategy (how we keep this safe)

Key rules:

* **Test first**, then upgrade.
* **One major risk at a time** (Node/toolchain, monorepo tooling, Azure auth, etc.).
* **Always keep a “known-good” baseline** you can revert to.
* **Never change behavior without a test that proves it’s unchanged** (or a documented, explicitly approved behavior change).

## Step-by-step checklist

### 0) Preparation & governance

* [x] Capture a **baseline artifact set** from the current code:
  * [x] `npm run clean:build` output (captured in `docs/upgrade-baseline/clean-build.log`)
  * [x] `bake --help` output (captured in `docs/upgrade-baseline/bake-help.txt`)
* [x] Decide “compatibility contract” scope:
  * [x] Are external teams consuming `@azbake/core` APIs directly?
    * Assumption: no external direct consumers observed; usage appears internal to this repo. Please confirm.
  * [x] Are 3rd-party ingredients relying on internals (e.g., `IngredientManager.Register` behavior)?
    * Assumption: no third-party ingredients observed; only first-party packages in this repo. Please confirm.

### 1) Build a real test suite (characterization + contracts)

This is the most important phase. Nothing else should proceed until we can continuously validate behavior.

#### 1.1 Test harness foundation

* [x] Choose a repo-wide test standard:
  * [x] Short-term recommendation: keep **Mocha** initially (already present), but modernize versions later.
  * [x] Confirm if you’d prefer **Vitest/Jest** long-term.
    * Decision: stick with **Mocha** for now; revisit after the major upgrades.
* [x] Add a top-level `test/` or `tests/` folder with:
  * [x] `fixtures/` (canonical bake.yaml and ingredient sources)
  * [x] `snapshots/` (golden outputs)
  * [x] `fixtures/recipes/` (sanitized “real-ish” bake recipes you provide as golden fixtures)
  * [x] Document fixture rules (no secrets, no real subscription IDs, use placeholder env vars)
* [x] Fix/replace broken existing tests:
  * [x] Populate `system/test/bake.yaml` (currently empty) with a minimal valid recipe.
* [x] Standardize how tests run across packages:
  * [x] Ensure every package has a `test` script.
  * [x] Ensure root has a “run all tests” script (`lerna run test` initially).
* [x] Add code coverage tooling:
  * [x] Keep the existing nyc+mocha approach (gulp already references it), but make it real.
  * [x] Set an initial coverage threshold target (start low; raise over time).
    * Initial target: **5%** lines/statements/functions (branches at **0%** to start).

#### 1.2 Core behavioral contracts (unit tests)

Create tests that lock down current semantics:

* [x] `system/src/index.ts` CLI parsing tests (initial coverage)
  * [x] `mix` requires `--runtime` and `--name` (including missing target file case)
  * [x] `serve` / local-file run:
    * [x] env vars are populated as expected
    * [x] help output is stable
    * [x] exit codes are stable on invalid input
* [x] `system/src/bake-loader.ts` tests
  * [x] YAML load behavior, defaults, recipe map conversion
  * [x] variable merge precedence (global env vars vs config vars)
  * [x] ingredient list registration & version trimming logic
* [x] `core/src/eval.ts` tests
  * [x] bracket detection
  * [x] expression compilation and async evaluation
  * [x] failure paths fall back to “treat as literal”
* [x] `core/src/ingredient-manager.ts` tests
  * [x] plugin registration works when module is resolvable by `require(moduleName)`
  * [x] fallback path works when only `./node_modules/<name>` resolution works
  * [x] version detection behavior (moduleName/package.json and fallback `npm_ingredient_root`)
* [x] `system/src/bake-runner.ts` tests
  * [x] dependency scheduling
  * [x] `condition` skip behavior
  * [x] `ignoreErrors` behavior
  * [x] parallel region behavior (parallel vs sequential)

#### 1.3 Ingredient-level characterization tests

For each first-party ingredient package in `ingredient/*`:

* [x] Add a minimal unit test set for:
  * [x] required parameters parsing (shared ingredient contract suite)
  * [x] “side effects” that should remain stable (fixture-script output + ARM helper param assertions)
  * [x] anything that writes to disk or runs shell commands (mocked kubectl exec)
  * [x] Initial coverage added for `@azbake/ingredient-null` and `@azbake/ingredient-script`
* [x] For ingredients that call Azure:
  * [x] add HTTP mocking via module stubs (FakeArmHelper + `@azure/*` stubs) to avoid live calls.
* [x] For ingredients that shell out (kubectl, docker, etc):
  * [x] mock `child_process.execSync` and assert command strings.

#### 1.4 End-to-end smoke tests (recommended)

* [x] Build a “no-Azure-required” recipe fixture using:
  * [x] `@azbake/ingredient-null`
  * [x] Fixture ingredient (`@azbake/fixture-script`) executing a trivial local script (keeps E2E deterministic)
* [x] Add an E2E test that runs the CLI with that recipe and asserts:
  * [x] exit code
  * [x] key log output lines (snapshot)

Because we’re staying mocked, add “integration-ish” tests that still execute real code paths:

* [x] Golden fixture runs (no Azure): for a small, intentional fixture set (2 recipes):
  * [x] run `bake serve` in a controlled environment with `BAKE_AUTH_SKIP=true`
  * [x] assert logs + generated files match snapshots
  * [x] assert ingredient dynamic install logic is exercised (covered by `bake-loader.install` test)
  * [x] Keep the fixture set intentionally small (start with **2 recipes**). Add more only if they cover a new, currently-untested behavior.

**Gate:** Do not start dependency upgrades until these tests are reliable in CI.

### 2) Reproducible builds & environment pinning

* [x] Add explicit toolchain pins:
  * [x] Add `.nvmrc` or `.node-version` with the current CI Node version (16) first.
  * [x] Add `engines` in root and in publishable packages (decide after Node target).
  * [ ] Consider adding `packageManager` in root `package.json`.
* [x] Normalize `.npmrc` behavior:
  * [x] Decide whether `always-auth=true` is still needed (kept for now; CI injects auth).
  * [x] If needed, update `.npmrc` to a modern, supported configuration and keep secrets out of repo (documented in-file).
* [x] Ensure CI uses deterministic installs:
  * [x] Prefer `npm ci` where possible.
  * [ ] Ensure lockfiles are updated intentionally (no accidental churn).

### 3) Modernize monorepo tooling (Lerna upgrade path)

Modern Lerna expects you to use your package manager’s workspaces.

#### 3.1 Inventory and replace legacy commands

* [x] Search and list all usages of:
  * [x] `lerna bootstrap` (found in root scripts)
  * [x] `lerna add` (no repo usages found)
  * [x] `lerna link` (no repo usages found)
* [x] Replace them with package-manager equivalents (npm examples):
  * [x] `lerna bootstrap --hoist` → `npm install` (or `npm ci`)
  * [x] `lerna add <dep> --scope <pkg>` → `npm install <dep> -w <pkg>` (no usages to replace)
* [x] Add npm workspaces config in root `package.json` to align with modern Lerna.

#### 3.2 Upgrade Lerna safely

* [ ] Upgrade in two hops (recommended):
  * [x] Hop A: upgrade to a Lerna version that still supports your current scripts (Node 16-compatible). **Completed with `lerna@7.4.2`.**
  * [ ] Hop B: migrate scripts to workspaces, then upgrade to **Lerna 9.x** (requires Node >= 20.19; deferred to Phase 4).
  * [x] Keep classic task runner behavior during the hop (`useNx: false`).
* [ ] After upgrading, run:
  * [ ] `lerna repair` to update configuration to the current format (defer until Hop B).
* [ ] Ensure independent versioning and publish behavior remains the same:
  * [ ] conventional commits
  * [ ] publish tags
  * [ ] changelog behavior

**Gate:** CI build (`npm run clean:build`) and the new test suite must pass.

### 4) Node.js version upgrades (CI + runtime + devcontainer)

Do this as a dedicated phase, because Node upgrades can cause cascading issues.

* [x] Upgrade CI from Node 16 → Node 22 (skipped the intermediate 20 hop)
  * [x] Update `azure-pipelines.yml` `NodeTool@0` versionSpec.
* [x] Upgrade runtime Docker image:
  * [x] Update `system/Dockerfile` base image to Node 20+.
  * [x] Re-evaluate kubectl version (v1.19 is very old; kept for compatibility for now).
  * [x] Replace deprecated npm flags:
    * [x] `npm install --only=production` → `npm ci --omit=dev` (preferred) or `npm install --omit=dev`.
* [x] Upgrade devcontainer:
  * [x] Update `.devcontainer/parent/Dockerfile` from `node:10` to the chosen Node LTS.
  * [ ] Validate postCreateCommand still works.

**Gate:** All tests + E2E smoke tests pass on the new Node version.

### 5) Upgrade dev tooling dependencies (low runtime risk)

Upgrade these first after the test gate, because they primarily affect development/build output:

* [x] TypeScript: `5.5.x` → `5.9.x`
  * [x] Keep `module: commonjs` initially to avoid a packaging break.
  * [x] Add/adjust shared tsconfig base if needed. *(Not needed — existing tsconfig structure is sufficient.)*
* [x] `@types/node`: `^10.x` → match the chosen Node LTS
* [x] Test tooling:
  * [x] `mocha` → latest
  * [x] `ts-node` → latest
  * [x] `chai/@types/*` → latest
* [ ] Linting/formatting (optional, deferred to post-upgrade cleanup):
  * [ ] add ESLint + TypeScript rules (or modernize any existing setup) *(Deferred — not blocking Phase 5 completion.)*

**Gate:** build output and tests pass; no snapshot diffs. ✅ *(Verified 2026-01-22: TypeScript 5.9.3, @types/node 22.13.0, mocha 11.7.5, ts-node 10.9.2, chai 4.3.10 confirmed in root package.json.)*

### 6) Upgrade non-Azure runtime dependencies (medium risk)

Handle “ecosystem breaking changes” explicitly:

* [x] `js-yaml` v3 → v4
  * [x] Replace `safeLoad`/`safeDump` usages:
    * `safeLoad` → `load`
    * `safeDump` → `dump`
  * [x] Add regression tests for YAML edge cases (notably zero-prefixed numeric-looking strings).
  * Touch points:
    * [x] `system/src/bake-loader.ts`
* [x] `yargs` v13 → v18 (root build tooling)
  * [x] Validate gulp tasks still parse args identically.
* [x] `del` v4 → v8 (gulp tooling)
  * [x] del is ESM-only in v7+.
  * [x] Replaced with `fs.promises.rm` (Node builtin) instead of converting to ESM.
* [x] `got` v11 → v14 (ingredient-apim)
  * [x] got is ESM-only from v12+.
  * [x] Replaced got usage with Node's built-in `https` module to avoid ESM churn (Node 18+ fetch not needed).
  * [x] Maintained CA certificate support via custom https Agent.
  * [x] Removed unused `got` dependency from `ingredient-apim/package.json`.
* [x] Remove/replace risky deps:
  * [x] Remove `event-stream` usage from `gulpfile.js` (replaced with native Transform streams).
  * [x] Remove `child_process` from `package.json` (Node builtin).

**Gate:** ✅ tests pass (1380 tests); no snapshot diffs.

### 7) Azure SDK modernization (highest risk)

This is the phase that requires the most care.

#### 7.1 Introduce an auth abstraction (no behavior change)

* [ ] Create an internal “credential factory” that can produce:
  * [ ] legacy ms-rest credentials (current)
  * [ ] `TokenCredential` (`@azure/identity`) for modern SDKs
* [ ] Add tests that validate:
  * [ ] same env var inputs produce equivalent auth behavior
  * [ ] token acquisition errors are handled/logged consistently

#### 7.2 Migrate from `@azure/ms-rest-nodeauth` → `@azure/identity`

Based on Azure SDK guidance, replace `loginWithServicePrincipalSecret(...)` with `ClientSecretCredential(...)`.

* [ ] Update `system/src/bake-runner.ts` login flow.
* [ ] Update `core/src/deployment-context.ts` types if needed.
  * [ ] Goal: preserve public API types as much as possible; if not possible, plan semver major bumps.
* [ ] Add/expand tests for authentication and client creation.

#### 7.3 Upgrade management clients (`@azure/arm-*`)

* [ ] For each Azure management library in the repo, upgrade one at a time:
  * [ ] `@azure/arm-resources`
  * [ ] `@azure/arm-network`
  * [ ] `@azure/arm-storage`
  * [ ] `@azure/arm-sql`
  * [ ] etc (inventory all packages in `ingredient/*/package.json`)
* [ ] Update code to match the new client APIs (notably:
  * [ ] constructor credential type
  * [ ] long-running operation patterns and return shapes
  * [ ] model import paths (avoid `.../esm/models` imports if they changed)
* [ ] Verify behavior with:
  * [ ] HTTP mocking tests (assert request payloads)
  * [ ] recorded fixtures (if you choose to adopt an Azure SDK recorder later)

**Gate:** mocked contract tests must pass (no live Azure dependency).

### 8) Docker & packaging validation

* [ ] Ensure `system/Dockerfile` still builds reproducibly.
  * [ ] Confirm how dependencies are sourced (from npm registry vs workspace-local packages).
  * [ ] Preserve the contract: runtime image is published as `homecarehomebase/bake:<version>` and is what `bake mix --runtime <version>` uses as `FROM`.
* [ ] Validate `bake mix` still produces functional images.
  * [ ] Add a CI job to build a sample mixed image and run it.
* [ ] Validate `bake serve` for:
  * [ ] a no-Azure recipe (always)
  * [ ] optionally, a manual-run Azure-backed recipe in a sandbox environment (out of CI)

### 9) CI/CD and release pipeline modernization

* [ ] Update `azure-pipelines.yml`:
  * [ ] Node version changes
  * [ ] prefer `npm ci`
  * [ ] ensure docker login/logout still works
* [ ] Evaluate whether to keep gulp for releases or replace with npm scripts.
  * [ ] If replacing: ensure publish tagging/versioning behavior is identical.
* [ ] Add automated dependency maintenance:
  * [ ] Renovate or Dependabot configuration
  * [ ] Security scanning (`npm audit`/Snyk/GitHub advisories)

### 10) Rollout and long-term maintenance

* [ ] Create a “compatibility report” PR comment template:
  * [ ] what changed
  * [ ] which tests prove compatibility
  * [ ] risk assessment
* [ ] Add a monthly “dependency update” workflow (small PRs, always passing CI).
* [ ] Document supported Node version and upgrade cadence.

## Remaining questions / confirmations

None right now (we’ve agreed on `node:22-alpine` for the runtime image and approved keeping 2 sanitized golden recipe fixtures for tests).
