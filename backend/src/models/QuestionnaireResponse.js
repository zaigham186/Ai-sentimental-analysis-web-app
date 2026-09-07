const mongoose = require('mongoose');

/**
 * QuestionnaireResponse Model
 * Stores participant responses to questionnaires
 * Raw answers preserved separately from calculated scores
 */

const answerSchema = new mongoose.Schema({
  itemNumber: {
    type: Number,
    required: [true, 'Item number is required'],
    min: [1, 'Item number must be at least 1']
  },
  
  // Raw answer value - MUST remain unchanged
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Answer value is required']
  },
  
  responseTime: {
    type: Number, // Time for this item in milliseconds
    min: [0, 'Response time cannot be negative']
  }
}, { _id: false });

const subscaleScoreSchema = new mongoose.Schema({
  subscale: {
    type: String,
    required: [true, 'Subscale name is required'],
    maxlength: [100, 'Subscale name cannot exceed 100 characters']
  },
  
  score: {
    type: Number,
    required: [true, 'Score is required']
  },
  
  interpretation: {
    type: String,
    maxlength: [200, 'Interpretation cannot exceed 200 characters']
  }
}, { _id: false });

const questionnaireResponseSchema = new mongoose.Schema({
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: [true, 'Participant reference is required']
  },
  
  questionnaireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Questionnaire',
    required: [true, 'Questionnaire reference is required']
  },
  
  // Version tracking - critical for research validity
  questionnaireVersion: {
    type: String,
    required: [true, 'Questionnaire version is required'],
    maxlength: [20, 'Version cannot exceed 20 characters']
  },
  
  // Raw answers - preserved as submitted
  answers: {
    type: [answerSchema],
    required: [true, 'At least one answer is required'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Response must have at least one answer'
    }
  },
  
  // Calculated scores - separate from raw data
  calculatedScore: {
    totalScore: {
      type: Number,
      default: null
    },
    
    subscaleScores: [subscaleScoreSchema],
    
    calculatedAt: {
      type: Date,
      default: null
    },
    
    calculatedBy: {
      type: String,
      enum: ['automatic', 'manual', 'system'],
      default: 'automatic'
    }
  },
  
  // Completion tracking
  startedAt: {
    type: Date,
    required: [true, 'Start time is required']
  },
  
  completedAt: {
    type: Date,
    required: [true, 'Completion time is required'],
    default: Date.now
  },
  
  totalTime: {
    type: Number, // Total time in seconds
    required: true,
    min: [0, 'Total time cannot be negative']
  },
  
  // Completion status
  isComplete: {
    type: Boolean,
    default: true,
    required: true
  }
}, {
  timestamps: true
});

// Compound index to track participant responses
questionnaireResponseSchema.index({ participantId: 1, questionnaireId: 1 });
// Note: questionnaireId is already indexed as part of the compound index above, no need for separate index
questionnaireResponseSchema.index({ completedAt: -1 });
questionnaireResponseSchema.index({ questionnaireVersion: 1 });

// Pre-save hook to calculate total time if not provided
questionnaireResponseSchema.pre('save', function(next) {
  if (this.isNew && !this.totalTime && this.startedAt && this.completedAt) {
    this.totalTime = Math.round((this.completedAt - this.startedAt) / 1000);
  }
  next();
});

// Methods
questionnaireResponseSchema.methods.calculateScore = function(scoringFunction) {
  // Scoring function provided by research protocol
  const result = scoringFunction(this.answers);
  this.calculatedScore.totalScore = result.totalScore;
  this.calculatedScore.subscaleScores = result.subscaleScores || [];
  this.calculatedScore.calculatedAt = new Date();
  this.calculatedScore.calculatedBy = 'automatic';
  return this.save();
};

questionnaireResponseSchema.methods.getAnswerByItem = function(itemNumber) {
  return this.answers.find(a => a.itemNumber === itemNumber);
};

// Statics
questionnaireResponseSchema.statics.findByParticipant = function(participantId) {
  return this.find({ participantId })
    .populate('questionnaireId', 'title questionnaireId version')
    .sort({ completedAt: -1 });
};

questionnaireResponseSchema.statics.findByQuestionnaire = function(questionnaireId) {
  return this.find({ questionnaireId })
    .populate('participantId', 'username condition')
    .sort({ completedAt: -1 });
};

questionnaireResponseSchema.statics.countByQuestionnaire = function(questionnaireId) {
  return this.countDocuments({ questionnaireId });
};

questionnaireResponseSchema.statics.getCompletionRate = async function(questionnaireId) {
  const Participant = mongoose.model('Participant');
  const totalParticipants = await Participant.countDocuments({ status: { $ne: 'withdrawn' } });
  const completedResponses = await this.countDocuments({ questionnaireId });
  return totalParticipants > 0 ? (completedResponses / totalParticipants) * 100 : 0;
};

module.exports = mongoose.model('QuestionnaireResponse', questionnaireResponseSchema);
