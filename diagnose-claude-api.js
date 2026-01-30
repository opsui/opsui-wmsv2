/**
 * Claude API Diagnostic Script
 * 
 * This script tests your Anthropic API key and identifies common issues
 * including the "Invalid signature in thinking block" error.
 * 
 * Usage:
 *   1. Set your API key: set ANTHROPIC_API_KEY=sk-ant-...
 *   2. Run: node diagnose-claude-api.js
 */

const https = require('https');

const API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_API_KEY_HERE';

console.log('='.repeat(60));
console.log('Claude API Diagnostic Tool');
console.log('='.repeat(60));
console.log();

// Check if API key is provided
if (API_KEY === 'YOUR_API_KEY_HERE' || !API_KEY) {
  console.error('❌ ERROR: No API key provided!');
  console.error('   Please set ANTHROPIC_API_KEY environment variable:');
  console.error('   Windows CMD: set ANTHROPIC_API_KEY=sk-ant-...');
  console.error('   Windows PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..."');
  console.log();
  process.exit(1);
}

// Validate API key format
if (!API_KEY.startsWith('sk-ant-')) {
  console.error('❌ ERROR: Invalid API key format!');
  console.error('   API key should start with "sk-ant-"');
  console.log();
  process.exit(1);
}

console.log('✅ API key format looks valid');
console.log('   Key:', API_KEY.substring(0, 10) + '...');
console.log();

// Test 1: Simple message (no thinking block)
console.log('Test 1: Simple message (no thinking block)');
console.log('-'.repeat(60));

const test1Data = JSON.stringify({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }]
});

runAPITest(test1Data, (success, response) => {
  if (success) {
    console.log('✅ Test 1 PASSED: Basic API connection works');
    console.log();
    
    // Test 2: Message with extended thinking
    console.log('Test 2: Message with extended thinking enabled');
    console.log('-'.repeat(60));
    
    const test2Data = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello' }],
      thinking: {
        type: "enabled",
        budget_tokens: 1024
      }
    });
    
    runAPITest(test2Data, (success, response) => {
      if (success) {
        console.log('✅ Test 2 PASSED: Extended thinking works');
        console.log();
        console.log('='.repeat(60));
        console.log('ALL TESTS PASSED! ✅');
        console.log('='.repeat(60));
        console.log();
        console.log('Your API key and configuration are working correctly.');
        console.log('The "Invalid signature in thinking block" error is likely');
        console.log('caused by the Claude Code Extension, not your API key.');
        console.log();
        console.log('Recommended fixes:');
        console.log('1. Update the Claude Code extension');
        console.log('2. Change model to: claude-3-opus-20240229');
        console.log('3. Clear VSCode extension cache');
        console.log('4. Reinstall the extension');
      } else {
        console.log('❌ Test 2 FAILED: Extended thinking not supported');
        console.log('   Error:', JSON.stringify(response, null, 2));
        console.log();
        console.log('Solution: Use a model without extended thinking:');
        console.log('  claude-3-opus-20240229 (recommended)');
        console.log('  claude-3-sonnet-20240229');
        console.log();
        console.log('In VSCode settings.json:');
        console.log('{');
        console.log('  "claude-code.model": "claude-3-opus-20240229"');
        console.log('}');
      }
    });
  } else {
    console.log('❌ Test 1 FAILED: Basic API connection failed');
    console.log('   Error:', JSON.stringify(response, null, 2));
    console.log();
    console.log('Possible issues:');
    console.log('1. Invalid or expired API key');
    console.log('2. Network connectivity issues');
    console.log('3. API key permissions issue');
    console.log('4. Anthropic API service is down');
    console.log();
    console.log('Troubleshooting:');
    console.log('- Verify your API key at: https://console.anthropic.com/');
    console.log('- Check your internet connection');
    console.log('- Try the API key in Anthropic\'s web console');
  }
});

function runAPITest(data, callback) {
  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(data)
    },
    timeout: 30000
  };

  const req = https.request(options, (res) => {
    let body = '';
    
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
      
      if (res.statusCode === 200) {
        console.log('Response: Success');
        try {
          const json = JSON.parse(body);
          if (json.content && json.content[0]) {
            console.log('Message:', json.content[0].text.substring(0, 100) + '...');
          }
        } catch (e) {
          console.log('Response body:', body.substring(0, 200));
        }
        callback(true, null);
      } else {
        console.log('Response:', body);
        try {
          const json = JSON.parse(body);
          callback(false, json);
        } catch (e) {
          callback(false, { error: body });
        }
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
    callback(false, { error: e.message });
  });

  req.on('timeout', () => {
    console.error('Request timeout');
    req.destroy();
    callback(false, { error: 'Request timeout' });
  });

  req.write(data);
  req.end();
}