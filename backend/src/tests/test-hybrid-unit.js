/**
 * Unit Test Suite for Cross-Domain Hybrid Authentication
 * Verifies extractParticipantId and extractAdminId across all credential modes:
 * - Bearer Token in Authorization Header (Cross-domain / 3rd-party cookie blocked)
 * - Custom Header (x-participant-session / x-admin-session)
 * - Session Cookies (Same-domain / standard cookies enabled)
 * - Precedence and fallback behavior
 */

const assert = require('assert');
const { extractParticipantId } = require('../middleware/participantAuth');
const { extractAdminId } = require('../middleware/adminAuth');

console.log('='.repeat(65));
console.log('HYBRID AUTHENTICATION EXTRACTION & HEADER VERIFICATION');
console.log('='.repeat(65));

const MOCK_PARTICIPANT_ID = '60d5ecb8b5c0c24d9c8b4567';
const MOCK_ADMIN_ID = '60d5ecb8b5c0c24d9c8b4568';

let passed = 0;
let failed = 0;

function runTest(description, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// 1. Participant Auth Extraction Tests
// -------------------------------------------------------------
console.log('\n[1] Participant Session Extraction:');

runTest('Extracts participant ID from Cookie when present', () => {
  const req = {
    cookies: { participantSession: MOCK_PARTICIPANT_ID },
    headers: {}
  };
  const result = extractParticipantId(req);
  assert.strictEqual(result, MOCK_PARTICIPANT_ID);
});

runTest('Extracts participant ID from Authorization: Bearer <token> (No cookies)', () => {
  const req = {
    cookies: {},
    headers: {
      authorization: `Bearer ${MOCK_PARTICIPANT_ID}`
    }
  };
  const result = extractParticipantId(req);
  assert.strictEqual(result, MOCK_PARTICIPANT_ID);
});

runTest('Extracts participant ID from capitalized Authorization header', () => {
  const req = {
    cookies: {},
    headers: {
      Authorization: `Bearer ${MOCK_PARTICIPANT_ID}`
    }
  };
  const result = extractParticipantId(req);
  assert.strictEqual(result, MOCK_PARTICIPANT_ID);
});

runTest('Extracts participant ID from x-participant-session custom header', () => {
  const req = {
    cookies: {},
    headers: {
      'x-participant-session': MOCK_PARTICIPANT_ID
    }
  };
  const result = extractParticipantId(req);
  assert.strictEqual(result, MOCK_PARTICIPANT_ID);
});

runTest('Extracts participant ID from x-session-token fallback header', () => {
  const req = {
    cookies: {},
    headers: {
      'x-session-token': MOCK_PARTICIPANT_ID
    }
  };
  const result = extractParticipantId(req);
  assert.strictEqual(result, MOCK_PARTICIPANT_ID);
});

runTest('Returns null when no cookies and no auth headers present', () => {
  const req = {
    cookies: {},
    headers: {}
  };
  const result = extractParticipantId(req);
  assert.strictEqual(result, null);
});

runTest('Handles missing cookies object gracefully', () => {
  const req = {
    headers: {
      authorization: `Bearer ${MOCK_PARTICIPANT_ID}`
    }
  };
  const result = extractParticipantId(req);
  assert.strictEqual(result, MOCK_PARTICIPANT_ID);
});

// -------------------------------------------------------------
// 2. Admin Auth Extraction Tests
// -------------------------------------------------------------
console.log('\n[2] Admin Session Extraction:');

runTest('Extracts admin ID from adminSession cookie', () => {
  const req = {
    cookies: { adminSession: MOCK_ADMIN_ID },
    headers: {}
  };
  const result = extractAdminId(req);
  assert.strictEqual(result, MOCK_ADMIN_ID);
});

runTest('Extracts admin ID from Authorization: Bearer <token>', () => {
  const req = {
    cookies: {},
    headers: {
      authorization: `Bearer ${MOCK_ADMIN_ID}`
    }
  };
  const result = extractAdminId(req);
  assert.strictEqual(result, MOCK_ADMIN_ID);
});

runTest('Extracts admin ID from x-admin-session header', () => {
  const req = {
    cookies: {},
    headers: {
      'x-admin-session': MOCK_ADMIN_ID
    }
  };
  const result = extractAdminId(req);
  assert.strictEqual(result, MOCK_ADMIN_ID);
});

runTest('Returns null when admin request has no credentials', () => {
  const req = {
    cookies: {},
    headers: {}
  };
  const result = extractAdminId(req);
  assert.strictEqual(result, null);
});

console.log('\n' + '='.repeat(65));
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('='.repeat(65));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\nAll extraction unit tests passed cleanly!\n');
  process.exit(0);
}
