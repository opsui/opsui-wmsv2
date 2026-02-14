/**
 * Quick test to verify GLM API connection
 * Usage: node test-glm-api.js [model-name]
 *
 * Examples:
 *   node test-glm-api.js             # Uses default model (glm-5)
 *   node test-glm-api.js glm-5       # Uses GLM-5 (Opus-like)
 *   node test-glm-api.js glm-4.7     # Uses GLM-4.7 (Sonnet-like)
 *   node test-glm-api.js --list      # Lists all available models
 */

const { GLMClient, GLM_MODELS } = require('./glm-client.ts');

function printAvailableModels() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              AVAILABLE GLM MODELS                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const models = GLMClient.getAvailableModels();

  console.log('  ┌─────────────────────────────────────────────────────────┐');
  for (const [key, info] of Object.entries(models)) {
    const recommended = info.recommended ? ' ⭐' : '';
    const equiv = key === 'glm-5' ? '(like Claude Opus)' : '(like Claude Sonnet)';
    console.log(`  │ ${key.padEnd(10)} - ${info.name}${recommended}`.padEnd(58) + '│');
    console.log(`  │            ${equiv}`.padEnd(58) + '│');
    console.log(`  │            ${info.description}`.substring(0, 57).padEnd(58) + '│');
    console.log('  │                                                         │');
  }
  console.log('  └─────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('💡 Usage:');
  console.log('   node test-glm-api.js glm-5      # Most capable');
  console.log('   node test-glm-api.js glm-4.7    # Fast & efficient');
  console.log('   set GLM_MODEL=glm-4.7           # Set default via env');
  console.log('');
}

async function testGLMAPI() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              GLM API CONNECTION TEST                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check for --list flag
  if (process.argv.includes('--list') || process.argv.includes('-l')) {
    printAvailableModels();
    return true;
  }

  const apiKey = process.env.GLM_API_KEY || '1c4e10d1249440e0b6a5430c21450dc7.tn1bVz1mkDUHbgAW';

  // Get model from command line or environment or default
  const modelArg = process.argv[2];
  let selectedModel = null;

  if (modelArg && !modelArg.startsWith('-')) {
    const validModels = Object.keys(GLM_MODELS);
    if (validModels.includes(modelArg)) {
      selectedModel = modelArg;
    } else {
      console.log(`⚠️  Unknown model: ${modelArg}`);
      console.log('📋 Available models: ' + validModels.join(', '));
      console.log('');
      return false;
    }
  }

  console.log('🔑 API Key:', apiKey.substring(0, 20) + '...\n');

  const client = new GLMClient(apiKey, selectedModel);

  // Show current model info
  const currentModel = client.getModel();
  const modelInfo = client.getModelInfo();
  const equiv = currentModel === 'glm-5' ? '(Opus-like)' : '(Sonnet-like)';
  console.log('📦 Using Model:', currentModel, equiv);
  console.log('   Description:', modelInfo.description);
  console.log('');

  console.log('📡 Testing API connection...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const startTime = Date.now();

    const response = await client.callGLM([
      {
        role: 'user',
        content: 'Say "API connection successful!" in exactly those words.',
      },
    ]);

    const duration = Date.now() - startTime;

    console.log('✅ API Response:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(response.trim());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`⏱️  Response time: ${duration}ms\n`);

    if (response.toLowerCase().includes('success')) {
      console.log('✅ API TEST PASSED - Connection is working!\n');

      // Show how to use different models
      console.log('💡 TIP: You can switch between models:');
      console.log('   node test-glm-api.js glm-5      # Most capable (Opus-like)');
      console.log('   node test-glm-api.js glm-4.7    # Fast & efficient (Sonnet-like)');
      console.log('');

      return true;
    } else {
      console.log('⚠️  API TEST WARNING - Response unexpected but connection works\n');
      return true;
    }
  } catch (error) {
    console.error('❌ API TEST FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error:', error.message);

    if (error.message.includes('404') || error.message.includes('not_found')) {
      console.error('\n🔧 TROUBLESHOOTING:');
      console.error('   The model "' + currentModel + '" may not be available for your account.');
      console.error('   Try the other model:');
      console.error('   node test-glm-api.js glm-4.7');
      console.error('   node test-glm-api.js glm-5');
      console.error('');
    } else if (error.message.includes('401') || error.message.includes('auth')) {
      console.error('\n🔧 TROUBLESHOOTING:');
      console.error('   API key is invalid or expired.');
      console.error('   Check your Zhipu AI dashboard.');
      console.error('   Format should be: id.secret\n');
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      console.error('\n🔧 TROUBLESHOOTING:');
      console.error('   Rate limit exceeded. Wait a moment and try again.');
      console.error('   The client has built-in retry logic.\n');
    }

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return false;
  }
}

// Run test
testGLMAPI()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
