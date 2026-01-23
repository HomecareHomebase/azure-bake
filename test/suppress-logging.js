// Suppress app console logging during test runs to reduce noise.
// Automatically loaded via NODE_OPTIONS when BAKE_SUPPRESS_LOGGING=true is set.
// Preserves mocha test output while suppressing app-level logging.

if (process.env.BAKE_SUPPRESS_LOGGING === 'true') {
  const originalLog = console.log.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const originalInfo = console.info.bind(console);
  const originalDebug = console.debug.bind(console);

  // Pattern to detect app logging (timestamped, colored output)
  // App logs look like: "[Thu, 22 Jan 2026 23:49:10 GMT] message"
  const appLogPattern = /^\u001b\[3[0-9]m\[.*GMT\]/;
  
  const isAppLog = (args) => {
    if (args.length === 0) return false;
    const first = args[0];
    if (typeof first !== 'string') return false;
    return appLogPattern.test(first);
  };

  console.log = (...args) => {
    if (!isAppLog(args)) originalLog(...args);
  };

  console.warn = (...args) => {
    if (!isAppLog(args)) originalWarn(...args);
  };

  console.error = (...args) => {
    if (!isAppLog(args)) originalError(...args);
  };

  console.info = (...args) => {
    if (!isAppLog(args)) originalInfo(...args);
  };

  console.debug = (...args) => {
    if (!isAppLog(args)) originalDebug(...args);
  };
}
