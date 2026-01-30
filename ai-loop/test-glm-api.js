/**
 * Quick test to verify GLM API connection
 * Usage: node test-glm-api.js
 */

const { GLMClient } = require('./glm-client.ts');

async function testGLMAPI() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              GLM API CONNECTION TEST                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const apiKey = process.env.GLM_API_KEY || '1c4e10d1249440e0b6a5430c21450dc7.tn1bVz1mkDUHbgAW';

  console.log('🔑 API Key:', apiKey.substring(0, 20) + '...\n');

  const client = new GLMClient(apiKey);

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
      console.error('   The model "glm-4.7" may not be available.');
      console.error('   Check your Zhipu AI console for available models.');
      console.error('   Available models might be: glm-4, glm-4-plus, glm-4-air, etc.');
      console.error('\n   To fix: Edit ai-loop/glm-client.ts line 30 and change:');
      console.error('   private model = "glm-4.7";');
      console.error('   to:');
      console.error('   private model = "glm-4";  // or available model\n');
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
