#!/usr/bin/env node
// Runs tests with minimal output - only shows summary and errors.

const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Get list of packages with test scripts
let packages;
try {
  const result = execSync('npx lerna list --json', { cwd: rootDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  packages = JSON.parse(result);
} catch (e) {
  console.error('Failed to list packages');
  process.exit(1);
}

let totalPassing = 0;
const failures = [];

for (const pkg of packages) {
  const pkgJsonPath = path.join(pkg.location, 'package.json');
  const pkgJson = require(pkgJsonPath);
  
  if (!pkgJson.scripts || !pkgJson.scripts.test) {
    continue;
  }

  try {
    const output = execSync('npm test', {
      cwd: pkg.location,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        BAKE_SUPPRESS_LOGGING: 'true',
        NODE_OPTIONS: `--require "${path.join(__dirname, 'suppress-logging.js').replace(/\\/g, '/')}" ${process.env.NODE_OPTIONS || ''}`
      }
    });
    
    const passingMatch = output.match(/(\d+)\s+passing/);
    if (passingMatch) totalPassing += parseInt(passingMatch[1], 10);
    
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    
    const passingMatch = output.match(/(\d+)\s+passing/);
    if (passingMatch) totalPassing += parseInt(passingMatch[1], 10);
    
    // Extract first error message only
    const errorMatch = output.match(/Error: ([^\n]+)/);
    const assertMatch = output.match(/AssertionError: ([^\n]+)/);
    const typeMatch = output.match(/TypeError: ([^\n]+)/);
    const refMatch = output.match(/ReferenceError: ([^\n]+)/);
    const firstError = typeMatch?.[1] || refMatch?.[1] || errorMatch?.[1] || assertMatch?.[1] || 'Unknown error';
    
    failures.push({ name: pkg.name, error: firstError });
  }
}

// Print summary
if (failures.length === 0) {
  console.log(`\x1b[32m✓ ${totalPassing} tests passed\x1b[0m`);
} else {
  console.log(`\x1b[32m✓ ${totalPassing} passed\x1b[0m, \x1b[31m✗ ${failures.length} packages failed\x1b[0m\n`);
  
  for (const f of failures) {
    console.log(`\x1b[31m${f.name}\x1b[0m: ${f.error}`);
  }
}

process.exit(failures.length > 0 ? 1 : 0);
