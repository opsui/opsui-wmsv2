# GLM API Setup Guide

## Available Models

The GLM API client has two models in an Opus/Sonnet-style selection:

| Model     | Equivalent    | Description        | Use Case                             |
| --------- | ------------- | ------------------ | ------------------------------------ |
| `glm-5`   | Claude Opus   | Most capable model | Complex reasoning, difficult tasks   |
| `glm-4.7` | Claude Sonnet | Fast and efficient | Balanced performance, everyday tasks |

**Default Model:** `glm-5` (most capable)

## Quick Start

```bash
# Test with default model (glm-5)
node ai-loop/test-glm-api.js

# Test with GLM-4.7 (faster)
node ai-loop/test-glm-api.js glm-4.7

# List all models
node ai-loop/test-glm-api.js --list
```

## Usage

### Command Line

```bash
# Use default model (glm-5)
node test-glm-api.js

# Use GLM-5 (Opus-like) - most capable
node test-glm-api.js glm-5

# Use GLM-4.7 (Sonnet-like) - fast and efficient
node test-glm-api.js glm-4.7

# List all available models
node test-glm-api.js --list
```

### Environment Variable

Set the `GLM_MODEL` environment variable to change the default model:

**Windows (Command Prompt):**

```cmd
set GLM_MODEL=glm-4.7
```

**Windows (PowerShell):**

```powershell
$env:GLM_MODEL="glm-4.7"
```

**Linux/Mac:**

```bash
export GLM_MODEL=glm-4.7
```

### In Code

```typescript
import { GLMClient, GLM_MODELS } from './glm-client';

// Option 1: Use default model (glm-5)
const client = new GLMClient(apiKey);

// Option 2: Specify a model
const client = new GLMClient(apiKey, 'glm-4.7');

// Option 3: Change model after creation
client.setModel('glm-4.7');

// Get current model info
console.log(client.getModel()); // 'glm-4.7'
console.log(client.getModelInfo()); // { name: 'GLM-4.7', ... }

// List all available models
const models = GLMClient.getAvailableModels();
console.log(models);
// Output: { 'glm-5': {...}, 'glm-4.7': {...} }
```

## When to Use Which Model

### Use GLM-5 (like Opus) when:

- Complex reasoning required
- Difficult test scenarios
- Security analysis
- Root cause investigation
- Maximum accuracy needed

### Use GLM-4.7 (like Sonnet) when:

- Fast responses needed
- Simple test generation
- High volume requests
- Cost-conscious operations
- Everyday tasks

## API Key Setup

### Get Your API Key

1. Visit https://open.bigmodel.cn/
2. Sign up and get your API key
3. Format: `id.secret`

### Set Environment Variable (Recommended)

**Windows (Command Prompt):**

```cmd
set GLM_API_KEY=your_api_key_here
```

**Windows (PowerShell):**

```powershell
$env:GLM_API_KEY="your_api_key_here"
```

**Linux/Mac:**

```bash
export GLM_API_KEY=your_api_key_here
```

### Or Create .env File

Create a `.env` file in the `ai-loop` directory:

```
GLM_API_KEY=your_api_key_here
GLM_MODEL=glm-5
```

## Troubleshooting

### Error: "model not found"

1. Try the other model:
   ```bash
   node test-glm-api.js glm-4.7
   node test-glm-api.js glm-5
   ```

### Error: "Invalid API key"

- Verify your API key is in correct format: `id.secret`
- Check your API key hasn't expired
- Ensure your account is active

### Error: "Rate limit exceeded"

The GLM API has strict rate limits. The code handles this with:

- 3-second delays between requests
- Automatic retries with exponential backoff
- Max 1 concurrent request

## Security Best Practices

1. **Never commit API keys** to version control
2. Add `.env` to `.gitignore`
3. Use environment variables in production
4. Rotate API keys regularly
5. Use different keys for dev/staging/prod

## Getting Help

- Zhipu AI Documentation: https://open.bigmodel.cn/dev/api
- Contact support if your key is valid but still getting errors
