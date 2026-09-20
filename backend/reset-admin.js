require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ALL_PERMISSIONS = [
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
];

async function resetAdminForDb(dbName, baseUri, password) {
  const hash = await bcrypt.hash(password, 12);
  const conn = await mongoose.createConnection(baseUri, { dbName }).asPromise();
  const adminsCol = conn.collection('admins');

  // Find or update admin
  let admin = await adminsCol.findOne({ username: 'admin' });
  if (admin) {
    await adminsCol.updateOne(
      { username: 'admin' },
      {
        $set: {
          passwordHash: hash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          active: true,
          role: 'superadmin',
          permissions: ALL_PERMISSIONS,
          updatedAt: new Date()
        }
      }
    );
    console.log(`✓ [${dbName}] Admin account 'admin' unlocked and password reset.`);
  } else {
    await adminsCol.insertOne({
      username: 'admin',
      email: 'admin@sbbwu.edu.pk',
      name: 'System Administrator',
      passwordHash: hash,
      role: 'superadmin',
      permissions: ALL_PERMISSIONS,
      active: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✓ [${dbName}] Admin account 'admin' created.`);
  }

  // Verify
  const updated = await adminsCol.findOne({ username: 'admin' });
  const isMatch = await bcrypt.compare(password, updated.passwordHash);
  console.log(`✓ [${dbName}] Verification:`, {
    username: updated.username,
    email: updated.email,
    active: updated.active,
    failedLoginAttempts: updated.failedLoginAttempts,
    lockedUntil: updated.lockedUntil,
    passwordMatches: isMatch
  });

  await conn.close();
}

async function main() {
  const baseUri = process.env.MONGODB_URI || 'mongodb+srv://24pwbcs1261_db_user:FLNtaLd2IYSZnFr0@cluster1.cy0uc3w.mongodb.net/?appName=Cluster1';
  const targetPassword = process.argv[2] || 'admin123456';

  console.log(`\n=== Resetting Admin Credentials: admin / ${targetPassword} ===\n`);

  for (const dbName of ['test', 'cyberbullying-research']) {
    await resetAdminForDb(dbName, baseUri, targetPassword);
  }

  console.log('\n=== Admin Reset Complete ===\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ Reset failed:', err);
  process.exit(1);
});
