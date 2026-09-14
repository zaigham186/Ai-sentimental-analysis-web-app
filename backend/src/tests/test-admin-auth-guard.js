/**
 * Automated Verification Suite for Admin Authentication & Privacy Protection
 * Covers all 14 requirements from the User Specification
 */

const http = require('http');

const BASE_API = 'http://127.0.0.1:5000';
const FRONTEND_URL = 'http://127.0.0.1:3000';

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Connection': 'close',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          // HTML or raw string
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'object' ? JSON.stringify(options.body) : options.body);
    }
    req.end();
  });
}

function parseCookies(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return {};
  const cookies = {};
  setCookie.forEach(str => {
    const parts = str.split(';')[0].split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return cookies;
}

async function runVerification() {
  console.log('='.repeat(70));
  console.log('  MANDATORY ADMIN AUTHENTICATION & PRIVACY VERIFICATION SUITE');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // SCENARIO 1-4 & 11: Direct Backend Admin API Protection (Unauthenticated)
    // ------------------------------------------------------------------------
    console.log('\n[Phase 1] Backend API Protection on Unauthenticated Requests');

    const adminEndpoints = [
      '/api/admin/dashboard',
      '/api/admin/responses',
      '/api/admin/coding/responses',
      '/api/admin/participants',
      '/api/admin/videos',
      '/api/admin/analytics/dashboard',
      '/api/admin/export/data-quality',
      '/api/admin/me'
    ];

    for (const ep of adminEndpoints) {
      const res = await httpRequest(`${BASE_API}${ep}`);
      assert(
        res.statusCode === 401 && res.data?.message === 'Admin authentication required',
        `Unauthenticated ${ep} returns 401 Unauthorized`,
        `Got ${res.statusCode}: ${JSON.stringify(res.data)}`
      );
    }

    // ------------------------------------------------------------------------
    // SCENARIO 5-7: Participant Isolation & Separation
    // ------------------------------------------------------------------------
    console.log('\n[Phase 2] Participant Session Isolation vs Admin APIs');

    // 1. Participant registers
    const testUsername = `ptest_${Date.now()}`;
    const regRes = await httpRequest(`${BASE_API}/api/participants/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: 'Test Participant',
        username: testUsername,
        age: 21,
        gender: 'female',
        university: 'SBBWU',
        department: 'Psychology',
        condition: 'anonymous'
      }
    });

    assert(regRes.statusCode === 201, 'Participant registers successfully');
    const participantCookies = parseCookies(regRes.headers);
    const participantCookieHeader = `participantSession=${participantCookies.participantSession}`;

    // 2. Participant provides consent
    const consentRes = await httpRequest(`${BASE_API}/api/participants/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': participantCookieHeader
      },
      body: {
        consentGiven: true,
        agreedToDataUse: true,
        agreedToWithdrawalTerms: true,
        electronicSignature: 'Test Participant'
      }
    });
    assert(consentRes.statusCode === 200, 'Participant provides consent');

    // 3. Participant tries to access Admin API using participant session cookie
    const pAdminRes = await httpRequest(`${BASE_API}/api/admin/dashboard`, {
      headers: { 'Cookie': participantCookieHeader }
    });
    assert(
      pAdminRes.statusCode === 401 && pAdminRes.data?.message === 'Admin authentication required',
      'Participant session CANNOT access /api/admin/dashboard (returns 401)'
    );

    const pCodingRes = await httpRequest(`${BASE_API}/api/admin/coding/responses`, {
      headers: { 'Cookie': participantCookieHeader }
    });
    assert(
      pCodingRes.statusCode === 401 && pCodingRes.data?.message === 'Admin authentication required',
      'Participant session CANNOT access /api/admin/coding/responses (returns 401)'
    );

    // 4. Participant starts experiment flow normally
    const pStartExp = await httpRequest(`${BASE_API}/api/experiment/start`, {
      method: 'POST',
      headers: { 'Cookie': participantCookieHeader }
    });
    assert(pStartExp.statusCode === 200, 'Participant starts experiment flow normally');

    // ------------------------------------------------------------------------
    // SCENARIO 8 & 12: Admin Login, Session Authentication & Persistence
    // ------------------------------------------------------------------------
    console.log('\n[Phase 3] Admin Login, Authorization & Refresh Verification');

    const loginRes = await httpRequest(`${BASE_API}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        username: 'admin',
        password: 'admin123456'
      }
    });

    assert(loginRes.statusCode === 200 && loginRes.data?.success === true, 'Admin successfully logs in');
    const adminCookies = parseCookies(loginRes.headers);
    assert(!!adminCookies.adminSession, 'Admin session cookie issued');

    const adminCookieHeader = `adminSession=${adminCookies.adminSession}`;

    // Access dashboard with valid session
    const dashRes = await httpRequest(`${BASE_API}/api/admin/dashboard`, {
      headers: { 'Cookie': adminCookieHeader }
    });
    assert(dashRes.statusCode === 200 && dashRes.data?.data?.participants !== undefined, 'Admin accesses Dashboard with session');

    // Access responses with valid session
    const respRes = await httpRequest(`${BASE_API}/api/admin/responses`, {
      headers: { 'Cookie': adminCookieHeader }
    });
    assert(respRes.statusCode === 200 && respRes.data?.data?.responses !== undefined, 'Admin accesses Responses with session');

    // Access coding with valid session
    const codingRes = await httpRequest(`${BASE_API}/api/admin/coding/responses`, {
      headers: { 'Cookie': adminCookieHeader }
    });
    assert(codingRes.statusCode === 200 && codingRes.data?.data?.responses !== undefined, 'Admin accesses Coding with session');

    // Refresh simulation (repeated call with session)
    const refreshRes = await httpRequest(`${BASE_API}/api/admin/me`, {
      headers: { 'Cookie': adminCookieHeader }
    });
    assert(refreshRes.statusCode === 200 && refreshRes.data?.data?.username === 'admin', 'Refreshed request retains admin access');

    // ------------------------------------------------------------------------
    // SCENARIO 9, 10, 13: Admin Logout & Session Expiration
    // ------------------------------------------------------------------------
    console.log('\n[Phase 4] Admin Logout & Expired / Invalid Session Rejection');

    // Logout
    const logoutRes = await httpRequest(`${BASE_API}/api/admin/logout`, {
      method: 'POST',
      headers: { 'Cookie': adminCookieHeader }
    });
    assert(logoutRes.statusCode === 200, 'Admin successfully logs out');
    const logoutCookies = parseCookies(logoutRes.headers);
    assert(logoutCookies.adminSession === '' || logoutRes.headers['set-cookie']?.some(s => s.includes('adminSession=;')), 'Session cookie cleared on logout');

    // Subsequent access with logged out / expired session
    const postLogoutRes = await httpRequest(`${BASE_API}/api/admin/dashboard`, {
      headers: { 'Cookie': 'adminSession=invalid_or_expired_token' }
    });
    assert(
      postLogoutRes.statusCode === 401,
      'Expired/invalid adminSession returns 401 Unauthorized'
    );

    // ------------------------------------------------------------------------
    // SCENARIO 14: Frontend HTML Inspection — Zero Pre-Auth Data Leakage
    // ------------------------------------------------------------------------
    console.log('\n[Phase 5] Frontend Security & Zero Pre-Authentication Data Leakage');

    const frontendPages = [
      '/admin',
      '/admin/dashboard',
      '/admin/responses',
      '/admin/coding',
      '/admin/participants',
      '/admin/settings',
      '/admin/response-management'
    ];

    for (const page of frontendPages) {
      const pageRes = await httpRequest(`${FRONTEND_URL}${page}`);
      assert(
        pageRes.statusCode === 200,
        `Frontend SSR route ${page} responds with 200 HTML shell`
      );

      const rawHtml = pageRes.raw;
      const containsParticipantData = rawHtml.includes('@sbbwu.edu.pk') ||
                                     rawHtml.includes('demo_researcher') ||
                                     rawHtml.includes('rawSeverity') ||
                                     rawHtml.includes('tum bohat');

      assert(
        !containsParticipantData,
        `Zero sensitive data leaked in SSR/HTML for ${page}`
      );
    }

    console.log('\n' + '='.repeat(70));
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('='.repeat(70));

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (err) {
    console.error('Unexpected test error:', err);
    process.exit(1);
  }
}

runVerification();
