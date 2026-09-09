const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Reset Participants Script
 * Deletes all test participants so you can register new ones
 */

async function resetParticipants() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research');
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;

    // Delete all participants
    console.log('Deleting all participants...');
    const participants = db.collection('participants');
    const result = await participants.deleteMany({});
    console.log(`✓ Deleted ${result.deletedCount} participants`);

    // Delete all video responses
    console.log('Deleting all video responses...');
    const videoResponses = db.collection('videoresponses');
    const result2 = await videoResponses.deleteMany({});
    console.log(`✓ Deleted ${result2.deletedCount} video responses`);

    // Reset study settings
    console.log('Resetting study settings...');
    const studySettings = db.collection('studysettings');
    await studySettings.updateOne(
      {},
      {
        $set: {
          currentAnonymousCount: 0,
          currentIdentifiableCount: 0,
          lastAssignmentVersion: 0,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log('✓ Study settings reset');

    console.log('\n✓ All test data cleared!');
    console.log('\nYou can now register new participants.');
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

resetParticipants();
