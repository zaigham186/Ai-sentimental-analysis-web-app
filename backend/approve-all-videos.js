/**
 * Approve All Videos Script
 * Quick setup to approve all candidate videos for participant viewing
 * Usage: node approve-all-videos.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Video = require('./src/models/Video');

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'MONGODB_URI=mongodb+srv://24pwbcs1261_db_user:FLNtaLd2IYSZnFr0@cluster1.cy0uc3w.mongodb.net/?appName=Cluster1';
    await mongoose.connect(mongoURI);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Approve all videos
 */
async function approveAllVideos() {
  try {
    console.log('\n=== Approving All Videos ===\n');

    // Find all videos that are not approved
    const videos = await Video.find({ 
      validationStatus: { $ne: 'approved' } 
    }).sort({ order: 1 });

    if (videos.length === 0) {
      console.log('ℹ All videos are already approved!');
      
      // Show approved count
      const approvedCount = await Video.countDocuments({ validationStatus: 'approved' });
      console.log(`\n✓ Total approved videos: ${approvedCount}`);
      return;
    }

    console.log(`Found ${videos.length} video(s) to approve:\n`);

    // Approve each video
    for (const video of videos) {
      console.log(`Approving: #${video.order} - ${video.title}`);
      console.log(`  Current status: ${video.validationStatus}`);
      
      // Update video
      video.validationStatus = 'approved';
      video.validationDate = new Date();
      video.active = true;
      video.validationNotes = 'Auto-approved via approve-all-videos.js script';
      
      await video.save();
      console.log(`  ✓ Approved\n`);
    }

    // Show summary
    const totalApproved = await Video.countDocuments({ validationStatus: 'approved', active: true });
    console.log('════════════════════════════════════════');
    console.log(`✓ Successfully approved ${videos.length} video(s)`);
    console.log(`✓ Total active approved videos: ${totalApproved}`);
    console.log('════════════════════════════════════════');
    console.log('\nParticipants can now see these videos during the experiment.\n');
    
  } catch (error) {
    console.error('✗ Failed to approve videos:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  await connectDB();
  await approveAllVideos();
  
  await mongoose.disconnect();
  console.log('✓ Disconnected from MongoDB\n');
  process.exit(0);
}

// Run main function
main();
