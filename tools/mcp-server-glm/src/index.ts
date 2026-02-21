#!/usr/bin/env node

/**
 * MCP Server for GLM API
 *
 * This server provides GLM models (glm-4, glm-4-plus, glm-4-air, glm-4-flash, glm-4.7, glm-5) as tools for Claude Code
 *
 * Token Optimization Features:
 * - Response caching for identical prompts (reduces duplicate API calls)
 * - Prompt compression for common patterns
 * - Token usage tracking and reporting
 * - Smart max_tokens based on task type
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as crypto from 'crypto';

// GLM API Configuration
const GLM_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// Available GLM models
const GLM_AVAILABLE_MODELS = [
  'glm-4', // General purpose
  'glm-4-plus', // Enhanced performance
  'glm-4-air', // Faster inference
  'glm-4-flash', // Ultra-fast
  'glm-4.7', // Default for Claude Code
  'glm-5', // Latest flagship model
] as const;

type GLMModel = (typeof GLM_AVAILABLE_MODELS)[number];

// Get model from environment or use default
const GLM_MODEL: GLMModel = (process.env.GLM_MODEL as GLMModel) || 'glm-4.7';

// Validate model
if (!GLM_AVAILABLE_MODELS.includes(GLM_MODEL)) {
  console.error(
    `Warning: Unknown model "${GLM_MODEL}". Available models: ${GLM_AVAILABLE_MODELS.join(', ')}`
  );
}

// Get API key from environment
const GLM_API_KEY = process.env.GLM_API_KEY;

if (!GLM_API_KEY) {
  console.error('Error: GLM_API_KEY environment variable is required');
  process.exit(1);
}

// ============================================================================
// TOKEN OPTIMIZATION: CACHING & TRACKING
// ============================================================================

interface CacheEntry {
  response: string;
  timestamp: number;
  tokenCount: number;
}

interface TokenStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  totalTokensUsed: number;
  tokensSaved: number;
}

// Response cache (5 minute TTL)
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Token usage statistics
const tokenStats: TokenStats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalTokensUsed: 0,
  tokensSaved: 0,
};

// Shortened system prompts to reduce tokens
const COMPACT_SYSTEM_PROMPTS = {
  default: 'You are a helpful assistant.',
  code: 'You are an expert developer. Provide concise, well-documented code.',
  analyze: 'You are an expert analyst. Provide brief, actionable insights.',
  review: 'You are a code reviewer. Focus on bugs, security, and improvements.',
  debug: 'You are a debugging expert. Identify root causes and suggest fixes.',
};

/**
 * Generate cache key from messages
 */
function generateCacheKey(messages: Array<{ role: string; content: string }>): string {
  const content = JSON.stringify(messages);
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 32);
}

/**
 * Check cache for existing response
 */
function checkCache(cacheKey: string): CacheEntry | null {
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(cacheKey);
    return null;
  }

  return entry;
}

/**
 * Store response in cache
 */
function cacheResponse(cacheKey: string, response: string, tokenCount: number): void {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now(),
    tokenCount,
  });

  // Cleanup old entries (keep cache under 100 entries)
  if (responseCache.size > 100) {
    const entries = Array.from(responseCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - 100);
    toDelete.forEach(([key]) => responseCache.delete(key));
  }
}

/**
 * Estimate token count (rough: ~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Compress prompt by removing redundant whitespace
 */
function compressPrompt(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generate JWT token for GLM API authentication
 * GLM API key format: id.secret
 */
function generateToken(): string {
  const apiKey = GLM_API_KEY as string;
  const parts = apiKey.split('.');
  if (parts.length !== 2) {
    return apiKey;
  }

  const [id, secret] = parts;

  const header = {
    alg: 'HS256',
    sign_type: 'SIGN',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    api_key: id,
    exp: now + 3600,
    timestamp: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Call GLM API with caching
 */
async function callGLM(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 2000
): Promise<{ response: string; cached: boolean; tokensUsed: number }> {
  // Compress messages to reduce tokens
  const compressedMessages = messages.map(m => ({
    role: m.role,
    content: compressPrompt(m.content),
  }));

  // Check cache
  const cacheKey = generateCacheKey(compressedMessages);
  const cached = checkCache(cacheKey);

  if (cached) {
    tokenStats.cacheHits++;
    tokenStats.tokensSaved += cached.tokenCount;
    return { response: cached.response, cached: true, tokensUsed: 0 };
  }

  tokenStats.cacheMisses++;
  tokenStats.totalRequests++;

  const token = generateToken();

  const requestBody = {
    model: GLM_MODEL,
    messages: compressedMessages,
    temperature: 0.7,
    max_tokens: Math.min(maxTokens, 4000),
  };

  const response = await fetch(GLM_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GLM API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from GLM');
  }

  const responseContent = data.choices[0].message.content;
  const tokensUsed = data.usage?.total_tokens || estimateTokens(responseContent);

  tokenStats.totalTokensUsed += tokensUsed;

  // Cache the response
  cacheResponse(cacheKey, responseContent, tokensUsed);

  return { response: responseContent, cached: false, tokensUsed };
}

// Create MCP Server
const server = new Server(
  {
    name: 'glm-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'glm_chat',
        description:
          'Send a message to GLM and get a response. Use this for general AI tasks, code generation, analysis, and more. Default model is glm-4.7.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt or question to send to GLM',
            },
            systemPrompt: {
              type: 'string',
              description:
                "Optional system prompt to set the behavior (e.g., 'You are a code expert')",
              default: 'You are a helpful AI assistant.',
            },
            temperature: {
              type: 'number',
              description:
                'Temperature for response (0.0-2.0, lower = more focused, higher = more creative)',
              default: 0.7,
            },
            maxTokens: {
              type: 'number',
              description: 'Maximum tokens in response (1-4000)',
              default: 2000,
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'glm_code',
        description:
          'Use GLM for code-related tasks (generation, review, debugging, refactoring). Default model is glm-4.7.',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description:
                "The coding task (e.g., 'Write a function to sort an array', 'Review this code for bugs')",
            },
            code: {
              type: 'string',
              description: 'Existing code to work with (if applicable)',
            },
            language: {
              type: 'string',
              description: "Programming language (e.g., 'javascript', 'typescript', 'python')",
            },
          },
          required: ['task'],
        },
      },
      {
        name: 'glm_analyze',
        description:
          'Use GLM for analysis tasks (text analysis, data interpretation, pattern detection). Default model is glm-4.7.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content to analyze',
            },
            analysisType: {
              type: 'string',
              description:
                "Type of analysis (e.g., 'sentiment', 'summarize', 'extract', 'explain')",
              default: 'general',
            },
            context: {
              type: 'string',
              description: 'Additional context for the analysis',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'glm_stats',
        description:
          'Get token usage statistics for the GLM server (cache hits, tokens saved, total usage).',
        inputSchema: {
          type: 'object',
          properties: {
            reset: {
              type: 'boolean',
              description: 'Reset statistics after reporting (default: false)',
              default: false,
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [{ type: 'text', text: 'Error: Missing arguments' }],
      isError: true,
    };
  }

  try {
    if (name === 'glm_chat') {
      // Use compact system prompt if not specified
      const systemPrompt = (args.systemPrompt as string) || COMPACT_SYSTEM_PROMPTS.default;
      const maxTokens = (args.maxTokens as number) || 2000;

      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: args.prompt as string },
      ];

      const { response, cached, tokensUsed } = await callGLM(messages, maxTokens);

      // Add cache indicator to response
      const cacheNote = cached ? ' [cached]' : '';
      const tokenNote = cached ? '' : ` (${tokensUsed} tokens)`;

      return {
        content: [
          {
            type: 'text',
            text: response + cacheNote + tokenNote,
          },
        ],
      };
    } else if (name === 'glm_code') {
      const language = args.language as string | undefined;
      const task = args.task as string;
      const code = args.code as string | undefined;

      // Use compact code system prompt
      const systemPrompt = language
        ? `Expert ${language} dev. Concise, documented code.`
        : COMPACT_SYSTEM_PROMPTS.code;

      const userPrompt = code ? `${task}\n\`\`\`\n${code}\n\`\`\`` : task;

      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      // Code tasks typically need more tokens
      const { response, cached, tokensUsed } = await callGLM(messages, 3000);

      const cacheNote = cached ? ' [cached]' : '';
      const tokenNote = cached ? '' : ` (${tokensUsed} tokens)`;

      return {
        content: [
          {
            type: 'text',
            text: response + cacheNote + tokenNote,
          },
        ],
      };
    } else if (name === 'glm_analyze') {
      const analysisType = (args.analysisType as string | undefined) || 'general';
      const content = args.content as string;
      const context = args.context as string | undefined;

      // Use compact analyze system prompt
      const systemPrompt = `Expert analyst. ${analysisType} analysis. Brief, actionable.`;

      const userPrompt = context ? `${content}\nCtx: ${context}` : content;

      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      // Analysis tasks typically need fewer tokens
      const { response, cached, tokensUsed } = await callGLM(messages, 1500);

      const cacheNote = cached ? ' [cached]' : '';
      const tokenNote = cached ? '' : ` (${tokensUsed} tokens)`;

      return {
        content: [
          {
            type: 'text',
            text: response + cacheNote + tokenNote,
          },
        ],
      };
    } else if (name === 'glm_stats') {
      const reset = (args.reset as boolean) || false;

      const stats = {
        ...tokenStats,
        cacheSize: responseCache.size,
        cacheHitRate:
          tokenStats.totalRequests > 0
            ? `${((tokenStats.cacheHits / (tokenStats.cacheHits + tokenStats.cacheMisses)) * 100).toFixed(1)}%`
            : 'N/A',
        savingsRate:
          tokenStats.totalTokensUsed + tokenStats.tokensSaved > 0
            ? `${((tokenStats.tokensSaved / (tokenStats.totalTokensUsed + tokenStats.tokensSaved)) * 100).toFixed(1)}%`
            : '0%',
      };

      if (reset) {
        tokenStats.totalRequests = 0;
        tokenStats.cacheHits = 0;
        tokenStats.cacheMisses = 0;
        tokenStats.totalTokensUsed = 0;
        tokenStats.tokensSaved = 0;
        responseCache.clear();
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GLM MCP Server running on stdio');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
