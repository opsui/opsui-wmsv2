# Claude Code Extension - API Error Fix Guide

## Error: Invalid signature in thinking block

**Error Message:**
```
API Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"messages.1.content.0: Invalid signature in thinking block"},"request_id":"..."}
```

## Root Cause

This error occurs when the thinking block format in the API request doesn't match the expected signature. The Anthropic API expects thinking blocks in a specific XML-like format.

## Solutions

### Solution 1: Check Extension Configuration

1. **Open VSCode Settings:**
   - Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
   - Search for "Claude Code" or "Anthropic"

2. **Verify API Configuration:**
   ```json
   {
     "anthropic.apiKey": "your-api-key-here",
     "anthropic.model": "claude-sonnet-4.1-20250514" // or your preferred model
   }
   ```

3. **Disable Thinking Blocks (if not needed):**
   - Some extensions have a setting to disable thinking blocks
   - Check for: `"anthropic.enableThinkingBlocks": false`

### Solution 2: Update Extension

1. **Check for Updates:**
   - Go to Extensions tab (`Ctrl+Shift+X`)
   - Search for "Claude Code"
   - Click "Update" if available

2. **If already updated, try:**
   - Disable the extension
   - Reload VSCode
   - Re-enable the extension
   - Reload VSCode again

### Solution 3: Clear Extension Cache

```bash
# Windows PowerShell
$env:APPDATA\Code\User\globalStorage
# Look for extension folder and delete cache

# Or simply:
# 1. Open Command Palette (Ctrl+Shift+P)
# 2. Type "Developer: Reload Window"
# 3. Type "Developer: Reset Settings"
```

### Solution 4: Use Different API Configuration

If you're using the extension with custom settings, try:

**Option A: Use VSCode settings.json:**

```json
{
  "claude-code.apiKey": "sk-ant-...",
  "claude-code.model": "claude-3-5-sonnet-20241022",
  "claude-code.maxTokens": 4096,
  "claude-code.temperature": 0.7
}
```

**Option B: Use environment variables:**

```bash
# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="sk-ant-..."

# Windows (CMD)
set ANTHROPIC_API_KEY=sk-ant-...
```

### Solution 5: Check API Key Format

Ensure your API key is valid:
- Must start with `sk-ant-`
- No extra spaces or quotes
- Not expired or revoked

Test your API key:
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Solution 6: Try a Different Model

The thinking block feature may be model-specific. Try using a model that supports it:

```json
{
  "claude-code.model": "claude-3-opus-20240229"
}
```

Or disable extended thinking:
```json
{
  "claude-code.maxTokens": 4096,
  "claude-code.temperature": 0.7
}
```

### Solution 7: Check Extension Logs

1. Open VSCode
2. Go to Help → Toggle Developer Tools
3. Go to Console tab
4. Look for errors related to "thinking block" or "signature"

### Solution 8: Reinstall Extension

```bash
# Uninstall:
# 1. Extensions tab
# 2. Find Claude Code extension
# 3. Click uninstall

# Reinstall:
# 1. Extensions tab
# 2. Search "Claude Code"
# 3. Install
# 4. Reload VSCode
```

## Temporary Workaround

If you need to continue working immediately:

1. **Use the Anthropic API directly in a terminal:**
   ```bash
   # Create a script: test-api.js
   node test-api.js
   ```

2. **Use Anthropic's web console:**
   - Visit https://console.anthropic.com/
   - Use the chat interface there

3. **Use a different AI coding assistant** temporarily while you fix this issue

## Prevention

To avoid this issue in the future:

1. **Keep extension updated**
2. **Don't modify extension files directly**
3. **Use supported API models only**
4. **Report issues to extension maintainers**

## Getting Help

If none of these solutions work:

1. **Check extension GitHub issues:**
   - Search for "thinking block" or "invalid signature"
   - See if others have the same issue

2. **File a bug report:**
   - Include your error message
   - Include extension version
   - Include VSCode version
   - Include your OS version

3. **Contact Anthropic support:**
   - https://support.anthropic.com/

## Quick Diagnostic Script

Save as `diagnose-claude.js` and run with `node diagnose-claude.js`:

```javascript
const https = require('https');

const API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_API_KEY';

const data = JSON.stringify({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }]
});

const options = {
  hostname: 'api.anthropic.com',
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'x-api-key': API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'content-length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(data);
req.end();
```

## Most Likely Fix

Based on the error "messages.1.content.0: Invalid signature in thinking block", the issue is most likely:

1. **The extension is trying to send thinking blocks in the wrong format**
2. **Your extension version is outdated**
3. **The API model you're using doesn't support thinking blocks**

**Try this first:**
```json
// In settings.json
{
  "claude-code.model": "claude-3-opus-20240229"
}
```

Then reload VSCode.