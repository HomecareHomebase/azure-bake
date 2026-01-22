# AGENTS.md

This repository is **Azure Bake**: a TypeScript/Node.js monorepo for building and running the **Bake** CLI/runtime plus a large set of **ingredients** (plugins) used to deploy Azure infrastructure/software from YAML “recipes”.

## Project overview

### What lives where

- `system/` — the Bake CLI/runtime (`bake`), Docker runtime image build, and runtime helpers.
- `core/` — core library APIs used by ingredients and the system.
- `arm-helper/` — helper utilities for ARM template deployments.
- `ingredient/*/` — ingredient packages (plugins) that implement deployment behavior.
- `tests/` — repo-level tests (e.g., ingredient contract tests).

### Key technologies

- TypeScript (compiled to `dist/`)
- Node.js + npm
- Lerna (monorepo bootstrap + running scripts across packages)
- Mocha + ts-node for tests
- NYC for coverage
- Docker / docker-compose (primarily for building/running the Bake runtime image)

## Setup commands

### Prerequisites

- Node.js + npm (use a current LTS if possible)
- Docker Desktop (only required for image builds / runtime packaging)

### Install dependencies (monorepo)

Run from repository root:

```bash
npm ci
```

If you don’t have a lockfile-friendly environment, `npm install` is acceptable.

### Build (compile all packages)

From repository root:

```bash
npm run build
```

If you’re seeing stale/hoisted dependency issues, use the clean build:

```bash
npm run clean:build
```

### (Optional) Link ingredients into the runtime

Some workflows expect ingredients to be linked/registered with the runtime:

```bash
npm run load:ingredients
```

## Development workflow

### Compile/watch a single package

Most packages support:

```bash
npm run compile
npm run watch
```

Run those from within the package directory (e.g., `core/`, `system/`, an `ingredient/*/` folder).

### Run the Bake CLI locally

After building, run the runtime from `system/`:

```bash
node system/dist/index.js --help
```

(Or use `npm start` from `system/` if preferred.)

### Docker-based runtime builds

The runtime package includes Docker scripts in `system/`.

- Dev-oriented build/watch (also builds docker-compose services):

```bash
npm --prefix system run debug-build
```

- Release image build:

```bash
npm --prefix system run release-build
```

## Testing instructions

### Mocking (important)

- Tests are written in TypeScript and generally use **Chai** (`expect`) for assertions and **Sinon** for mocking (stubs/spies) via a `sinon.createSandbox()` in `beforeEach()` with `sandbox.restore()` in `afterEach()`.
- When adding tests, prefer sandboxed stubs/spies and always restore them to avoid cross-test pollution.
- Unit tests should not make live Azure/network calls—mock Azure SDK clients/auth flows and feed fake `DeploymentContext`/environment objects as needed.

### Run all tests (recommended)

From repository root:

```bash
npm test
```

This uses Lerna to run each package’s `test` script.

### Run tests for one package

Examples (scope names come from each package’s `package.json`):

```bash
npx lerna run test --scope @azbake/core
npx lerna run test --scope azure-bake
```

### Repo-level tests and test layout

- Per-package unit tests are typically in `<package>/test/**/*.ts`.
- Cross-cutting tests live under `tests/**/*.test.ts`.

Mocha is configured via `test/mocha.opts` (and typically runs through `ts-node`).

### Coverage

From repository root:

```bash
npx nyc mocha --opts test/mocha.opts
```

Outputs:

- `coverage/` (HTML + `lcov.info`)

Coverage thresholds are configured in `.nycrc.json`.

## Code style and conventions

- TypeScript source lives in `src/`; compiled output goes to `dist/`.
- Prefer small, testable changes and update/add tests when behavior changes.
- Most packages are CommonJS (`"module": "commonjs"`) with Node-style resolution.

## Build & deployment notes

- CI/CD is configured for Azure DevOps via `azure-pipelines.yml`.
- The repository is managed as a Lerna monorepo (`lerna.json`).
- Publishing is orchestrated via the root script:

```bash
npm run publish
```

(Agents should not publish unless explicitly instructed.)

## Environment & secrets (local)

The Bake runtime uses environment variables for Azure authentication and environment selection.

- Use `.env.example` as the starting point for local runs.
- **Do not commit secrets.** Prefer injecting env vars via your shell/CI secret store.

Common variables used by the runtime (non-exhaustive):

- `BAKE_AUTH_SUBSCRIPTION_ID`
- `BAKE_AUTH_SERVICE_ID`
- `BAKE_AUTH_SERVICE_KEY`
- `BAKE_AUTH_TENANT_ID`
- `BAKE_ENV_NAME`, `BAKE_ENV_CODE`, `BAKE_ENV_REGIONS`
- `BAKE_VARIABLES`, `BAKE_LOG_LEVEL`

## Troubleshooting

- **Build fails with missing/incorrect dependencies**: run `npm run clean:build` to wipe package `node_modules` and re-bootstrap/hoist.
- **Mocha TS failures**: confirm tests are running with `ts-node` (see `test/mocha.opts`).
- **Docker errors**: verify Docker Desktop is running and `docker-compose` is available.
