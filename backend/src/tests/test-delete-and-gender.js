/**
 * Test Suite for Admin Portal Delete Functionality and Gender Filter
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const { buildResponseQueryAndResults } = require('../utils/responseQueryHelper');
const { VideoResponse, Participant, Video, Coding } = require('../models');
const participantManagementController = require('../controllers/participantManagementController');
const responseManagementController = require('../controllers/responseManagementController');
const codingController = require('../controllers/codingController');

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
    console.log('  ADMIN PORTAL: GENDER FILTER & DELETE FUNCTIONALITY TESTS');
    console.log('='.repeat(70));

    // ---------------------------------------------------------
    // 1. PARTICIPANT MANAGEMENT GENDER FILTER
    // ---------------------------------------------------------
    console.log('\n[1] Testing Gender Filter in Participant Management');

    // Simulate mock req/res for participantManagementController.getAllParticipants
    async function getParticipantsWithFilter(query) {
      return new Promise((resolve, reject) => {
        const req = { query };
        const res = {
          json: (data) => resolve(data),
          status: (code) => ({
            json: (data) => reject(new Error(`Status ${code}: ${JSON.stringify(data)}`))
          })
        };
        participantManagementController.getAllParticipants(req, res).catch(reject);
      });
    }

    const allParticipantsRes = await getParticipantsWithFilter({});
    const totalAll = allParticipantsRes.data.participants.length;
    assert(totalAll > 0, `Retrieved all participants (${totalAll} total)`);

    const maleParticipantsRes = await getParticipantsWithFilter({ gender: 'male' });
    const maleList = maleParticipantsRes.data.participants;
    assert(
      maleList.every((p) => p.gender === 'male'),
      `All ${maleList.length} returned participants have gender: 'male'`
    );

    const femaleParticipantsRes = await getParticipantsWithFilter({ gender: 'female' });
    const femaleList = femaleParticipantsRes.data.participants;
    assert(
      femaleList.every((p) => p.gender === 'female'),
      `All ${femaleList.length} returned participants have gender: 'female'`
    );

    console.log(`     Counts: Total=${totalAll}, Male=${maleList.length}, Female=${femaleList.length}`);

    // ---------------------------------------------------------
    // 2. RESPONSE MANAGEMENT & CODING GENDER FILTER (buildResponseQueryAndResults)
    // ---------------------------------------------------------
    console.log('\n[2] Testing Gender Filter in Responses & Coding Views');

    // Test gender = male in participant view mode
    const maleRespPartMode = await buildResponseQueryAndResults({ gender: 'male', viewMode: 'participant', participantIndex: 1 });
    assert(
      maleRespPartMode.currentParticipant ? maleRespPartMode.currentParticipant.gender === 'male' : true,
      `Participant view mode with gender=male returns male participant`
    );
    if (maleRespPartMode.responses.length > 0) {
      assert(
        maleRespPartMode.responses.every((r) => r.participant && r.participant.gender === 'male'),
        `All responses in male filtered participant view have participant gender: 'male'`
      );
    }

    // Test gender = female in participant view mode
    const femaleRespPartMode = await buildResponseQueryAndResults({ gender: 'female', viewMode: 'participant', participantIndex: 1 });
    assert(
      femaleRespPartMode.currentParticipant ? femaleRespPartMode.currentParticipant.gender === 'female' : true,
      `Participant view mode with gender=female returns female participant`
    );
    if (femaleRespPartMode.responses.length > 0) {
      assert(
        femaleRespPartMode.responses.every((r) => r.participant && r.participant.gender === 'female'),
        `All responses in female filtered participant view have participant gender: 'female'`
      );
    }

    // Test gender = male in flat response view mode
    const maleRespFlat = await buildResponseQueryAndResults({ gender: 'male', viewMode: 'responses', limit: 20 });
    assert(
      maleRespFlat.responses.length > 0 && maleRespFlat.responses.every((r) => r.participant && r.participant.gender === 'male'),
      `Flat response mode with gender=male returns only male participant responses (${maleRespFlat.responses.length} checked)`
    );

    // Test gender = female in flat response view mode
    const femaleRespFlat = await buildResponseQueryAndResults({ gender: 'female', viewMode: 'responses', limit: 20 });
    assert(
      femaleRespFlat.responses.length > 0 && femaleRespFlat.responses.every((r) => r.participant && r.participant.gender === 'female'),
      `Flat response mode with gender=female returns only female participant responses (${femaleRespFlat.responses.length} checked)`
    );

    // ---------------------------------------------------------
    // 3. COMBINED FILTERS (Condition + Gender + Status)
    // ---------------------------------------------------------
    console.log('\n[3] Testing Combined Filters (Condition + Gender + Status)');

    // Condition = identifiable + Gender = male
    const identMale = await buildResponseQueryAndResults({ condition: 'identifiable', gender: 'male', viewMode: 'responses', limit: 20 });
    assert(
      identMale.responses.length > 0 && identMale.responses.every((r) => r.participant && r.participant.condition === 'identifiable' && r.participant.gender === 'male'),
      `Combined Condition=identifiable + Gender=male returns only matching records (${identMale.responses.length} found)`
    );

    // Condition = anonymous + Gender = female
    const anonFemale = await buildResponseQueryAndResults({ condition: 'anonymous', gender: 'female', viewMode: 'responses', limit: 20 });
    assert(
      anonFemale.responses.length > 0 && anonFemale.responses.every((r) => r.participant && r.participant.condition === 'anonymous' && r.participant.gender === 'female'),
      `Combined Condition=anonymous + Gender=female returns only matching records (${anonFemale.responses.length} found)`
    );

    // Condition = identifiable + Gender = female + coded = true
    const identFemaleCoded = await buildResponseQueryAndResults({ condition: 'identifiable', gender: 'female', coded: 'true', viewMode: 'responses', limit: 20 });
    assert(
      identFemaleCoded.responses.every((r) => r.participant && r.participant.condition === 'identifiable' && r.participant.gender === 'female' && r.coded === true),
      `Triple filter (Condition=identifiable + Gender=female + Coded=true) correctly filters all records`
    );

    // ---------------------------------------------------------
    // 4. DELETE FUNCTIONALITY (Response Management Controller)
    // ---------------------------------------------------------
    console.log('\n[4] Testing Delete Functionality in Response Management');

    // Ensure clean state before starting
    await Participant.deleteMany({ username: /^temp_test_/ });

    let tempParticipant;
    try {
      tempParticipant = await Participant.create({
        name: 'Temp Delete Test Participant',
        username: `temp_test_${Date.now()}`,
        condition: 'identifiable',
        gender: 'male',
        age: 25,
        department: 'Testing',
        university: 'SBBWU'
      });

      const anyVideo = await Video.findOne({ order: { $lte: 10 } });
      assert(!!anyVideo, 'Found a video for test response');

      const tempResponse = await VideoResponse.create({
        participant: tempParticipant._id,
        video: anyVideo._id,
        responseText: 'Temporary response to test delete functionality',
        submittedAt: new Date()
      });

      // Create an associated coding record
      const tempCoding = await Coding.create({
        response: tempResponse._id
      });

      const initialTotalResponses = await VideoResponse.countDocuments();

      // Call responseManagementController.deleteResponse
      let deleteResponseResult;
      await new Promise((resolve, reject) => {
        const req = {
          params: { id: tempResponse._id.toString() },
          user: { id: 'admin1', role: 'admin' }
        };
        const res = {
          json: (data) => {
            deleteResponseResult = data;
            resolve(data);
          },
          status: (code) => ({
            json: (data) => reject(new Error(`Delete failed with status ${code}: ${JSON.stringify(data)}`))
          })
        };
        responseManagementController.deleteResponse(req, res).catch(reject);
      });

      assert(deleteResponseResult && deleteResponseResult.success === true, 'deleteResponse returned success: true');

      // Verify response is removed from DB
      const checkResponse = await VideoResponse.findById(tempResponse._id);
      assert(checkResponse === null, 'VideoResponse was deleted from the database');

      // Verify coding is cascaded and removed
      const checkCoding = await Coding.findById(tempCoding._id);
      assert(checkCoding === null, 'Associated Coding record was cascade deleted');

      // Verify other responses unaffected
      const newTotalResponses = await VideoResponse.countDocuments();
      assert(newTotalResponses === initialTotalResponses - 1, `Total responses decreased by exactly 1 (${initialTotalResponses} -> ${newTotalResponses})`);

      // ---------------------------------------------------------
      // 5. DELETE FUNCTIONALITY (Coding Controller)
      // ---------------------------------------------------------
      console.log('\n[5] Testing Delete Functionality in Coding Controller');

      const tempResponse2 = await VideoResponse.create({
        participant: tempParticipant._id,
        video: anyVideo._id,
        responseText: 'Second temporary response to test coding controller delete',
        submittedAt: new Date()
      });

      const tempCoding2 = await Coding.create({
        response: tempResponse2._id
      });

      let codingDeleteResult;
      await new Promise((resolve, reject) => {
        const req = {
          params: { id: tempResponse2._id.toString() },
          user: { id: 'admin1', role: 'admin' }
        };
        const res = {
          json: (data) => {
            codingDeleteResult = data;
            resolve(data);
          },
          status: (code) => ({
            json: (data) => reject(new Error(`Coding delete failed with status ${code}: ${JSON.stringify(data)}`))
          })
        };
        codingController.deleteResponse(req, res).catch(reject);
      });

      assert(codingDeleteResult && codingDeleteResult.success === true, 'codingController.deleteResponse returned success: true');

      const checkResponse2 = await VideoResponse.findById(tempResponse2._id);
      assert(checkResponse2 === null, 'VideoResponse was deleted via coding controller');

      const checkCoding2 = await Coding.findById(tempCoding2._id);
      assert(checkCoding2 === null, 'Associated Coding record was also cascade deleted');
    } finally {
      // Guarantee cleanup of temp participant, responses, and codings
      if (tempParticipant) {
        await VideoResponse.deleteMany({ participant: tempParticipant._id });
        await Coding.deleteMany({ response: { $in: await VideoResponse.find({ participant: tempParticipant._id }).distinct('_id') } });
        await Participant.findByIdAndDelete(tempParticipant._id);
      }
    }

    // ---------------------------------------------------------
    // 6. ERROR HANDLING ON NON-EXISTENT OR INVALID ID
    // ---------------------------------------------------------
    console.log('\n[6] Testing Delete Error Handling');

    let errorHandled = false;
    await new Promise((resolve) => {
      const req = {
        params: { id: new mongoose.Types.ObjectId().toString() },
        user: { id: 'admin1', role: 'admin' }
      };
      const res = {
        json: () => resolve(),
        status: (code) => {
          if (code === 404) errorHandled = true;
          return { json: () => resolve() };
        }
      };
      responseManagementController.deleteResponse(req, res).catch(() => resolve());
    });
    assert(errorHandled, 'Deleting non-existent ID gracefully returns 404 status');

    // ---------------------------------------------------------
    // 7. PARTICIPANT DELETE FUNCTIONALITY (participantManagementController)
    // ---------------------------------------------------------
    console.log('\n[7] Testing Delete Participant in Participant Management');

    const tempParticipant3 = await Participant.create({
      name: 'Temp Participant To Delete',
      username: `temp_p_delete_${Date.now()}`,
      condition: 'anonymous',
      gender: 'female',
      age: 21,
      department: 'Testing',
      university: 'SBBWU'
    });

    const anyVideo2 = await Video.findOne({ order: { $lte: 10 } });
    const tempResponse3 = await VideoResponse.create({
      participant: tempParticipant3._id,
      video: anyVideo2._id,
      responseText: 'Participant response to verify cascade deletion',
      submittedAt: new Date()
    });

    const tempCoding3 = await Coding.create({
      response: tempResponse3._id
    });

    let deleteParticipantResult;
    await new Promise((resolve, reject) => {
      const req = {
        params: { id: tempParticipant3._id.toString() },
        user: { id: 'admin1', role: 'admin' }
      };
      const res = {
        json: (data) => {
          deleteParticipantResult = data;
          resolve(data);
        },
        status: (code) => ({
          json: (data) => reject(new Error(`Delete participant failed with status ${code}: ${JSON.stringify(data)}`))
        })
      };
      participantManagementController.deleteParticipant(req, res).catch(reject);
    });

    assert(deleteParticipantResult && deleteParticipantResult.success === true, 'deleteParticipant returned success: true');

    const checkP = await Participant.findById(tempParticipant3._id);
    assert(checkP === null, 'Participant was deleted from the database');

    const checkR = await VideoResponse.findById(tempResponse3._id);
    assert(checkR === null, 'Associated VideoResponse was cascaded and deleted');

    const checkC = await Coding.findById(tempCoding3._id);
    assert(checkC === null, 'Associated Coding was cascaded and deleted');

    // Test deleting non-existent participant ID returns 404
    let pNotFoundHandled = false;
    await new Promise((resolve) => {
      const req = {
        params: { id: new mongoose.Types.ObjectId().toString() },
        user: { id: 'admin1', role: 'admin' }
      };
      const res = {
        json: () => resolve(),
        status: (code) => {
          if (code === 404) pNotFoundHandled = true;
          return { json: () => resolve() };
        }
      };
      participantManagementController.deleteParticipant(req, res).catch(() => resolve());
    });
    assert(pNotFoundHandled, 'Deleting non-existent participant ID gracefully returns 404 status');

    // Ensure any leftover temp_p_delete_ records are cleaned
    await Participant.deleteMany({ username: /^temp_p_delete_/ });

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
