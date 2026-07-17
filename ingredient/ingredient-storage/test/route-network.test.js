// T010 - Network-route component tests (storageNetwork.json).
//
// The presence of a NetworkAcls param steers the plugin to storageNetwork.json. That
// template was collapsed into a single storage account resource: its networkAcls copy
// loops moved into variable iteration and its properties union() in the conditional
// allowBlobPublicAccess fragment. These tests assert the collapsed shape plus the
// omitted/unset/false/true matrix and Metrics preservation. Node built-ins only.
//
// Scenario coverage: S7.

const { test, assert } = require("./helpers/harness")
const { buildRouteCase } = require("./helpers/route-case")

const TEMPLATE = "storageNetwork.json"
const ROUTE_PARAMS = { NetworkAcls: { value: { bypass: "AzureServices", ipRules: [], virtualNetworkRules: [] } } }

// Structural: the dual-resource switch is gone - one resource, no condition, union merge.
test("T010 network template collapses to a single conditionless union merge", () => {
    const c = buildRouteCase(TEMPLATE, ROUTE_PARAMS, "omitted")

    assert.strictEqual(c.hasCondition, false, "collapsed resource must not carry a deploy-time condition")
    assert.strictEqual(c.mergesProperty, true, "properties must union the conditional allowBlobPublicAccess fragment")
    assert.strictEqual(c.omitsOnUnset, true, "conditional variable must omit the property on 'unset'")
})

// S7 - omitted: param not forwarded, no exception tag, Metrics preserved.
test("T010 S7 network route omitted: param not forwarded, no exception tag, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, ROUTE_PARAMS, "omitted")

    assert.strictEqual(c.hasAllowBlobKey, false, "omitted param must not be forwarded")
    assert.strictEqual(c.exceptionTag, undefined, "omitted path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})

// S7 - false: forwarded as "false", no exception tag, Metrics preserved.
test("T010 S7 network route false: forwarded as 'false', no exception tag, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, ROUTE_PARAMS, "false")

    assert.strictEqual(c.hasAllowBlobKey, true, "false must be forwarded")
    assert.strictEqual(c.forwardedValue, "false", "forwarded value must be the tri-state string 'false'")
    assert.strictEqual(c.exceptionTag, undefined, "false path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})

// S7 - true: forwarded as "true", exception tag present, Metrics preserved.
test("T010 S7 network route true: forwarded as 'true', exception tag present, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, ROUTE_PARAMS, "true")

    assert.strictEqual(c.hasAllowBlobKey, true, "true must be forwarded")
    assert.strictEqual(c.forwardedValue, "true", "forwarded value must be the tri-state string 'true'")
    assert.strictEqual(c.exceptionTag, "true", "true path must stamp allow-anonymous-blob-access=true")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})
