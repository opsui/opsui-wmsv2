// Check what routes are actually registered in the running backend
const http = require('http');

// Make a request to a debug endpoint to see what routes exist
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/health',
  method: 'GET',
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Health check response:', data);

    // Now test organizations route
    const orgReq = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/organizations',
        method: 'GET',
        headers: { Authorization: 'Bearer test' },
      },
      orgRes => {
        let orgData = '';
        orgRes.on('data', chunk => {
          orgData += chunk;
        });
        orgRes.on('end', () => {
          console.log('Organizations response status:', orgRes.statusCode);
          console.log('Organizations response:', orgData);
        });
      }
    );
    orgReq.on('error', e => {
      console.error('Org error:', e.message);
    });
    orgReq.end();
  });
});

req.on('error', e => {
  console.error('Health error:', e.message);
});
req.end();
