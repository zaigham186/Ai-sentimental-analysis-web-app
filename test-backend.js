/**
 * Test Backend Connection
 * Quick test to check if backend is accessible
 */

const http = require('http');

console.log('Testing backend connection...\n');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`✓ Backend is running!`);
  console.log(`Status: ${res.statusCode}`);
  console.log(`URL: http://localhost:5000\n`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log('✗ Backend is NOT running!');
  console.log(`Error: ${error.message}\n`);
  console.log('Please start the backend server first:');
  console.log('  cd backend');
  console.log('  npm start\n');
});

req.on('timeout', () => {
  console.log('✗ Backend connection timeout!');
  console.log('The server might be starting or overloaded.\n');
  req.destroy();
});

req.end();
