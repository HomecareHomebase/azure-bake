# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.40](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.39...v0.1.40) (2019-04-08)


### Bug Fixes

* fixing await in wrong place for  ingredients ([b3736e4](https://github.com/HomecareHomebase/azure-bake/commit/b3736e4))





## [0.1.39](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.38...v0.1.39) (2019-04-08)


### Bug Fixes

* storage-util primary/secondary keys now work ([703a346](https://github.com/HomecareHomebase/azure-bake/commit/703a346))





## [0.1.38](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.37...v0.1.38) (2019-04-08)


### Bug Fixes

* fixing arm-helper dist path ([e3435b4](https://github.com/HomecareHomebase/azure-bake/commit/e3435b4))





## [0.1.37](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.36...v0.1.37) (2019-04-08)

**Note:** Version bump only for package root





## [0.1.36](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.34...v0.1.36) (2019-04-04)

**Note:** Version bump only for package root





## [0.1.34](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.33...v0.1.34) (2019-04-04)

**Note:** Version bump only for package root





## [0.1.33](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.32...v0.1.33) (2019-04-04)


### Bug Fixes

* resolving mismatched peerDeps ([eca4e13](https://github.com/HomecareHomebase/azure-bake/commit/eca4e13))





## [0.1.32](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.31...v0.1.32) (2019-04-02)


### Bug Fixes

* Add Acr And Storage Ingredient ([#35](https://github.com/HomecareHomebase/azure-bake/issues/35)) ([a3d49e8](https://github.com/HomecareHomebase/azure-bake/commit/a3d49e8))
* Feature/custom tags ([#36](https://github.com/HomecareHomebase/azure-bake/issues/36)) ([94beec0](https://github.com/HomecareHomebase/azure-bake/commit/94beec0))
* tag for splunk metrics ingestion ([#38](https://github.com/HomecareHomebase/azure-bake/issues/38)) ([5d2a8a9](https://github.com/HomecareHomebase/azure-bake/commit/5d2a8a9))





## [0.1.31](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.30...v0.1.31) (2019-03-26)

**Note:** Version bump only for package root






## [0.1.30](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.29...v0.1.30) (2019-03-20)


### Bug Fixes

* Ingredient build fix ([#33](https://github.com/HomecareHomebase/azure-bake/issues/33)) ([28cde6f](https://github.com/HomecareHomebase/azure-bake/commit/28cde6f))





## [0.1.29](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.28...v0.1.29) (2019-03-19)


### Bug Fixes

* fixing the global tool version for the env ([#32](https://github.com/HomecareHomebase/azure-bake/issues/32)) ([15dab51](https://github.com/HomecareHomebase/azure-bake/commit/15dab51))





## [0.1.28](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.27...v0.1.28) (2019-03-19)


### Bug Fixes

* Moved Tag generator into core so it can be used everywhere in the ecosystem ([#31](https://github.com/HomecareHomebase/azure-bake/issues/31)) ([1dcef96](https://github.com/HomecareHomebase/azure-bake/commit/1dcef96))





## [0.1.27](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.26...v0.1.27) (2019-03-18)


### Bug Fixes

* fixing format for ARM tag injection ([c6fbceb](https://github.com/HomecareHomebase/azure-bake/commit/c6fbceb))





## [0.1.26](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.25...v0.1.26) (2019-03-18)


### Bug Fixes

* Adding ARM deployment based auto-injected tags ([a7808bf](https://github.com/HomecareHomebase/azure-bake/commit/a7808bf))






## [0.1.25](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.24...v0.1.25) (2019-03-07)


### Bug Fixes

* new app insights ingredient ([#26](https://github.com/HomecareHomebase/azure-bake/issues/26)) ([094441a](https://github.com/HomecareHomebase/azure-bake/commit/094441a))





## [0.1.24](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.23...v0.1.24) (2019-02-15)


### Bug Fixes

* Ingredient-Script had typescript removed from packages ([274d965](https://github.com/HomecareHomebase/azure-bake/commit/274d965))





## [0.1.23](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.22...v0.1.23) (2019-02-15)

**Note:** Version bump only for package root





## [0.1.22](https://github.com/HomecareHomebase/azure-bake/compare/v0.1.5...v0.1.22) (2019-02-15)


### Bug Fixes

* Added util to lookup current ingredient source value ([b3f2ba0](https://github.com/HomecareHomebase/azure-bake/commit/b3f2ba0))
* **system:** Fixed [#12](https://github.com/HomecareHomebase/azure-bake/issues/12) - bake.yaml with no variables defined was failing ([500b5a7](https://github.com/HomecareHomebase/azure-bake/commit/500b5a7))
* Adds 3 ingredients for web apps (webapp, traffic manager, custom hostnames with ssl), teaches core-utils how to recognize a primary region, and cleans up boilerplate code for deploying arm templates through ingredients into a helper package. ([0304458](https://github.com/HomecareHomebase/azure-bake/commit/0304458))
* fixes truncation of environment file ([#17](https://github.com/HomecareHomebase/azure-bake/issues/17)) ([fea40e6](https://github.com/HomecareHomebase/azure-bake/commit/fea40e6))
* fixing lerna public publish ([341ca98](https://github.com/HomecareHomebase/azure-bake/commit/341ca98))
* Fixing lerna setup for proper mono-repo build/clean/bootstrap ([d8e0977](https://github.com/HomecareHomebase/azure-bake/commit/d8e0977))
* fixing peerDep for core module ([a2cea1c](https://github.com/HomecareHomebase/azure-bake/commit/a2cea1c))
* refactored template to source/BakeVariable ([9d9b405](https://github.com/HomecareHomebase/azure-bake/commit/9d9b405))






## [0.1.21](https://github.com/csperbeck/azure-bake/compare/v0.1.5...v0.1.21) (2019-02-15)


### Bug Fixes

* Added util to lookup current ingredient source value ([b3f2ba0](https://github.com/csperbeck/azure-bake/commit/b3f2ba0))
* **system:** Fixed [#12](https://github.com/csperbeck/azure-bake/issues/12) - bake.yaml with no variables defined was failing ([500b5a7](https://github.com/csperbeck/azure-bake/commit/500b5a7))
* Adds 3 ingredients for web apps (webapp, traffic manager, custom hostnames with ssl), teaches core-utils how to recognize a primary region, and cleans up boilerplate code for deploying arm templates through ingredients into a helper package. ([0304458](https://github.com/csperbeck/azure-bake/commit/0304458))
* fixes truncation of environment file ([#17](https://github.com/csperbeck/azure-bake/issues/17)) ([fea40e6](https://github.com/csperbeck/azure-bake/commit/fea40e6))
* fixing lerna public publish ([341ca98](https://github.com/csperbeck/azure-bake/commit/341ca98))
* fixing peerDep for core module ([a2cea1c](https://github.com/csperbeck/azure-bake/commit/a2cea1c))
* refactored template to source/BakeVariable ([9d9b405](https://github.com/csperbeck/azure-bake/commit/9d9b405))
