/**
 * Create Initial Admin User
 * Run this script to create the first admin account
 * Usage: node create-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Import Admin model
const Admin = require('./src/models/Admin');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

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
 * Create admin user
 */
async function createAdmin() {
  try {
    console.log('\n=== Create Admin Account ===\n');

    // Get admin details from user
    const username = await question('Username: ');
    const email = await question('Email: ');
    const name = await question('Full Name: ');
    const password = await question('Password (min 8 characters): ');
    const passwordConfirm = await question('Confirm Password: ');

    // Validation
    if (!username || username.length < 3) {
      console.error('✗ Username must be at least 3 characters');
      process.exit(1);
    }

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      console.error('✗ Invalid email format');
      process.exit(1);
    }

    if (!name || name.length < 2) {
      console.error('✗ Name must be at least 2 characters');
      process.exit(1);
    }

    if (!password || password.length < 8) {
      console.error('✗ Password must be at least 8 characters');
      process.exit(1);
    }

    if (password !== passwordConfirm) {
      console.error('✗ Passwords do not match');
      process.exit(1);
    }

    // Check if username already exists
    const existingByUsername = await Admin.findOne({ username: username.toLowerCase() });
    if (existingByUsername) {
      console.error('✗ Username already exists');
      process.exit(1);
    }

    // Check if email already exists
    const existingByEmail = await Admin.findOne({ email: email.toLowerCase() });
    if (existingByEmail) {
      console.error('✗ Email already exists');
      process.exit(1);
    }

    // Hash password
    console.log('\nHashing password...');
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin
    const admin = await Admin.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      name: name,
      passwordHash: passwordHash,
      role: 'superadmin',
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

    console.log('\n✓ Admin account created successfully!');
    console.log('\nAdmin Details:');
    console.log(`  Username: ${admin.username}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Role: ${admin.role}`);
    console.log('\nYou can now log in at: http://localhost:3001/admin/login');
    
  } catch (error) {
    console.error('✗ Failed to create admin:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  await connectDB();
  await createAdmin();
  
  rl.close();
  await mongoose.disconnect();
  console.log('\n✓ Disconnected from MongoDB');
  process.exit(0);
}

// Run main function
main();
