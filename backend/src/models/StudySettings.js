const mongoose = require('mongoose');

/**
 * StudySettings Model
 * Stores global study configuration and parameters
 * Single document collection for study-wide settings
 */

const studySettingsSchema = new mongoose.Schema({
  // Study Status
  studyStatus: {
    type: String,
    required: [true, 'Study status is required'],
    enum: {
      values: ['setup', 'recruiting', 'active', 'data_collection_complete', 'closed'],
      message: '{VALUE} is not a valid study status'
    },
    default: 'setup'
  },
  
  // Recruitment targets
  targetParticipants: {
    type: Number,
    required: [true, 'Target participants is required'],
    default: 90, // INCREASED TO 90
    min: [1, 'Target must be at least 1']
  },
  
  anonymousTarget: {
    type: Number,
    required: [true, 'Anonymous target is required'],
    default: 45, // INCREASED TO 45
    min: [0, 'Anonymous target cannot be negative']
  },
  
  identifiableTarget: {
    type: Number,
    required: [true, 'Identifiable target is required'],
    default: 45, // INCREASED TO 45
    min: [0, 'Identifiable target cannot be negative']
  },
  
  // Current counts (tracked)
  currentParticipants: {
    type: Number,
    default: 0,
    min: [0, 'Current participants cannot be negative']
  },
  
  anonymousCount: {
    type: Number,
    default: 0,
    min: [0, 'Anonymous count cannot be negative']
  },
  
  identifiableCount: {
    type: Number,
    default: 0,
    min: [0, 'Identifiable count cannot be negative']
  },
  
  // Versioning
  stimulusSetVersion: {
    type: String,
    required: [true, 'Stimulus set version is required'],
    default: '1.0',
    maxlength: [20, 'Version cannot exceed 20 characters']
  },
  
  questionnaireVersions: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  codingVersion: {
    type: String,
    default: '1.0',
    maxlength: [20, 'Coding version cannot exceed 20 characters']
  },
  
  // Allocation
  allocationMethod: {
    type: String,
    required: [true, 'Allocation method is required'],
    enum: {
      values: ['random', 'sequential', 'balanced', 'stratified'],
      message: '{VALUE} is not a valid allocation method'
    },
    default: 'balanced'
  },
  
  allocationVersion: {
    type: String,
    default: '1.0',
    maxlength: [20, 'Allocation version cannot exceed 20 characters']
  },
  
  // Recruitment
  recruitmentStatus: {
    type: String,
    required: [true, 'Recruitment status is required'],
    enum: {
      values: ['not_started', 'open', 'paused', 'closed'],
      message: '{VALUE} is not a valid recruitment status'
    },
    default: 'not_started'
  },
  
  acceptingParticipants: {
    type: Boolean,
    default: false,
    required: true
  },
  
  recruitmentStartDate: {
    type: Date,
    default: null
  },
  
  recruitmentEndDate: {
    type: Date,
    default: null
  },
  
  // Environment
  environment: {
    type: String,
    required: [true, 'Environment is required'],
    enum: {
      values: ['development', 'staging', 'production'],
      message: '{VALUE} is not a valid environment'
    },
    default: 'development'
  },
  
  // Study Lock (prevent changes during active data collection)
  studyLocked: {
    type: Boolean,
    default: false,
    required: true
  },
  
  lockedAt: {
    type: Date,
    default: null
  },
  
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  
  // Consent
  currentConsentVersion: {
    type: String,
    default: '1.0',
    maxlength: [20, 'Consent version cannot exceed 20 characters']
  },
  
  consentRequired: {
    type: Boolean,
    default: true,
    required: true
  },
  
  // Video configuration
  activeVideoIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  
  videoPresentationOrder: {
    type: String,
    enum: ['sequential', 'random', 'fixed'],
    default: 'fixed'
  },
  
  // Questionnaire configuration
  activeQuestionnaireIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Questionnaire'
  }],
  
  questionnaireOrder: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Questionnaire'
  }],
  
  // Experiment settings
  experimentSettings: {
    maxResponseTime: {
      type: Number, // in seconds
      default: 600 // 10 minutes
    },
    
    minResponseLength: {
      type: Number,
      default: 10 // minimum characters
    },
    
    allowWithdrawal: {
      type: Boolean,
      default: true
    },
    
    showProgressBar: {
      type: Boolean,
      default: true
    }
  },
  
  // Analytics
  analyticsEnabled: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

// Validation: ensure targets match
studySettingsSchema.pre('save', function(next) {
  if (this.anonymousTarget + this.identifiableTarget !== this.targetParticipants) {
    next(new Error('Anonymous target + Identifiable target must equal total target participants'));
  } else {
    next();
  }
});

// Methods
studySettingsSchema.methods.incrementParticipantCount = function(condition) {
  this.currentParticipants += 1;
  
  if (condition === 'anonymous') {
    this.anonymousCount += 1;
  } else if (condition === 'identifiable') {
    this.identifiableCount += 1;
  }
  
  return this.save();
};

studySettingsSchema.methods.decrementParticipantCount = function(condition) {
  if (this.currentParticipants > 0) {
    this.currentParticipants -= 1;
  }
  
  if (condition === 'anonymous' && this.anonymousCount > 0) {
    this.anonymousCount -= 1;
  } else if (condition === 'identifiable' && this.identifiableCount > 0) {
    this.identifiableCount -= 1;
  }
  
  return this.save();
};

studySettingsSchema.methods.canAcceptParticipant = function(condition = null) {
  if (!this.acceptingParticipants) return false;
  if (this.studyLocked) return false;
  if (this.currentParticipants >= this.targetParticipants) return false;
  
  if (condition === 'anonymous' && this.anonymousCount >= this.anonymousTarget) {
    return false;
  }
  
  if (condition === 'identifiable' && this.identifiableCount >= this.identifiableTarget) {
    return false;
  }
  
  return true;
};

studySettingsSchema.methods.getNextCondition = function() {
  // Balanced allocation based on targets
  if (this.anonymousCount < this.anonymousTarget && 
      this.identifiableCount < this.identifiableTarget) {
    // Both conditions available, choose based on which is further from target
    const anonymousRatio = this.anonymousCount / this.anonymousTarget;
    const identifiableRatio = this.identifiableCount / this.identifiableTarget;
    return anonymousRatio <= identifiableRatio ? 'anonymous' : 'identifiable';
  }
  
  if (this.anonymousCount < this.anonymousTarget) {
    return 'anonymous';
  }
  
  if (this.identifiableCount < this.identifiableTarget) {
    return 'identifiable';
  }
  
  return null; // No conditions available
};

studySettingsSchema.methods.lockStudy = function(adminId) {
  this.studyLocked = true;
  this.lockedAt = new Date();
  this.lockedBy = adminId;
  return this.save();
};

studySettingsSchema.methods.unlockStudy = function() {
  this.studyLocked = false;
  this.lockedAt = null;
  this.lockedBy = null;
  return this.save();
};

// Statics
studySettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  // Create default settings if none exist
  if (!settings) {
    settings = await this.create({
      targetParticipants: 90, // INCREASED TO 90
      anonymousTarget: 45, // INCREASED TO 45
      identifiableTarget: 45, // INCREASED TO 45
      acceptingParticipants: true // AUTO-ENABLE FOR TESTING
    });
  }
  
  return settings;
};

studySettingsSchema.statics.updateSettings = async function(updates, adminId) {
  let settings = await this.getSettings();
  
  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      settings[key] = updates[key];
    }
  });
  
  settings.lastModifiedBy = adminId;
  return settings.save();
};

module.exports = mongoose.model('StudySettings', studySettingsSchema);
