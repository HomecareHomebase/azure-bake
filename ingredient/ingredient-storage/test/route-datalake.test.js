// T011 - Datalake-route component tests (storageDatalake.json).
//
// Exercises the omitted/false/true matrix under the IsHnsEnabled route: the presence of
// an IsHnsEnabled param steers the plugin to storageDatalake.json. Asserts property
// absence/value per row, exception-tag stamping only on the true path, Metrics preserved,
// and omitted-path equivalence to the CP01 datalake.omitted.json baseline. Node built-ins
// only.
//
// Scenario coverage: S8.

const { test, assert } = require("./lib/harness")
const { buildRouteCase } = require("./lib/route-case")

const TEMPLATE = "storageDatalake.json"
const BASELINE = "datalake"
const ROUTE_PARAMS = { IsHnsEnabled: { value: true } }

// S8 - omitted: property absent, matches baseline, no exception tag, Metrics preserved.
test("T011 S8 datalake route omitted: property absent, matches baseline, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, BASELINE, ROUTE_PARAMS, "omitted")

    assert.strictEqual(c.hasAllowBlobKey, false, "omitted param must not be forwarded")
    assert.strictEqual(c.forwardsProperty, false, "omitted-path resource must not emit allowBlobPublicAccess")
    assert.strictEqual(c.exceptionTag, undefined, "omitted path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
    assert.deepStrictEqual(c.resource, c.baselineResource, "omitted resource must equal the CP01 baseline")
})

// S8 - false: property forwarded=false, no exception tag, Metrics preserved.
test("T011 S8 datalake route false: property forwarded, no exception tag, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, BASELINE, ROUTE_PARAMS, "false")

    assert.strictEqual(c.forwardsProperty, true, "explicit-path resource must emit allowBlobPublicAccess")
    assert.strictEqual(c.resource.properties.allowBlobPublicAccess, "[parameters('allowBlobPublicAccess')]",
        "resource must bind the allowBlobPublicAccess parameter")
    assert.strictEqual(c.params.allowBlobPublicAccess.value, false, "forwarded value must be false")
    assert.strictEqual(c.exceptionTag, undefined, "false path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})

// S8 - true: property forwarded=true, exception tag present, Metrics preserved.
test("T011 S8 datalake route true: property forwarded, exception tag present, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, BASELINE, ROUTE_PARAMS, "true")

    assert.strictEqual(c.forwardsProperty, true, "explicit-path resource must emit allowBlobPublicAccess")
    assert.strictEqual(c.params.allowBlobPublicAccess.value, true, "forwarded value must be true")
    assert.strictEqual(c.exceptionTag, "true", "true path must stamp allow-anonymous-blob-access=true")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})
