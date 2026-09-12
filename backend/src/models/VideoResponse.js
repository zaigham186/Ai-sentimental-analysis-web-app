const mongoose = require('mongoose');

/**
 * VideoResponse Model
 * Stores participant responses to video stimuli
 * CRITICAL: Enforces one response per participant per video
 */

const videoResponseSchema = new mongoose.Schema({
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: [true, 'Participant reference is required']
  },
  
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: [true, 'Video reference is required']
  },
  
  // Raw response - MUST remain unchanged after submission
  responseText: {
    type: String,
    required: [true, 'Response text is required'],
    minlength: [1, 'Response cannot be empty'],
    maxlength: [5000, 'Response cannot exceed 5000 characters'],
    immutable: true, // Mongoose will prevent updates to this field
    set: function(val) {
      if (!this.isNew && this._originalResponseText && val !== this._originalResponseText) {
        throw new Error('Response text is immutable and cannot be modified');
      }
      return val;
    }
  },
  
  // Response metrics
  responseLength: {
    type: Number,
    required: true
  },
  
  responseWordCount: {
    type: Number,
    default: 0
  },
  
  responseTime: {
    type: Number, // Time taken in seconds
    min: [0, 'Response time cannot be negative']
  },
  
  submittedAt: {
    type: Date,
    required: true,
    default: Date.now,
    immutable: true
  }
}, {
  timestamps: true
});

// CRITICAL: Compound unique index to prevent duplicate responses
videoResponseSchema.index({ participant: 1, video: 1 }, { unique: true });

// Additional indexes for queries
videoResponseSchema.index({ submittedAt: -1 });
videoResponseSchema.index({ participant: 1 });
videoResponseSchema.index({ video: 1 });

// Track original responseText on loaded documents
videoResponseSchema.post('init', function() {
  this._originalResponseText = this.responseText;
});

// Pre-validate hook to calculate metrics before required validation check
videoResponseSchema.pre('validate', function(next) {
  if (!this.isNew && this.isDirectModified('responseText')) {
    return next(new Error('Response text is immutable and cannot be modified'));
  }
  if (this.responseText) {
    if (this.responseLength === undefined || this.responseLength === null) {
      this.responseLength = this.responseText.length;
    }
    if (this.responseWordCount === undefined || this.responseWordCount === null || this.responseWordCount === 0) {
      this.responseWordCount = this.responseText.trim().split(/\s+/).length;
    }
  }
  next();
});

// Pre-save hook to calculate metrics and enforce immutability
videoResponseSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified('responseText')) {
    return next(new Error('Response text is immutable and cannot be modified'));
  }
  if (this.isNew && this.responseText) {
    this.responseLength = this.responseText.length;
    this.responseWordCount = this.responseText.trim().split(/\s+/).length;
  }
  next();
});

// Virtual to check if coded
videoResponseSchema.virtual('isCoded', {
  ref: 'Coding',
  localField: '_id',
  foreignField: 'response',
  justOne: true
});

// Methods
videoResponseSchema.methods.getWithDetails = function() {
  return this.populate([
    { path: 'participant', select: 'username condition status' },
    { path: 'video', select: 'title topic' }
  ]);
};

// Statics
videoResponseSchema.statics.findByParticipant = function(participantId) {
  return this.find({ participant: participantId })
    .populate('video', 'title topic order')
    .sort({ submittedAt: 1 });
};

videoResponseSchema.statics.findByVideo = function(videoId) {
  return this.find({ video: videoId })
    .populate('participant', 'username condition')
    .sort({ submittedAt: -1 });
};

videoResponseSchema.statics.countByVideo = function(videoId) {
  return this.countDocuments({ video: videoId });
};

videoResponseSchema.statics.getUncodedResponses = async function() {
  const Coding = mongoose.model('Coding');
  const codedResponseIds = await Coding.distinct('response');
  return this.find({ _id: { $nin: codedResponseIds } })
    .populate('participant', 'username condition')
    .populate('video', 'title')
    .sort({ submittedAt: 1 });
};

module.exports = mongoose.model('VideoResponse', videoResponseSchema);
