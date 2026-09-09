/**
 * Create Test Admin Account (Non-Interactive)
 * Quick setup for development/testing
 * Usage: node create-test-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import Admin model
const Admin = require('./src/models/Admin');

// Test admin credentials
const TEST_ADMIN = {
  username: 'admin',
  email: 'admin@sbbwu.edu.pk',
  name: 'Test Admin',
  password: 'admin123456',
  role: 'superadmin'
};

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research';
    await mongoose.connect(mongoURI);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Create test admin user
 */
async function createTestAdmin() {
  try {
    console.log('\n=== Creating Test Admin Account ===\n');

    // Check if admin already exists
    const existingByUsername = await Admin.findOne({ username: TEST_ADMIN.username });
    if (existingByUsername) {
      console.log('ℹ Test admin already exists');
      console.log('\nExisting Admin Details:');
      console.log(`  Username: ${existingByUsername.username}`);
      console.log(`  Email: ${existingByUsername.email}`);
      console.log(`  Name: ${existingByUsername.name}`);
      console.log(`  Role: ${existingByUsername.role}`);
      console.log('\nYou can log in at: http://localhost:3001/admin/login');
      console.log(`  Username: ${TEST_ADMIN.username}`);
      console.log(`  Password: ${TEST_ADMIN.password}`);
      return;
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(TEST_ADMIN.password, 12);

    // Create admin
    const admin = await Admin.create({
      username: TEST_ADMIN.username,
      email: TEST_ADMIN.email,
      name: TEST_ADMIN.name,
      passwordHash: passwordHash,
      role: TEST_ADMIN.role,
      permissions: [
        'view_participants',
        'view_responses',
        'view_data',
        'code_responses',
        'manage_videos',
        'manage_questionnaires',
        'export_data',
        'manage_admins',
        'manage_study_settings',
        'view_audit_logs'
      ],
      active: true
    });

    console.log('\n✓ Test admin account created successfully!');
    console.log('\nAdmin Details:');
    console.log(`  Username: ${admin.username}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Role: ${admin.role}`);
    console.log('\n=== Login Credentials ===');
    console.log(`  URL: http://localhost:3001/admin/login`);
    console.log(`  Username: ${TEST_ADMIN.username}`);
    console.log(`  Password: ${TEST_ADMIN.password}`);
    console.log('\n⚠️  This is a test account. Change password in production!');
    
  } catch (error) {
    console.error('✗ Failed to create test admin:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  await connectDB();
  await createTestAdmin();
  
  await mongoose.disconnect();
  console.log('\n✓ Disconnected from MongoDB\n');
  process.exit(0);
}

// Run main function
main();
