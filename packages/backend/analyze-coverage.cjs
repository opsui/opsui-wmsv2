const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));

const files = Object.entries(data)
  .filter(([k]) => k.endsWith('.ts'))
  .map(([k, v]) => ({
    file: path.basename(k),
    fullPath: k.replace('C:\\Users\\Heinricht\\Documents\\Warehouse Management System\\packages\\backend\\', ''),
    lines: v.lines.pct,
    total: v.lines.total,
    covered: v.lines.covered,
    uncovered: v.lines.total - v.lines.covered
  }))
  .sort((a, b) => b.total - a.total);

console.log('\n=== Files with most lines (potential for high coverage impact) ===\n');
console.table(files.slice(0, 40));

const lowCoverage = files.filter(f => f.lines < 30 && f.total > 50).sort((a, b) => a.lines - b.lines);
console.log('\n=== Large files with LOW coverage (< 30%) ===\n');
console.table(lowCoverage.slice(0, 20));

const untested = files.filter(f => f.lines === 0 && f.total > 0).sort((a, b) => b.total - a.total);
console.log('\n=== Large files with ZERO coverage ===\n');
console.table(untested.slice(0, 20));
