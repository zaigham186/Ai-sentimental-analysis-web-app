const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Add Research Videos to Database
 * 
 * INSTRUCTIONS:
 * 1. Upload your 10 videos to Cloudinary
 * 2. Replace the URLs below with your actual Cloudinary URLs
 * 3. Update the titles and descriptions
 * 4. Run: node add-videos.js
 */

const videos = [
  {
    videoId: 'video-001',
    title: 'Scenario 1: Online Comment Thread',
    description: 'A scenario depicting an ambiguous online interaction',
    videoUrl: 'https://res.cloudinary.com/byvhmrm7/video/upload/v1788764931/video1.mp4',
    thumbnailUrl: null,
    duration: 35,
    order: 1,
    active: true,
    validationStatus: 'approved'
  },
  {
    videoId: 'video-002',
    title: 'Scenario 2: Social Media Post',
    description: 'A scenario depicting an ambiguous online interaction',
    videoUrl: 'https://res.cloudinary.com/byvhmrm7/video/upload/v1788804462/video2.mp4',
    thumbnailUrl: null,
    duration: 40,
    order: 2,
    active: true,
    validationStatus: 'approved'
  },
  {
    videoId: 'video-003',
    title: 'Scenario 3: Group Chat Message',
    description: 'A scenario depicting an ambiguous online interaction',
    videoUrl:'https://res.cloudinary.com/byvhmrm7/video/upload/v1788804561/video3.mp4',
    thumbnailUrl: null,
    duration: 38,
    order: 3,
    active: true,
    validationStatus: 'approved'
  },
  {
    videoId: 'video-004',
    title: 'Scenario 4: Public Forum Discussion',
    description: 'A scenario depicting an ambiguous online interaction',
    videoUrl: 'https://res.cloudinary.com/byvhmrm7/video/upload/v1788804610/video4.mp4',
    thumbnailUrl: null,
    duration: 42,
    order: 4,
    active: true,
    validationStatus: 'approved'
  },
  {
    videoId: 'video-005',
    title: 'Scenario 5: Direct Message Exchange',
    description: 'A scenario depicting an ambiguous online interaction',
    videoUrl: 'https://res.cloudinary.com/byvhmrm7/video/upload/v1788804704/video5.mp4',
    thumbnailUrl: null,
    duration: 36,
    order: 5,
    active: true,
    validationStatus: 'approved'
  },
  {
    videoId: 'video-006',
    title: 'Scenario 6: Blog Comment Section',
    description: 'A scenario depicting an ambiguous online interaction',
    videoUrl: 'https://res.cloudinary.com/byvhmrm7/video/upload/v1788805038/video6.mp4',
    thumbnailUrl: null,
    duration: 39,
    order: 6,
    active: true,
    validationStatus: 'approved'
  },
  {
    videoId: 'video-007',
    title: 'Scenario 7: Gaming Platform Chat',
    description: 'A scenario depicting an ambiguous online interaction',
    videoUrl: 'https://res.cloudinary.com/byvhmrm7/video/upload/v1788805113/video7.mp4',
    thumbnailUrl: null,
    duration: 41,
    order: 7,
    active: true,
    validationStatus: 'approved'
  },
  {
    videoId: 'video-008',
    title: 'Scenario 8: Video Platform Comments',
    description: 'A scenario depicting an ambiguous online interaction',
    videoUrl: 'https://res.cloudinary.com/byvhmrm7/video/upload/v1788805139/video8.mp4',
    thumbnailUrl: null,
    duration: 37,
    order: 8,
    active: true,
    validationStatus: 'approved'
  },
  {
    videoId: 'video-009',
    title: 'Scenario 9: Discussion Board Thread',
    description: 'A scenario depicting an ambiguous online interaction',
    videoUrl: 'https://res.cloudinary.com/byvhmrm7/video/upload/v1788805237/vidoe9.mp4',
    thumbnailUrl: null,
    duration: 43,
    order: 9,
    active: true,
    validationStatus: 'approved'
  },
  {
    videoId: 'video-010',
    title: 'Scenario 10: Social Network Update',
    description: 'A scenario depicting an ambiguous online interaction',
    videoUrl: 'https://res.cloudinary.com/byvhmrm7/video/upload/v1788805180/video10.mp4',
    thumbnailUrl: null,
    duration: 40,
    order: 10,
    active: true,
    validationStatus: 'approved'
  }
];

async function addVideos() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research');
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    const videosCollection = db.collection('videos');

    // Check for placeholder URLs
    const hasPlaceholders = videos.some(v => v.videoUrl.includes('YOUR-CLOUD-NAME'));
    if (hasPlaceholders) {
      console.log('⚠️  WARNING: You still have placeholder URLs!');
      console.log('');
      console.log('Please:');
      console.log('1. Upload your videos to Cloudinary');
      console.log('2. Replace YOUR-CLOUD-NAME with your actual cloud name');
      console.log('3. Replace video URLs with your actual Cloudinary URLs');
      console.log('4. Run this script again');
      console.log('');
      await mongoose.disconnect();
      return;
    }

    // Delete existing videos
    console.log('Removing old videos...');
    await videosCollection.deleteMany({});
    console.log('✓ Old videos removed\n');

    // Insert new videos
    console.log('Adding videos to database...');
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      await videosCollection.insertOne({
        ...video,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✓ Added: ${video.title}`);
    }

    console.log(`\n✓ Successfully added ${videos.length} videos!`);
    console.log('\nNext steps:');
    console.log('1. Test the experiment at: http://localhost:3001/experiment/start');
    console.log('2. Register a test participant');
    console.log('3. Complete the 10-video experiment');
    
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');

  } catch (error) {
    console.error('✗ Error:', error.message);
    await mongoose.disconnect();
  }
}

addVideos();
