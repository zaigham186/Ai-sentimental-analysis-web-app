const mongoose = require('mongoose');

/**
 * Video Model
 * Stores video stimuli for the cyberbullying experiment
 */

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    trim: true,
    maxlength: [100, 'Topic cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required'],
    validate: {
      validator: function(v) {
        // Basic URL validation
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid video URL format'
    },
    maxlength: [500, 'Video URL cannot exceed 500 characters']
  },
  
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 second'],
    max: [3600, 'Duration cannot exceed 1 hour']
  },
  
  order: {
    type: Number,
    required: [true, 'Display order is required'],
    min: [1, 'Order must be at least 1']
  },
  
  active: {
    type: Boolean,
    default: true,
    required: true
  },
  
  // Expert Validation
  validationStatus: {
    type: String,
    required: true,
    enum: {
      values: ['candidate', 'under_review', 'approved', 'rejected'],
      message: '{VALUE} is not a valid validation status'
    },
    default: 'candidate'
  },
  
  validationNotes: {
    type: String,
    default: null,
    maxlength: [1000, 'Validation notes cannot exceed 1000 characters']
  },
  
  validationDate: {
    type: Date,
    default: null
  },
  
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  
  version: {
    type: String,
    required: [true, 'Version is required'],
    default: '1.0',
    maxlength: [20, 'Version cannot exceed 20 characters']
  },
  
  // Metadata for research tracking
  metadata: {
    category: {
      type: String,
      maxlength: [100, 'Category cannot exceed 100 characters']
    },
    tags: [{
      type: String,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  }
}, {
  timestamps: true
});

// Indexes
videoSchema.index({ active: 1, validationStatus: 1 });
videoSchema.index({ order: 1 });
videoSchema.index({ validationStatus: 1 });

// Statics
videoSchema.statics.getApprovedActive = function() {
  return this.find({ 
    active: true, 
    validationStatus: 'approved' 
  }).sort({ order: 1 });
};

videoSchema.statics.countByStatus = function(status) {
  return this.countDocuments({ validationStatus: status });
};

// Methods
videoSchema.methods.approve = function(adminId, notes = null) {
  this.validationStatus = 'approved';
  this.validationDate = new Date();
  this.validatedBy = adminId;
  if (notes) {
    this.validationNotes = notes;
  }
  return this.save();
};

videoSchema.methods.reject = function(adminId, notes) {
  this.validationStatus = 'rejected';
  this.validationDate = new Date();
  this.validatedBy = adminId;
  this.validationNotes = notes;
  this.active = false;
  return this.save();
};

module.exports = mongoose.model('Video', videoSchema);
