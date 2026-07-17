// Shared driver for the per-route component tests (default / network / datalake). For a
// given tri-state input (omitted / unset / false / true) it builds a params bag, runs the
// plugin contract, loads the route's template, and returns everything the route tests need
// to assert the single-resource merge: property forwarding, exception-tag stamping,
// Metrics preservation, and that the collapsed resource carries no deploy-time condition.
// Node built-ins only.

const { applyPluginContract, getExceptionTagValue } = require("./plugin-contract")
const {
    loadTemplate,
    getStorageAccountResource,
    resourceHasCondition,
    resourceMergesAllowBlobPublicAccess,
    templateOmitsAllowBlobOnUnset,
    resourceUnionsMetricsTag
} = require("./template-route")

// routeParams: extra params that steer the plugin to this route's template
// (e.g. { NetworkAcls: {...} } or { IsHnsEnabled: {...} }). allowBlobState is one of
// "omitted" | "unset" | "false" | "true".
function buildRouteCase(templateFile, routeParams, allowBlobState) {
    const params = {
        storageAccountName: { value: "acct" },
        tags: { value: { team: "payments" } },
        ...routeParams
    }

    if (allowBlobState === "false") {
        params.allowBlobPublicAccess = { value: "false" }
    } else if (allowBlobState === "true") {
        params.allowBlobPublicAccess = { value: "true" }
    } else if (allowBlobState === "unset") {
        params.allowBlobPublicAccess = { value: "unset" }
    }
    // "omitted" leaves the key off entirely.

    applyPluginContract(params)

    const template = loadTemplate(templateFile)
    const resource = getStorageAccountResource(template)
    const allowBlobParam = params.allowBlobPublicAccess

    return {
        params,
        template,
        resource,
        hasAllowBlobKey: Object.prototype.hasOwnProperty.call(params, "allowBlobPublicAccess"),
        forwardedValue: allowBlobParam && typeof allowBlobParam === "object" ? allowBlobParam.value : allowBlobParam,
        hasCondition: resourceHasCondition(resource),
        mergesProperty: resourceMergesAllowBlobPublicAccess(resource),
        omitsOnUnset: templateOmitsAllowBlobOnUnset(template),
        unionsMetrics: resourceUnionsMetricsTag(resource),
        exceptionTag: getExceptionTagValue(params)
    }
}

module.exports = { buildRouteCase }
