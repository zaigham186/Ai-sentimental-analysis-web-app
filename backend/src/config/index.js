require('dotenv').config();

/**
 * Centralized configuration
 * All environment variables and configuration values
 */

const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research',
  
  // Session
  sessionSecret: process.env.SESSION_SECRET || 'development-secret-change-in-production',
  
  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Rate Limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 1000, // max requests per window (increased for development)
  
  // Validation
  maxRequestBodySize: '10mb',
  
  // Feature flags (for future phases)
  features: {
    participantRegistration: false,
    experimentEngine: false,
    questionnaires: false,
    adminDashboard: false
  }
};

// Validate required environment variables in production
if (config.nodeEnv === 'production') {
  const required = ['MONGODB_URI', 'SESSION_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('✗ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
  
  if (process.env.SESSION_SECRET.length < 32) {
    console.error('✗ SESSION_SECRET must be at least 32 characters long');
    process.exit(1);
  }
}

module.exports = config;
