const routes = require('./dist/routes/index');
console.log('Routes stack length:', routes.default?.stack?.length);

// Check for organizations route
const stack = routes.default?.stack || [];
stack.forEach((layer, i) => {
  const regexp = layer?.regexp?.toString() || '';
  if (regexp.includes('organizations') || regexp.includes('org')) {
    console.log(`Layer ${i}: ${regexp}`);
  }
});

// Check the v1Router
const v1Layer = stack.find(layer => layer?.regexp?.toString().includes('v1'));
if (v1Layer) {
  console.log('Found v1 layer');
  const v1Stack = v1Layer?.handle?.stack || [];
  console.log('V1 stack length:', v1Stack.length);
  v1Stack.forEach((layer, i) => {
    const regexp = layer?.regexp?.toString() || '';
    if (regexp.includes('organizations') || regexp.includes('org')) {
      console.log(`V1 Layer ${i}: ${regexp}`);
    }
  });
}
