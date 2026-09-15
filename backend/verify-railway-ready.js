#!/usr/bin/env node

/**
 * Railway Deployment Readiness Checker
 * 
 * This script verifies that all required files and configurations
 * are in place for successful Railway deployment.
 */

const fs = require('fs');
const path = require('path');

console.log('\n🚂 Railway Deployment Readiness Check\n');
console.log('═'.repeat(50));

let allChecks = true;

// Required files
const requiredFiles = [
  { file: 'package.json', required: true },
  { file: 'nixpacks.toml', required: true },
  { file: 'railway.json', required: true },
  { file: 'Procfile', required: true },
  { file: '.railwayignore', required: false },
  { file: 'src/server.js', required: true },
  { file: '.env', required: false }
];

console.log('\n📁 Checking Required Files:\n');

requiredFiles.forEach(({ file, required }) => {
  const exists = fs.existsSync(path.join(__dirname, file));
  const status = exists ? '✅' : (required ? '❌' : '⚠️');
  const label = required ? 'REQUIRED' : 'OPTIONAL';
  
  console.log(`${status} ${file.padEnd(25)} [${label}]`);
  
  if (required && !exists) {
    allChecks = false;
  }
});

// Check package.json
console.log('\n📦 Checking package.json:\n');

try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  // Check for start script
  if (packageJson.scripts && packageJson.scripts.start) {
    console.log(`✅ "start" script found: ${packageJson.scripts.start}`);
  } else {
    console.log('❌ No "start" script in package.json');
    allChecks = false;
  }
  
  // Check for main entry point
  if (packageJson.main) {
    console.log(`✅ "main" entry point: ${packageJson.main}`);
  } else {
    console.log('⚠️  No "main" field (optional if you have "start" script)');
  }
  
  // Check for duplicate scripts
  const scriptsStr = JSON.stringify(packageJson.scripts, null, 2);
  const startMatches = (scriptsStr.match(/"start":/g) || []).length;
  if (startMatches > 1) {
    console.log('❌ WARNING: Duplicate "start" scripts detected!');
    allChecks = false;
  }
  
} catch (error) {
  console.log(`❌ Error reading package.json: ${error.message}`);
  allChecks = false;
}

// Check nixpacks.toml
console.log('\n⚙️  Checking nixpacks.toml:\n');

try {
  const nixpacks = fs.readFileSync(path.join(__dirname, 'nixpacks.toml'), 'utf8');
  
  if (nixpacks.includes('[start]')) {
    console.log('✅ [start] section found');
  } else {
    console.log('⚠️  No [start] section in nixpacks.toml');
  }
  
  if (nixpacks.includes('cmd =')) {
    const cmdMatch = nixpacks.match(/cmd\s*=\s*"([^"]+)"/);
    if (cmdMatch) {
      console.log(`✅ Start command: ${cmdMatch[1]}`);
    }
  } else {
    console.log('⚠️  No start command in nixpacks.toml');
  }
  
} catch (error) {
  console.log(`❌ Error reading nixpacks.toml: ${error.message}`);
}

// Check railway.json
console.log('\n🚂 Checking railway.json:\n');

try {
  const railwayJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'railway.json'), 'utf8'));
  
  if (railwayJson.build && railwayJson.build.builder) {
    console.log(`✅ Builder: ${railwayJson.build.builder}`);
  }
  
  if (railwayJson.deploy && railwayJson.deploy.startCommand) {
    console.log(`✅ Start command: ${railwayJson.deploy.startCommand}`);
  } else {
    console.log('⚠️  No startCommand in railway.json (will use package.json start script)');
  }
  
  if (railwayJson.deploy && railwayJson.deploy.healthcheckPath) {
    console.log(`✅ Health check: ${railwayJson.deploy.healthcheckPath}`);
  }
  
} catch (error) {
  console.log(`❌ Error reading railway.json: ${error.message}`);
}

// Check Procfile
console.log('\n📄 Checking Procfile:\n');

try {
  const procfile = fs.readFileSync(path.join(__dirname, 'Procfile'), 'utf8');
  
  if (procfile.includes('web:')) {
    const webMatch = procfile.match(/web:\s*(.+)/);
    if (webMatch) {
      console.log(`✅ Web process: ${webMatch[1].trim()}`);
    }
  } else {
    console.log('⚠️  No "web:" process in Procfile');
  }
  
} catch (error) {
  console.log(`❌ Error reading Procfile: ${error.message}`);
}

// Environment variables check
console.log('\n🔐 Environment Variables Reminder:\n');

const requiredEnvVars = [
  'NODE_ENV (should be "production")',
  'PORT (Railway provides this automatically)',
  'MONGODB_URI',
  'JWT_SECRET',
  'SESSION_SECRET',
  'CORS_ORIGIN',
  'NLP_SERVICE_URL'
];

console.log('Make sure these are set in Railway dashboard:');
requiredEnvVars.forEach(varName => {
  console.log(`   • ${varName}`);
});

// Root directory warning
console.log('\n⚠️  CRITICAL CONFIGURATION:\n');
console.log('┌─────────────────────────────────────────────────┐');
console.log('│  Railway Dashboard Settings:                    │');
console.log('│                                                 │');
console.log('│  Root Directory = "backend"                     │');
console.log('│                                                 │');
console.log('│  ⚠️  Without this, Railway will look at the     │');
console.log('│     root folder and see a workspace with        │');
console.log('│     2 packages, causing deployment to fail.     │');
console.log('└─────────────────────────────────────────────────┘');

// Final result
console.log('\n' + '═'.repeat(50));

if (allChecks) {
  console.log('\n✅ ALL CHECKS PASSED!\n');
  console.log('Your backend is ready for Railway deployment.\n');
  console.log('Next steps:');
  console.log('  1. Set Root Directory to "backend" in Railway dashboard');
  console.log('  2. Configure environment variables');
  console.log('  3. Deploy!\n');
} else {
  console.log('\n❌ SOME CHECKS FAILED!\n');
  console.log('Please fix the issues above before deploying.\n');
  process.exit(1);
}

console.log('═'.repeat(50));
console.log('\n📚 For detailed deployment guide, see:');
console.log('   • RAILWAY-FIX-NOW.md');
console.log('   • RAILWAY-DEPLOYMENT-FIX.md\n');
