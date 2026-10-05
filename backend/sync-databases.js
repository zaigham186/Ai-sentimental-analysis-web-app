/**
 * Database Synchronization Script
 * Synchronizes live data from 'test' database into 'cyberbullying-research' database
 * ensuring both databases in MongoDB Atlas have identical, complete records.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const BASE_URI = 'mongodb+srv://24pwbcs1261_db_user:FLNtaLd2IYSZnFr0@cluster1.cy0uc3w.mongodb.net/';

const COLLECTIONS = [
  'participants',
  'videoresponses',
  'codings',
  'videos',
  'studysettings',
  'questionnaires',
  'questionnaireresponses',
  'auditlogs'
];

async function syncDatabases() {
  console.log('='.repeat(70));
  console.log('  MONGODB ATLAS DATABASE SYNCHRONIZATION');
  console.log('  Source: cyberbullying-research (Production Master DB)');
  console.log('  Target: test (Development/Backup DB)');
  console.log('='.repeat(70));

  const sourceConn = await mongoose.createConnection(BASE_URI + 'cyberbullying-research?appName=Cluster1').asPromise();
  const targetConn = await mongoose.createConnection(BASE_URI + 'test?appName=Cluster1').asPromise();

  console.log(' Connected to both databases.\n');

  for (const colName of COLLECTIONS) {
    const sourceCol = sourceConn.db.collection(colName);
    const targetCol = targetConn.db.collection(colName);

    const sourceDocs = await sourceCol.find({}).toArray();
    console.log(`[${colName}] Found ${sourceDocs.length} documents in source (test).`);

    if (sourceDocs.length > 0) {
      // Clear target collection and bulk insert source docs
      await targetCol.deleteMany({});
      await targetCol.insertMany(sourceDocs);
      console.log(`  ✓ Cloned ${sourceDocs.length} documents into cyberbullying-research.${colName}`);
    } else {
      await targetCol.deleteMany({});
      console.log(`  ✓ Cleared target cyberbullying-research.${colName} (0 documents)`);
    }
  }

  // Handle admins collection: copy source admins
  console.log('\n[admins] Cloning admin accounts from source...');
  const sourceAdmins = await sourceConn.db.collection('admins').find({}).toArray();
  const targetAdminsCol = targetConn.db.collection('admins');
  await targetAdminsCol.deleteMany({});
  await targetAdminsCol.insertMany(sourceAdmins);
  const totalTargetAdmins = await targetAdminsCol.countDocuments();
  console.log(`  ✓ Cloned admin accounts (Total in target: ${totalTargetAdmins})`);

  // Verification
  console.log('\n' + '='.repeat(70));
  console.log('  VERIFICATION REPORT');
  console.log('='.repeat(70));
  for (const colName of [...COLLECTIONS, 'admins']) {
    const sCount = await sourceConn.db.collection(colName).countDocuments();
    const tCount = await targetConn.db.collection(colName).countDocuments();
    console.log(`  ${colName.padEnd(25)}: Source=${sCount} | Target=${tCount} | Match=${sCount === tCount ? 'YES' : 'NO'}`);
  }

  await sourceConn.close();
  await targetConn.close();
  console.log('\n✓ Synchronization completed successfully!\n');
}

syncDatabases()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✗ Sync failed:', err);
    process.exit(1);
  });
