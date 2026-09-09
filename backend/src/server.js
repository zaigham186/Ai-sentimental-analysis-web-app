const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { helmetMiddleware, limiter } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const routes = require('./routes');

/**
 * Express Application Setup
 * Research Platform API Server
 */

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmetMiddleware);

// CORS configuration - Allow both 3000 and 3001 for testing
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: config.maxRequestBodySize }));
app.use(express.urlencoded({ extended: true, limit: config.maxRequestBodySize }));

// Cookie parsing (for session management)
app.use(cookieParser());

// Request logging
app.use(logger);

// Rate limiting
app.use('/api', limiter);

// API Routes
app.use('/api', routes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    const server = app.listen(config.port, () => {
      console.log('');
      console.log('='.repeat(50));
      console.log('  Cyberbullying Research Platform - Backend API');
      console.log('='.repeat(50));
      console.log(`✓ Server running on port ${config.port}`);
      console.log(`✓ Environment: ${config.nodeEnv}`);
      console.log(`✓ Frontend URL: ${config.frontendUrl}`);
      console.log(`✓ Health check: http://localhost:${config.port}/api/health`);
      console.log('='.repeat(50));
      console.log('');
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('✓ HTTP server closed');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('✗ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the application
startServer();

module.exports = app;
