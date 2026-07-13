// Aggregating entry point for the CP04 test matrix. Requires each test module (which
// registers cases with the shared harness) then runs them all, exiting non-zero on any
// failure. Invoked after the baseline check by the `npm test` script so the full suite
// runs deterministically with Node built-ins and no external dependencies.

const { runAll } = require("./lib/harness")

require("./plugin.test")
require("./route-default.test")
require("./route-network.test")
require("./route-datalake.test")

runAll()
