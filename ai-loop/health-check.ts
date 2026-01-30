/**
 * CRAWLER HEALTH CHECK
 *
 * Verifies that everything is properly set up before running the crawler.
 * This follows industry best practices for pre-flight checks.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface HealthCheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

const results: HealthCheckResult[] = [];

function check(name: string, condition: boolean, message: string, fix?: string) {
  results.push({
    name,
    status: condition ? 'pass' : 'fail',
    message,
    fix,
  });
}

function warn(name: string, condition: boolean, message: string, fix?: string) {
  results.push({
    name,
    status: condition ? 'pass' : 'warn',
    message,
    fix,
  });
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║           WMS CRAWLER - HEALTH CHECK                       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// 1. Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
check(
  'Node.js version',
  majorVersion >= 20,
  `Node.js ${nodeVersion} installed`,
  'Upgrade to Node.js 20 or higher'
);

// 2. Check if Playwright is installed
try {
  const pwVersion = execSync('npx playwright --version', { encoding: 'utf-8' }).trim();
  check('Playwright installed', true, pwVersion);
} catch {
  check(
    'Playwright installed',
    false,
    'Playwright not found',
    'Run: npm install -D @playwright/test && npx playwright install'
  );
}

// 3. Check if Playwright browsers are installed
try {
  const browsersPath = path.join(process.cwd(), 'node_modules', 'playwright-core', 'browsers.json');
  const browsersExist =
    fs.existsSync(browsersPath) ||
    fs.existsSync(path.join(process.env.USERPROFILE || '', '.cache', 'ms-playwright'));
  warn(
    'Playwright browsers',
    browsersExist,
    'Browsers may not be installed',
    'Run: npx playwright install chromium'
  );
} catch {}

// 4. Check if tsx is installed
try {
  execSync('npx tsx --version', { stdio: 'pipe' });
  check('tsx installed', true, 'tsx is available');
} catch {
  check('tsx installed', false, 'tsx not found', 'Run: npm install -D tsx');
}

// 5. Check if dev server is running
try {
  execSync('curl -s http://localhost:5173 > nul 2>&1', { stdio: 'pipe', shell: true });
  check('Dev server running', true, 'Server detected at localhost:5173');
} catch {
  warn('Dev server running', false, 'Server not detected', 'Start dev server: npm run dev');
}

// 6. Check required files
const requiredFiles = [
  'crawl.spec.ts',
  'normalize-errors.ts',
  'auto-fix.ts',
  'playwright.config.ts',
  'tsconfig.json',
];

for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(__dirname, file));
  check(`File: ${file}`, exists, exists ? 'Found' : 'Missing');
}

// 7. Check output directory
const outputDir = path.join(__dirname, 'playwright-report');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
check('Output directory', true, 'playwright-report directory exists');

// 8. Check TypeScript config
try {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'tsconfig.json'), 'utf-8'));
  check('tsconfig.json', true, 'Valid TypeScript config');
} catch {
  check('tsconfig.json', false, 'Invalid or missing tsconfig.json');
}

// 9. Check package.json scripts
try {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const hasCrawlScripts = packageJson.scripts?.crawl && packageJson.scripts?.['crawl:all'];
  check('package.json scripts', hasCrawlScripts, 'Crawl scripts configured');
} catch {
  warn('package.json scripts', false, 'Could not verify scripts');
}

// Print results
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;
let warnings = 0;

for (const result of results) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌';
  console.log(`${icon} ${result.name.padEnd(25)} ${result.message}`);

  if (result.status === 'pass') passed++;
  else if (result.status === 'warn') warnings++;
  else failed++;

  if (result.fix) {
    console.log(`   💡 Fix: ${result.fix}`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`Summary: ${passed} passed, ${warnings} warnings, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════════\n');

// Exit with error code if any critical checks failed
if (failed > 0) {
  console.log('❌ Health check failed! Please fix the errors above before running the crawler.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('⚠️  Some warnings detected. Crawler may not work properly.\n');
  console.log('Run the crawler anyway? (Press Ctrl+C to cancel)');
  console.log('Starting in 3 seconds...\n');
} else {
  console.log('✅ All checks passed! Ready to run the crawler.\n');
}
