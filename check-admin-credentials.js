/**
 * Check Admin Credentials
 * Verify admin account exists and credentials are correct
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './backend/.env' });

async function checkAdminCredentials() {
  try {
    console.log('🔍 Checking Admin Credentials...\n');
    
    // Connect to database
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database\n');

    // Load Admin model
    const Admin = require('./backend/src/models/Admin');

    // Find all admin accounts
    const admins = await Admin.find({});
    
    if (admins.length === 0) {
      console.log('❌ No admin accounts found in database!');
      console.log('\n📝 To create an admin account, run:');
      console.log('   node backend/create-admin.js');
      return;
    }

    console.log(`📊 Found ${admins.length} admin account(s):\n`);
    
    // Check each admin
    for (const admin of admins) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`👤 Admin: ${admin.name}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Email: ${admin.email || 'N/A'}`);
      console.log(`   Status: ${admin.status || 'active'}`);
      console.log(`   Created: ${admin.createdAt}`);
      
      // Test password
      const testUsername = 'Admin';
      const testPassword = 'admin123456';
      
      if (admin.username.toLowerCase() === testUsername.toLowerCase()) {
        const isMatch = await bcrypt.compare(testPassword, admin.password);
        console.log(`\n🔑 Testing credentials:`);
        console.log(`   Username: "${testUsername}"`);
        console.log(`   Password: "${testPassword}"`);
        console.log(`   Result: ${isMatch ? '✅ CORRECT' : '❌ INCORRECT'}`);
        
        if (!isMatch) {
          console.log('\n⚠️  Password does NOT match!');
          console.log('   To reset password, run:');
          console.log('   node backend/change-admin-password.js');
        }
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Summary
    console.log('📋 Summary:');
    console.log(`   Total Admins: ${admins.length}`);
    console.log(`   Active Admins: ${admins.filter(a => a.status === 'active').length}`);
    
    const correctAdmin = admins.find(a => 
      a.username.toLowerCase() === 'admin'
    );
    
    if (correctAdmin) {
      const passwordCorrect = await bcrypt.compare('admin123456', correctAdmin.password);
      console.log(`\n✅ Login credentials for "Admin / admin123456": ${passwordCorrect ? 'CORRECT' : 'INCORRECT'}`);
      
      if (!passwordCorrect) {
        console.log('\n🔧 Fix: Run this command to reset password:');
        console.log('   node backend/change-admin-password.js');
      }
    } else {
      console.log('\n❌ No admin account with username "Admin" found');
      console.log('\n🔧 Fix: Run this command to create admin:');
      console.log('   node backend/create-admin.js');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
  }
}

// Run the check
checkAdminCredentials();
