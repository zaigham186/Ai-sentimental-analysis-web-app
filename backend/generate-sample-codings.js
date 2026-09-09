const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Generate Sample Codings for Demo
 * 
 * This will create actual reviewed codings for first 5 responses
 * so statistics show real data for client presentation
 */

async function generateSampleCodings() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research');
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;

    // Get first 5 responses that don't have reviewed codings
    console.log('Finding responses without reviewed codings...');
    const responses = await db.collection('videoresponses').find({}).limit(5).toArray();
    
    if (responses.length === 0) {
      console.log('⚠️  No responses found in database!');
      console.log('   Please have participants complete the experiment first.');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${responses.length} responses\n`);

    // Get admin user (first admin)
    const admin = await db.collection('admins').findOne({});
    if (!admin) {
      console.log('⚠️  No admin found! Cannot create codings without admin user.');
      await mongoose.disconnect();
      return;
    }

    console.log(`Using admin: ${admin.name || admin.username}\n`);

    // Sample coding templates
    const sampleCodings = [
      {
        sentiment: 'negative',
        aggression: { category: 'moderate', level: 6 },
        cyberbullying: { present: false, type: 'none', severity: 0 },
        notes: 'Contains critical language but not aggressive toward individuals',
        confidence: 'high'
      },
      {
        sentiment: 'negative',
        aggression: { category: 'mild', level: 3 },
        cyberbullying: { present: false, type: 'none', severity: 0 },
        notes: 'Negative sentiment but minimal aggression',
        confidence: 'medium'
      },
      {
        sentiment: 'neutral',
        aggression: { category: 'none', level: 0 },
        cyberbullying: { present: false, type: 'none', severity: 0 },
        notes: 'Neutral response with no aggressive content',
        confidence: 'high'
      },
      {
        sentiment: 'negative',
        aggression: { category: 'severe', level: 8 },
        cyberbullying: { present: true, type: 'harassment', severity: 7 },
        notes: 'Clear harassment directed at individual',
        confidence: 'high'
      },
      {
        sentiment: 'mixed',
        aggression: { category: 'moderate', level: 5 },
        cyberbullying: { present: false, type: 'none', severity: 0 },
        notes: 'Mixed sentiment with moderate aggressive language',
        confidence: 'medium'
      }
    ];

    let createdCount = 0;
    let skippedCount = 0;

    console.log('Creating sample codings...\n');
    console.log('='.repeat(60));

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const codingTemplate = sampleCodings[i % sampleCodings.length];

      // Check if already has reviewed coding
      const existingCoding = await db.collection('codings').findOne({
        response: response._id,
        coderRole: 'primary',
        reviewStatus: 'reviewed'
      });

      if (existingCoding) {
        console.log(`Response ${i + 1}: SKIPPED (already has reviewed coding)`);
        skippedCount++;
        continue;
      }

      // Create or update coding
      const coding = {
        response: response._id,
        sentiment: codingTemplate.sentiment,
        aggression: codingTemplate.aggression,
        cyberbullying: codingTemplate.cyberbullying,
        notes: codingTemplate.notes,
        confidence: codingTemplate.confidence,
        codingVersion: '1.0',
        codedBy: admin._id,
        coderRole: 'primary',
        reviewStatus: 'reviewed',
        codedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('codings').insertOne(coding);
      
      console.log(`Response ${i + 1}: ✓ CREATED`);
      console.log(`  Sentiment: ${coding.sentiment}`);
      console.log(`  Aggression: ${coding.aggression.category} (${coding.aggression.level}/10)`);
      console.log(`  Cyberbullying: ${coding.cyberbullying.present ? 'Present' : 'Not Present'}`);
      console.log('');
      
      createdCount++;
    }

    console.log('='.repeat(60));
    console.log(`\n✓ Sample codings generated!`);
    console.log(`  Created: ${createdCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log(`  Total: ${createdCount + skippedCount}`);

    // Show updated statistics
    const totalResponses = await db.collection('videoresponses').countDocuments();
    const codedResponses = await db.collection('codings').countDocuments({
      coderRole: 'primary',
      reviewStatus: { $in: ['reviewed', null] },
      $or: [
        { sentiment: { $exists: true, $ne: null } },
        { 'aggression.category': { $exists: true, $ne: null } },
        { 'cyberbullying.present': { $exists: true, $ne: null } }
      ]
    });
    
    const progress = totalResponses > 0 ? ((codedResponses / totalResponses) * 100).toFixed(1) : 0;

    console.log('\n' + '='.repeat(60));
    console.log('UPDATED STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total Responses: ${totalResponses}`);
    console.log(`Coded Responses: ${codedResponses}`);
    console.log(`Uncoded Responses: ${totalResponses - codedResponses}`);
    console.log(`Progress: ${progress}%`);
    console.log('='.repeat(60));

    console.log('\n✓ Done! Refresh your browser to see updated statistics.\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

generateSampleCodings();
