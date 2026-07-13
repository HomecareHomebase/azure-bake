// T009 - Default-route component tests (storage.json).
//
// Drives the CP03 conditional dual-resource pattern for the default storage template and
// asserts the omitted/false/true matrix: property absence/value, exception-tag stamping
// only on the true path, Metrics preserved in every case, and omitted-path equivalence to
// the CP01 default.omitted.json baseline. Node built-ins only.
//
// Scenario coverage: S4, S5, S6.

const { test, assert } = require("./lib/harness")
const { buildRouteCase } = require("./lib/route-case")

const TEMPLATE = "storage.json"
const BASELINE = "default"

// S4 - omitted: property absent + byte-equivalent to the omitted baseline; no exception tag.
test("T009 S4 default route omitted: property absent, matches baseline, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, BASELINE, {}, "omitted")

    assert.strictEqual(c.hasAllowBlobKey, false, "omitted param must not be forwarded")
    assert.strictEqual(c.forwardsProperty, false, "omitted-path resource must not emit allowBlobPublicAccess")
    assert.strictEqual(c.exceptionTag, undefined, "omitted path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
    assert.deepStrictEqual(c.resource, c.baselineResource, "omitted resource must equal the CP01 baseline")
})

// S5 - false: properties.allowBlobPublicAccess=false, no exception tag, Metrics preserved.
test("T009 S5 default route false: property forwarded, no exception tag, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, BASELINE, {}, "false")

    assert.strictEqual(c.hasAllowBlobKey, true, "false must be forwarded")
    assert.strictEqual(c.forwardsProperty, true, "explicit-path resource must emit allowBlobPublicAccess")
    assert.strictEqual(c.resource.properties.allowBlobPublicAccess, "[parameters('allowBlobPublicAccess')]",
        "resource must bind the allowBlobPublicAccess parameter")
    assert.strictEqual(c.params.allowBlobPublicAccess.value, false, "forwarded value must be false")
    assert.strictEqual(c.exceptionTag, undefined, "false path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})

// S6 - true: properties.allowBlobPublicAccess=true, exception tag present, Metrics preserved.
test("T009 S6 default route true: property forwarded, exception tag present, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, BASELINE, {}, "true")

    assert.strictEqual(c.hasAllowBlobKey, true, "true must be forwarded")
    assert.strictEqual(c.forwardsProperty, true, "explicit-path resource must emit allowBlobPublicAccess")
    assert.strictEqual(c.params.allowBlobPublicAccess.value, true, "forwarded value must be true")
    assert.strictEqual(c.exceptionTag, "true", "true path must stamp allow-anonymous-blob-access=true")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})
