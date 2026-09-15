/**
 * Reset Participant Data Script
 * ⚠️  WARNING: This will DELETE participant data but KEEP videos!
 * 
 * Deletes:
 * - All participants
 * - All video responses
 * - All coding records
 * - All questionnaire responses
 * - All audit logs
 * - Resets participant counts to 0
 * 
 * Keeps:
 * - Admin accounts
 * - Videos (your 10 Cloudinary videos)
 * - Study settings
 * 
 * Usage: node reset-all-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research';
    await mongoose.connect(mongoURI);
    console.log('✓ Connected to MongoDB');
    console.log(`Database: ${mongoose.connection.db.databaseName}\n`);
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Reset all data
 */
async function resetAllData() {
  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║      ⚠️  RESET PARTICIPANT DATA TOOL  ⚠️              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('This will DELETE participant data but KEEP videos:');
    console.log('  ❌ All participants');
    console.log('  ❌ All video responses');
    console.log('  ❌ All coding records');
    console.log('  ❌ All questionnaire responses');
    console.log('  ❌ All audit logs');
    console.log('');
    console.log('  ✅ Videos will be KEPT');
    console.log('  ✅ Admin accounts will be KEPT');
    console.log('  ✅ Study settings will be KEPT');
    console.log('');

    const confirm1 = await question('Delete participant data but keep videos? (yes/no): ');
    if (confirm1.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled. No data was deleted.\n');
      rl.close();
      await mongoose.disconnect();
      process.exit(0);
    }

    const confirm2 = await question('\nType "DELETE PARTICIPANT DATA" to confirm: ');
    if (confirm2 !== 'DELETE PARTICIPANT DATA') {
      console.log('\n❌ Operation cancelled. Confirmation text did not match.\n');
      rl.close();
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('\n════════════════════════════════════════════════════════\n');
    console.log('Starting data deletion...\n');

    const db = mongoose.connection.db;

    // Get counts before deletion
    const participantsCount = await db.collection('participants').countDocuments();
    const responsesCount = await db.collection('videoresponses').countDocuments();
    const codingsCount = await db.collection('codings').countDocuments();
    const videosCount = await db.collection('videos').countDocuments();
    const questionnaireResponsesCount = await db.collection('questionnaireresponses').countDocuments();
    const questionnairesCount = await db.collection('questionnaires').countDocuments();
    const auditLogsCount = await db.collection('auditlogs').countDocuments();
    const studySettingsCount = await db.collection('studysettings').countDocuments();

    console.log('Current data:');
    console.log(`  - ${participantsCount} participants`);
    console.log(`  - ${responsesCount} video responses`);
    console.log(`  - ${codingsCount} coding records`);
    console.log(`  - ${videosCount} videos`);
    console.log(`  - ${questionnaireResponsesCount} questionnaire responses`);
    console.log(`  - ${questionnairesCount} questionnaires`);
    console.log(`  - ${auditLogsCount} audit logs`);
    console.log(`  - ${studySettingsCount} study settings`);
    console.log('');

    // Delete all data
    console.log('Deleting participants...');
    await db.collection('participants').deleteMany({});
    console.log('✓ Participants deleted\n');

    console.log('Deleting video responses...');
    await db.collection('videoresponses').deleteMany({});
    console.log('✓ Video responses deleted\n');

    console.log('Deleting coding records...');
    await db.collection('codings').deleteMany({});
    console.log('✓ Coding records deleted\n');

    console.log('Keeping videos (not deleted)...');
    console.log(`✓ ${videosCount} videos preserved\n`);

    console.log('Deleting questionnaire responses...');
    await db.collection('questionnaireresponses').deleteMany({});
    console.log('✓ Questionnaire responses deleted\n');

    console.log('Deleting audit logs...');
    await db.collection('auditlogs').deleteMany({});
    console.log('✓ Audit logs deleted\n');

    console.log('Resetting participant counts in study settings...');
    await db.collection('studysettings').updateMany(
      {},
      {
        $set: {
          currentParticipants: 0,
          currentAnonymous: 0,
          currentIdentifiable: 0,
          updatedAt: new Date()
        }
      }
    );
    console.log('✓ Participant counts reset to 0\n');

    // Check what was preserved
    const adminCount = await db.collection('admins').countDocuments();
    const remainingVideos = await db.collection('videos').countDocuments();
    console.log(`✓ Admin accounts preserved: ${adminCount} admin(s)`);
    console.log(`✓ Videos preserved: ${remainingVideos} video(s)\n`);

    console.log('════════════════════════════════════════════════════════\n');
    console.log('✅ PARTICIPANT DATA HAS BEEN DELETED!\n');
    console.log('Your videos are still there. Ready for fresh testing.\n');
    console.log('Next steps:');
    console.log('  1. Register new test participants');
    console.log('  2. Complete experiment with real responses');
    console.log('  3. Code responses in admin panel\n');

    rl.close();
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB\n');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error during reset:', error.message);
    console.error(error);
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  await connectDB();
  await resetAllData();
}

// Run main function
main();
