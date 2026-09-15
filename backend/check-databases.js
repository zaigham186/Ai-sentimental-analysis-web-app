/**
 * Check Available Databases Script
 * Lists all databases in your MongoDB cluster to find your old data
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkDatabases() {
  try {
    // Connect without specifying database
    const baseUri = process.env.MONGODB_URI.split('/').slice(0, -1).join('/') + '/';
    console.log('\n=== Connecting to MongoDB Atlas ===\n');
    
    await mongoose.connect(baseUri + 'admin');
    console.log('✓ Connected to MongoDB\n');

    // List all databases
    const admin = mongoose.connection.db.admin();
    const { databases } = await admin.listDatabases();

    console.log('=== Available Databases ===\n');
    
    if (databases.length === 0) {
      console.log('No databases found.');
    } else {
      for (const db of databases) {
        console.log(`Database: ${db.name}`);
        console.log(`  Size: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Empty: ${db.empty ? 'Yes' : 'No'}`);
        
        // Check collections in each database
        const dbConnection = mongoose.connection.client.db(db.name);
        const collections = await dbConnection.listCollections().toArray();
        
        if (collections.length > 0) {
          console.log(`  Collections: ${collections.map(c => c.name).join(', ')}`);
          
          // Count documents in key collections
          const participantsCount = await dbConnection.collection('participants').countDocuments().catch(() => 0);
          const responsesCount = await dbConnection.collection('videoresponses').countDocuments().catch(() => 0);
          const codingsCount = await dbConnection.collection('codings').countDocuments().catch(() => 0);
          const videosCount = await dbConnection.collection('videos').countDocuments().catch(() => 0);
          
          if (participantsCount > 0 || responsesCount > 0 || codingsCount > 0) {
            console.log(`  📊 Data Summary:`);
            console.log(`     - ${participantsCount} participants`);
            console.log(`     - ${responsesCount} video responses`);
            console.log(`     - ${codingsCount} coding records`);
            console.log(`     - ${videosCount} videos`);
          }
        } else {
          console.log(`  Collections: (none)`);
        }
        console.log('');
      }
    }

    console.log('=== Current Configuration ===\n');
    console.log(`MONGODB_URI: ${process.env.MONGODB_URI}`);
    console.log('');

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB\n');
    process.exit(0);

  } catch (error) {
    console.error('✗ Error:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

checkDatabases();
