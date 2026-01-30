# GLM API Setup Guide

## Problem

The AI loop is getting a 404 error when trying to use the GLM API with model `glm-4.7`.

## Root Cause

The API key is hardcoded in the code and may be:

- Invalid or expired
- Not authorized for the `glm-4.7` model
- Missing proper permissions

## Solution

### Option 1: Set Environment Variable (Recommended)

1. Get your API key from Zhipu AI (BigModel)
   - Visit: https://open.bigmodel.cn/
   - Sign up and get your API key
   - Format: `id.secret`

2. Set the environment variable:

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
export GLM_API_KEY="your_api_key_here"
```

3. Run your AI loop commands:

```bash
cd ai-loop
npm run crawl:all
node auto-fix.ts
```

### Option 2: Create .env File

Create a `.env` file in the `ai-loop` directory:

```
GLM_API_KEY=your_api_key_here
```

Then update the code to use dotenv. Add this to `auto-fix.ts`:

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

// Then use:
const glmApiKey = process.env.GLM_API_KEY || 'your_fallback_key';
```

### Option 3: Update Hardcoded Key (Temporary)

If you have a valid API key, you can temporarily update it in `ai-loop/auto-fix.ts` at line 272:

```typescript
const glmApiKey = process.env.GLM_API_KEY || 'your_valid_api_key_here';
```

## Available GLM Models

The GLM API supports these models:

- `glm-4` - General purpose
- `glm-4-plus` - Enhanced performance
- `glm-4-air` - Faster inference
- `glm-4-flash` - Ultra-fast
- `glm-4-7` - (if this exists in your account)

**Note:** Model availability depends on your API plan. Check your Zhipu AI console to see which models you have access to.

## Troubleshooting

### Error: "model: glm-4.7 not found"

1. Check your Zhipu AI console for available models
2. Update the model in `ai-loop/glm-client.ts`:

```typescript
private model = 'glm-4'; // or glm-4-plus, etc.
```

### Error: "Invalid API key"

- Verify your API key is in correct format: `id.secret`
- Check your API key hasn't expired
- Ensure your account is active

### Error: "Rate limit exceeded"

The GLM API has strict rate limits. The code already handles this with:

- 3-second delays between requests
- Automatic retries with exponential backoff
- Max 1 concurrent request

## Testing Your API Key

Create a test file `test-glm.js`:

```javascript
const { GLMClient } = require('./glm-client.ts');

async function test() {
  const client = new GLMClient('your_api_key_here');

  try {
    const result = await client.callGLM([
      { role: 'user', content: 'Say "API works!"' },
    ]);
    console.log('✅ API Test:', result);
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
  }
}

test();
```

Run with: `node ai-loop/test-glm.js`

## Security Best Practices

1. **Never commit API keys** to version control
2. Add `.env` to `.gitignore`
3. Use environment variables in production
4. Rotate API keys regularly
5. Use different keys for dev/staging/prod

## Getting Help

- Zhipu AI Documentation: https://open.bigmodel.cn/dev/api
- Contact support if your key is valid but still getting 404
