# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.21](https://github.com/csperbeck/azure-bake/compare/v0.1.5...v0.1.21) (2019-02-15)


### Bug Fixes

* Added util to lookup current ingredient source value ([b3f2ba0](https://github.com/csperbeck/azure-bake/commit/b3f2ba0))
* **system:** Fixed [#12](https://github.com/csperbeck/azure-bake/issues/12) - bake.yaml with no variables defined was failing ([500b5a7](https://github.com/csperbeck/azure-bake/commit/500b5a7))
* Adds 3 ingredients for web apps (webapp, traffic manager, custom hostnames with ssl), teaches core-utils how to recognize a primary region, and cleans up boilerplate code for deploying arm templates through ingredients into a helper package. ([0304458](https://github.com/csperbeck/azure-bake/commit/0304458))
* fixes truncation of environment file ([#17](https://github.com/csperbeck/azure-bake/issues/17)) ([fea40e6](https://github.com/csperbeck/azure-bake/commit/fea40e6))
* fixing lerna public publish ([341ca98](https://github.com/csperbeck/azure-bake/commit/341ca98))
* fixing peerDep for core module ([a2cea1c](https://github.com/csperbeck/azure-bake/commit/a2cea1c))
* refactored template to source/BakeVariable ([9d9b405](https://github.com/csperbeck/azure-bake/commit/9d9b405))
