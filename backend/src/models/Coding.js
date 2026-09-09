const mongoose = require('mongoose');

/**
 * Coding Model - Enhanced Phase 10
 * Research-Grade AI-Assisted Coding with Human Review
 * 
 * CRITICAL PRINCIPLES:
 * - AI provides suggestions, human approves final coding
 * - Sentiment ≠ Aggression ≠ Cyberbullying (separate dimensions)
 * - Original response NEVER modified
 * - Evidence-based coding with rationale
 * - Configurable coding framework
 * - Full auditability
 */

const codingSchema = new mongoose.Schema({
  response: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoResponse',
    required: [true, 'Response reference is required'],
    index: true
  },
  
  // ============================================
  // AI-GENERATED CODING (Suggestions Only)
  // ============================================
  aiCoding: {
    // AI Sentiment Analysis
    sentiment: {
      label: {
        type: String,
        enum: ['positive', 'neutral', 'negative', 'mixed', null],
        default: null
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: null
      },
      evidence: {
        type: String,
        maxlength: 1000
      },
      needsReview: {
        type: Boolean,
        default: false
      }
    },

    // AI Aggression Analysis
    aggression: {
      label: {
        type: String,
        enum: ['none', 'mild', 'moderate', 'severe', null],
        default: null
      },
      level: {
        type: Number,
        min: 0,
        max: 10,
        default: null
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: null
      },
      evidence: {
        type: String,
        maxlength: 1000
      },
      needsReview: {
        type: Boolean,
        default: false
      }
    },

    // AI Cyberbullying Analysis
    cyberbullying: {
      present: {
        type: Boolean,
        default: null
      },
      type: {
        type: String,
        enum: ['none', 'harassment', 'denigration', 'flaming', 'impersonation', 'outing', 'exclusion', 'cyberstalking', 'other', null],
        default: null
      },
      severity: {
        type: Number,
        min: 0,
        max: 10,
        default: null
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: null
      },
      evidence: {
        type: String,
        maxlength: 1000
      },
      criteriaMatched: [{
        type: String,
        maxlength: 100
      }],
      needsReview: {
        type: Boolean,
        default: false
      }
    },

    // AI Metadata
    modelName: {
      type: String,
      maxlength: 100
    },
    modelVersion: {
      type: String,
      maxlength: 50
    },
    promptVersion: {
      type: String,
      maxlength: 50
    },
    detectedLanguage: {
      type: String,
      maxlength: 50
    },
    languageConfidence: {
      type: Number,
      min: 0,
      max: 1
    },
    needsHumanReview: {
      type: Boolean,
      default: true
    },
    analyzedAt: {
      type: Date
    }
  },
  
  // ============================================
  // HUMAN-APPROVED FINAL CODING
  // ============================================
  
  // Final Sentiment (Human-reviewed)
  sentiment: {
    type: String,
    enum: {
      values: ['positive', 'neutral', 'negative', 'mixed', null],
      message: '{VALUE} is not a valid sentiment'
    },
    default: null
  },
  
  // Final Aggression (Human-reviewed)
  aggression: {
    level: {
      type: Number,
      min: [0, 'Aggression level cannot be negative'],
      max: [10, 'Aggression level cannot exceed 10'],
      default: null
    },
    
    category: {
      type: String,
      enum: {
        values: ['none', 'mild', 'moderate', 'severe', null],
        message: '{VALUE} is not a valid aggression category'
      },
      default: null
    },
    
    subcategories: [{
      type: String,
      maxlength: [100, 'Subcategory cannot exceed 100 characters']
    }]
  },
  
  // Final Cyberbullying (Human-reviewed)
  cyberbullying: {
    present: {
      type: Boolean,
      default: null
    },
    
    type: {
      type: String,
      enum: {
        values: ['none', 'harassment', 'denigration', 'flaming', 'impersonation', 'outing', 'exclusion', 'cyberstalking', 'other', null],
        message: '{VALUE} is not a valid cyberbullying type'
      },
      default: null
    },
    
    severity: {
      type: Number,
      min: [0, 'Severity cannot be negative'],
      max: [10, 'Severity cannot exceed 10'],
      default: null
    }
  },
  
  // Additional coding dimensions (extensible)
  dimensions: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  
  // Human coder notes
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  
  // ============================================
  // REVIEW STATUS & WORKFLOW
  // ============================================
  reviewStatus: {
    type: String,
    enum: {
      values: ['pending_review', 'ai_generated', 'reviewed', 'needs_revision', 'approved', 'uncertain'],
      message: '{VALUE} is not a valid review status'
    },
    default: 'pending_review',
    index: true
  },

  reviewAction: {
    type: String,
    enum: ['accepted_ai', 'modified', 'rejected', 'marked_uncertain', null],
    default: null
  },
  
  // ============================================
  // CODER INFORMATION
  // ============================================
  codedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Coder reference is required'],
    index: true
  },
  
  coderRole: {
    type: String,
    enum: {
      values: ['primary', 'secondary', 'expert', 'validator'],
      message: '{VALUE} is not a valid coder role'
    },
    required: [true, 'Coder role is required'],
    default: 'primary',
    index: true
  },
  
  // ============================================
  // VERSIONING & AUDITABILITY
  // ============================================
  codingFrameworkVersion: {
    type: String,
    required: [true, 'Coding framework version is required'],
    default: '1.0',
    maxlength: [20, 'Coding framework version cannot exceed 20 characters'],
    index: true
  },

  codingVersion: {
    type: String,
    required: [true, 'Coding version is required'],
    default: '1.0',
    maxlength: [20, 'Coding version cannot exceed 20 characters']
  },
  
  // Confidence rating (human coder confidence)
  confidence: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: '{VALUE} is not a valid confidence level'
    },
    default: 'medium'
  },
  
  // ============================================
  // INTER-RATER RELIABILITY
  // ============================================
  reliability: {
    hasSecondCoding: {
      type: Boolean,
      default: false
    },
    
    agreement: {
      type: Boolean,
      default: null
    },
    
    discrepancy: {
      type: Number,
      default: null,
      min: [0, 'Discrepancy cannot be negative']
    },
    
    resolved: {
      type: Boolean,
      default: false
    },
    
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    }
  },
  
  // ============================================
  // TIMESTAMPS
  // ============================================
  codedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },

  reviewedAt: {
    type: Date,
    default: null
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

// Indexes - Enhanced for AI-assisted coding
codingSchema.index({ response: 1, coderRole: 1 });
codingSchema.index({ codedBy: 1 });
codingSchema.index({ codingVersion: 1 });
codingSchema.index({ codingFrameworkVersion: 1 });
codingSchema.index({ reviewStatus: 1 });
codingSchema.index({ 'aggression.category': 1 });
codingSchema.index({ 'cyberbullying.present': 1 });
codingSchema.index({ 'aiCoding.needsHumanReview': 1 });
codingSchema.index({ codedAt: -1 });

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Store AI coding suggestion
 */
codingSchema.methods.storeAICoding = function(aiAnalysis) {
  this.aiCoding = {
    sentiment: aiAnalysis.sentiment,
    aggression: aiAnalysis.aggression,
    cyberbullying: aiAnalysis.cyberbullying,
    modelName: aiAnalysis.metadata?.provider || 'unknown',
    modelVersion: aiAnalysis.metadata?.version || '1.0',
    detectedLanguage: aiAnalysis.metadata?.detectedLanguage,
    languageConfidence: aiAnalysis.metadata?.languageConfidence,
    needsHumanReview: aiAnalysis.needsHumanReview !== false,
    analyzedAt: new Date()
  };
  
  this.reviewStatus = 'ai_generated';
  return this;
};

/**
 * Accept AI coding as final
 */
codingSchema.methods.acceptAICoding = function(reviewedBy) {
  if (!this.aiCoding) {
    throw new Error('No AI coding to accept');
  }

  this.sentiment = this.aiCoding.sentiment.label;
  this.aggression.category = this.aiCoding.aggression.label;
  this.aggression.level = this.aiCoding.aggression.level;
  this.cyberbullying.present = this.aiCoding.cyberbullying.present;
  this.cyberbullying.type = this.aiCoding.cyberbullying.type;
  this.cyberbullying.severity = this.aiCoding.cyberbullying.severity;

  this.reviewStatus = 'reviewed';
  this.reviewAction = 'accepted_ai';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  
  return this;
};

/**
 * Mark as uncertain (needs expert review)
 */
codingSchema.methods.markUncertain = function(reviewedBy, notes) {
  this.reviewStatus = 'uncertain';
  this.reviewAction = 'marked_uncertain';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  if (notes) this.notes = notes;
  return this;
};

/**
 * Approve final coding
 */
codingSchema.methods.approveCoding = function(reviewedBy) {
  this.reviewStatus = 'approved';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  return this;
};

// Existing methods preserved
codingSchema.methods.markAsSecondary = function() {
  this.coderRole = 'secondary';
  this.reliability.hasSecondCoding = true;
  return this.save();
};

codingSchema.methods.calculateAgreement = async function(primaryCodingId) {
  const primaryCoding = await this.constructor.findById(primaryCodingId);
  if (!primaryCoding) return false;
  
  // Simple agreement check (can be made more sophisticated)
  const aggressionMatch = this.aggression.category === primaryCoding.aggression.category;
  const cyberbullyingMatch = this.cyberbullying.present === primaryCoding.cyberbullying.present;
  
  this.reliability.agreement = aggressionMatch && cyberbullyingMatch;
  
  // Calculate discrepancy
  if (this.aggression.level !== null && primaryCoding.aggression.level !== null) {
    this.reliability.discrepancy = Math.abs(this.aggression.level - primaryCoding.aggression.level);
  }
  
  return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

// Existing static methods preserved
codingSchema.statics.findByResponse = function(responseId) {
  return this.find({ response: responseId })
    .populate('codedBy', 'username name role')
    .populate('reviewedBy', 'username name role')
    .sort({ coderRole: 1, codedAt: 1 });
};

codingSchema.statics.findPrimaryCoding = function(responseId) {
  return this.findOne({ response: responseId, coderRole: 'primary' })
    .populate('codedBy', 'username name')
    .populate('reviewedBy', 'username name');
};

codingSchema.statics.findSecondaryCoding = function(responseId) {
  return this.findOne({ response: responseId, coderRole: 'secondary' })
    .populate('codedBy', 'username name');
};

codingSchema.statics.getUncodedResponses = async function() {
  const VideoResponse = mongoose.model('VideoResponse');
  const codedResponseIds = await this.distinct('response', { coderRole: 'primary' });
  return VideoResponse.find({ _id: { $nin: codedResponseIds } })
    .populate('participant', 'username condition')
    .populate('video', 'title');
};

// New static methods for AI-assisted coding
codingSchema.statics.getPendingReviewCount = function() {
  return this.countDocuments({ 
    reviewStatus: { $in: ['ai_generated', 'pending_review', 'needs_revision'] }
  });
};

codingSchema.statics.getByReviewStatus = function(status, options = {}) {
  const query = { reviewStatus: status, coderRole: 'primary' };
  return this.find(query)
    .populate('response')
    .populate('codedBy', 'username name')
    .sort({ codedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

codingSchema.statics.calculateInterRaterReliability = async function() {
  const responses = await this.aggregate([
    { $match: { coderRole: { $in: ['primary', 'secondary'] } } },
    { $group: { 
      _id: '$response',
      count: { $sum: 1 },
      agreements: { $sum: { $cond: ['$reliability.agreement', 1, 0] } }
    }},
    { $match: { count: 2 } }
  ]);
  
  if (responses.length === 0) return 0;
  
  const totalAgreements = responses.reduce((sum, r) => sum + r.agreements, 0);
  return (totalAgreements / responses.length) * 100;
};

module.exports = mongoose.model('Coding', codingSchema);
