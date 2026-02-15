# GLM Setup for Claude Code in VS Code

This guide shows how to configure GLM models (including GLM 5) as custom models for Claude Code in VS Code using an MCP server.

## Overview

GLM models are now available as custom models through a Model Context Protocol (MCP) server. This allows Claude Code to use GLM for:

- General AI tasks and conversations
- Code generation, review, and debugging
- Text analysis and pattern detection

## Available Models

| Model         | Description                       | Best For                             |
| ------------- | --------------------------------- | ------------------------------------ |
| `glm-4.7`     | **Default model for Claude Code** | General coding, balanced performance |
| `glm-5`       | Latest flagship model             | Advanced reasoning, complex coding   |
| `glm-4-plus`  | Enhanced version                  | Complex reasoning                    |
| `glm-4-flash` | Faster, cheaper                   | Quick tasks, simple queries          |
| `glm-4-air`   | Lightweight                       | Basic assistance                     |
| `glm-4`       | General purpose                   | Standard tasks                       |

## Prerequisites

1. **GLM API Key**: You need a Zhipu AI (BigModel) API key
   - Visit: https://open.bigmodel.cn/
   - Sign up and get your API key
   - Format: `id.secret`

2. **Node.js**: Ensure Node.js is installed (v18 or higher recommended)

## Setup Instructions

### Step 1: Get Your GLM API Key

1. Go to https://open.bigmodel.cn/
2. Sign up or log in
3. Navigate to your account settings or API management
4. Generate a new API key
5. Copy the API key (format: `id.secret`)

### Step 2: Configure the API Key

Open `.claude/settings.json` in your project root and find the GLM server configuration:

```json
"glm": {
  "command": "npx",
  "args": [
    "-y",
    "tsx",
    "C:\\Users\\Heinricht\\Documents\\Warehouse Management System\\tools\\mcp-server-glm\\src\\index.ts"
  ],
  "env": {
    "GLM_API_KEY": "YOUR_GLM_API_KEY_HERE"
  }
}
```

Replace `YOUR_GLM_API_KEY_HERE` with your actual GLM API key.

**Example:**

```json
"glm": {
  "command": "npx",
  "args": [
    "-y",
    "tsx",
    "C:\\Users\\Heinricht\\Documents\\Warehouse Management System\\tools\\mcp-server-glm\\src\\index.ts"
  ],
  "env": {
    "GLM_API_KEY": "12345.abcdef123456"
  }
}
```

### Step 3: Restart VS Code

After updating the configuration:

1. Save the `settings.json` file
2. Restart VS Code to load the new MCP server
3. Claude Code will automatically detect the GLM server

## Available GLM Tools

Once configured, Claude Code can access three GLM tools:

### 1. `glm_chat` - General AI Assistant

Use for general AI tasks, questions, and conversations.

**Parameters:**

- `prompt` (required): Your question or request
- `systemPrompt` (optional): Set the AI's behavior (default: "You are a helpful AI assistant.")
- `temperature` (optional): 0.0-2.0, lower = more focused, higher = more creative (default: 0.7)
- `maxTokens` (optional): Maximum response tokens, 1-4000 (default: 2000)

**Example usage in conversation:**

```
"Use glm_chat to explain what RESTful APIs are"
```

### 2. `glm_code` - Code Expert

Use for code-related tasks including generation, review, debugging, and refactoring.

**Parameters:**

- `task` (required): Description of the coding task
- `code` (optional): Existing code to work with
- `language` (optional): Programming language (e.g., "javascript", "typescript", "python")

**Example usage:**

```
"Use glm_code to write a function that sorts an array of objects by date"
"Use glm_code to review this code for bugs: [paste code]"
"Use glm_code with language typescript to refactor this code"
```

### 3. `glm_analyze` - Analysis Expert

Use for text analysis, data interpretation, and pattern detection.

**Parameters:**

- `content` (required): The content to analyze
- `analysisType` (optional): Type of analysis (e.g., "sentiment", "summarize", "extract", "explain", default: "general")
- `context` (optional): Additional context for the analysis

**Example usage:**

```
"Use glm_analyze with analysisType summarize to summarize this document"
"Use glm_analyze to extract key insights from this log file"
"Use glm_analyze with context 'this is from user feedback' to analyze sentiment"
```

## Using GLM in Claude Code

### Direct Requests

You can directly ask Claude Code to use GLM:

```
"Ask GLM to explain quantum computing"
"Use GLM to generate a React component for a user profile"
"Have GLM analyze this error message and suggest fixes"
```

### Implicit Usage

Claude Code will automatically determine when to use GLM for tasks that benefit from AI capabilities:

```
"Generate some test cases for this function"
"Review this code for security vulnerabilities"
"Explain this complex algorithm"
```

## Testing Your Setup

To verify that GLM is working correctly:

1. Start a new conversation in Claude Code
2. Ask: "Use glm_chat to say 'Hello, GLM is working!'"
3. You should receive a response from GLM

### Troubleshooting

**Issue: GLM server not detected**

- Verify the API key is correct
- Ensure the MCP server path is correct
- Restart VS Code
- Check that `tools/mcp-server-glm/src/index.ts` exists

**Issue: Authentication errors**

- Verify your API key format: `id.secret`
- Check that your API key hasn't expired
- Ensure your Zhipu AI account is active

**Issue: Rate limiting**

- GLM has strict rate limits
- The server includes automatic retry with exponential backoff
- Consider upgrading your API plan for higher limits

## Advanced Configuration

### Adjusting Rate Limits

If you encounter rate limits, you can modify `tools/mcp-server-glm/src/index.ts`:

```typescript
// Increase concurrent requests
private maxConcurrentRequests = 3; // Default: 1

// Decrease delay between requests
private requestDelay = 2000; // Default: 3000ms
```

**Note:** Since we're using npx tsx to run the TypeScript file directly, no compilation step is needed. Changes take effect after restarting VS Code.

### Adding Custom Tools

You can add custom GLM tools by extending the MCP server. Edit `tools/mcp-server-glm/src/index.ts` and add new tools to the `ListToolsRequestSchema` handler.

Since the server runs TypeScript directly via npx tsx, changes take effect immediately after restarting VS Code without needing to recompile.

## Security Best Practices

1. **Never commit API keys** to version control
2. The `.claude` directory is typically in `.gitignore`, but verify this
3. Use different API keys for development and production
4. Rotate API keys regularly
5. Monitor API usage in your Zhipu AI dashboard

## API Cost Considerations

- GLM models have associated costs based on token usage
- Monitor your usage in the Zhipu AI dashboard
- Set up budget alerts if available
- Consider using `glm-4-flash` or `glm-4-air` for cost-sensitive tasks
- `glm-5` is the flagship model with the best performance but may have higher costs

## Changing the Model

The server defaults to `glm-4.7`. To switch to a different model, you have two options:

### Option 1: Environment Variable (Recommended)

Add `GLM_MODEL` to the environment in your `.claude/settings.json`:

```json
"glm": {
  "command": "npx",
  "args": [
    "-y",
    "tsx",
    "C:\\Users\\Heinricht\\Documents\\Warehouse Management System\\tools\\mcp-server-glm\\src\\index.ts"
  ],
  "env": {
    "GLM_API_KEY": "YOUR_GLM_API_KEY_HERE",
    "GLM_MODEL": "glm-5"
  }
}
```

### Option 2: Edit the Source File

1. Edit `tools/mcp-server-glm/src/index.ts`
2. Find the `GLM_MODEL` constant near the top:
   ```typescript
   const GLM_MODEL: GLMModel = (process.env.GLM_MODEL as GLMModel) || 'glm-4.7';
   ```
3. Change the default value (the last string) to your preferred model
4. Restart VS Code (no rebuild needed since we use npx tsx)

**Available models:**

| Model         | Description             | Best For                          |
| ------------- | ----------------------- | --------------------------------- |
| `glm-4.7`     | Default for Claude Code | General coding, balanced tasks    |
| `glm-5`       | Latest flagship         | Advanced reasoning, complex tasks |
| `glm-4-plus`  | Enhanced version        | Complex reasoning                 |
| `glm-4-flash` | Ultra-fast              | Quick tasks, simple queries       |
| `glm-4-air`   | Lightweight             | Basic assistance                  |
| `glm-4`       | General purpose         | Standard tasks                    |

## Support

- **GLM API Documentation**: https://open.bigmodel.cn/dev/api
- **MCP Documentation**: https://modelcontextprotocol.io/
- **Claude Code Documentation**: Available in VS Code extension marketplace

## Example Workflows

### Code Review Workflow

```
"Use glm_code to review this file for potential bugs and improvements"
"Ask GLM to suggest test cases for this function"
"Use GLM to generate documentation for this code"
```

### Debugging Workflow

```
"Use glm_analyze to explain this error stack trace"
"Have GLM suggest possible causes for this bug"
"Ask GLM to provide a step-by-step debugging approach"
```

### Learning Workflow

```
"Use glm_chat to explain how React hooks work"
"Ask GLM to provide examples of design patterns"
"Use GLM to create a study guide for TypeScript"
```

## Integration with Existing Tools

GLM works alongside your existing MCP servers:

- **erp-dev-accelerator**: Project-specific tools
- **github**: GitHub integration
- **postgres**: Database queries
- **filesystem**: File system operations
- **glm**: AI-powered assistance (new!)

You can chain tools together:

```
"Read the database schema, then ask GLM to generate a data model diagram"
"List recent GitHub issues, then use GLM to prioritize them"
```

## Performance Tips

1. **Cache responses**: GLM may give similar answers to similar questions
2. **Be specific**: Detailed prompts get better results
3. **Use appropriate tools**: Use `glm_code` for code, `glm_analyze` for analysis, `glm_chat` for general tasks
4. **Set appropriate temperature**: Lower for code/analysis, higher for creative tasks
5. **Limit token usage**: Set `maxTokens` appropriately to control costs

---

**Enjoy using GLM with Claude Code!** 🚀
