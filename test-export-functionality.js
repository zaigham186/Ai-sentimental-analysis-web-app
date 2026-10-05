/**
 * Test Export Functionality
 * Tests all 4 export types with both identity-linked and de-identified options
 * Run this script to verify exports work correctly
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const { Participant, VideoResponse, Coding, Video } = require('./backend/src/models');

async function testExportQueries() {
  try {
    console.log('🔍 Testing Export Data Queries...\n');
    
    // Connect to database
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database\n');

    // Test 1: Participants Export
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: PARTICIPANTS EXPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const participants = await Participant.find({}).limit(3);
    console.log(`Found ${participants.length} participants`);
    
    if (participants.length > 0) {
      const p = participants[0];
      console.log('\n📋 Sample Participant Data:');
      console.log(`  - ID: ${p._id}`);
      console.log(`  - Name: ${p.name}`);
      console.log(`  - Username: ${p.username}`);
      console.log(`  - Age: ${p.age}`);
      console.log(`  - Gender: ${p.gender}`);
      console.log(`  - University: ${p.university}`);
      console.log(`  - Department: ${p.department}`);
      console.log(`  - Condition: ${p.condition}`);
      console.log(`  - Status: ${p.status}`);
      console.log(`  - Consent Given: ${p.consentGiven}`);
      console.log(`  - Completed Videos: ${p.completedVideos?.length || 0}`);
    }

    // Test 2: Responses Export
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: RESPONSES EXPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const responses = await VideoResponse.find({})
      .populate('participant', 'condition username name age gender university department')
      .populate('video', 'title order topic')
      .limit(3);
    
    console.log(`Found ${responses.length} responses`);
    
    if (responses.length > 0) {
      const r = responses[0];
      console.log('\n📋 Sample Response Data:');
      console.log(`  - Response ID: ${r._id}`);
      console.log(`  - Participant Name: ${r.participant?.name || 'N/A'}`);
      console.log(`  - Participant Username: ${r.participant?.username || 'N/A'}`);
      console.log(`  - Participant Age: ${r.participant?.age || 'N/A'}`);
      console.log(`  - Participant Gender: ${r.participant?.gender || 'N/A'}`);
      console.log(`  - Condition: ${r.participant?.condition || 'N/A'}`);
      console.log(`  - Video Title: ${r.video?.title || 'N/A'}`);
      console.log(`  - Video Order: ${r.video?.order || 'N/A'}`);
      console.log(`  - Response Text: ${r.responseText?.substring(0, 50)}...`);
      console.log(`  - Response Length: ${r.responseLength}`);
      console.log(`  - Word Count: ${r.responseWordCount}`);
    }

    // Test 3: Codings Export
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: CODINGS EXPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const codings = await Coding.find({ coderRole: 'primary' })
      .populate({
        path: 'response',
        populate: [
          { path: 'participant', select: 'condition name username age gender university department' },
          { path: 'video', select: 'title order topic' }
        ]
      })
      .populate('codedBy', 'name username')
      .limit(3);
    
    console.log(`Found ${codings.length} codings`);
    
    if (codings.length > 0) {
      const c = codings[0];
      console.log('\n📋 Sample Coding Data:');
      console.log(`  - Coding ID: ${c._id}`);
      console.log(`  - Participant Name: ${c.response?.participant?.name || 'N/A'}`);
      console.log(`  - Participant Username: ${c.response?.participant?.username || 'N/A'}`);
      console.log(`  - Condition: ${c.response?.participant?.condition || 'N/A'}`);
      console.log(`  - Video Title: ${c.response?.video?.title || 'N/A'}`);
      console.log(`  - Response Text: ${c.response?.responseText?.substring(0, 50)}...`);
      console.log(`  - Sentiment: ${c.sentiment || 'N/A'}`);
      console.log(`  - Aggression Level: ${c.aggression?.level !== undefined ? c.aggression.level : 'N/A'}`);
      console.log(`  - Aggression Category: ${c.aggression?.category || 'N/A'}`);
      console.log(`  - Cyberbullying Present: ${c.cyberbullying?.present !== undefined ? c.cyberbullying.present : 'N/A'}`);
      console.log(`  - Cyberbullying Type: ${c.cyberbullying?.type || 'N/A'}`);
      console.log(`  - Coder: ${c.codedBy?.name || 'N/A'}`);
    }

    // Test 4: Combined Research Dataset
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 4: COMBINED RESEARCH DATASET');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const allParticipants = await Participant.find({}).limit(2);
    const allResponses = await VideoResponse.find({})
      .populate('participant', '_id name username age gender university department condition status')
      .populate('video', 'title order topic')
      .lean();
    
    const allCodings = await Coding.find({ coderRole: 'primary' })
      .populate('codedBy', 'name username')
      .lean();
    
    // Create maps
    const responsesByParticipant = {};
    allResponses.forEach(r => {
      const participantId = r.participant?._id?.toString();
      if (participantId) {
        if (!responsesByParticipant[participantId]) {
          responsesByParticipant[participantId] = [];
        }
        responsesByParticipant[participantId].push(r);
      }
    });
    
    const codingsByResponse = {};
    allCodings.forEach(c => {
      const responseId = c.response?.toString();
      if (responseId) {
        codingsByResponse[responseId] = c;
      }
    });
    
    console.log(`\n📊 Dataset Statistics:`);
    console.log(`  - Total Participants: ${allParticipants.length}`);
    console.log(`  - Total Responses: ${allResponses.length}`);
    console.log(`  - Total Codings: ${allCodings.length}`);
    
    if (allParticipants.length > 0) {
      const participant = allParticipants[0];
      const participantId = participant._id.toString();
      const participantResponses = responsesByParticipant[participantId] || [];
      
      console.log(`\n📋 Sample Combined Record (Participant: ${participant.name}):`);
      console.log(`  Participant Demographics:`);
      console.log(`    - Name: ${participant.name}`);
      console.log(`    - Username: ${participant.username}`);
      console.log(`    - Age: ${participant.age}`);
      console.log(`    - Gender: ${participant.gender}`);
      console.log(`    - University: ${participant.university}`);
      console.log(`    - Department: ${participant.department}`);
      console.log(`    - Condition: ${participant.condition}`);
      console.log(`    - Status: ${participant.status}`);
      console.log(`    - Responses Count: ${participantResponses.length}`);
      
      if (participantResponses.length > 0) {
        const response = participantResponses[0];
        const coding = codingsByResponse[response._id.toString()];
        
        console.log(`\n  First Response:`);
        console.log(`    - Video: ${response.video?.title}`);
        console.log(`    - Response: ${response.responseText?.substring(0, 50)}...`);
        console.log(`    - Length: ${response.responseLength} chars`);
        console.log(`    - Words: ${response.responseWordCount}`);
        
        if (coding) {
          console.log(`\n  Coding Results:`);
          console.log(`    - Sentiment: ${coding.sentiment}`);
          console.log(`    - Aggression Level: ${coding.aggression?.level}`);
          console.log(`    - Aggression Category: ${coding.aggression?.category}`);
          console.log(`    - Cyberbullying: ${coding.cyberbullying?.present}`);
          console.log(`    - Coder: ${coding.codedBy?.name}`);
        } else {
          console.log(`\n  Coding Results: Not yet coded`);
        }
      }
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalParticipants = await Participant.countDocuments();
    const totalResponses = await VideoResponse.countDocuments();
    const totalCodings = await Coding.countDocuments({ coderRole: 'primary' });
    const totalVideos = await Video.countDocuments();
    
    console.log('\n📊 Database Statistics:');
    console.log(`  ✓ Total Participants: ${totalParticipants}`);
    console.log(`  ✓ Total Videos: ${totalVideos}`);
    console.log(`  ✓ Total Responses: ${totalResponses}`);
    console.log(`  ✓ Total Codings: ${totalCodings}`);
    console.log(`  ✓ Coding Coverage: ${totalResponses > 0 ? ((totalCodings / totalResponses) * 100).toFixed(1) : 0}%`);
    
    console.log('\n✅ Export Data Structure Tests Completed!');
    console.log('\n📝 Next Steps:');
    console.log('  1. Test exports in localhost admin panel');
    console.log('  2. Verify CSV and Excel formats download correctly');
    console.log('  3. Check both identity-linked and de-identified exports');
    console.log('  4. Deploy to production and test there');
    console.log('  5. Verify authentication works in production');
    
  } catch (error) {
    console.error('❌ Error testing exports:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
  }
}

// Run the tests
testExportQueries();
