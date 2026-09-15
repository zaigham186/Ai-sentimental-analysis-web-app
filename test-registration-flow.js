/**
 * Test Registration and Session Flow
 * Tests the complete flow: register -> get profile
 */

const http = require('http');

// Generate random test user
const randomNum = Math.floor(Math.random() * 10000);
const testUser = {
  name: 'John Doe',  // Simple name without numbers
  username: 'testuser' + randomNum,
  age: 20,
  gender: 'male',
  university: 'SBBWU',
  department: 'Computer Science',
  condition: 'anonymous'
};

console.log('Testing registration and session flow...\n');
console.log('Test User:', testUser.username, '\n');

// Step 1: Register participant
function registerParticipant() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(testUser);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/participants/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    console.log('Step 1: Registering participant...');
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          
          if (res.statusCode === 201) {
            console.log('✓ Registration successful!');
            console.log('  Username:', parsed.data.username);
            
            // Extract session cookie
            const cookies = res.headers['set-cookie'] || [];
            const sessionCookie = cookies.find(c => c.startsWith('participantSession='));
            
            if (sessionCookie) {
              console.log('✓ Session cookie received\n');
              resolve(sessionCookie.split(';')[0]);
            } else {
              console.log('✗ No session cookie received\n');
              resolve(null);
            }
          } else {
            console.log('✗ Registration failed!');
            console.log('  Status:', res.statusCode);
            console.log('  Response:', parsed);
            reject(new Error(parsed.message || 'Registration failed'));
          }
        } catch (e) {
          console.log('✗ Parse error:', e.message);
          console.log('  Raw response:', responseData);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.log('✗ Request error:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Step 2: Get participant profile
function getProfile(sessionCookie) {
  return new Promise((resolve, reject) => {
    if (!sessionCookie) {
      console.log('✗ Cannot get profile: No session cookie');
      reject(new Error('No session cookie'));
      return;
    }

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/participants/me',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    };

    console.log('Step 2: Getting participant profile...');
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          
          if (res.statusCode === 200) {
            console.log('✓ Profile retrieved successfully!');
            console.log('  Name:', parsed.data.name);
            console.log('  Username:', parsed.data.username);
            console.log('  University:', parsed.data.university);
            console.log('  Status:', parsed.data.status);
            console.log('\n✓ ALL TESTS PASSED! Registration flow is working correctly.\n');
            resolve(parsed);
          } else {
            console.log('✗ Failed to get profile!');
            console.log('  Status:', res.statusCode);
            console.log('  Response:', parsed);
            reject(new Error(parsed.message || 'Profile fetch failed'));
          }
        } catch (e) {
          console.log('✗ Parse error:', e.message);
          console.log('  Raw response:', responseData);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.log('✗ Request error:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Run the test
async function runTest() {
  try {
    const sessionCookie = await registerParticipant();
    await getProfile(sessionCookie);
  } catch (error) {
    console.log('\n✗ TEST FAILED!');
    console.log('Error:', error.message);
    console.log('\nPossible issues:');
    console.log('  1. Backend might not be setting session cookies correctly');
    console.log('  2. CORS configuration might be blocking credentials');
    console.log('  3. Frontend might not be including credentials in requests\n');
  }
}

runTest();
