// Suppress all console output during test runs for cleaner coverage reports
// Mocha uses its own reporter system, so this only affects test code logging
const noop = () => {};
console.log = noop;
console.info = noop;
console.debug = noop;
console.warn = noop;
console.error = noop;
