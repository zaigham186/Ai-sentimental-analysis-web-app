const mongoose = require('mongoose');

/**
 * Database connection configuration
 * Handles MongoDB connection with retry logic and graceful shutdown
 */

let isConnected = false;

const connectDatabase = async () => {
  if (isConnected) {
    console.log('✓ Using existing database connection');
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research';
    
    // Connection options
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoUri, options);
    
    isConnected = true;
    console.log('✓ MongoDB connected successfully');
    console.log(`  Database: ${mongoose.connection.name}`);
    console.log(`  Host: ${mongoose.connection.host}`);

  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message);
    
    // Retry connection after delay in development
    if (process.env.NODE_ENV === 'development') {
      console.log('  Retrying connection in 5 seconds...');
      setTimeout(connectDatabase, 5000);
    } else {
      // In production, exit and let the process manager restart
      process.exit(1);
    }
  }
};

// Connection event handlers
mongoose.connection.on('disconnected', () => {
  console.log('⚠ MongoDB disconnected');
  isConnected = false;
});

mongoose.connection.on('error', (error) => {
  console.error('✗ MongoDB error:', error.message);
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  console.log('✓ MongoDB reconnected');
  isConnected = true;
});

// Graceful shutdown
const disconnectDatabase = async () => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('✓ MongoDB connection closed gracefully');
  } catch (error) {
    console.error('✗ Error closing MongoDB connection:', error.message);
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase
};
