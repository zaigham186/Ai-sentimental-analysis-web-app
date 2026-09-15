/**
 * Check Video 9 Status
 * Verifies video 9 is in database and accessible
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkVideo9() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    const videosCollection = db.collection('videos');

    // Get all videos
    const allVideos = await videosCollection.find({}).sort({ order: 1 }).toArray();
    console.log(`Total videos in database: ${allVideos.length}\n`);

    // Find video 9
    const video9 = allVideos.find(v => v.videoId === 'video-009' || v.order === 9);

    if (video9) {
      console.log('✅ VIDEO 9 FOUND!');
      console.log('═'.repeat(60));
      console.log('Video ID:', video9.videoId);
      console.log('Title:', video9.title);
      console.log('Order:', video9.order);
      console.log('Active:', video9.active);
      console.log('Status:', video9.validationStatus);
      console.log('URL:', video9.videoUrl);
      console.log('Duration:', video9.duration, 'seconds');
      console.log('═'.repeat(60));

      // Test if URL is accessible
      console.log('\nTesting video URL...');
      const https = require('https');
      const url = new URL(video9.videoUrl);
      
      https.get(video9.videoUrl, (res) => {
        if (res.statusCode === 200) {
          console.log('✅ Video URL is accessible!');
          console.log(`   Status Code: ${res.statusCode}`);
          console.log(`   Content-Type: ${res.headers['content-type']}`);
          console.log(`   Content-Length: ${res.headers['content-length']} bytes`);
        } else {
          console.log(`⚠️  Video URL returned status: ${res.statusCode}`);
        }
        res.resume();
        mongoose.disconnect();
      }).on('error', (err) => {
        console.log('❌ Error accessing video URL:', err.message);
        mongoose.disconnect();
      });

    } else {
      console.log('❌ VIDEO 9 NOT FOUND!');
      console.log('\nAll videos in database:');
      allVideos.forEach(v => {
        console.log(`  - ${v.videoId}: ${v.title} (Order: ${v.order})`);
      });
      await mongoose.disconnect();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

checkVideo9();
