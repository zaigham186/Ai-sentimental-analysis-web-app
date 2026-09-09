const mongoose = require('mongoose');
require('dotenv').config();

async function updateLimits() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research');
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;

    // Update study settings to 90 participants
    console.log('Updating participant limits to 90...');
    const result = await db.collection('studysettings').updateOne(
      {},
      {
        $set: {
          targetParticipants: 90,
          anonymousTarget: 45,
          identifiableTarget: 45,
          acceptingParticipants: true,
          recruitmentStatus: 'open',
          currentParticipants: 0,
          anonymousCount: 0,
          identifiableCount: 0,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('✓ Limits updated to 90 (45 anonymous + 45 identifiable)');
    console.log('✓ Accepting participants: enabled');
    console.log('✓ Recruitment status: open');

    await mongoose.disconnect();
    console.log('\n✓ Done! You can now register up to 90 participants.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateLimits();
