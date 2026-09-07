/**
 * Health Check Script
 * Verifies system is configured correctly
 * 
 * Run with: node health-check.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(message) {
  log(`✓ ${message}`, 'green');
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

async function runHealthCheck() {
  log('\n🏥 Running Health Check...\n', 'blue');

  let allGood = true;

  // Check 1: .env file exists
  log('1. Checking environment configuration...', 'blue');
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    check('.env file exists');
    
    // Load and check variables
    require('dotenv').config();
    
    const requiredVars = ['MONGODB_URI', 'SESSION_SECRET', 'PORT'];
    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        check(`${varName} is set`);
      } else {
        error(`${varName} is missing`);
        allGood = false;
      }
    });
  } else {
    error('.env file not found');
    warn('Copy .env.example to .env and configure it');
    allGood = false;
  }

  // Check 2: MongoDB connection
  log('\n2. Checking MongoDB connection...', 'blue');
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research';
    await mongoose.connect(MONGODB_URI);
    check('MongoDB connection successful');
    log(`   Database: ${mongoose.connection.name}`);
    log(`   Host: ${mongoose.connection.host}`);
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const expectedCollections = ['participants', 'videos', 'videoresponses', 'studysettings'];
    log('\n   Collections:');
    expectedCollections.forEach(name => {
      if (collectionNames.includes(name)) {
        check(`   ${name} collection exists`);
      } else {
        warn(`   ${name} collection not found (will be created on first use)`);
      }
    });

    // Check for test data
    const { Video } = require('./src/models');
    const videoCount = await Video.countDocuments({ active: true, validationStatus: 'approved' });
    log(`\n   Approved active videos: ${videoCount}`);
    if (videoCount === 0) {
      warn('   No approved videos found - experiment will not work');
      warn('   Run: node src/tests/test-experiment.js to create test videos');
    } else if (videoCount < 10) {
      warn(`   Only ${videoCount} videos found - need 10 for complete experiment`);
    } else {
      check(`   ${videoCount} approved videos ready`);
    }

  } catch (err) {
    error('MongoDB connection failed');
    error(`   Error: ${err.message}`);
    warn('   Make sure MongoDB is running');
    warn('   Check MONGODB_URI in .env file');
    allGood = false;
  }

  // Check 3: Required dependencies
  log('\n3. Checking dependencies...', 'blue');
  const packageJson = require('./package.json');
  const requiredDeps = ['express', 'mongoose', 'dotenv', 'cors', 'helmet', 'express-validator'];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      check(`${dep} installed`);
    } else {
      error(`${dep} missing`);
      allGood = false;
    }
  });

  // Check 4: Port availability
  log('\n4. Checking port availability...', 'blue');
  const port = process.env.PORT || 5000;
  const net = require('net');
  
  const server = net.createServer();
  
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.once('listening', () => {
        server.close();
        resolve();
      });
      server.listen(port);
    });
    
    check(`Port ${port} is available`);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      error(`Port ${port} is already in use`);
      warn(`Run: kill-port-5000.bat to free the port`);
      allGood = false;
    } else {
      error(`Port check failed: ${err.message}`);
      allGood = false;
    }
  }

  // Check 5: Required directories
  log('\n5. Checking directory structure...', 'blue');
  const requiredDirs = [
    'src',
    'src/models',
    'src/controllers',
    'src/routes',
    'src/middleware',
    'src/validators',
    'src/services',
    'src/tests'
  ];

  requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
      check(`${dir}/ exists`);
    } else {
      error(`${dir}/ missing`);
      allGood = false;
    }
  });

  // Check 6: Critical files
  log('\n6. Checking critical files...', 'blue');
  const criticalFiles = [
    'src/server.js',
    'src/models/index.js',
    'src/models/Participant.js',
    'src/models/Video.js',
    'src/models/VideoResponse.js',
    'src/controllers/participantController.js',
    'src/controllers/experimentController.js',
    'src/routes/participants.js',
    'src/routes/experiment.js'
  ];

  criticalFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      check(`${file} exists`);
    } else {
      error(`${file} missing`);
      allGood = false;
    }
  });

  // Summary
  log('\n' + '='.repeat(50), 'blue');
  if (allGood) {
    log('✅ All checks passed! System is ready.', 'green');
    log('\nYou can start the server with: npm run dev', 'blue');
  } else {
    log('⚠️  Some issues found. Please fix them before starting.', 'yellow');
    log('\nSee TROUBLESHOOTING.md for help.', 'blue');
  }
  log('='.repeat(50) + '\n', 'blue');

  // Close MongoDB connection
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  process.exit(allGood ? 0 : 1);
}

// Run health check
runHealthCheck().catch(err => {
  error(`\nHealth check failed: ${err.message}`);
  process.exit(1);
});
