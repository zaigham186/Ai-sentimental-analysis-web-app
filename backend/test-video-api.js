/**
 * Test Video Management API
 * Phase 9: Video Stimulus Management Tests
 * Usage: node test-video-api.js
 */

const http = require('http');

const API_URL = 'http://localhost:5000';
const TEST_ADMIN = {
  username: 'admin',
  password: 'admin123456'
};

let adminCookie = null;
let testVideoId = null;

/**
 * Make HTTP request
 */
function request(method, path, data = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
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

      // Capture cookie
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
            body: JSON.parse(body)
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
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

async function testAdminLogin() {
  console.log('\n📋 Test 1: Admin Login');
  try {
    const response = await request('POST', '/api/admin/login', TEST_ADMIN);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Admin login successful');
      return true;
    } else {
      console.log('✗ Admin login failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Admin login error:', error.message);
    return false;
  }
}

async function testCreateVideo() {
  console.log('\n📋 Test 2: Create Video');
  try {
    const videoData = {
      title: 'Test Video 1',
      topic: 'Test Topic',
      description: 'This is a test video for Phase 9',
      videoUrl: 'https://res.cloudinary.com/test/video/upload/v1/test.mp4',
      duration: 45,
      order: 99,
      version: '1.0',
      active: true
    };

    const response = await request('POST', '/api/admin/videos', videoData, adminCookie);
    if (response.statusCode === 201 && response.body.success) {
      testVideoId = response.body.data._id;
      console.log('✓ Video created successfully');
      console.log('  Video ID:', testVideoId);
      return true;
    } else {
      console.log('✗ Video creation failed');
      console.log('  Message:', response.body.message);
      return false;
    }
  } catch (error) {
    console.log('✗ Video creation error:', error.message);
    return false;
  }
}

async function testGetAllVideos() {
  console.log('\n📋 Test 3: Get All Videos');
  try {
    const response = await request('GET', '/api/admin/videos', null, adminCookie);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Retrieved videos');
      console.log('  Count:', response.body.data.length);
      return true;
    } else {
      console.log('✗ Failed to retrieve videos');
      return false;
    }
  } catch (error) {
    console.log('✗ Get videos error:', error.message);
    return false;
  }
}

async function testGetVideoById() {
  console.log('\n📋 Test 4: Get Video By ID');
  try {
    if (!testVideoId) {
      console.log('✗ No test video ID available');
      return false;
    }

    const response = await request('GET', `/api/admin/videos/${testVideoId}`, null, adminCookie);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Retrieved video by ID');
      console.log('  Title:', response.body.data.title);
      return true;
    } else {
      console.log('✗ Failed to retrieve video');
      return false;
    }
  } catch (error) {
    console.log('✗ Get video error:', error.message);
    return false;
  }
}

async function testUpdateVideo() {
  console.log('\n📋 Test 5: Update Video');
  try {
    if (!testVideoId) {
      console.log('✗ No test video ID available');
      return false;
    }

    const updateData = {
      title: 'Updated Test Video',
      description: 'Updated description'
    };

    const response = await request('PUT', `/api/admin/videos/${testVideoId}`, updateData, adminCookie);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Video updated successfully');
      return true;
    } else {
      console.log('✗ Video update failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Update video error:', error.message);
    return false;
  }
}

async function testApproveVideo() {
  console.log('\n📋 Test 6: Approve Video');
  try {
    if (!testVideoId) {
      console.log('✗ No test video ID available');
      return false;
    }

    const response = await request('POST', `/api/admin/videos/${testVideoId}/approve`, 
      { notes: 'Test approval' }, adminCookie);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Video approved successfully');
      return true;
    } else {
      console.log('✗ Video approval failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Approve video error:', error.message);
    return false;
  }
}

async function testValidateStimulusSet() {
  console.log('\n📋 Test 7: Validate Stimulus Set');
  try {
    const response = await request('GET', '/api/admin/videos/validate-set', null, adminCookie);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Stimulus set validation');
      console.log('  Valid:', response.body.data.valid);
      console.log('  Count:', response.body.data.count);
      console.log('  Status:', response.body.data.status);
      return true;
    } else {
      console.log('✗ Stimulus set validation failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Validate stimulus set error:', error.message);
    return false;
  }
}

async function testGetStatistics() {
  console.log('\n📋 Test 8: Get Video Statistics');
  try {
    const response = await request('GET', '/api/admin/videos/stats', null, adminCookie);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Retrieved statistics');
      console.log('  Total:', response.body.data.total);
      console.log('  Approved Active:', response.body.data.approvedActive);
      return true;
    } else {
      console.log('✗ Failed to retrieve statistics');
      return false;
    }
  } catch (error) {
    console.log('✗ Get statistics error:', error.message);
    return false;
  }
}

async function testUnauthorizedAccess() {
  console.log('\n📋 Test 9: Unauthorized Access (No Cookie)');
  try {
    const response = await request('GET', '/api/admin/videos', null, null);
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

async function testDuplicateOrder() {
  console.log('\n📋 Test 10: Duplicate Order Prevention');
  try {
    const videoData = {
      title: 'Duplicate Order Test',
      topic: 'Test',
      description: 'Testing duplicate order',
      videoUrl: 'https://res.cloudinary.com/test/video/upload/v1/test2.mp4',
      duration: 30,
      order: 99, // Same as test video
      version: '1.0',
      active: true
    };

    const response = await request('POST', '/api/admin/videos', videoData, adminCookie);
    if (response.statusCode === 400) {
      console.log('✓ Duplicate order correctly prevented');
      return true;
    } else {
      console.log('✗ Duplicate order not prevented');
      return false;
    }
  } catch (error) {
    console.log('✗ Duplicate order test error:', error.message);
    return false;
  }
}

async function testDeleteVideo() {
  console.log('\n📋 Test 11: Delete Video');
  try {
    if (!testVideoId) {
      console.log('✗ No test video ID available');
      return false;
    }

    const response = await request('DELETE', `/api/admin/videos/${testVideoId}`, null, adminCookie);
    if (response.statusCode === 200 && response.body.success) {
      console.log('✓ Video deleted successfully');
      testVideoId = null;
      return true;
    } else {
      console.log('✗ Video deletion failed');
      console.log('  Message:', response.body.message);
      return false;
    }
  } catch (error) {
    console.log('✗ Delete video error:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Video Management API Test Suite     ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\nTesting Phase 9: Video Stimulus Management');
  console.log('Backend URL:', API_URL);

  const results = [];

  results.push(await testAdminLogin());
  results.push(await testCreateVideo());
  results.push(await testGetAllVideos());
  results.push(await testGetVideoById());
  results.push(await testUpdateVideo());
  results.push(await testApproveVideo());
  results.push(await testValidateStimulusSet());
  results.push(await testGetStatistics());
  results.push(await testUnauthorizedAccess());
  results.push(await testDuplicateOrder());
  results.push(await testDeleteVideo());

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
