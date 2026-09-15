/**
 * Fix Video 9 URL
 * Directly updates video 9 URL in database
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixVideo9() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    const videosCollection = db.collection('videos');

    // Update video 9 URL
    const result = await videosCollection.updateOne(
      { videoId: 'video-009' },
      {
        $set: {
          videoUrl: 'https://res.cloudinary.com/byvhmrm7/video/upload/v1788805237/vidoe9.mp4',
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Video 9 URL updated successfully!');
      
      // Verify the update
      const video9 = await videosCollection.findOne({ videoId: 'video-009' });
      console.log('\nUpdated video 9:');
      console.log('  URL:', video9.videoUrl);
      console.log('  Title:', video9.title);
      console.log('  Active:', video9.active);
      
      // Test the URL
      console.log('\nTesting new URL...');
      const https = require('https');
      https.get(video9.videoUrl, (res) => {
        if (res.statusCode === 200) {
          console.log('✅ Video 9 is now accessible!');
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Content-Type: ${res.headers['content-type']}\n`);
        } else {
          console.log(`⚠️  Status: ${res.statusCode}\n`);
        }
        res.resume();
        mongoose.disconnect();
      }).on('error', (err) => {
        console.log('❌ Error:', err.message);
        mongoose.disconnect();
      });
      
    } else {
      console.log('⚠️  Video 9 was not updated. It might already have the correct URL.');
      await mongoose.disconnect();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

fixVideo9();
