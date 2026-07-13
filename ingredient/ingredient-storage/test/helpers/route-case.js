// Shared driver for the per-route component tests (default / network / datalake). For a
// given route param state (omitted / false / true) it builds a params bag, runs the
// plugin contract, selects the storage account resource ARM would deploy, and returns
// everything the route tests need to assert property forwarding, exception-tag stamping,
// Metrics preservation, and omitted-path baseline equivalence. Node built-ins only.

const { applyPluginContract, getExceptionTagValue } = require("./plugin-contract")
const {
    loadTemplate,
    loadBaselineResource,
    selectStorageAccountResource,
    resourceForwardsAllowBlobPublicAccess,
    resourceUnionsMetricsTag
} = require("./template-route")

// routeParams: extra params that steer the plugin to this route's template
// (e.g. { NetworkAcls: {...} } or { IsHnsEnabled: {...} }). allowBlobState is one of
// "omitted" | "false" | "true".
function buildRouteCase(templateFile, baselineName, routeParams, allowBlobState) {
    const params = {
        storageAccountName: { value: "acct" },
        tags: { value: { team: "payments" } },
        ...routeParams
    }

    if (allowBlobState === "false") {
        params.allowBlobPublicAccess = { value: false }
    } else if (allowBlobState === "true") {
        params.allowBlobPublicAccess = { value: true }
    }
    // "omitted" leaves the key off entirely.

    applyPluginContract(params)

    const hasAllowBlobKey = Object.prototype.hasOwnProperty.call(params, "allowBlobPublicAccess")
    const resource = selectStorageAccountResource(loadTemplate(templateFile), hasAllowBlobKey)

    return {
        params,
        resource,
        hasAllowBlobKey,
        forwardsProperty: resourceForwardsAllowBlobPublicAccess(resource),
        unionsMetrics: resourceUnionsMetricsTag(resource),
        exceptionTag: getExceptionTagValue(params),
        baselineResource: loadBaselineResource(baselineName)
    }
}

module.exports = { buildRouteCase }
