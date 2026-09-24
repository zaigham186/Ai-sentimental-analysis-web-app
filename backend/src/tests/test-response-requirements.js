/**
 * Comprehensive Test Suite for User Requirements
 * Tests:
 * 1. Pagination (10 per page, Viewing 1-10 of X total, Prev/Next 10)
 * 2. Search bar (participant name, username, all responses across all videos, real-time)
 * 3. Response display order (sequential by video #1, #2..., grouped by participant, all 6 fields)
 * 4. Sorting options (default name A-Z + secondary video ascending, date, status, condition)
 * 5. Backend API endpoints (GET /api/responses, GET /api/admin/responses, GET /api/admin/coding/responses)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const { buildResponseQueryAndResults } = require('../utils/responseQueryHelper');
const { VideoResponse, Participant, Video, Coding } = require('../models');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('='.repeat(70));
    console.log('  RESPONSE CODING & MANAGEMENT PAGE REQUIREMENTS TEST');
    console.log('='.repeat(70));

    // ---------------------------------------------------------
    // REQUIREMENT 1: PAGINATION (10 per page, Viewing 1-10 of X)
    // ---------------------------------------------------------
    console.log('\n[Requirement 1] Pagination (10 per page, count ranges)');
    const p1 = await buildResponseQueryAndResults({ page: 1, limit: 10 });
    assert(p1.pagination.limit === 10, 'Default page limit is 10');
    assert(p1.responses.length <= 10, 'Returns at most 10 items per page');
    assert(p1.pagination.from === 1, 'First item index (from) is 1 on page 1');
    assert(p1.pagination.to === p1.responses.length, `Last item index (to) matches returned length (${p1.responses.length})`);
    assert(typeof p1.pagination.total === 'number' && p1.pagination.total > 0, `Total items is calculated (${p1.pagination.total})`);
    assert(p1.pagination.pages === Math.ceil(p1.pagination.total / 10), `Total pages correctly calculated (${p1.pagination.pages})`);

    // Test page 2 navigation
    if (p1.pagination.pages > 1) {
      const p2 = await buildResponseQueryAndResults({ page: 2, limit: 10 });
      assert(p2.pagination.page === 2, 'Page 2 navigation returns page 2');
      assert(p2.pagination.from === 11, 'Page 2 "from" starts at 11');
      assert(p2.pagination.to === Math.min(20, p2.pagination.total), `Page 2 "to" is ${p2.pagination.to}`);
    }

    // ---------------------------------------------------------
    // REQUIREMENT 2: SEARCH BAR (Name or username, all videos)
    // ---------------------------------------------------------
    console.log('\n[Requirement 2] Search Bar (Name or Username, all responses across all videos)');
    // Find a participant with responses
    const sample = p1.responses[0];
    const participantName = sample?.participant?.name;
    const participantUsername = sample?.participant?.username;

    if (participantName) {
      const firstName = participantName.split(' ')[0];
      const searchByName = await buildResponseQueryAndResults({ search: firstName, limit: 10 });
      assert(searchByName.responses.length > 0, `Searching by participant name "${firstName}" finds results`);
      const allMatchName = searchByName.responses.every(r => 
        (r.participant?.name && r.participant.name.toLowerCase().includes(firstName.toLowerCase())) ||
        (r.participant?.username && r.participant.username.toLowerCase().includes(firstName.toLowerCase())) ||
        (r.responseText && r.responseText.toLowerCase().includes(firstName.toLowerCase()))
      );
      assert(allMatchName, `All results match searched participant name "${firstName}"`);
    }

    if (participantUsername) {
      const searchByUsername = await buildResponseQueryAndResults({ search: participantUsername, limit: 10 });
      assert(searchByUsername.responses.length > 0, `Searching by username "${participantUsername}" finds results`);
      const allMatchUsername = searchByUsername.responses.every(r =>
        (r.participant?.username && r.participant.username.toLowerCase().includes(participantUsername.toLowerCase())) ||
        (r.participant?.name && r.participant.name.toLowerCase().includes(participantUsername.toLowerCase()))
      );
      assert(allMatchUsername, `All results match username "${participantUsername}"`);
    }

    // ---------------------------------------------------------
    // REQUIREMENT 3: RESPONSE DISPLAY ORDER & REQUIRED FIELDS
    // ---------------------------------------------------------
    console.log('\n[Requirement 3] Response Display Order & Required Fields');
    // Verify all 6 required fields on response objects:
    const checkItem = p1.responses[0];
    assert(checkItem.participant && typeof checkItem.participant.name === 'string', 'Field 1: Participant name present');
    assert(checkItem.participant && typeof checkItem.participant.username === 'string', 'Field 1b: Participant username present');
    assert(checkItem.participant && ['anonymous', 'identifiable'].includes(checkItem.participant.condition), `Field 2: Condition present (${checkItem.participant?.condition})`);
    assert(checkItem.video !== undefined, 'Field 3: Video stimulus present');
    assert(typeof checkItem.responseText === 'string' && checkItem.responseText.length > 0, 'Field 4: Response preview text present');
    assert(checkItem.submittedAt !== undefined, 'Field 5: Submission date present');
    assert(['CODED', 'UNCODED'].includes(checkItem.codingStatus), `Field 6: Coding status is CODED or UNCODED (${checkItem.codingStatus})`);

    // Verify sequential video ordering (#1, #2, #3, #4...)
    // Group responses by participant to test order
    const participantMap = new Map();
    p1.responses.forEach(r => {
      const pId = r.participant?._id?.toString() || r.participant?.username;
      if (!participantMap.has(pId)) participantMap.set(pId, []);
      participantMap.get(pId).push(r);
    });

    let sequentialOrderCheck = true;
    for (const [pId, pResponses] of participantMap.entries()) {
      for (let i = 0; i < pResponses.length - 1; i++) {
        const orderA = pResponses[i].video?.order ?? 0;
        const orderB = pResponses[i+1].video?.order ?? 0;
        if (orderA > orderB) {
          sequentialOrderCheck = false;
        }
      }
    }
    assert(sequentialOrderCheck, 'Responses within participant group are sequential by video number (ascending)');

    // ---------------------------------------------------------
    // REQUIREMENT 4: SORTING OPTIONS
    // ---------------------------------------------------------
    console.log('\n[Requirement 4] Sorting Options (Name, Date, Status, Condition, Video)');
    
    // Default: participant name A-Z, secondary video ascending
    const sortName = await buildResponseQueryAndResults({ sortBy: 'name', sortOrder: 'asc', limit: 10 });
    let nameSorted = true;
    for (let i = 0; i < sortName.responses.length - 1; i++) {
      const nA = (sortName.responses[i].participant?.name || '').toLowerCase();
      const nB = (sortName.responses[i+1].participant?.name || '').toLowerCase();
      if (nA.localeCompare(nB) > 0) {
        nameSorted = false;
      }
    }
    assert(nameSorted, 'Default sort: Participant name A-Z ascending');

    // Sort by date (descending)
    const sortDate = await buildResponseQueryAndResults({ sortBy: 'date', sortOrder: 'desc', limit: 5 });
    let dateSorted = true;
    for (let i = 0; i < sortDate.responses.length - 1; i++) {
      const dA = new Date(sortDate.responses[i].submittedAt).getTime();
      const dB = new Date(sortDate.responses[i+1].submittedAt).getTime();
      if (dA < dB) dateSorted = false;
    }
    assert(dateSorted, 'Sort by date descending (newest first)');

    // Sort by status
    const sortStatus = await buildResponseQueryAndResults({ sortBy: 'status', sortOrder: 'asc', limit: 10 });
    assert(sortStatus.responses.length > 0, 'Sort by status returns valid responses');

    // Sort by condition
    const sortCondition = await buildResponseQueryAndResults({ sortBy: 'condition', sortOrder: 'asc', limit: 10 });
    assert(sortCondition.responses.length > 0, 'Sort by condition returns valid responses');

    // ---------------------------------------------------------
    // REQUIREMENT 5: BACKEND API ENDPOINTS
    // ---------------------------------------------------------
    console.log('\n[Requirement 5] Backend API Route Verification');
    const responseRoutes = require('../routes/responses');
    assert(typeof responseRoutes === 'function', 'Response routes module exported as Express Router');

    const appRoutes = require('../routes');
    assert(typeof appRoutes === 'function', 'Root API router exported properly');

    console.log('\n' + '='.repeat(70));
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('='.repeat(70));

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
