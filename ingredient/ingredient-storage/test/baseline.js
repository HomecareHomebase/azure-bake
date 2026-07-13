// Establishes deterministic omitted-path baselines for the storage ingredient ARM
// templates. Each storage template carries a conditional dual-resource pattern: one
// resource that emits allowBlobPublicAccess (explicit path) and one that omits it
// (omitted path). These baselines capture the omitted-path resource for each route so
// later tests can assert that omitting allowBlobPublicAccess stays byte-equivalent to
// the pre-feature output.
//
// Usage:
//   node test/baseline.js          Regenerate the omitted-path baseline fixtures.
//   node test/baseline.js --check  Verify on-disk baselines match regenerated output.
//
// Uses only Node built-ins so it introduces no new dependencies.

const fs = require("fs")
const path = require("path")

const OMITTED_PATH_CONDITION_MARKER = "not(contains(deployment().properties.parameters, 'allowBlobPublicAccess'))"

const ROUTES = [
    { name: "default", template: "storage.json" },
    { name: "networkAcls", template: "storageNetwork.json" },
    { name: "datalake", template: "storageDatalake.json" }
]

const SRC_DIR = path.join(__dirname, "..", "src")
const BASELINE_DIR = path.join(__dirname, "baselines")

function findOmittedPathResource(template, templateFile) {
    const resources = Array.isArray(template.resources) ? template.resources : []
    const match = resources.find(resource =>
        typeof resource.condition === "string" &&
        resource.condition.includes(OMITTED_PATH_CONDITION_MARKER))

    if (!match) {
        throw new Error(`Unable to locate omitted-path (allowBlobPublicAccess absent) resource in ${templateFile}`)
    }

    return match
}

function buildBaseline(route) {
    const templatePath = path.join(SRC_DIR, route.template)
    const template = JSON.parse(fs.readFileSync(templatePath, "utf8"))
    const resource = findOmittedPathResource(template, route.template)

    return {
        route: route.name,
        template: route.template,
        apiVersion: resource.apiVersion,
        condition: resource.condition,
        resource
    }
}

function serialize(baseline) {
    return JSON.stringify(baseline, null, 2) + "\n"
}

function baselinePath(route) {
    return path.join(BASELINE_DIR, `${route.name}.omitted.json`)
}

function generate() {
    fs.mkdirSync(BASELINE_DIR, { recursive: true })

    for (const route of ROUTES) {
        const contents = serialize(buildBaseline(route))
        fs.writeFileSync(baselinePath(route), contents)
        console.log(`Wrote omitted-path baseline for '${route.name}' route -> ${path.relative(process.cwd(), baselinePath(route))}`)
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
        console.error("Omitted-path baselines are out of date. Run 'npm run baseline' to regenerate.")
        process.exit(1)
    }

    console.log("All omitted-path baselines are up to date.")
}

if (process.argv.includes("--check")) {
    check()
} else {
    generate()
}
