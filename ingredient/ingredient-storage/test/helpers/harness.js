// Minimal Node-only test harness for the storage ingredient allowBlobPublicAccess
// matrix. The repo is intentionally not bootstrapped (no node_modules, no jest/mocha),
// so tests rely solely on Node built-ins and this tiny collector. Test files register
// cases via test(name, fn); run-tests.js requires them and calls runAll(), which exits
// non-zero on the first failing assertion so `npm test` fails deterministically in CI.

const assert = require("assert")

const tests = []

function test(name, fn) {
    tests.push({ name, fn })
}

function runAll() {
    let passed = 0
    let failed = 0

    for (const entry of tests) {
        try {
            entry.fn()
            passed++
            console.log(`  PASS  ${entry.name}`)
        } catch (err) {
            failed++
            console.error(`  FAIL  ${entry.name}`)
            const message = err && err.stack ? err.stack : String(err)
            console.error(message.split("\n").map(line => `        ${line}`).join("\n"))
        }
    }

    console.log(`\n${passed} passed, ${failed} failed`)

    if (failed > 0) {
        process.exit(1)
    }
}

module.exports = { test, runAll, assert }
