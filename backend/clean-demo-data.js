/**
 * Clean Demo & Test Participant Data
 * 
 * Removes:
 * 1. Demo/test participant records (e.g. QA Test Participant, Test User, Temp Delete Test Participant)
 * 2. Any video responses or codings associated with demo/test participants
 * 3. Orphaned video responses whose participant was deleted
 * 4. Orphaned codings whose response was deleted
 * 5. Test video order 101 (QA Test Video Stimulus 1)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config');
const { Participant, VideoResponse, Coding, Video } = require('./src/models');

async function cleanDemoData() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('='.repeat(70));
    console.log('  CLEANING DEMO & TEST DATA FROM CYBERBULLYING RESEARCH PLATFORM');
    console.log('='.repeat(70));

    // 1. Identify Demo/Test Participants
    const allParticipants = await Participant.find().lean();
    console.log(`Total participants before cleanup: ${allParticipants.length}`);

    const demoParticipants = allParticipants.filter(p => {
      const name = (p.name || '').toLowerCase();
      const username = (p.username || '').toLowerCase();
      return (
        name.includes('test') ||
        name.includes('demo') ||
        username.includes('test') ||
        username.includes('demo') ||
        username.startsWith('qa_') ||
        username.startsWith('temp_')
      );
    });

    console.log(`\nFound ${demoParticipants.length} demo/test participants:`);
    demoParticipants.forEach(p => {
      console.log(`  - [${p._id}] Name: "${p.name}", Username: "${p.username}", Condition: ${p.condition}`);
    });

    const demoParticipantIds = demoParticipants.map(p => p._id);

    // 2. Find responses associated with demo participants
    const demoParticipantResponses = await VideoResponse.find({
      participant: { $in: demoParticipantIds }
    }).lean();
    console.log(`\nFound ${demoParticipantResponses.length} responses linked to demo participants`);

    // 3. Find orphaned responses (participant does not exist in DB)
    const validParticipantIds = allParticipants
      .filter(p => !demoParticipantIds.some(dpId => dpId.toString() === p._id.toString()))
      .map(p => p._id.toString());

    const allResponses = await VideoResponse.find().lean();
    const orphanedResponses = allResponses.filter(r => {
      if (!r.participant) return true;
      return !validParticipantIds.includes(r.participant.toString());
    });

    console.log(`Found ${orphanedResponses.length} orphaned/demo responses to remove:`);
    orphanedResponses.forEach(r => {
      console.log(`  - Resp [${r._id}] Participant: ${r.participant || 'null'} | Text: "${(r.responseText || '').slice(0, 50)}..."`);
    });

    const responseIdsToDelete = [
      ...demoParticipantResponses.map(r => r._id),
      ...orphanedResponses.map(r => r._id)
    ];

    // 4. Find codings linked to these responses or orphaned
    const allCodings = await Coding.find().lean();
    const orphanedOrDemoCodings = allCodings.filter(c => {
      if (!c.response) return true;
      return responseIdsToDelete.some(rId => rId.toString() === c.response.toString());
    });
    console.log(`\nFound ${orphanedOrDemoCodings.length} orphaned/demo codings to remove`);

    // 5. Check test videos (order > 10)
    const demoVideos = await Video.find({ order: { $gt: 10 } }).lean();
    console.log(`Found ${demoVideos.length} demo/test videos (order > 10):`);
    demoVideos.forEach(v => {
      console.log(`  - Video [${v._id}] Order: ${v.order}, Title: "${v.title}"`);
    });

    // EXECUTE DELETIONS
    console.log('\n--- Executing Cleanup ---');

    // Delete demo participants
    if (demoParticipantIds.length > 0) {
      const pRes = await Participant.deleteMany({ _id: { $in: demoParticipantIds } });
      console.log(`✓ Deleted ${pRes.deletedCount} demo/test participants`);
    }

    // Delete responses
    if (responseIdsToDelete.length > 0) {
      const rRes = await VideoResponse.deleteMany({ _id: { $in: responseIdsToDelete } });
      console.log(`✓ Deleted ${rRes.deletedCount} demo/orphaned video responses`);
    }

    // Delete codings
    if (orphanedOrDemoCodings.length > 0) {
      const cIds = orphanedOrDemoCodings.map(c => c._id);
      const cRes = await Coding.deleteMany({ _id: { $in: cIds } });
      console.log(`✓ Deleted ${cRes.deletedCount} demo/orphaned codings`);
    }

    // Delete demo videos
    if (demoVideos.length > 0) {
      const vIds = demoVideos.map(v => v._id);
      const vRes = await Video.deleteMany({ _id: { $in: vIds } });
      console.log(`✓ Deleted ${vRes.deletedCount} demo videos`);
    }

    // VERIFY FINAL STATE
    console.log('\n--- Verification of Remaining Data ---');
    const remainingParticipants = await Participant.find().sort({ createdAt: 1 }).lean();
    const remainingResponses = await VideoResponse.find().lean();
    const remainingCodings = await Coding.find().lean();
    const remainingVideos = await Video.find().sort({ order: 1 }).lean();

    console.log(`Remaining Participants: ${remainingParticipants.length}`);
    console.log(`Remaining Video Responses: ${remainingResponses.length}`);
    console.log(`Remaining Codings: ${remainingCodings.length}`);
    console.log(`Remaining Videos: ${remainingVideos.length}`);

    console.log('\nAll Remaining Participants:');
    remainingParticipants.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.name} (@${p.username}) - ${p.condition}, ${p.gender}, ${p.university}`);
    });

    console.log('\n✓ Cleanup complete! No demo participant data exists in the database.');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanDemoData();
