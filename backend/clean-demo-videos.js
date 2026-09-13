const mongoose = require('mongoose');
require('dotenv').config();

async function cleanDemoVideos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research');
    console.log('✓ Connected to database\n');

    const db = mongoose.connection.db;

    // Get all videos sorted by order
    const allVideos = await db.collection('videos').find({}).sort({ order: 1 }).toArray();
    console.log(`Found ${allVideos.length} total videos in database`);

    // Keep only the first 10 videos (orders 1-10)
    const videosToKeep = allVideos.filter(v => v.order <= 10);
    const videosToDelete = allVideos.filter(v => v.order > 10);

    console.log(`\nKeeping first ${videosToKeep.length} videos (order 1-10)`);
    console.log(`Removing ${videosToDelete.length} demo/test videos (order > 10)`);

    if (videosToDelete.length === 0) {
      console.log('\n✓ No demo videos to remove. Database is already clean.');
      await mongoose.disconnect();
      return;
    }

    // Show which videos will be deleted
    console.log('\nVideos to be deleted:');
    videosToDelete.forEach(v => {
      console.log(`  - Video ${v.order}: ${v.title || 'Untitled'}`);
    });

    // Get IDs of videos to delete
    const videoIdsToDelete = videosToDelete.map(v => v._id);

    // Delete the demo videos
    const deleteResult = await db.collection('videos').deleteMany({
      _id: { $in: videoIdsToDelete }
    });

    console.log(`\n✓ Deleted ${deleteResult.deletedCount} demo videos`);

    // Also delete any video responses associated with those demo videos
    const videoResponsesResult = await db.collection('videoresponses').deleteMany({
      video: { $in: videoIdsToDelete }
    });

    if (videoResponsesResult.deletedCount > 0) {
      console.log(`✓ Deleted ${videoResponsesResult.deletedCount} associated video responses`);
    }

    console.log('\n✓ Demo videos successfully removed!');
    console.log(`✓ ${videosToKeep.length} real videos remain in the system.`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

cleanDemoVideos();
