const mongoose = require('mongoose');

/**
 * AuditLog Model
 * Tracks all significant system actions for security and compliance
 */

const auditLogSchema = new mongoose.Schema({
  // Action information
  action: {
    type: String,
    required: [true, 'Action is required'],
    maxlength: [100, 'Action cannot exceed 100 characters'],
    index: true
  },
  
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: [
        'auth',           // Login, logout, password changes
        'participant',    // Participant registration, withdrawal
        'assignment',     // Condition assignment
        'experiment',     // Experiment actions (ADDED)
        'video',          // Video management
        'questionnaire',  // Questionnaire management
        'response',       // Response submissions
        'coding',         // Response coding
        'admin',          // Admin management
        'data',           // Data export, deletion
        'system',         // System configuration changes
        'security'        // Security-related events
      ],
      message: '{VALUE} is not a valid category'
    },
    index: true
  },
  
  // Actor (who performed the action)
  actorType: {
    type: String,
    required: [true, 'Actor type is required'],
    enum: {
      values: ['admin', 'participant', 'system'],
      message: '{VALUE} is not a valid actor type'
    }
  },
  
  actorId: {
    type: String,
    required: [true, 'Actor ID is required'],
    maxlength: [100, 'Actor ID cannot exceed 100 characters'],
    index: true
  },
  
  actorUsername: {
    type: String,
    maxlength: [100, 'Actor username cannot exceed 100 characters']
  },
  
  // Target (what was affected)
  targetType: {
    type: String,
    maxlength: [50, 'Target type cannot exceed 50 characters']
  },
  
  targetId: {
    type: String,
    maxlength: [100, 'Target ID cannot exceed 100 characters']
  },
  
  // Details (action-specific data)
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Request metadata
  ipAddress: {
    type: String,
    maxlength: [45, 'IP address cannot exceed 45 characters'] // IPv6 max length
  },
  
  userAgent: {
    type: String,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  },
  
  // Result
  success: {
    type: Boolean,
    required: true,
    default: true
  },
  
  errorMessage: {
    type: String,
    maxlength: [500, 'Error message cannot exceed 500 characters']
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Additional metadata
  metadata: {
    duration: {
      type: Number, // Action duration in milliseconds
      min: [0, 'Duration cannot be negative']
    },
    
    changes: {
      type: mongoose.Schema.Types.Mixed // Before/after for updates
    },
    
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'info'
    }
  }
}, {
  timestamps: false // We use timestamp field instead
});

// Indexes
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, timestamp: -1 });
auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ success: 1 });
auditLogSchema.index({ 'metadata.severity': 1, timestamp: -1 });

// Statics
auditLogSchema.statics.logAction = function(data) {
  return this.create({
    action: data.action,
    category: data.category,
    actorType: data.actorType,
    actorId: data.actorId,
    actorUsername: data.actorUsername,
    targetType: data.targetType,
    targetId: data.targetId,
    details: data.details || {},
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: data.success !== undefined ? data.success : true,
    errorMessage: data.errorMessage,
    metadata: data.metadata || {}
  });
};

auditLogSchema.statics.findByActor = function(actorId, limit = 100) {
  return this.find({ actorId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.findByCategory = function(category, limit = 100) {
  return this.find({ category })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.findByAction = function(action, limit = 100) {
  return this.find({ action })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

auditLogSchema.statics.findFailedActions = function(limit = 100) {
  return this.find({ success: false })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.findSecurityEvents = function(limit = 100) {
  return this.find({ category: 'security' })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.getStatsByCategory = function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.timestamp = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    { $group: {
      _id: '$category',
      count: { $sum: 1 },
      successCount: { $sum: { $cond: ['$success', 1, 0] } },
      failureCount: { $sum: { $cond: ['$success', 0, 1] } }
    }},
    { $sort: { count: -1 } }
  ]);
};

// Helper function to sanitize sensitive data before logging
auditLogSchema.statics.sanitizeDetails = function(details) {
  const sanitized = { ...details };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
