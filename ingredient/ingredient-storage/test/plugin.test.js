// T008 + T012 - Plugin-contract unit tests.
//
// These exercise the pure-Node mirror of the plugin's normalization/tag-merge contract
// (test/helpers/plugin-contract.js), which reproduces the TypeScript plugin's private
// methods verbatim because the plugin cannot be compiled in this un-bootstrapped repo.
// The invariants asserted here are exactly the invariants plugin.ts implements.
//
// Scenario coverage:
//   S1 - omitted allowBlobPublicAccess is not forwarded and stamps no exception tag.
//   S2 - explicit false is forwarded as false and stamps no exception tag.
//   S3 - explicit true is forwarded as true and stamps the exception tag.
//   S9 - existing/user tags survive the merge; conflicting exception values are enforced.

const fs = require("fs")
const path = require("path")
const { test, assert } = require("./helpers/harness")
const {
    ALLOW_ANONYMOUS_BLOB_ACCESS_TAG_KEY,
    applyPluginContract,
    getExplicitBooleanParamValue,
    getExceptionTagValue
} = require("./helpers/plugin-contract")
const {
    loadTemplate,
    selectStorageAccountResource,
    resourceUnionsMetricsTag
} = require("./helpers/template-route")

const CONFLICT_FIXTURE = JSON.parse(
    fs.readFileSync(path.join(__dirname, "fixtures", "conflict-tags.json"), "utf8"))

function hasAllowBlobKey(params) {
    return Object.prototype.hasOwnProperty.call(params, "allowBlobPublicAccess")
}

// --- T008: omitted / false / true forwarding + tag merge -------------------------------

// S1 - omitted param is dropped entirely and no exception tag is stamped.
test("T008 S1 omitted allowBlobPublicAccess is not forwarded and stamps no exception tag", () => {
    const params = { storageAccountName: { value: "acct" } }
    applyPluginContract(params)

    assert.strictEqual(hasAllowBlobKey(params), false, "omitted param must be removed, not forwarded")
    assert.strictEqual(getExceptionTagValue(params), undefined, "omitted path must not stamp the exception tag")
})

// S1 - non-explicit values (string, null, undefined-value) are treated as omitted.
test("T008 S1 non-explicit allowBlobPublicAccess values are treated as omitted", () => {
    for (const raw of [{ value: "true" }, { value: null }, { value: 1 }, {}, null]) {
        const params = { storageAccountName: { value: "acct" }, allowBlobPublicAccess: raw }
        applyPluginContract(params)
        assert.strictEqual(hasAllowBlobKey(params), false,
            `non-explicit value ${JSON.stringify(raw)} must be dropped, not forwarded`)
        assert.strictEqual(getExceptionTagValue(params), undefined,
            `non-explicit value ${JSON.stringify(raw)} must not stamp the exception tag`)
    }
})

// S2 - explicit false is forwarded (=false); exception tag absent.
test("T008 S2 explicit false is forwarded as false and stamps no exception tag", () => {
    const params = { storageAccountName: { value: "acct" }, allowBlobPublicAccess: { value: false } }
    applyPluginContract(params)

    assert.strictEqual(hasAllowBlobKey(params), true, "false must be forwarded")
    assert.strictEqual(getExplicitBooleanParamValue(params.allowBlobPublicAccess), false, "value must remain false")
    assert.strictEqual(getExceptionTagValue(params), undefined, "false path must not stamp the exception tag")
})

// S3 - explicit true is forwarded (=true); exception tag present with canonical value.
test("T008 S3 explicit true is forwarded as true and stamps the exception tag", () => {
    const params = { storageAccountName: { value: "acct" }, allowBlobPublicAccess: { value: true } }
    applyPluginContract(params)

    assert.strictEqual(hasAllowBlobKey(params), true, "true must be forwarded")
    assert.strictEqual(getExplicitBooleanParamValue(params.allowBlobPublicAccess), true, "value must remain true")
    assert.strictEqual(getExceptionTagValue(params), "true",
        "true path must stamp allow-anonymous-blob-access=true")
})

// S9 - existing user tags survive the merge on the true path.
test("T008 S9 existing tags survive the exception-tag merge", () => {
    const params = {
        storageAccountName: { value: "acct" },
        allowBlobPublicAccess: { value: true },
        tags: { value: { team: "payments", env: "prod" } }
    }
    applyPluginContract(params)

    assert.strictEqual(params.tags.value.team, "payments", "existing tag 'team' must survive")
    assert.strictEqual(params.tags.value.env, "prod", "existing tag 'env' must survive")
    assert.strictEqual(params.tags.value[ALLOW_ANONYMOUS_BLOB_ACCESS_TAG_KEY], "true",
        "exception tag must be added alongside existing tags")
})

// --- T012: conflict-fixture regression for tag precedence and preservation -------------

// S9 - false path with existing custom tags: custom + Metrics preserved, no exception tag.
test("T012 S9 false path preserves custom tags and Metrics without an exception tag", () => {
    const params = {
        storageAccountName: { value: "acct" },
        allowBlobPublicAccess: { value: false },
        tags: { value: { ...CONFLICT_FIXTURE.customTags } }
    }
    applyPluginContract(params)

    assert.deepStrictEqual(params.tags.value, CONFLICT_FIXTURE.customTags,
        "false path must leave custom tags untouched")
    assert.strictEqual(getExceptionTagValue(params), undefined,
        "false path must not stamp the exception tag")

    // Metrics is unioned by the template, not the plugin; confirm the deployed resource
    // still carries the Metrics union expression on the false (explicit) path.
    const resource = selectStorageAccountResource(loadTemplate("storage.json"), hasAllowBlobKey(params))
    assert.strictEqual(resourceUnionsMetricsTag(resource), true, "Metrics tag must be preserved by the template")
})

// S9 - true path with a conflicting pre-set exception value: enforced to "true",
// custom tags + Metrics preserved.
test("T012 S9 true path enforces exception tag to 'true' and preserves custom tags/Metrics", () => {
    const params = {
        storageAccountName: { value: "acct" },
        allowBlobPublicAccess: { value: true },
        tags: { value: { ...CONFLICT_FIXTURE.customTagsWithConflict } }
    }

    // sanity: the fixture really carries a conflicting exception value going in.
    assert.strictEqual(params.tags.value[ALLOW_ANONYMOUS_BLOB_ACCESS_TAG_KEY], "false",
        "fixture must start with a conflicting exception value")

    applyPluginContract(params)

    assert.strictEqual(params.tags.value.team, "payments", "custom tag 'team' must survive")
    assert.strictEqual(params.tags.value.env, "prod", "custom tag 'env' must survive")
    assert.strictEqual(getExceptionTagValue(params), "true",
        "conflicting exception value must be enforced to 'true'")

    const resource = selectStorageAccountResource(loadTemplate("storage.json"), hasAllowBlobKey(params))
    assert.strictEqual(resourceUnionsMetricsTag(resource), true, "Metrics tag must be preserved by the template")
})
