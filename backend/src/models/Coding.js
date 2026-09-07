const mongoose = require('mongoose');

/**
 * Coding Model
 * Stores aggression/cyberbullying coding for video responses
 * Supports configurable coding categories and inter-rater reliability
 */

const codingSchema = new mongoose.Schema({
  response: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoResponse',
    required: [true, 'Response reference is required']
  },
  
  // Core coding dimensions (configurable)
  sentiment: {
    type: String,
    enum: {
      values: ['positive', 'neutral', 'negative', 'mixed'],
      message: '{VALUE} is not a valid sentiment'
    },
    default: null
  },
  
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
        values: ['none', 'mild', 'moderate', 'severe'],
        message: '{VALUE} is not a valid aggression category'
      },
      default: null
    },
    
    // Support for future configurable subcategories
    subcategories: [{
      type: String,
      maxlength: [100, 'Subcategory cannot exceed 100 characters']
    }]
  },
  
  cyberbullying: {
    present: {
      type: Boolean,
      default: null
    },
    
    type: {
      type: String,
      enum: {
        values: ['none', 'harassment', 'denigration', 'flaming', 'impersonation', 'outing', 'exclusion', 'cyberstalking', 'other'],
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
  
  // Coder notes
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  
  // Coder information
  codedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Coder reference is required']
  },
  
  coderRole: {
    type: String,
    enum: {
      values: ['primary', 'secondary', 'expert', 'validator'],
      message: '{VALUE} is not a valid coder role'
    },
    required: [true, 'Coder role is required'],
    default: 'primary'
  },
  
  // Coding version for methodology tracking
  codingVersion: {
    type: String,
    required: [true, 'Coding version is required'],
    default: '1.0',
    maxlength: [20, 'Coding version cannot exceed 20 characters']
  },
  
  // Confidence rating
  confidence: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: '{VALUE} is not a valid confidence level'
    },
    default: 'medium'
  },
  
  // Inter-rater reliability fields
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
  
  codedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
codingSchema.index({ response: 1, coderRole: 1 });
codingSchema.index({ codedBy: 1 });
codingSchema.index({ codingVersion: 1 });
codingSchema.index({ 'aggression.category': 1 });
codingSchema.index({ 'cyberbullying.present': 1 });
codingSchema.index({ codedAt: -1 });

// Methods
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

// Statics
codingSchema.statics.findByResponse = function(responseId) {
  return this.find({ response: responseId })
    .populate('codedBy', 'username role')
    .sort({ coderRole: 1, codedAt: 1 });
};

codingSchema.statics.findPrimaryCoding = function(responseId) {
  return this.findOne({ response: responseId, coderRole: 'primary' })
    .populate('codedBy', 'username');
};

codingSchema.statics.findSecondaryCoding = function(responseId) {
  return this.findOne({ response: responseId, coderRole: 'secondary' })
    .populate('codedBy', 'username');
};

codingSchema.statics.getUncodedResponses = async function() {
  const VideoResponse = mongoose.model('VideoResponse');
  const codedResponseIds = await this.distinct('response', { coderRole: 'primary' });
  return VideoResponse.find({ _id: { $nin: codedResponseIds } })
    .populate('participant', 'username condition')
    .populate('video', 'title');
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
