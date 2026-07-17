// T009 - Default-route component tests (storage.json).
//
// The dual-resource switch was collapsed into a single storage account resource whose
// properties union() in a conditional allowBlobPublicAccess fragment. These tests assert
// the collapsed shape (single resource, no deploy-time condition, union merge, "unset"
// omission) plus the omitted/unset/false/true matrix: property forwarding, exception-tag
// stamping only on the true path, and Metrics preserved in every case. Node built-ins only.
//
// Scenario coverage: S4, S5, S6.

const { test, assert } = require("./helpers/harness")
const { buildRouteCase } = require("./helpers/route-case")

const TEMPLATE = "storage.json"

// Structural: the CP03 dual-resource switch is gone - one resource, no condition, and the
// property is merged conditionally so "unset" omits it without branching.
test("T009 default template collapses to a single conditionless union merge", () => {
    const c = buildRouteCase(TEMPLATE, {}, "omitted")

    assert.strictEqual(c.hasCondition, false, "collapsed resource must not carry a deploy-time condition")
    assert.strictEqual(c.mergesProperty, true, "properties must union the conditional allowBlobPublicAccess fragment")
    assert.strictEqual(c.omitsOnUnset, true, "conditional variable must omit the property on 'unset'")
})

// S4 - omitted: param not forwarded; no exception tag; Metrics preserved.
test("T009 S4 default route omitted: param not forwarded, no exception tag, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, {}, "omitted")

    assert.strictEqual(c.hasAllowBlobKey, false, "omitted param must not be forwarded")
    assert.strictEqual(c.exceptionTag, undefined, "omitted path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})

// S4 - explicit "unset": treated as omitted; param dropped; no exception tag.
test("T009 S4 default route unset: param dropped, no exception tag", () => {
    const c = buildRouteCase(TEMPLATE, {}, "unset")

    assert.strictEqual(c.hasAllowBlobKey, false, "explicit 'unset' must be dropped, not forwarded")
    assert.strictEqual(c.exceptionTag, undefined, "unset path must not stamp the exception tag")
})

// S5 - false: forwarded as the "false" string; no exception tag; Metrics preserved.
test("T009 S5 default route false: forwarded as 'false', no exception tag, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, {}, "false")

    assert.strictEqual(c.hasAllowBlobKey, true, "false must be forwarded")
    assert.strictEqual(c.forwardedValue, "false", "forwarded value must be the tri-state string 'false'")
    assert.strictEqual(c.exceptionTag, undefined, "false path must not stamp the exception tag")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})

// S6 - true: forwarded as the "true" string; exception tag present; Metrics preserved.
test("T009 S6 default route true: forwarded as 'true', exception tag present, Metrics preserved", () => {
    const c = buildRouteCase(TEMPLATE, {}, "true")

    assert.strictEqual(c.hasAllowBlobKey, true, "true must be forwarded")
    assert.strictEqual(c.forwardedValue, "true", "forwarded value must be the tri-state string 'true'")
    assert.strictEqual(c.exceptionTag, "true", "true path must stamp allow-anonymous-blob-access=true")
    assert.strictEqual(c.unionsMetrics, true, "Metrics tag must be present")
})
