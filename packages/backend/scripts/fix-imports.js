/**
 * Fix ES module imports to include .js extensions
 *
 * This script fixes the compiled JavaScript files to add .js extensions
 * to relative imports, which is required for Node.js ES modules.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '../dist');

/**
 * Check if a path exists and is a directory
 */
function isDirectory(basePath, relativePath) {
  try {
    const fullPath = resolve(basePath, relativePath);
    const stats = statSync(fullPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Fix import statements in a file
 */
function fixImportsInFile(filePath, baseDir) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;

  // Get the directory of the current file for resolving relative paths
  const fileDir = dirname(filePath);

  // Fix relative imports without extensions
  // Match: from './something' or from './something/else'
  // But NOT: from './something.js' or from 'npm-package' or from 'fs'
  const importRegex = /(?:from|import)\s+['"]([^'"]+)['"]/g;

  content = content.replace(importRegex, (match, importPath) => {
    // Skip if it's not a relative import
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
      return match;
    }

    // Skip if it already has an extension
    if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
      return match;
    }

    let newPath;
    // Check if the import points to a directory (which should get /index.js)
    if (isDirectory(fileDir, importPath)) {
      newPath = importPath + '/index.js';
    } else {
      newPath = importPath + '.js';
    }

    modified = true;
    return match.replace(importPath, newPath);
  });

  if (modified) {
    writeFileSync(filePath, content, 'utf-8');
    return true;
  }

  return false;
}

/**
 * Recursively process all .js files in a directory
 */
function processDirectory(dir) {
  let fixedCount = 0;

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      fixedCount += processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      if (fixImportsInFile(fullPath, dir)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

// Run the fix
console.log('Fixing ES module imports in dist folder...');
const fixedCount = processDirectory(distDir);
console.log(`Fixed ${fixedCount} files`);
