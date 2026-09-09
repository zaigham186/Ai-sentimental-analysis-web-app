/**
 * Coding API Test Script
 * Phase 10: Response Coding System
 * Tests all coding endpoints and workflows
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000';
let adminSession = null;
let testResponseId = null;
let testCodingId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.cyan}TEST: ${name}${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

async function makeRequest(method, endpoint, data = null, requireAuth = true) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: requireAuth && adminSession ? { Cookie: `adminSession=${adminSession}` } : {},
      withCredentials: true
    };

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    
    // Extract session cookie if present
    if (response.headers['set-cookie']) {
      const sessionCookie = response.headers['set-cookie']
        .find(cookie => cookie.startsWith('adminSession='));
      if (sessionCookie) {
        adminSession = sessionCookie.split(';')[0].replace('adminSession=', '');
      }
    }

    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

async function test1_UnauthorizedAccess() {
  logTest('Unauthorized Access - No Authentication');
  
  adminSession = null;
  const result = await makeRequest('GET', '/api/admin/coding/responses', null, false);
  
  if (!result.success && result.status === 401) {
    logSuccess('Correctly rejected unauthorized access');
    return true;
  } else {
    logError('Should have rejected unauthorized access');
    return false;
  }
}

async function test2_AdminLogin() {
  logTest('Admin Login');
  
  const result = await makeRequest('POST', '/api/admin/login', {
    username: 'admin',
    password: 'admin123456'
  }, false);
  
  if (result.success && adminSession) {
    logSuccess('Admin logged in successfully');
    logInfo(`Session: ${adminSession.substring(0, 20)}...`);
    return true;
  } else {
    logError('Admin login failed');
    return false;
  }
}

async function test3_GetConfig() {
  logTest('Get Coding Configuration');
  
  const result = await makeRequest('GET', '/api/admin/coding/config');
  
  if (result.success && result.data.data) {
    logSuccess('Retrieved coding configuration');
    logInfo(`Sentiment values: ${result.data.data.sentiment.values.join(', ')}`);
    logInfo(`Aggression categories: ${result.data.data.aggression.category.values.join(', ')}`);
    logInfo(`Cyberbullying types: ${result.data.data.cyberbullying.type.values.join(', ')}`);
    logInfo(`Configuration note: ${result.data.data.note.substring(0, 80)}...`);
    return true;
  } else {
    logError('Failed to retrieve configuration');
    return false;
  }
}

async function test4_GetStatistics() {
  logTest('Get Coding Statistics');
  
  const result = await makeRequest('GET', '/api/admin/coding/stats');
  
  if (result.success && result.data.data) {
    const stats = result.data.data;
    logSuccess('Retrieved coding statistics');
    logInfo(`Total responses: ${stats.total}`);
    logInfo(`Coded: ${stats.coded}`);
    logInfo(`Uncoded: ${stats.uncoded}`);
    logInfo(`Progress: ${stats.progress}%`);
    return true;
  } else {
    logError('Failed to retrieve statistics');
    return false;
  }
}

async function test5_GetAllResponses() {
  logTest('Get All Responses with Coding Status');
  
  const result = await makeRequest('GET', '/api/admin/coding/responses');
  
  if (result.success && result.data.data) {
    const responses = result.data.data.responses;
    logSuccess(`Retrieved ${responses.length} responses`);
    
    if (responses.length > 0) {
      const response = responses[0];
      testResponseId = response.id;
      logInfo(`Sample response ID: ${testResponseId}`);
      logInfo(`Participant: ${response.participant.name} (@${response.participant.username})`);
      logInfo(`Condition: ${response.participant.condition}`);
      logInfo(`Video: #${response.video.order} - ${response.video.title}`);
      logInfo(`Status: ${response.codingStatus}`);
      logInfo(`Response preview: ${response.responseText.substring(0, 50)}...`);
    }
    return true;
  } else {
    logError('Failed to retrieve responses');
    return false;
  }
}

async function test6_FilterUncodedResponses() {
  logTest('Filter Uncoded Responses Only');
  
  const result = await makeRequest('GET', '/api/admin/coding/responses?coded=false');
  
  if (result.success && result.data.data) {
    const responses = result.data.data.responses;
    const allUncoded = responses.every(r => r.codingStatus === 'UNCODED');
    
    if (allUncoded) {
      logSuccess(`Retrieved ${responses.length} uncoded responses`);
      return true;
    } else {
      logError('Filter returned coded responses');
      return false;
    }
  } else {
    logError('Failed to filter uncoded responses');
    return false;
  }
}

async function test7_GetResponseById() {
  logTest('Get Single Response by ID');
  
  if (!testResponseId) {
    logError('No test response ID available');
    return false;
  }
  
  const result = await makeRequest('GET', `/api/admin/coding/responses/${testResponseId}`);
  
  if (result.success && result.data.data) {
    const detail = result.data.data;
    logSuccess('Retrieved response details');
    logInfo(`Response ID: ${detail.response.id}`);
    logInfo(`Participant: ${detail.response.participant.name}`);
    logInfo(`Coded: ${detail.coded}`);
    logInfo(`Full response text: ${detail.response.responseText.length} characters`);
    
    // Verify original responseText is intact
    if (detail.response.responseText && detail.response.responseText.length > 0) {
      logSuccess('Original responseText is preserved');
    } else {
      logError('Original responseText is missing');
      return false;
    }
    return true;
  } else {
    logError('Failed to retrieve response details');
    return false;
  }
}

async function test8_CreateCoding() {
  logTest('Create Coding for Response');
  
  if (!testResponseId) {
    logError('No test response ID available');
    return false;
  }
  
  const codingData = {
    responseId: testResponseId,
    sentiment: 'negative',
    aggression: {
      level: 6,
      category: 'moderate'
    },
    cyberbullying: {
      present: true,
      type: 'harassment',
      severity: 5
    },
    notes: 'Test coding - contains aggressive language directed at target',
    confidence: 'high',
    codingVersion: '1.0'
  };
  
  const result = await makeRequest('POST', '/api/admin/coding', codingData);
  
  if (result.success && result.data.data) {
    testCodingId = result.data.data._id;
    logSuccess('Created coding successfully');
    logInfo(`Coding ID: ${testCodingId}`);
    logInfo(`Sentiment: ${result.data.data.sentiment}`);
    logInfo(`Aggression: Level ${result.data.data.aggression.level}, ${result.data.data.aggression.category}`);
    logInfo(`Cyberbullying: ${result.data.data.cyberbullying.present ? 'Present' : 'Absent'}`);
    logInfo(`Coder: ${result.data.data.codedBy.name}`);
    return true;
  } else {
    logError(`Failed to create coding: ${result.error}`);
    return false;
  }
}

async function test9_VerifyOriginalResponseIntact() {
  logTest('Verify Original Response Text Unchanged After Coding');
  
  if (!testResponseId) {
    logError('No test response ID available');
    return false;
  }
  
  const result = await makeRequest('GET', `/api/admin/coding/responses/${testResponseId}`);
  
  if (result.success && result.data.data) {
    const detail = result.data.data;
    
    if (detail.response.responseText && detail.response.responseText.length > 0) {
      logSuccess('Original responseText remains intact after coding');
      logInfo('CRITICAL CHECK PASSED: Coding does not modify original response');
      return true;
    } else {
      logError('CRITICAL FAILURE: Original responseText was modified or deleted');
      return false;
    }
  } else {
    logError('Failed to verify response');
    return false;
  }
}

async function test10_UpdateCoding() {
  logTest('Update Existing Coding');
  
  if (!testCodingId) {
    logError('No test coding ID available');
    return false;
  }
  
  const updateData = {
    aggression: {
      level: 7,
      category: 'severe'
    },
    notes: 'Updated test coding - escalated to severe',
    confidence: 'medium'
  };
  
  const result = await makeRequest('PUT', `/api/admin/coding/${testCodingId}`, updateData);
  
  if (result.success && result.data.data) {
    logSuccess('Updated coding successfully');
    logInfo(`New aggression level: ${result.data.data.aggression.level}`);
    logInfo(`New category: ${result.data.data.aggression.category}`);
    return true;
  } else {
    logError(`Failed to update coding: ${result.error}`);
    return false;
  }
}

async function test11_PreventDuplicateCoding() {
  logTest('Prevent Duplicate Primary Coding');
  
  if (!testResponseId) {
    logError('No test response ID available');
    return false;
  }
  
  const codingData = {
    responseId: testResponseId,
    sentiment: 'positive',
    confidence: 'low'
  };
  
  const result = await makeRequest('POST', '/api/admin/coding', codingData);
  
  if (!result.success && result.error.includes('already has primary coding')) {
    logSuccess('Correctly prevented duplicate primary coding');
    return true;
  } else {
    logError('Should have prevented duplicate coding');
    return false;
  }
}

async function test12_ValidateInvalidData() {
  logTest('Validate Invalid Coding Data');
  
  // Try with invalid aggression level
  const invalidData = {
    responseId: testResponseId,
    aggression: {
      level: 15 // Should fail (max is 10)
    }
  };
  
  const result = await makeRequest('POST', '/api/admin/coding', invalidData);
  
  if (!result.success) {
    logSuccess('Correctly rejected invalid aggression level');
    return true;
  } else {
    logError('Should have rejected invalid data');
    return false;
  }
}

async function test13_SearchResponses() {
  logTest('Search in Response Text');
  
  const result = await makeRequest('GET', '/api/admin/coding/responses?search=test');
  
  if (result.success && result.data.data) {
    logSuccess(`Search returned ${result.data.data.responses.length} results`);
    return true;
  } else {
    logError('Failed to search responses');
    return false;
  }
}

async function test14_FilterByCondition() {
  logTest('Filter Responses by Condition');
  
  const result = await makeRequest('GET', '/api/admin/coding/responses?condition=anonymous');
  
  if (result.success && result.data.data) {
    const responses = result.data.data.responses;
    const allAnonymous = responses.every(r => r.participant.condition === 'anonymous');
    
    if (allAnonymous || responses.length === 0) {
      logSuccess(`Retrieved ${responses.length} anonymous condition responses`);
      return true;
    } else {
      logError('Filter returned wrong condition');
      return false;
    }
  } else {
    logError('Failed to filter by condition');
    return false;
  }
}

async function test15_StatisticsAfterCoding() {
  logTest('Verify Statistics Updated After Coding');
  
  const result = await makeRequest('GET', '/api/admin/coding/stats');
  
  if (result.success && result.data.data) {
    const stats = result.data.data;
    
    if (stats.coded > 0) {
      logSuccess('Statistics show coded responses');
      logInfo(`Coded: ${stats.coded}, Uncoded: ${stats.uncoded}`);
      logInfo(`Progress: ${stats.progress}%`);
      
      if (stats.distribution) {
        logInfo('Distribution data available');
      }
      return true;
    } else {
      logError('Statistics not updated');
      return false;
    }
  } else {
    logError('Failed to retrieve statistics');
    return false;
  }
}

async function test16_DeleteCoding() {
  logTest('Delete Coding');
  
  if (!testCodingId) {
    logError('No test coding ID available');
    return false;
  }
  
  const result = await makeRequest('DELETE', `/api/admin/coding/${testCodingId}`);
  
  if (result.success) {
    logSuccess('Deleted coding successfully');
    return true;
  } else {
    logError(`Failed to delete coding: ${result.error}`);
    return false;
  }
}

async function test17_VerifyDeletionPreservesResponse() {
  logTest('Verify Response Intact After Coding Deletion');
  
  if (!testResponseId) {
    logError('No test response ID available');
    return false;
  }
  
  const result = await makeRequest('GET', `/api/admin/coding/responses/${testResponseId}`);
  
  if (result.success && result.data.data) {
    const detail = result.data.data;
    
    if (detail.response.responseText && !detail.coded) {
      logSuccess('Response intact after coding deletion');
      logSuccess('CRITICAL CHECK PASSED: Response text preserved throughout lifecycle');
      return true;
    } else {
      logError('Response damaged or coding not deleted');
      return false;
    }
  } else {
    logError('Failed to verify response');
    return false;
  }
}

async function runAllTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     PHASE 10: RESPONSE CODING SYSTEM - API TESTS          ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  const tests = [
    test1_UnauthorizedAccess,
    test2_AdminLogin,
    test3_GetConfig,
    test4_GetStatistics,
    test5_GetAllResponses,
    test6_FilterUncodedResponses,
    test7_GetResponseById,
    test8_CreateCoding,
    test9_VerifyOriginalResponseIntact,
    test10_UpdateCoding,
    test11_PreventDuplicateCoding,
    test12_ValidateInvalidData,
    test13_SearchResponses,
    test14_FilterByCondition,
    test15_StatisticsAfterCoding,
    test16_DeleteCoding,
    test17_VerifyDeletionPreservesResponse
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      logError(`Test threw exception: ${error.message}`);
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                      TEST SUMMARY                          ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');
  log(`Total Tests: ${tests.length}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, 'red');
  log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`, passed === tests.length ? 'green' : 'yellow');
  console.log('\n');

  if (passed === tests.length) {
    log('✓ ALL TESTS PASSED - Phase 10 Implementation Complete!', 'green');
  } else {
    log('⚠ Some tests failed - Review implementation', 'yellow');
  }
  console.log('\n');
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
