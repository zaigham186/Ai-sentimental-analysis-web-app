/**
 * Test Admin API
 * Tests admin authentication endpoints
 * Usage: node test-admin-api.js
 */

const http = require('http');

const API_URL = 'http://localhost:5000';
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'admin123456'
};

let adminCookie = null;

/**
 * Make HTTP request
 */
function request(method, path, data = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let body = '';

      // Capture cookie from response
      if (res.headers['set-cookie']) {
        const cookies = res.headers['set-cookie'];
        const adminSessionCookie = cookies.find(c => c.startsWith('adminSession='));
        if (adminSessionCookie) {
          adminCookie = adminSessionCookie.split(';')[0];
        }
      }

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(body)
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Test functions
 */

async function testHealthCheck() {
  console.log('\n📋 Test 1: Health Check');
  try {
    const response = await request('GET', '/api/health');
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Health check passed');
      return true;
    } else {
      console.log('✗ Health check failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Health check error:', error.message);
    return false;
  }
}

async function testAdminLogin() {
  console.log('\n📋 Test 2: Admin Login');
  try {
    const response = await request('POST', '/api/admin/login', TEST_CREDENTIALS);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Admin login successful');
      console.log('  Admin:', response.body.data.name);
      console.log('  Role:', response.body.data.role);
      return true;
    } else {
      console.log('✗ Admin login failed');
      console.log('  Message:', response.body.message);
      return false;
    }
  } catch (error) {
    console.log('✗ Admin login error:', error.message);
    return false;
  }
}

async function testInvalidLogin() {
  console.log('\n📋 Test 3: Invalid Login');
  try {
    const response = await request('POST', '/api/admin/login', {
      username: 'admin',
      password: 'wrongpassword'
    });
    if (response.statusCode === 401) {
      console.log('✓ Invalid login correctly rejected');
      return true;
    } else {
      console.log('✗ Invalid login not rejected properly');
      return false;
    }
  } catch (error) {
    console.log('✗ Invalid login test error:', error.message);
    return false;
  }
}

async function testGetCurrentAdmin() {
  console.log('\n📋 Test 4: Get Current Admin');
  try {
    if (!adminCookie) {
      console.log('✗ No admin cookie available');
      return false;
    }

    const response = await request('GET', '/api/admin/me', null, adminCookie);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Get current admin successful');
      console.log('  Username:', response.body.data.username);
      console.log('  Role:', response.body.data.role);
      return true;
    } else {
      console.log('✗ Get current admin failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Get current admin error:', error.message);
    return false;
  }
}

async function testGetDashboard() {
  console.log('\n📋 Test 5: Get Dashboard Statistics');
  try {
    if (!adminCookie) {
      console.log('✗ No admin cookie available');
      return false;
    }

    const response = await request('GET', '/api/admin/dashboard', null, adminCookie);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Dashboard data retrieved');
      console.log('  Total Participants:', response.body.data.participants.total);
      console.log('  Total Responses:', response.body.data.experiment.totalResponses);
      return true;
    } else {
      console.log('✗ Dashboard retrieval failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Dashboard error:', error.message);
    return false;
  }
}

async function testUnauthorizedDashboardAccess() {
  console.log('\n📋 Test 6: Unauthorized Dashboard Access');
  try {
    const response = await request('GET', '/api/admin/dashboard', null, null);
    if (response.statusCode === 401) {
      console.log('✓ Unauthorized access correctly blocked');
      return true;
    } else {
      console.log('✗ Unauthorized access not blocked');
      return false;
    }
  } catch (error) {
    console.log('✗ Unauthorized access test error:', error.message);
    return false;
  }
}

async function testAdminLogout() {
  console.log('\n📋 Test 7: Admin Logout');
  try {
    if (!adminCookie) {
      console.log('✗ No admin cookie available');
      return false;
    }

    const response = await request('POST', '/api/admin/logout', null, adminCookie);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Logout successful');
      adminCookie = null;
      return true;
    } else {
      console.log('✗ Logout failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Logout error:', error.message);
    return false;
  }
}

async function testAccessAfterLogout() {
  console.log('\n📋 Test 8: Access After Logout');
  try {
    const response = await request('GET', '/api/admin/me', null, adminCookie);
    if (response.statusCode === 401) {
      console.log('✓ Access correctly denied after logout');
      return true;
    } else {
      console.log('✗ Access not denied after logout');
      return false;
    }
  } catch (error) {
    console.log('✗ Access after logout test error:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Admin API Test Suite                 ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\nTesting Admin Authentication & Authorization');
  console.log('Backend URL:', API_URL);

  const results = [];

  results.push(await testHealthCheck());
  results.push(await testAdminLogin());
  results.push(await testInvalidLogin());
  results.push(await testGetCurrentAdmin());
  results.push(await testGetDashboard());
  results.push(await testUnauthorizedDashboardAccess());
  results.push(await testAdminLogout());
  results.push(await testAccessAfterLogout());

  // Summary
  const passed = results.filter(r => r === true).length;
  const failed = results.filter(r => r === false).length;

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Test Summary                         ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite error:', error);
  process.exit(1);
});
