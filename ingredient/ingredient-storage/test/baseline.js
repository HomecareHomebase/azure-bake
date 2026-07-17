// Establishes deterministic baselines for the storage ingredient ARM templates. The
// dual-resource switch was collapsed into a single storage account resource per template
// whose properties union() in a conditional allowBlobPublicAccess fragment. These
// baselines capture that single resource for each route so accidental template edits are
// caught as byte-level drift.
//
// Usage:
//   node test/baseline.js          Regenerate the baseline fixtures.
//   node test/baseline.js --check  Verify on-disk baselines match regenerated output.
//
// Uses only Node built-ins so it introduces no new dependencies.

const fs = require("fs")
const path = require("path")

const STORAGE_ACCOUNT_TYPE = "Microsoft.Storage/storageAccounts"

const ROUTES = [
    { name: "default", template: "storage.json" },
    { name: "networkAcls", template: "storageNetwork.json" },
    { name: "datalake", template: "storageDatalake.json" }
]

const SRC_DIR = path.join(__dirname, "..", "src")
const BASELINE_DIR = path.join(__dirname, "baselines")

function findStorageAccountResource(template, templateFile) {
    const resources = Array.isArray(template.resources) ? template.resources : []
    const matches = resources.filter(resource => resource.type === STORAGE_ACCOUNT_TYPE)

    if (matches.length !== 1) {
        throw new Error(`Expected exactly one ${STORAGE_ACCOUNT_TYPE} resource in ${templateFile}, found ${matches.length}`)
    }

    return matches[0]
}

function buildBaseline(route) {
    const templatePath = path.join(SRC_DIR, route.template)
    const template = JSON.parse(fs.readFileSync(templatePath, "utf8"))
    const resource = findStorageAccountResource(template, route.template)

    return {
        route: route.name,
        template: route.template,
        apiVersion: resource.apiVersion,
        resource
    }
}

function serialize(baseline) {
    return JSON.stringify(baseline, null, 2) + "\n"
}

function baselinePath(route) {
    return path.join(BASELINE_DIR, `${route.name}.storageAccount.json`)
}

function generate() {
    fs.mkdirSync(BASELINE_DIR, { recursive: true })

    for (const route of ROUTES) {
        const contents = serialize(buildBaseline(route))
        fs.writeFileSync(baselinePath(route), contents)
        console.log(`Wrote storage account baseline for '${route.name}' route -> ${path.relative(process.cwd(), baselinePath(route))}`)
    }
}

function check() {
    let drift = false

    for (const route of ROUTES) {
        const expected = serialize(buildBaseline(route))
        const target = baselinePath(route)

        if (!fs.existsSync(target)) {
            console.error(`Missing baseline for '${route.name}' route: ${path.relative(process.cwd(), target)}`)
            drift = true
            continue
        }

        const actual = fs.readFileSync(target, "utf8")
        if (actual !== expected) {
            console.error(`Baseline drift detected for '${route.name}' route: ${path.relative(process.cwd(), target)}`)
            drift = true
        }
    }

    if (drift) {
        console.error("Storage account baselines are out of date. Run 'npm run baseline' to regenerate.")
        process.exit(1)
    }

    console.log("All storage account baselines are up to date.")
}

if (process.argv.includes("--check")) {
    check()
} else {
    generate()
}
