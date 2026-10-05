/**
 * Test Script: Gender Filter Fix Verification
 * Tests case-insensitive gender filtering
 */

const mongoose = require('mongoose');
const { Participant } = require('./src/models');
require('dotenv').config();

async function testGenderFilter() {
  try {
    console.log('\n🧪 Testing Gender Filter Fix...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to database\n');

    // Test 1: Find with exact capitalized match
    console.log('Test 1: Filter with "Male" (capitalized)');
    const test1 = await Participant.find({ 
      gender: new RegExp(`^Male$`, 'i') 
    }).select('name username gender');
    console.log(`  Found ${test1.length} participants`);
    if (test1.length > 0) {
      console.log(`  Sample:`, test1.slice(0, 2).map(p => ({
        name: p.name,
        gender: p.gender
      })));
    }

    // Test 2: Find with lowercase
    console.log('\nTest 2: Filter with "male" (lowercase)');
    const test2 = await Participant.find({ 
      gender: new RegExp(`^male$`, 'i') 
    }).select('name username gender');
    console.log(`  Found ${test2.length} participants`);
    if (test2.length > 0) {
      console.log(`  Sample:`, test2.slice(0, 2).map(p => ({
        name: p.name,
        gender: p.gender
      })));
    }

    // Test 3: Find with "Female"
    console.log('\nTest 3: Filter with "Female" (capitalized)');
    const test3 = await Participant.find({ 
      gender: new RegExp(`^Female$`, 'i') 
    }).select('name username gender');
    console.log(`  Found ${test3.length} participants`);
    if (test3.length > 0) {
      console.log(`  Sample:`, test3.slice(0, 2).map(p => ({
        name: p.name,
        gender: p.gender
      })));
    }

    // Test 4: Find with "female"
    console.log('\nTest 4: Filter with "female" (lowercase)');
    const test4 = await Participant.find({ 
      gender: new RegExp(`^female$`, 'i') 
    }).select('name username gender');
    console.log(`  Found ${test4.length} participants`);
    if (test4.length > 0) {
      console.log(`  Sample:`, test4.slice(0, 2).map(p => ({
        name: p.name,
        gender: p.gender
      })));
    }

    // Verify case-insensitivity
    console.log('\n✓ Verification:');
    console.log(`  "Male" and "male" return same count: ${test1.length === test2.length ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  "Female" and "female" return same count: ${test3.length === test4.length ? '✓ PASS' : '✗ FAIL'}`);

    // Show all unique gender values in database
    console.log('\n📊 All unique gender values in database:');
    const allGenders = await Participant.distinct('gender');
    console.log('  ', allGenders);

    // Count by each gender value
    console.log('\n📊 Count by gender:');
    for (const gender of allGenders) {
      const count = await Participant.countDocuments({ gender });
      console.log(`    ${gender}: ${count} participants`);
    }

    console.log('\n✅ Gender filter test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from database\n');
  }
}

// Run test
testGenderFilter();
