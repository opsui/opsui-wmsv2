/**
 * AI-ENHANCED AUTO-FIX GENERATOR v2.0
 *
 * Generates an optimized prompt for Claude Code to fix errors found by the crawler.
 * Uses GLM AI to analyze errors, prioritize fixes, and generate smart suggestions.
 *
 * This can be used with:
 * - Claude Code CLI
 * - Claude Code VSCode extension
 * - Manual paste to Claude
 */

import * as fs from 'fs';
import * as path from 'path';
import { GLMClient } from './glm-client';

interface NormalizedError {
  id: string;
  type: string;
  count: number;
  routes: string[];
  message: string;
  stack?: string;
  priority: string;
  suggestedFix?: string;
}

interface ErrorReport {
  summary: {
    totalUniqueErrors: number;
    byPriority: Record<string, number>;
  };
  errors: NormalizedError[];
  apiIssues: any[];
  quickFix: any[];
}

interface AIAnalysis {
  priorityGroups: {
    critical: string[];
    high: string[];
    medium: string[];
  };
  relatedErrors: Array<{
    group: string;
    errors: string[];
    commonCause: string;
    suggestedApproach: string;
  }>;
  fixStrategy: {
    recommendedOrder: string[];
    batchFixes: Array<{
      errors: string[];
      commonFix: string;
      files: string[];
    }>;
    quickWins: string[];
  };
  riskAssessment: {
    highRiskFixes: string[];
    safeToFix: string[];
    needsTesting: string[];
  };
}

/**
 * Generate AI-powered analysis of errors using GLM
 */
async function analyzeErrorsWithAI(
  errors: NormalizedError[],
  glmClient: GLMClient
): Promise<AIAnalysis> {
  console.log('\n🤖 Running AI analysis on errors...');

  // Prepare error summary for AI
  const errorSummary = errors.slice(0, 20).map(err => ({
    id: err.id,
    type: err.type,
    priority: err.priority,
    message: err.message.slice(0, 200),
    routes: err.routes.slice(0, 3).join(', '),
  }));

  const systemPrompt = {
    role: 'system' as const,
    content: `You are an expert code analyst specializing in React/TypeScript error analysis.
Analyze crawler errors and provide intelligent fix strategies.

Return JSON:
{
  "priorityGroups": {
    "critical": ["ERR-001", "ERR-002"],
    "high": ["ERR-003"],
    "medium": ["ERR-004"]
  },
  "relatedErrors": [
    {
      "group": "Auth Issues",
      "errors": ["ERR-001", "ERR-002"],
      "commonCause": "JWT token handling",
      "suggestedApproach": "Fix auth middleware together"
    }
  ],
  "fixStrategy": {
    "recommendedOrder": ["ERR-001", "ERR-002", "ERR-003"],
    "batchFixes": [
      {
        "errors": ["ERR-001", "ERR-002"],
        "commonFix": "Add null checks with optional chaining",
        "files": ["packages/frontend/src/components/*.tsx"]
      }
    ],
    "quickWins": ["ERR-004"]
  },
  "riskAssessment": {
    "highRiskFixes": ["ERR-001"],
    "safeToFix": ["ERR-003", "ERR-004"],
    "needsTesting": ["ERR-002"]
  }
}

Consider:
- Group related errors for batch fixing
- Identify safe quick wins
- Flag high-risk changes
- Suggest optimal fix order`,
  };

  const userPrompt = {
    role: 'user' as const,
    content: `Analyze these ${errors.length} crawler errors and provide fix strategy:

Errors:
${errorSummary.map(e => `- [${e.id}] ${e.type} (${e.priority}): ${e.message} on ${e.routes}`).join('\n')}

Provide intelligent fix grouping and prioritization.`,
  };

  try {
    const response = await glmClient.callGLM([systemPrompt, userPrompt]);

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    console.log('✅ AI analysis complete');
    return analysis;
  } catch (error) {
    console.log('⚠️  AI analysis failed, using fallback:', (error as Error).message);

    // Fallback: simple grouping
    const critical = errors.filter(e => e.priority === 'critical').map(e => e.id);
    const high = errors.filter(e => e.priority === 'high').map(e => e.id);
    const medium = errors.filter(e => e.priority === 'medium').map(e => e.id);

    return {
      priorityGroups: { critical, high, medium },
      relatedErrors: [],
      fixStrategy: {
        recommendedOrder: [...critical, ...high, ...medium],
        batchFixes: [],
        quickWins: medium,
      },
      riskAssessment: {
        highRiskFixes: critical,
        safeToFix: medium,
        needsTesting: high,
      },
    };
  }
}

/**
 * Generate AI-enhanced fix prompt
 */
async function generateFixPrompt(
  report: ErrorReport,
  aiAnalysis: AIAnalysis
): Promise<string> {
  const { errors, apiIssues, quickFix, summary } = report;

  let prompt = `# WMS Error Fix Request - AI-Optimized

You are fixing a production React/TypeScript Warehouse Management System.
This fix request has been **AI-analyzed** for optimal prioritization and grouping.

## 🎯 AI-Recommended Fix Order

The errors below are sorted by AI analysis for maximum impact with minimum risk:

`;

  // Add AI priority groups
  if (aiAnalysis.priorityGroups.critical.length > 0) {
    prompt += `### 🔴 CRITICAL (Fix First)
${aiAnalysis.priorityGroups.critical.map(id => {
      const err = errors.find(e => e.id === id);
      return `- **[${err?.id}]** ${err?.message.slice(0, 80)}...`;
    }).join('\n')}

`;
  }

  if (aiAnalysis.priorityGroups.high.length > 0) {
    prompt += `### 🟠 HIGH PRIORITY
${aiAnalysis.priorityGroups.high.map(id => {
      const err = errors.find(e => e.id === id);
      return `- **[${err?.id}]** ${err?.message.slice(0, 80)}...`;
    }).join('\n')}

`;
  }

  // Add batch fix suggestions
  if (aiAnalysis.fixStrategy.batchFixes.length > 0) {
    prompt += `## 📦 AI-Identified Batch Fixes

These errors can be fixed together with a single change:

`;
    for (const batch of aiAnalysis.fixStrategy.batchFixes) {
      prompt += `### ${batch.errors.join(', ')}
**Common Fix:** ${batch.commonFix}
**Files Affected:** ${batch.files.join(', ')}

`;
    }
  }

  prompt += `## Hard Rules
- Fix ONLY the errors provided below
- Do NOT refactor unrelated code
- Do NOT change architecture or patterns
- Preserve existing styles and formatting
- Return code patches with file paths and line numbers

## Context
- Framework: React with TypeScript
- Runtime: Vite dev server
- Backend: NestJS with PostgreSQL
- Errors are reproducible via UI interaction

## Error Summary
- Total Unique Errors: ${summary.totalUniqueErrors}
- Critical: ${summary.byPriority.critical || 0}
- High: ${summary.byPriority.high || 0}
- Medium: ${summary.byPriority.medium || 0}

`;

  // Group errors by AI-suggested related groups
  const processedErrors = new Set<string>();

  for (const group of aiAnalysis.relatedErrors) {
    prompt += `## 📁 Related Error Group: ${group.group}\n\n`;
    prompt += `**Common Cause:** ${group.commonCause}\n`;
    prompt += `**Suggested Approach:** ${group.suggestedApproach}\n\n`;

    for (const errId of group.errors) {
      const err = errors.find(e => e.id === errId);
      if (err) {
        prompt += formatError(err);
        processedErrors.add(err.id);
      }
    }
  }

  // Add remaining errors not in groups
  const ungroupedErrors = errors.filter(e => !processedErrors.has(e.id));
  if (ungroupedErrors.length > 0) {
    prompt += `## Other Errors\n\n`;

    // Group by type
    const byType = new Map<string, NormalizedError[]>();
    for (const err of ungroupedErrors) {
      if (!byType.has(err.type)) {
        byType.set(err.type, []);
      }
      byType.get(err.type)!.push(err);
    }

    for (const [type, typeErrors] of byType.entries()) {
      prompt += `### ${type.toUpperCase()} Errors\n\n`;
      for (const err of typeErrors) {
        prompt += formatError(err);
      }
    }
  }

  // Add API issues
  if (apiIssues.length > 0) {
    prompt += `\n## API Issues\n\n`;
    for (const api of apiIssues.slice(0, 10)) {
      prompt += `### [${api.status}] ${api.endpoint}\n`;
      prompt += `- **Method**: ${api.methods.join(', ')}\n`;
      prompt += `- **Occurrences**: ${api.count}\n`;
      prompt += `- **Routes**: ${api.routes.join(', ')}\n\n`;
    }
  }

  prompt += `
## Expected Output Format

For each error, provide:
1. **File**: Path to file containing the error
2. **Line**: Line number (if available from stack)
3. **Problem**: Brief description of what's wrong
4. **Solution**: Code fix

\`\`\`diff
--- a/packages/frontend/src/components/SomeComponent.tsx
+++ b/packages/frontend/src/components/SomeComponent.tsx
@@ -10,7 +10,7 @@
-  const value = data.property.nested;
+  const value = data.property?.nested;
\`\`\`

---

Please fix these errors now, following the AI-recommended priority order above.
`;

  return prompt;
}

/**
 * Format a single error for the prompt
 */
function formatError(err: NormalizedError): string {
  let output = `### [${err.id}] ${err.priority.toUpperCase()}\n`;
  output += `**Routes**: ${err.routes.join(', ')}\n`;
  output += `**Occurrences**: ${err.count}\n`;
  output += `**Message**:\n\`\`\`\n${err.message}\n\`\`\`\n`;

  if (err.stack) {
    const stackLines = err.stack.split('\n').slice(0, 3);
    output += `**Stack Trace**:\n\`\`\`\n${stackLines.join('\n')}\n\`\`\`\n`;
  }

  if (err.suggestedFix) {
    output += `**Suggested Fix**: ${err.suggestedFix}\n`;
  }

  output += '\n';
  return output;
}

/**
 * Main function
 */
async function main() {
  const reportPath = path.join(__dirname, 'normalized-errors.json');

  if (!fs.existsSync(reportPath)) {
    console.error('❌ No normalized-errors.json found.');
    console.error('   Run: npm run crawl:all');
    process.exit(1);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     AI-ENHANCED AUTO-FIX PROMPT GENERATOR v2.0            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const report: ErrorReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

  if (report.summary.totalUniqueErrors === 0) {
    console.log('✅ No errors to fix! All systems operational.\n');
    return;
  }

  // Initialize GLM client
  const glmApiKey = process.env.GLM_API_KEY || '1c4e10d1249440e0b6a5430c21450dc7.tn1bVz1mkDUHbgAW';
  const glmClient = new GLMClient(glmApiKey);

  // Run AI analysis
  const aiAnalysis = await analyzeErrorsWithAI(report.errors, glmClient);

  // Generate AI-enhanced prompt
  const prompt = await generateFixPrompt(report, aiAnalysis);

  // Save prompt to file
  const promptPath = path.join(__dirname, 'fix-prompt.md');
  fs.writeFileSync(promptPath, prompt, 'utf-8');

  console.log(`📝 Generated AI-optimized fix prompt for ${report.summary.totalUniqueErrors} error(s)\n`);
  console.log(`✅ Prompt saved to: ${promptPath}\n`);

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('NEXT STEPS:\n');

  console.log('Option 1: Copy prompt to Claude Code');
  console.log(`  1. Open: ${promptPath}`);
  console.log('  2. Copy entire contents');
  console.log('  3. Paste into Claude Code\n');

  console.log('Option 2: Use with Claude Code CLI (if available)');
  console.log(`  cat ${promptPath} | claude-code\n`);

  console.log('Option 3: View and copy manually');
  console.log(`  code ${promptPath}\n`);

  // Show AI insights
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🤖 AI INSIGHTS:\n');

  if (aiAnalysis.fixStrategy.quickWins.length > 0) {
    console.log(`⚡ Quick Wins: ${aiAnalysis.fixStrategy.quickWins.length}`);
    console.log(`   ${aiAnalysis.fixStrategy.quickWins.slice(0, 5).join(', ')}\n`);
  }

  if (aiAnalysis.fixStrategy.batchFixes.length > 0) {
    console.log(`📦 Batch Fixes: ${aiAnalysis.fixStrategy.batchFixes.length}`);
    console.log(`   Can fix ${aiAnalysis.fixStrategy.batchFixes.reduce((sum, b) => sum + b.errors.length, 0)} errors in ${aiAnalysis.fixStrategy.batchFixes.length} changes\n`);
  }

  if (aiAnalysis.relatedErrors.length > 0) {
    console.log(`🔗 Related Groups: ${aiAnalysis.relatedErrors.length}`);
    aiAnalysis.relatedErrors.forEach(g => {
      console.log(`   - ${g.group}: ${g.errors.join(', ')}`);
    });
    console.log('');
  }

  // Preview
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PREVIEW (first 1500 chars):\n');
  console.log(prompt.slice(0, 1500) + '...\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('🔗 Quick links:');
  console.log(`   Full report: ${reportPath}`);
  console.log(`   Fix prompt: ${promptPath}\n`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
