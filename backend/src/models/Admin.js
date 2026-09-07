const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Admin Model
 * Stores admin user accounts for platform management
 * CRITICAL: Passwords stored as bcrypt hashes only
 */

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username cannot exceed 50 characters'],
    match: [/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [255, 'Email cannot exceed 255 characters'],
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },
  
  // Password stored as hash ONLY - never plaintext
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
    select: false // Don't include in queries by default
  },
  
  // Profile
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['superadmin', 'researcher', 'coder', 'analyst'],
      message: '{VALUE} is not a valid role'
    },
    default: 'researcher'
  },
  
  // Permissions (for fine-grained access control)
  permissions: [{
    type: String,
    enum: [
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
    ]
  }],
  
  // Status
  active: {
    type: Boolean,
    default: true,
    required: true
  },
  
  // Security
  lastLogin: {
    type: Date,
    default: null
  },
  
  lastLoginIp: {
    type: String,
    default: null,
    maxlength: [45, 'IP address cannot exceed 45 characters'] // IPv6 max length
  },
  
  failedLoginAttempts: {
    type: Number,
    default: 0,
    min: [0, 'Failed login attempts cannot be negative']
  },
  
  lockedUntil: {
    type: Date,
    default: null
  },
  
  passwordChangedAt: {
    type: Date,
    default: null
  },
  
  // Password reset
  passwordResetToken: {
    type: String,
    default: null,
    select: false
  },
  
  passwordResetExpires: {
    type: Date,
    default: null,
    select: false
  },
  
  // Session tracking
  sessions: [{
    token: String,
    createdAt: Date,
    expiresAt: Date,
    ipAddress: String
  }]
}, {
  timestamps: true
});

// Indexes
// Note: username and email indexes created automatically by unique: true in field definitions
adminSchema.index({ active: 1 });
adminSchema.index({ role: 1 });

// Virtual for account lock status
adminSchema.virtual('isLocked').get(function() {
  return this.lockedUntil && this.lockedUntil > Date.now();
});

// Methods
adminSchema.methods.recordLogin = function(ipAddress) {
  this.lastLogin = new Date();
  this.lastLoginIp = ipAddress;
  this.failedLoginAttempts = 0;
  return this.save();
};

adminSchema.methods.recordFailedLogin = function() {
  this.failedLoginAttempts += 1;
  
  // Lock account after 5 failed attempts
  if (this.failedLoginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
  }
  
  return this.save();
};

adminSchema.methods.unlock = function() {
  this.failedLoginAttempts = 0;
  this.lockedUntil = null;
  return this.save();
};

adminSchema.methods.deactivate = function() {
  this.active = false;
  return this.save();
};

adminSchema.methods.hasPermission = function(permission) {
  if (this.role === 'superadmin') return true;
  return this.permissions.includes(permission);
};

adminSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  return resetToken; // Return unhashed token to send to user
};

// Statics
adminSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase() });
};

adminSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

adminSchema.statics.getActiveAdmins = function() {
  return this.find({ active: true }).select('-passwordHash');
};

adminSchema.statics.countByRole = function(role) {
  return this.countDocuments({ role, active: true });
};

// NOTE: Password hashing should be done in the controller/service layer using bcrypt
// Example: const bcrypt = require('bcryptjs'); 
//          const hash = await bcrypt.hash(password, 12);
//          admin.passwordHash = hash;

module.exports = mongoose.model('Admin', adminSchema);
