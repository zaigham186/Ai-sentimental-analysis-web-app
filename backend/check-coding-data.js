const mongoose = require('mongoose');
require('dotenv').config();

async function checkCodingData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research');
    console.log('✓ Connected to database\n');

    const db = mongoose.connection.db;

    // Check responses
    const totalResponses = await db.collection('videoresponses').countDocuments();
    console.log('='.repeat(60));
    console.log('VIDEO RESPONSES');
    console.log('='.repeat(60));
    console.log(`Total Responses: ${totalResponses}`);
    
    if (totalResponses > 0) {
      const sampleResponse = await db.collection('videoresponses').findOne({});
      console.log(`\nSample Response ID: ${sampleResponse._id}`);
      console.log(`Response Text (first 100 chars): ${sampleResponse.responseText.substring(0, 100)}...`);
      console.log(`Submitted At: ${sampleResponse.submittedAt}`);
    }

    // Check all codings
    const totalCodings = await db.collection('codings').countDocuments();
    console.log('\n' + '='.repeat(60));
    console.log('CODINGS - ALL');
    console.log('='.repeat(60));
    console.log(`Total Codings: ${totalCodings}`);

    if (totalCodings > 0) {
      const allCodings = await db.collection('codings').find({}).toArray();
      console.log(`\nBreakdown:`);
      
      let pendingCount = 0;
      let reviewedCount = 0;
      let nullStatusCount = 0;
      let hasActualDataCount = 0;
      let aiOnlyCount = 0;
      
      allCodings.forEach(coding => {
        if (coding.reviewStatus === 'pending') pendingCount++;
        else if (coding.reviewStatus === 'reviewed') reviewedCount++;
        else if (coding.reviewStatus === null || coding.reviewStatus === undefined) nullStatusCount++;
        
        // Check if has actual coding data
        const hasData = coding.sentiment || 
                       coding.aggression?.category || 
                       coding.cyberbullying?.present !== undefined;
        
        if (hasData) hasActualDataCount++;
        
        // Check if has only AI suggestion
        if (coding.aiCoding && !hasData) aiOnlyCount++;
      });
      
      console.log(`  - Pending (AI suggestions awaiting review): ${pendingCount}`);
      console.log(`  - Reviewed (human-approved codings): ${reviewedCount}`);
      console.log(`  - No reviewStatus (old codings): ${nullStatusCount}`);
      console.log(`  - Has actual coding data: ${hasActualDataCount}`);
      console.log(`  - Has ONLY AI suggestion (no final coding): ${aiOnlyCount}`);
      
      console.log('\n' + '-'.repeat(60));
      console.log('SAMPLE CODINGS:');
      console.log('-'.repeat(60));
      
      // Show first 3 codings
      for (let i = 0; i < Math.min(3, allCodings.length); i++) {
        const coding = allCodings[i];
        console.log(`\nCoding #${i + 1}:`);
        console.log(`  ID: ${coding._id}`);
        console.log(`  Response: ${coding.response}`);
        console.log(`  Review Status: ${coding.reviewStatus || 'null'}`);
        console.log(`  Coder Role: ${coding.coderRole}`);
        
        if (coding.aiCoding) {
          console.log(`  Has AI Suggestion: YES`);
          console.log(`    - Sentiment: ${coding.aiCoding.sentiment?.label || 'N/A'}`);
          console.log(`    - Aggression: ${coding.aiCoding.aggression?.label || 'N/A'}`);
          console.log(`    - Cyberbullying: ${coding.aiCoding.cyberbullying?.present ? 'Present' : 'Not Present'}`);
        } else {
          console.log(`  Has AI Suggestion: NO`);
        }
        
        if (coding.sentiment || coding.aggression?.category || coding.cyberbullying?.present !== undefined) {
          console.log(`  Has Final Coding: YES`);
          console.log(`    - Sentiment: ${coding.sentiment || 'N/A'}`);
          console.log(`    - Aggression Category: ${coding.aggression?.category || 'N/A'}`);
          console.log(`    - Cyberbullying Present: ${coding.cyberbullying?.present !== undefined ? (coding.cyberbullying.present ? 'Yes' : 'No') : 'N/A'}`);
        } else {
          console.log(`  Has Final Coding: NO`);
        }
      }
    }

    // Calculate statistics like the controller does
    console.log('\n' + '='.repeat(60));
    console.log('STATISTICS (WHAT CONTROLLER SHOWS)');
    console.log('='.repeat(60));
    
    const codedCount = await db.collection('codings').countDocuments({
      coderRole: 'primary',
      reviewStatus: { $in: ['reviewed', null] },
      $or: [
        { sentiment: { $exists: true, $ne: null } },
        { 'aggression.category': { $exists: true, $ne: null } },
        { 'cyberbullying.present': { $exists: true, $ne: null } }
      ]
    });
    
    const uncodedCount = totalResponses - codedCount;
    const progress = totalResponses > 0 ? ((codedCount / totalResponses) * 100).toFixed(1) : 0;
    
    console.log(`Total Responses: ${totalResponses}`);
    console.log(`Coded Responses: ${codedCount}`);
    console.log(`Uncoded Responses: ${uncodedCount}`);
    console.log(`Progress: ${progress}%`);
    
    if (codedCount === 0 && totalCodings > 0) {
      console.log('\n⚠️  WARNING: You have codings in database but statistics show 0!');
      console.log('   This means all your codings are either:');
      console.log('   1. Pending AI suggestions (not yet reviewed)');
      console.log('   2. Missing final coding data (empty codings)');
      console.log('\n   TO FIX: You need to complete the review workflow:');
      console.log('   - Click "Code Response" on any uncoded item');
      console.log('   - Click "Analyze with AI" to get suggestions');
      console.log('   - Click "Accept", "Modify", or "Reject" to finalize');
      console.log('   - Or code manually without using AI');
    }

    await mongoose.disconnect();
    console.log('\n✓ Disconnected\n');
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

checkCodingData();
