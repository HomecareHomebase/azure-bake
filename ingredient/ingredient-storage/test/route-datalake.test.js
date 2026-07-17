// T011 - Datalake-route component tests (storageDatalake.json).
//
// The presence of an IsHnsEnabled param steers the plugin to storageDatalake.json. That
// template was collapsed into a single storage account resource whose properties union()
// in the conditional allowBlobPublicAccess fragment. These tests assert the collapsed
// shape plus the omitted/unset/false/true matrix and Metrics preservation. Node built-ins
// only.
//
// Scenario coverage: S8.

const { test, assert } = require("./helpers/harness")
const { buildRouteCase } = require("./helpers/route-case")

const TEMPLATE = "storageDatalake.json"
const ROUTE_PARAMS = { IsHnsEnabled: { value: true } }

// Structural: the dual-resource switch is gone - one resource, no condition, union merge.
test("T011 datalake template collapses to a single conditionless union merge", () => {
    const c = buildRouteCase(TEMPLATE, ROUTE_PARAMS, "omitted")

    assert.strictEqual(c.hasCondition, false, "collapsed resource must not carry a deploy-time condition")
    assert.strictEqual(c.mergesProperty, true, "properties must union the conditional allowBlobPublicAccess fragment")
    assert.strictEqual(c.omitsOnUnset, true, "conditional variable must omit the property on 'unset'")
})

// S8 - omitted: param not forwarded, no exception tag, Metrics preserved.
test("T011 S8 datalake route omitted: param not forwarded, no exception tag, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, ROUTE_PARAMS, "omitted")

    assert.strictEqual(c.hasAllowBlobKey, false, "omitted param must not be forwarded")
    assert.strictEqual(c.exceptionTag, undefined, "omitted path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})

// S8 - false: forwarded as "false", no exception tag, Metrics preserved.
test("T011 S8 datalake route false: forwarded as 'false', no exception tag, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, ROUTE_PARAMS, "false")

    assert.strictEqual(c.hasAllowBlobKey, true, "false must be forwarded")
    assert.strictEqual(c.forwardedValue, "false", "forwarded value must be the tri-state string 'false'")
    assert.strictEqual(c.exceptionTag, undefined, "false path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})

// S8 - true: forwarded as "true", exception tag present, Metrics preserved.
test("T011 S8 datalake route true: forwarded as 'true', exception tag present, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, ROUTE_PARAMS, "true")

    assert.strictEqual(c.hasAllowBlobKey, true, "true must be forwarded")
    assert.strictEqual(c.forwardedValue, "true", "forwarded value must be the tri-state string 'true'")
    assert.strictEqual(c.exceptionTag, "true", "true path must stamp allow-anonymous-blob-access=true")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})
