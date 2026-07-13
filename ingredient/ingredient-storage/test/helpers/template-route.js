// Route-selection helper shared by the default/network/datalake component tests. Each
// storage template carries the CP03 conditional dual-resource pattern: one storage
// account resource guarded by contains(...'allowBlobPublicAccess') (explicit path) and
// one guarded by not(contains(...)) (omitted path). Given a normalized params bag, this
// helper picks the resource ARM would deploy so tests can assert the property/tag output
// per route without evaluating ARM template language. Uses only Node built-ins.

const fs = require("fs")
const path = require("path")

const SRC_DIR = path.join(__dirname, "..", "..", "src")
const BASELINE_DIR = path.join(__dirname, "..", "baselines")

const ALLOW_BLOB_MARKER = "contains(deployment().properties.parameters, 'allowBlobPublicAccess')"
const OMITTED_MARKER = "not(contains(deployment().properties.parameters, 'allowBlobPublicAccess'))"

const STORAGE_ACCOUNT_TYPE = "Microsoft.Storage/storageAccounts"

function loadTemplate(templateFile) {
    return JSON.parse(fs.readFileSync(path.join(SRC_DIR, templateFile), "utf8"))
}

function loadBaselineResource(baselineName) {
    const baseline = JSON.parse(fs.readFileSync(path.join(BASELINE_DIR, `${baselineName}.omitted.json`), "utf8"))
    return baseline.resource
}

function storageAccountResources(template) {
    const resources = Array.isArray(template.resources) ? template.resources : []
    return resources.filter(resource => resource.type === STORAGE_ACCOUNT_TYPE)
}

function isOmittedResource(resource) {
    return typeof resource.condition === "string" && resource.condition.includes(OMITTED_MARKER)
}

function isExplicitResource(resource) {
    return typeof resource.condition === "string"
        && resource.condition.includes(ALLOW_BLOB_MARKER)
        && !resource.condition.includes(OMITTED_MARKER)
}

// Selects the storage account resource ARM would deploy given whether the normalized
// params still carry the allowBlobPublicAccess key. When present the explicit-path
// resource is chosen; when absent the omitted-path resource is chosen.
function selectStorageAccountResource(template, paramsHasAllowBlobKey) {
    const resources = storageAccountResources(template)
    const predicate = paramsHasAllowBlobKey ? isExplicitResource : isOmittedResource
    const match = resources.find(predicate)

    if (!match) {
        throw new Error(`Unable to locate ${paramsHasAllowBlobKey ? "explicit" : "omitted"}-path storage account resource`)
    }

    return match
}

// True when the resource emits properties.allowBlobPublicAccess (explicit path only).
function resourceForwardsAllowBlobPublicAccess(resource) {
    return !!(resource && resource.properties && "allowBlobPublicAccess" in resource.properties)
}

// True when the resource tags expression unions the Metrics tag (createObject('Metrics', '*')).
function resourceUnionsMetricsTag(resource) {
    return typeof resource.tags === "string" && resource.tags.includes("'Metrics'")
}

module.exports = {
    loadTemplate,
    loadBaselineResource,
    selectStorageAccountResource,
    resourceForwardsAllowBlobPublicAccess,
    resourceUnionsMetricsTag,
    ALLOW_BLOB_MARKER,
    OMITTED_MARKER
}
