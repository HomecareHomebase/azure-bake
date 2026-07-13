// Pure-Node mirror of the allowBlobPublicAccess parameter/tag contract implemented in
// ../../src/plugin.ts. The plugin is authored in TypeScript and cannot be compiled in
// this environment (no bootstrap, no build tooling, no node_modules), so these helpers
// faithfully reproduce the exact semantics of the plugin's private methods:
//
//   - GetExplicitBooleanParamValue  -> getExplicitBooleanParamValue
//   - GetTagMap                     -> getTagMap
//   - NormalizeAllowBlobPublicAccessParam -> normalizeAllowBlobPublicAccessParam
//   - ApplyAnonymousBlobExceptionTag      -> applyAnonymousBlobExceptionTag
//
// applyPluginContract() invokes normalize() then applyTag() in the same order as
// StoragePlugIn.Execute(). The unit tests in this suite assert the invariants of that
// contract (omitted -> param absent + no tag; false -> false + no tag; true -> true +
// exception tag; existing/user tags preserved; conflicting exception value forced to
// "true"). Keep this file in lockstep with plugin.ts if the plugin logic changes.

const ALLOW_ANONYMOUS_BLOB_ACCESS_TAG_KEY = "allow-anonymous-blob-access"
const ALLOW_ANONYMOUS_BLOB_ACCESS_TAG_VALUE = "true"

function getExplicitBooleanParamValue(param) {
    if (param && typeof param === "object" && "value" in param) {
        if (param.value === true || param.value === false) {
            return param.value
        }
        return undefined
    }

    if (param === true || param === false) {
        return param
    }

    return undefined
}

function getTagMap(tagsParam) {
    if (!tagsParam) {
        return {}
    }

    const tagValue = tagsParam && typeof tagsParam === "object" && "value" in tagsParam
        ? tagsParam.value
        : tagsParam

    if (!tagValue || typeof tagValue !== "object" || Array.isArray(tagValue)) {
        return {}
    }

    return tagValue
}

function normalizeAllowBlobPublicAccessParam(params) {
    const allowBlobPublicAccess = getExplicitBooleanParamValue(params["allowBlobPublicAccess"])
    if (allowBlobPublicAccess === undefined) {
        delete params["allowBlobPublicAccess"]
        return
    }

    const allowBlobPublicAccessParam = params["allowBlobPublicAccess"]
    if (allowBlobPublicAccessParam && typeof allowBlobPublicAccessParam === "object" && "value" in allowBlobPublicAccessParam) {
        allowBlobPublicAccessParam.value = allowBlobPublicAccess
        return
    }

    params["allowBlobPublicAccess"] = allowBlobPublicAccess
}

function applyAnonymousBlobExceptionTag(params) {
    const allowBlobPublicAccess = getExplicitBooleanParamValue(params["allowBlobPublicAccess"])
    if (allowBlobPublicAccess !== true) {
        return
    }

    const tagsParam = params["tags"]
    const existingTags = getTagMap(tagsParam)
    const mergedTags = {
        ...existingTags,
        [ALLOW_ANONYMOUS_BLOB_ACCESS_TAG_KEY]: ALLOW_ANONYMOUS_BLOB_ACCESS_TAG_VALUE
    }

    if (tagsParam && typeof tagsParam === "object" && "value" in tagsParam) {
        tagsParam.value = mergedTags
        return
    }

    params["tags"] = { value: mergedTags }
}

// Mirrors the ordering in StoragePlugIn.Execute(): normalize first (which may delete the
// param), then stamp the exception tag only when the value resolved to explicit true.
function applyPluginContract(params) {
    normalizeAllowBlobPublicAccessParam(params)
    applyAnonymousBlobExceptionTag(params)
    return params
}

// Reads the resolved exception-tag value from a normalized params bag (undefined when the
// tag was never stamped). Used by tests to assert presence/absence of the exception tag.
function getExceptionTagValue(params) {
    return getTagMap(params && params["tags"])[ALLOW_ANONYMOUS_BLOB_ACCESS_TAG_KEY]
}

module.exports = {
    ALLOW_ANONYMOUS_BLOB_ACCESS_TAG_KEY,
    ALLOW_ANONYMOUS_BLOB_ACCESS_TAG_VALUE,
    getExplicitBooleanParamValue,
    getTagMap,
    normalizeAllowBlobPublicAccessParam,
    applyAnonymousBlobExceptionTag,
    applyPluginContract,
    getExceptionTagValue
}
