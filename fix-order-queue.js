const fs = require('fs');
const path = '/root/opsui-wmsv2/packages/backend/src/repositories/OrderRepository.ts';
let content = fs.readFileSync(path, 'utf8');

// Remove all broken fix attempts (lines with literal \n characters)
// Match any line that looks like a broken fix
const lines = content.split('\n');
const cleanedLines = [];
let skipNext = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Skip lines that contain literal \n escape sequences (broken sed insert)
  if (
    line.includes('\\n    // This prevents') ||
    line.includes('\\n    if (filters.status === PENDING\\') ||
    line.includes('\\n      conditions.push') ||
    line.includes('\\n    }\\n')
  ) {
    continue;
  }

  // Skip duplicate correct fix (we'll add one clean version)
  if (
    line.includes('// For PENDING status, exclude orders that are already claimed') &&
    cleanedLines.some(l =>
      l.includes('// For PENDING status, exclude orders that are already claimed')
    )
  ) {
    // Skip this line and the next 4 lines of the duplicate
    i += 4;
    continue;
  }

  cleanedLines.push(line);
}

content = cleanedLines.join('\n');

// Now add the clean fix
const target =
  "    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';";

// Check if fix already exists
if (!content.includes("if (filters.status === 'PENDING' && !filters.pickerId)")) {
  const fix = `    // For PENDING status, exclude orders that are already claimed (have a picker_id)
    // This prevents showing already-claimed orders in the queue
    if (filters.status === 'PENDING' && !filters.pickerId) {
      conditions.push(\`o.picker_id IS NULL\`);
    }

${target}`;
  content = content.replace(target, fix);
}

fs.writeFileSync(path, content);
console.log('Fixed!');
