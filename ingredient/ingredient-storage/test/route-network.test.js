// T010 - Network-route component tests (storageNetwork.json).
//
// Exercises the omitted/false/true matrix under the NetworkAcls route: the presence of a
// NetworkAcls param steers the plugin to storageNetwork.json. Asserts property absence/
// value per row, exception-tag stamping only on the true path, Metrics preserved, and
// omitted-path equivalence to the CP01 networkAcls.omitted.json baseline. Node built-ins
// only.
//
// Scenario coverage: S7.

const { test, assert } = require("./helpers/harness")
const { buildRouteCase } = require("./helpers/route-case")

const TEMPLATE = "storageNetwork.json"
const BASELINE = "networkAcls"
const ROUTE_PARAMS = { NetworkAcls: { value: { bypass: "AzureServices", ipRules: [], virtualNetworkRules: [] } } }

// S7 - omitted: property absent, matches baseline, no exception tag, Metrics preserved.
test("T010 S7 network route omitted: property absent, matches baseline, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, BASELINE, ROUTE_PARAMS, "omitted")

    assert.strictEqual(c.hasAllowBlobKey, false, "omitted param must not be forwarded")
    assert.strictEqual(c.forwardsProperty, false, "omitted-path resource must not emit allowBlobPublicAccess")
    assert.strictEqual(c.exceptionTag, undefined, "omitted path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
    assert.deepStrictEqual(c.resource, c.baselineResource, "omitted resource must equal the CP01 baseline")
})

// S7 - false: property forwarded=false, no exception tag, Metrics preserved.
test("T010 S7 network route false: property forwarded, no exception tag, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, BASELINE, ROUTE_PARAMS, "false")

    assert.strictEqual(c.forwardsProperty, true, "explicit-path resource must emit allowBlobPublicAccess")
    assert.strictEqual(c.resource.properties.allowBlobPublicAccess, "[parameters('allowBlobPublicAccess')]",
        "resource must bind the allowBlobPublicAccess parameter")
    assert.strictEqual(c.params.allowBlobPublicAccess.value, false, "forwarded value must be false")
    assert.strictEqual(c.exceptionTag, undefined, "false path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})

// S7 - true: property forwarded=true, exception tag present, Metrics preserved.
test("T010 S7 network route true: property forwarded, exception tag present, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, BASELINE, ROUTE_PARAMS, "true")

    assert.strictEqual(c.forwardsProperty, true, "explicit-path resource must emit allowBlobPublicAccess")
    assert.strictEqual(c.params.allowBlobPublicAccess.value, true, "forwarded value must be true")
    assert.strictEqual(c.exceptionTag, "true", "true path must stamp allow-anonymous-blob-access=true")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})
