const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Fix Duplicate Index Script
 * Drops old duplicate indexes from MongoDB collections
 */

async function fixIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research');
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;

    // Fix QuestionnaireResponse collection
    console.log('Fixing QuestionnaireResponse indexes...');
    try {
      const collection = db.collection('questionnaireresponses');
      const indexes = await collection.indexes();
      console.log('Current indexes:', indexes.map(i => i.name).join(', '));
      
      // Drop individual questionnaireId index if it exists
      try {
        await collection.dropIndex('questionnaireId_1');
        console.log('✓ Dropped questionnaireId_1 index');
      } catch (err) {
        console.log('  (questionnaireId_1 index not found - OK)');
      }
    } catch (err) {
      console.log('  (Collection not found - OK)');
    }

    console.log('\n✓ All indexes fixed!');
    console.log('\nYou can now start the server without warnings.');
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

fixIndexes();
