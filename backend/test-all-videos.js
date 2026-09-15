/**
 * Test All Video URLs
 * Checks which videos are accessible on Cloudinary
 */

require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');

async function testAllVideos() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    const videosCollection = db.collection('videos');

    const allVideos = await videosCollection.find({}).sort({ order: 1 }).toArray();
    console.log(`Testing ${allVideos.length} videos...\n`);

    const results = [];

    for (const video of allVideos) {
      await new Promise((resolve) => {
        https.get(video.videoUrl, (res) => {
          const status = res.statusCode === 200 ? '✅' : '❌';
          const result = {
            order: video.order,
            videoId: video.videoId,
            title: video.title,
            status: res.statusCode,
            accessible: res.statusCode === 200,
            url: video.videoUrl
          };
          results.push(result);
          console.log(`${status} Video ${video.order}: ${video.title} - Status: ${res.statusCode}`);
          res.resume();
          resolve();
        }).on('error', (err) => {
          const result = {
            order: video.order,
            videoId: video.videoId,
            title: video.title,
            status: 'ERROR',
            accessible: false,
            url: video.videoUrl,
            error: err.message
          };
          results.push(result);
          console.log(`❌ Video ${video.order}: ${video.title} - ERROR: ${err.message}`);
          resolve();
        });
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('SUMMARY:');
    console.log('═'.repeat(60));
    
    const working = results.filter(r => r.accessible).length;
    const broken = results.filter(r => !r.accessible).length;
    
    console.log(`✅ Working: ${working}/${allVideos.length}`);
    console.log(`❌ Broken: ${broken}/${allVideos.length}\n`);

    if (broken > 0) {
      console.log('BROKEN VIDEOS:');
      results.filter(r => !r.accessible).forEach(r => {
        console.log(`\n  Video ${r.order}: ${r.title}`);
        console.log(`  Status: ${r.status}`);
        console.log(`  URL: ${r.url}`);
        
        // Suggest fix
        const filename = r.url.split('/').pop();
        if (filename === 'video9.mp4') {
          console.log(`  💡 TRY: Change filename to 'vidoe9.mp4' (the typo version)`);
          const fixedUrl = r.url.replace('video9.mp4', 'vidoe9.mp4');
          console.log(`  Fixed URL: ${fixedUrl}`);
        }
      });
    }

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

testAllVideos();
