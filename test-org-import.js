// Test if organizations route can be imported
try {
  const orgRoute = require('./dist/routes/organizations');
  console.log('Organizations route loaded successfully');
  console.log('Type:', typeof orgRoute);
  console.log('Default type:', typeof orgRoute.default);
  if (orgRoute.default && orgRoute.default.stack) {
    console.log('Stack length:', orgRoute.default.stack.length);
  }
} catch (e) {
  console.error('Error loading organizations route:', e.message);
  console.error(e.stack);
}
