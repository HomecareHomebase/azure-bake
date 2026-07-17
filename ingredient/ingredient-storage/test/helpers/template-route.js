// Template inspection helpers shared by the default/network/datalake component tests.
// The storage templates were collapsed from the old dual-resource switch (explicit vs
// omitted paths gated on contains(...'allowBlobPublicAccess')) into a SINGLE storage
// account resource whose properties are assembled with union(). The allowBlobPublicAccess
// property is contributed by a conditional variable that yields an empty object on the
// tri-state "unset" value, so ARM omits the property without any branching. These helpers
// let the tests assert that single-resource merge structurally without evaluating ARM
// template language. Uses only Node built-ins.

const fs = require("fs")
const path = require("path")

const SRC_DIR = path.join(__dirname, "..", "..", "src")

const STORAGE_ACCOUNT_TYPE = "Microsoft.Storage/storageAccounts"
const ALLOW_BLOB_VARIABLE = "allowBlobPublicAccessProperty"
// The conditional variable must omit the property (empty object) on the "unset" value.
const UNSET_OMIT_MARKER = "if(equals(parameters('allowBlobPublicAccess'), 'unset'), createObject()"

function loadTemplate(templateFile) {
    return JSON.parse(fs.readFileSync(path.join(SRC_DIR, templateFile), "utf8"))
}

function storageAccountResources(template) {
    const resources = Array.isArray(template.resources) ? template.resources : []
    return resources.filter(resource => resource.type === STORAGE_ACCOUNT_TYPE)
}

// The dual-resource switch is gone: each template now carries exactly one storage account
// resource. Returns it, throwing if the template regresses to zero or multiple resources.
function getStorageAccountResource(template) {
    const matches = storageAccountResources(template)
    if (matches.length !== 1) {
        throw new Error(`Expected exactly one ${STORAGE_ACCOUNT_TYPE} resource, found ${matches.length}`)
    }
    return matches[0]
}

// True when the storage account resource still carries a deploy-time condition. After the
// collapse it must not (the branching moved into the union()/if() merge), so tests assert
// this is false.
function resourceHasCondition(resource) {
    return typeof resource.condition === "string" && resource.condition.length > 0
}

// True when the resource assembles its properties by union()-ing the conditional
// allowBlobPublicAccess fragment onto the base object (the single-resource merge).
function resourceMergesAllowBlobPublicAccess(resource) {
    return typeof resource.properties === "string"
        && resource.properties.includes("union(")
        && resource.properties.includes(`variables('${ALLOW_BLOB_VARIABLE}')`)
}

// True when the conditional variable omits the property (yields an empty object) on the
// tri-state "unset" value.
function templateOmitsAllowBlobOnUnset(template) {
    const expression = template.variables && template.variables[ALLOW_BLOB_VARIABLE]
    return typeof expression === "string" && expression.includes(UNSET_OMIT_MARKER)
}

// True when the resource tags expression unions the Metrics tag (createObject('Metrics', '*')).
function resourceUnionsMetricsTag(resource) {
    return typeof resource.tags === "string" && resource.tags.includes("'Metrics'")
}

// The allowBlobPublicAccess parameter declaration (used to assert the tri-state string
// contract: type string, default "unset", allowedValues unset/true/false).
function allowBlobPublicAccessParam(template) {
    return template.parameters && template.parameters.allowBlobPublicAccess
}

module.exports = {
    loadTemplate,
    getStorageAccountResource,
    resourceHasCondition,
    resourceMergesAllowBlobPublicAccess,
    templateOmitsAllowBlobOnUnset,
    resourceUnionsMetricsTag,
    allowBlobPublicAccessParam,
    ALLOW_BLOB_VARIABLE
}
