/**
 * Change Admin Password
 * Secure script to update admin credentials
 * Usage: node change-admin-password.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Import Admin model
const Admin = require('./src/models/Admin');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Hide password input (simple version)
 */
const questionPassword = async (query) => {
  return new Promise((resolve) => {
    process.stdout.write(query);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    let password = '';
    process.stdin.on('data', (char) => {
      char = char.toString('utf8');
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          process.exit(130);
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          process.stdout.write('*');
          password += char;
          break;
      }
    });
  });
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
 * List all admins
 */
async function listAdmins() {
  const admins = await Admin.find().select('username email name role active');
  
  console.log('\n=== Existing Admin Accounts ===\n');
  admins.forEach((admin, index) => {
    console.log(`${index + 1}. ${admin.username}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Status: ${admin.active ? 'Active' : 'Inactive'}`);
    console.log('');
  });
  
  return admins;
}

/**
 * Change password
 */
async function changePassword() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  SECURE ADMIN PASSWORD CHANGE SCRIPT  ║');
    console.log('╚════════════════════════════════════════╝\n');

    // List existing admins
    const admins = await listAdmins();
    
    if (admins.length === 0) {
      console.log('✗ No admin accounts found. Run create-admin.js first.');
      process.exit(1);
    }

    // Get username
    const username = await question('Enter username to update: ');
    
    // Find admin
    const admin = await Admin.findOne({ username: username.toLowerCase() });
    
    if (!admin) {
      console.error(`\n✗ Admin "${username}" not found`);
      process.exit(1);
    }

    console.log(`\n✓ Found admin: ${admin.name} (${admin.email})`);
    console.log(`  Role: ${admin.role}`);
    
    // Confirm
    const confirm = await question('\nProceed with password change? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n✗ Password change cancelled');
      process.exit(0);
    }

    // Get new password
    console.log('\n⚠️  Password Requirements:');
    console.log('   - Minimum 8 characters');
    console.log('   - Recommended: Mix of letters, numbers, symbols');
    console.log('');

    const newPassword = await questionPassword('Enter new password: ');
    
    if (newPassword.length < 8) {
      console.error('\n✗ Password must be at least 8 characters');
      process.exit(1);
    }

    const confirmPassword = await questionPassword('Confirm new password: ');
    
    if (newPassword !== confirmPassword) {
      console.error('\n✗ Passwords do not match');
      process.exit(1);
    }

    // Hash and update password
    console.log('\n⏳ Hashing password...');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    admin.passwordHash = passwordHash;
    admin.passwordChangedAt = new Date();
    await admin.save();

    console.log('\n✅ PASSWORD CHANGED SUCCESSFULLY!');
    console.log('\n════════════════════════════════════════');
    console.log('  Admin: ' + admin.username);
    console.log('  Name: ' + admin.name);
    console.log('  Email: ' + admin.email);
    console.log('  Changed: ' + new Date().toLocaleString());
    console.log('════════════════════════════════════════');
    console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
    console.log('   1. Keep your new password secure');
    console.log('   2. Do not share credentials');
    console.log('   3. Do not display password on login page');
    console.log('   4. Consider changing password regularly');
    console.log('\n✓ You can now log in with your new password');
    console.log('  URL: http://localhost:3001/admin/login\n');

  } catch (error) {
    console.error('\n✗ Failed to change password:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  await connectDB();
  await changePassword();
  
  rl.close();
  await mongoose.disconnect();
  console.log('✓ Disconnected from MongoDB\n');
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n✗ Unhandled error:', error.message);
  process.exit(1);
});

// Run main function
main();
