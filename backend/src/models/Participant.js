const mongoose = require('mongoose');

/**
 * Participant Model
 * Stores participant information and study progress
 */

const participantSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
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
  
  // Demographics - As approved by research protocol
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [18, 'Participant must be at least 18 years old'],
    max: [100, 'Invalid age']
  },
  
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: {
      values: ['male', 'female', 'other', 'prefer_not_to_say'],
      message: '{VALUE} is not a valid gender option'
    }
  },
  
  university: {
    type: String,
    required: [true, 'University is required'],
    enum: {
      values: ['SBBWU', 'University of Peshawar'],
      message: '{VALUE} is not a valid university'
    }
  },
  
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  
  // Experimental Condition
  condition: {
    type: String,
    required: false, // Will be assigned by assignment service
    enum: {
      values: ['anonymous', 'identifiable'],
      message: '{VALUE} is not a valid condition'
    }
  },
  
  // Assignment Tracking
  conditionAssigned: {
    type: Boolean,
    default: false,
    required: true
  },
  
  assignedAt: {
    type: Date,
    default: null
  },
  
  assignmentVersion: {
    type: String,
    default: null,
    maxlength: [20, 'Assignment version cannot exceed 20 characters']
  },
  
  // Consent
  consentGiven: {
    type: Boolean,
    default: false,
    required: true
  },
  
  consentAt: {
    type: Date,
    default: null
  },
  
  consentVersion: {
    type: String,
    default: null,
    maxlength: [20, 'Consent version cannot exceed 20 characters']
  },
  
  // Status
  status: {
    type: String,
    required: true,
    enum: {
      values: ['active', 'completed', 'incomplete', 'withdrawn'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  
  // Experiment Progress
  currentVideo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  
  completedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  
  experimentStartedAt: {
    type: Date,
    default: null
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  // Withdrawal
  withdrawalStatus: {
    type: Boolean,
    default: false
  },
  
  withdrawalReason: {
    type: String,
    default: null,
    maxlength: [500, 'Withdrawal reason cannot exceed 500 characters']
  },
  
  withdrawalDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes
participantSchema.index({ status: 1 });
participantSchema.index({ condition: 1 });
participantSchema.index({ createdAt: -1 });
// Note: username index created automatically by unique: true in field definition

// Virtual for completion percentage (for future use)
participantSchema.virtual('completionPercentage').get(function() {
  // Will be calculated based on completed tasks
  return 0;
});

// Methods
participantSchema.methods.markConsent = function(version) {
  this.consentGiven = true;
  this.consentAt = new Date();
  this.consentVersion = version;
  return this.save();
};

participantSchema.methods.withdraw = function(reason) {
  this.status = 'withdrawn';
  this.withdrawalStatus = true;
  this.withdrawalReason = reason;
  this.withdrawalDate = new Date();
  return this.save();
};

participantSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Statics
participantSchema.statics.countByCondition = function(condition) {
  return this.countDocuments({ condition, status: { $ne: 'withdrawn' } });
};

module.exports = mongoose.model('Participant', participantSchema);
