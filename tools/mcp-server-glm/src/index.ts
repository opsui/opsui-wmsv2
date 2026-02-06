#!/usr/bin/env node

/**
 * MCP Server for GLM 4.7 API
 *
 * This server provides GLM 4.7 as a tool for Claude Code
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as crypto from 'crypto';

// GLM API Configuration
const GLM_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM_MODEL = 'glm-4.7';

// Get API key from environment
const GLM_API_KEY = process.env.GLM_API_KEY;

if (!GLM_API_KEY) {
  console.error('Error: GLM_API_KEY environment variable is required');
  process.exit(1);
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
 * Call GLM API
 */
async function callGLM(messages: Array<{ role: string; content: string }>): Promise<string> {
  const token = generateToken();

  const requestBody = {
    model: GLM_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 4000,
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

  return data.choices[0].message.content;
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
          'Send a message to GLM 4.7 and get a response. Use this for general AI tasks, code generation, analysis, and more.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt or question to send to GLM 4.7',
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
          'Use GLM 4.7 for code-related tasks (generation, review, debugging, refactoring)',
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
          'Use GLM 4.7 for analysis tasks (text analysis, data interpretation, pattern detection)',
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
      const messages: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: (args.systemPrompt as string) || 'You are a helpful AI assistant.',
        },
        {
          role: 'user',
          content: args.prompt as string,
        },
      ];

      const response = await callGLM(messages);

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } else if (name === 'glm_code') {
      const language = args.language as string | undefined;
      const task = args.task as string;
      const code = args.code as string | undefined;

      const systemPrompt = language
        ? `You are an expert ${language} developer. Provide clear, well-documented code following best practices.`
        : 'You are an expert software developer. Provide clear, well-documented code following best practices.';

      const userPrompt = code ? `${task}\n\nCode:\n\`\`\`\n${code}\n\`\`\`` : task;

      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await callGLM(messages);

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } else if (name === 'glm_analyze') {
      const analysisType = (args.analysisType as string | undefined) || 'general';
      const content = args.content as string;
      const context = args.context as string | undefined;

      const systemPrompt = `You are an expert analyst. Perform ${analysisType} analysis on the provided content.`;

      const userPrompt = context ? `${content}\n\nContext: ${context}` : content;

      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await callGLM(messages);

      return {
        content: [
          {
            type: 'text',
            text: response,
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
