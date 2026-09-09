const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research');
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;

    // Check participants
    const participants = await db.collection('participants').countDocuments();
    console.log(`Participants in database: ${participants}`);

    // Check study settings
    const settings = await db.collection('studysettings').findOne({});
    if (settings) {
      console.log('\nStudy Settings:');
      console.log(`  Target Total: ${settings.targetTotalParticipants || 60}`);
      console.log(`  Target Anonymous: ${settings.targetAnonymous || 30}`);
      console.log(`  Target Identifiable: ${settings.targetIdentifiable || 30}`);
      console.log(`  Current Anonymous: ${settings.currentAnonymousCount || 0}`);
      console.log(`  Current Identifiable: ${settings.currentIdentifiableCount || 0}`);
      console.log(`  Total: ${(settings.currentAnonymousCount || 0) + (settings.currentIdentifiableCount || 0)}`);
    } else {
      console.log('\n⚠️ No study settings found!');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabase();
