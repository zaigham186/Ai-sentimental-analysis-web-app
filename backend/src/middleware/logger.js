const config = require('../config');

/**
 * Simple request logging middleware
 */

const logger = (req, res, next) => {
  const start = Date.now();

  // Log after response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLine = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    
    if (config.nodeEnv === 'development') {
      console.log(logLine);
    }
  });

  next();
};

module.exports = logger;
