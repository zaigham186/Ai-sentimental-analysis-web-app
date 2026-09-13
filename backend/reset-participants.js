const mongoose = require('mongoose');
require('dotenv').config();

async function resetParticipants() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research');
    console.log('✓ Connected to database\n');

    const db = mongoose.connection.db;

    // Get participant IDs before deletion
    const participants = await db.collection('participants').find({}).toArray();
    const participantIds = participants.map(p => p._id);
    
    console.log(`Found ${participants.length} participants to remove`);
    
    if (participants.length === 0) {
      console.log('\n✓ No participants to remove. Database is already clean.');
      await mongoose.disconnect();
      return;
    }

    // Delete all related data
    console.log('\nRemoving participant data...');
    
    // 1. Delete video responses
    const videoResponsesResult = await db.collection('videoresponses').deleteMany({
      participant: { $in: participantIds }
    });
    console.log(`✓ Deleted ${videoResponsesResult.deletedCount} video responses`);

    // 2. Delete questionnaire responses
    const questionnaireResponsesResult = await db.collection('questionnaireresponses').deleteMany({
      participant: { $in: participantIds }
    });
    console.log(`✓ Deleted ${questionnaireResponsesResult.deletedCount} questionnaire responses`);

    // 3. Delete coding records
    const codingResult = await db.collection('codings').deleteMany({
      participant: { $in: participantIds }
    });
    console.log(`✓ Deleted ${codingResult.deletedCount} coding records`);

    // 4. Delete ALL orphaned coding records (codings without matching participants)
    const allCodings = await db.collection('codings').find({}).toArray();
    const allParticipantIds = (await db.collection('participants').find({}).toArray()).map(p => p._id.toString());
    
    const orphanedCodings = allCodings.filter(c => !allParticipantIds.includes(c.participant?.toString()));
    if (orphanedCodings.length > 0) {
      const orphanedIds = orphanedCodings.map(c => c._id);
      const orphanedResult = await db.collection('codings').deleteMany({
        _id: { $in: orphanedIds }
      });
      console.log(`✓ Deleted ${orphanedResult.deletedCount} orphaned coding records`);
    }

    // 5. Delete participants
    const participantsResult = await db.collection('participants').deleteMany({});
    console.log(`✓ Deleted ${participantsResult.deletedCount} participants`);

    // 5. Reset study settings participant counts to 0
    await db.collection('studysettings').updateOne(
      {},
      {
        $set: {
          currentParticipants: 0,
          anonymousCount: 0,
          identifiableCount: 0,
          updatedAt: new Date()
        }
      }
    );
    console.log('✓ Reset participant counts in study settings');

    console.log('\n✓ All participant data successfully removed!');
    console.log('✓ System is ready for fresh participant registrations.');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetParticipants();
