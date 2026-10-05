/**
 * Check Database Sync Between Localhost and Production
 * This script helps diagnose database connection issues
 */

const mongoose = require('mongoose');
const { Participant } = require('./src/models');
require('dotenv').config();

async function checkDatabaseSync() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   DATABASE SYNC CHECKER');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    console.log('📡 Connecting to MongoDB...');
    console.log(`   URI: ${mongoUri.substring(0, 30)}...${mongoUri.substring(mongoUri.length - 20)}\n`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected successfully!\n');

    // Count participants
    const totalParticipants = await Participant.countDocuments();
    console.log(`📊 TOTAL PARTICIPANTS: ${totalParticipants}\n`);

    // Get all participants with details
    const participants = await Participant.find()
      .select('name username condition status gender age createdAt')
      .sort({ createdAt: -1 });

    console.log('👥 PARTICIPANT LIST:\n');
    console.log('ID                       | Name                  | Username      | Condition    | Status   | Gender');
    console.log('─'.repeat(120));
    
    participants.forEach((p, index) => {
      const id = p._id.toString();
      const name = (p.name || 'N/A').padEnd(20).substring(0, 20);
      const username = (p.username || 'N/A').padEnd(12).substring(0, 12);
      const condition = (p.condition || 'N/A').padEnd(11).substring(0, 11);
      const status = (p.status || 'N/A').padEnd(8).substring(0, 8);
      const gender = (p.gender || 'N/A').padEnd(6);
      
      console.log(`${id} | ${name} | ${username} | ${condition} | ${status} | ${gender}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`   EXPECTED IN FRONTEND: ${totalParticipants} participants`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check specific participant IDs
    console.log('🔍 TESTING SPECIFIC PARTICIPANT IDS:\n');
    
    // Test a few IDs
    const testIds = participants.slice(0, 3).map(p => p._id);
    
    for (const id of testIds) {
      const exists = await Participant.findById(id);
      console.log(`   ID: ${id} → ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    }

    console.log('\n✅ Database check completed!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database\n');
  }
}

// Run check
checkDatabaseSync();
