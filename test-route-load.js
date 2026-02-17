const route = require('./dist/routes/organizations');
console.log('Loaded:', typeof route.default);
console.log('Route stack length:', route.default?.stack?.length);
