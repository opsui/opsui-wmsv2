#!/usr/bin/env node

/**
 * Prompt Optimizer for GLM
 *
 * Enhances user prompts using GLM-4.7 before sending to the main agent.
 * This creates a two-pass process:
 * 1. First pass: Optimize the prompt for clarity and structure
 * 2. Second pass: Execute the optimized prompt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  model: 'glm-4.7',
  apiKey: '1c4e10d1249440e0b6a5430c21450dc7.tn1bVz1mkDUHbgAW',
  temperature: 0.1,
  maxTokens: 2000
};

// Read workspace context
function getWorkspaceContext() {
  const workspaceRoot = process.cwd();
  const packageJson = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'));

  return {
    name: packageJson.name || 'Warehouse Management System',
    workspace: workspaceRoot,
    techStack: ['TypeScript', 'React', 'NestJS', 'TypeORM', 'PostgreSQL'],
    domains: ['inventory', 'fulfillment', 'picking', 'orders']
  };
}

// Optimize prompt using GLM
async function optimizePrompt(userPrompt, context) {
  const systemPrompt = `You are a prompt optimization specialist. Your job is to rewrite user prompts to be more effective for an AI coding assistant.

## Your Task
Rewrite the user's prompt to be:
1. More specific and explicit
2. Better structured with clear requirements
3. Include relevant context from the codebase
4. Frame the problem in a way that enables precise diagnosis

## Guidelines
- Keep the user's intent intact
- Add technical specificity where helpful
- Structure with clear sections (Context, Problem, Requirements)
- Include relevant file paths if mentioned
- Specify expected outcomes
- Don't add requirements the user didn't imply
- Output ONLY the optimized prompt, no explanation

## Project Context
- Project: ${context.name}
- Tech Stack: ${context.techStack.join(', ')}
- Domains: ${context.domains.join(', ')}

## Example Transformation
USER: "fix the login bug"
OPTIMIZED: "I need to fix a login issue. Please:
1. Search for authentication/login related files in the codebase
2. Read the authentication flow to understand how login works
3. Identify common failure points (validation, API calls, state management)
4. PROBLEM: [describe what's failing - error message?]
5. EVIDENCE: [what have you observed?]
6. HYPOTHESIS: [what do you think is wrong?]
7. PLAN: [what will you do to fix it?]"`;

  try {
    const response = await fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Optimize this prompt:\n\n${userPrompt}` }
        ],
        temperature: CONFIG.temperature,
        max_tokens: CONFIG.maxTokens,
        top_p: 0.85
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Prompt optimization failed:');
    console.error('Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause.message);
    }
    // Fallback to original prompt
    console.log('\n\x1b[33m%s\x1b[0m', 'Using original prompt instead:\n');
    return userPrompt;
  }
}

// Main CLI
async function main() {
  const userPrompt = process.argv.slice(2).join(' ');

  if (!userPrompt || userPrompt === '--help' || userPrompt === '-h') {
    console.log(`
Prompt Optimizer for GLM
========================

Usage:
  node prompt-optimizer.mjs "your prompt here"

The tool will:
  1. Send your prompt through GLM for optimization
  2. Output the enhanced prompt
  3. You can then copy it to your main agent

Example:
  node prompt-optimizer.mjs "fix the login bug"
`);
    process.exit(0);
  }

  const context = getWorkspaceContext();

  console.log('\x1b[36m%s\x1b[0m', '🔧 Optimizing prompt...\n');

  const optimized = await optimizePrompt(userPrompt, context);

  console.log('\x1b[32m%s\x1b[0m', '✅ Optimized prompt:\n');
  console.log('\x1b[1m%s\x1b[0m', '━'.repeat(60));
  console.log(optimized);
  console.log('\x1b[1m%s\x1b[0m', '━'.repeat(60));

  // Copy to clipboard (Windows)
  if (process.platform === 'win32') {
    const { exec } = await import('child_process');
    exec(`echo ${JSON.stringify(optimized)} | clip`, (err) => {
      if (!err) {
        console.log('\x1b[33m%s\x1b[0m', '\n📋 Copied to clipboard!');
      }
    });
  }
}

main().catch(console.error);
