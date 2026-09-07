const mongoose = require('mongoose');

/**
 * Questionnaire Model
 * Stores questionnaire definitions (data-driven)
 * Examples: Moral Disengagement Scale, Empathy Scale, etc.
 */

const questionSchema = new mongoose.Schema({
  itemNumber: {
    type: Number,
    required: [true, 'Item number is required'],
    min: [1, 'Item number must be at least 1']
  },
  
  text: {
    type: String,
    required: [true, 'Question text is required'],
    maxlength: [1000, 'Question text cannot exceed 1000 characters']
  },
  
  type: {
    type: String,
    required: [true, 'Question type is required'],
    enum: {
      values: ['likert', 'multiple_choice', 'text', 'scale'],
      message: '{VALUE} is not a valid question type'
    }
  },
  
  options: [{
    type: String,
    maxlength: [200, 'Option text cannot exceed 200 characters']
  }],
  
  scaleMin: {
    type: Number,
    default: null
  },
  
  scaleMax: {
    type: Number,
    default: null
  },
  
  required: {
    type: Boolean,
    default: true
  },
  
  reverseCoded: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const subscaleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subscale name is required'],
    maxlength: [100, 'Subscale name cannot exceed 100 characters']
  },
  
  items: [{
    type: Number,
    min: [1, 'Item number must be at least 1']
  }],
  
  description: {
    type: String,
    maxlength: [500, 'Subscale description cannot exceed 500 characters']
  }
}, { _id: false });

const questionnaireSchema = new mongoose.Schema({
  // Identification
  questionnaireId: {
    type: String,
    required: [true, 'Questionnaire ID is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [50, 'Questionnaire ID cannot exceed 50 characters'],
    match: [/^[A-Z0-9_-]+$/, 'Questionnaire ID can only contain uppercase letters, numbers, hyphens, and underscores']
  },
  
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  version: {
    type: String,
    required: [true, 'Version is required'],
    default: '1.0',
    maxlength: [20, 'Version cannot exceed 20 characters']
  },
  
  // Instructions for participants
  instructions: {
    type: String,
    required: [true, 'Instructions are required'],
    maxlength: [2000, 'Instructions cannot exceed 2000 characters']
  },
  
  // Questions (data-driven)
  questions: {
    type: [questionSchema],
    required: [true, 'At least one question is required'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Questionnaire must have at least one question'
    }
  },
  
  // Scoring configuration
  scoringConfiguration: {
    method: {
      type: String,
      required: [true, 'Scoring method is required'],
      maxlength: [50, 'Scoring method cannot exceed 50 characters']
    },
    
    description: {
      type: String,
      maxlength: [1000, 'Scoring description cannot exceed 1000 characters']
    },
    
    minScore: {
      type: Number
    },
    
    maxScore: {
      type: Number
    },
    
    interpretation: {
      type: String,
      maxlength: [1000, 'Interpretation cannot exceed 1000 characters']
    }
  },
  
  // Subscales
  subscales: [subscaleSchema],
  
  // Display configuration
  displayOrder: {
    type: Number,
    required: [true, 'Display order is required'],
    min: [1, 'Display order must be at least 1'],
    default: 1
  },
  
  // Status
  active: {
    type: Boolean,
    default: true,
    required: true
  },
  
  // Citation and attribution
  citation: {
    type: String,
    maxlength: [500, 'Citation cannot exceed 500 characters']
  },
  
  author: {
    type: String,
    maxlength: [200, 'Author cannot exceed 200 characters']
  },
  
  publicationYear: {
    type: Number,
    min: [1900, 'Invalid publication year'],
    max: [new Date().getFullYear(), 'Publication year cannot be in the future']
  }
}, {
  timestamps: true
});

// Indexes
questionnaireSchema.index({ questionnaireId: 1 }, { unique: true });
questionnaireSchema.index({ active: 1, displayOrder: 1 });

// Statics
questionnaireSchema.statics.getActiveQuestionnaires = function() {
  return this.find({ active: true }).sort({ displayOrder: 1 });
};

questionnaireSchema.statics.findByIdAndVersion = function(questionnaireId, version) {
  return this.findOne({ questionnaireId, version });
};

// Methods
questionnaireSchema.methods.deactivate = function() {
  this.active = false;
  return this.save();
};

questionnaireSchema.methods.getQuestionCount = function() {
  return this.questions.length;
};

module.exports = mongoose.model('Questionnaire', questionnaireSchema);
