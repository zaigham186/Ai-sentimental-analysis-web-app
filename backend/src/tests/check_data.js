require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const config = require('../config');

async function main() {
  const conn = await mongoose.connect(config.mongoUri);
  const dbTest = conn.connection.useDb('test');
  const dbCbr = conn.connection.useDb('cyberbullying-research');

  console.log('--- TEST DB ---');
  const testP = await dbTest.collection('participants').countDocuments();
  const testR = await dbTest.collection('videoresponses').countDocuments();
  console.log('test participants:', testP, 'videoresponses:', testR);

  console.log('--- CYBERBULLYING-RESEARCH DB ---');
  const cbrP = await dbCbr.collection('participants').countDocuments();
  const cbrR = await dbCbr.collection('videoresponses').countDocuments();
  console.log('cbr participants:', cbrP, 'videoresponses:', cbrR);

  // Check participants with responses in test
  const testDistinctP = await dbTest.collection('videoresponses').distinct('participant');
  console.log('test participants with responses count:', testDistinctP.length);
  for (const pid of testDistinctP) {
    const p = await dbTest.collection('participants').findOne({ _id: pid });
    const rCount = await dbTest.collection('videoresponses').countDocuments({ participant: pid });
    console.log(`  - ${p?.name} (@${p?.username}) [${p?.condition}]: ${rCount} responses`);
  }

  process.exit(0);
}
main();
