/**
 * Backend Error Checker
 * Comprehensive check for common issues
 */

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════');
console.log('  BACKEND ERROR CHECKER');
console.log('═══════════════════════════════════════════════\n');

const errors = [];
const warnings = [];
const passed = [];

// Check 1: Required files exist
console.log('📁 Checking required files...');
const requiredFiles = [
  'package.json',
  'src/server.js',
  'src/config/index.js',
  'src/config/database.js',
  '.env'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    passed.push(`✅ ${file} exists`);
  } else {
    errors.push(`❌ Missing required file: ${file}`);
  }
});

// Check 2: Package.json validation
console.log('📦 Checking package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!pkg.scripts || !pkg.scripts.start) {
    errors.push('❌ package.json missing "start" script');
  } else {
    passed.push(`✅ Start script: ${pkg.scripts.start}`);
  }
  
  if (!pkg.main) {
    warnings.push('⚠️  package.json missing "main" field');
  } else {
    passed.push(`✅ Main entry: ${pkg.main}`);
  }
  
  if (!pkg.dependencies) {
    errors.push('❌ No dependencies found in package.json');
  } else {
    passed.push(`✅ ${Object.keys(pkg.dependencies).length} dependencies listed`);
  }
  
} catch (e) {
  errors.push(`❌ Invalid package.json: ${e.message}`);
}

// Check 3: Environment variables
console.log('🔐 Checking environment variables...');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'SESSION_SECRET',
    'NODE_ENV',
    'PORT'
  ];
  
  requiredEnvVars.forEach(envVar => {
    if (envContent.includes(`${envVar}=`)) {
      const value = envContent.split(`${envVar}=`)[1]?.split('\n')[0]?.trim();
      if (!value || value.includes('your-secret') || value.includes('change-this')) {
        warnings.push(`⚠️  ${envVar} needs to be changed (using default/placeholder)`);
      } else {
        passed.push(`✅ ${envVar} is set`);
      }
    } else {
      errors.push(`❌ Missing environment variable: ${envVar}`);
    }
  });
} else {
  errors.push('❌ .env file not found');
}

// Check 4: Syntax check main files
console.log('🔍 Checking JavaScript syntax...');
const filesToCheck = [
  'src/server.js',
  'src/config/index.js',
  'src/config/database.js'
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      require(`./${file}`);
      passed.push(`✅ ${file} - No syntax errors`);
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        warnings.push(`⚠️  ${file} - Missing dependency: ${e.message}`);
      } else {
        errors.push(`❌ ${file} - Syntax error: ${e.message}`);
      }
    }
  }
});

// Check 5: Railway/Deployment files
console.log('🚂 Checking deployment configuration...');
const deployFiles = [
  { file: 'Procfile', required: false },
  { file: 'railway.json', required: false },
  { file: 'nixpacks.toml', required: false }
];

deployFiles.forEach(({ file, required }) => {
  if (fs.existsSync(file)) {
    passed.push(`✅ ${file} exists`);
  } else if (required) {
    errors.push(`❌ Missing ${file}`);
  } else {
    warnings.push(`⚠️  ${file} not found (optional)`);
  }
});

// Print results
console.log('\n' + '═'.repeat(50));
console.log('RESULTS SUMMARY');
console.log('═'.repeat(50) + '\n');

console.log(`✅ PASSED: ${passed.length}`);
console.log(`⚠️  WARNINGS: ${warnings.length}`);
console.log(`❌ ERRORS: ${errors.length}\n`);

if (errors.length > 0) {
  console.log('═'.repeat(50));
  console.log('CRITICAL ERRORS (Must Fix):');
  console.log('═'.repeat(50));
  errors.forEach(err => console.log(err));
  console.log('');
}

if (warnings.length > 0) {
  console.log('═'.repeat(50));
  console.log('WARNINGS (Should Fix):');
  console.log('═'.repeat(50));
  warnings.forEach(warn => console.log(warn));
  console.log('');
}

if (passed.length > 0 && errors.length === 0 && warnings.length === 0) {
  console.log('═'.repeat(50));
  console.log('🎉 ALL CHECKS PASSED!');
  console.log('═'.repeat(50));
  console.log('\nYour backend is ready for deployment!\n');
}

console.log('═'.repeat(50));
console.log('RECOMMENDATIONS:');
console.log('═'.repeat(50));

if (errors.length > 0) {
  console.log('❌ Fix all critical errors before deploying');
}

if (warnings.length > 0) {
  console.log('⚠️  Review and address warnings');
}

console.log('✅ Test locally: npm start');
console.log('✅ Check MongoDB connection');
console.log('✅ Generate strong JWT_SECRET and SESSION_SECRET');
console.log('✅ Set Railway Root Directory to: backend');
console.log('');

process.exit(errors.length > 0 ? 1 : 0);
