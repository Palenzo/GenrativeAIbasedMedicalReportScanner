const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });

  // If the error is a known type, we can handle it gracefully
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'AI response validation failed.',
      details: err.errors,
    });
  }

  // For file cleanup in multer errors
  if (req.file) {
    const fs = require('fs').promises;
    fs.unlink(req.file.path).catch(unlinkErr => logger.error('Failed to clean up file on error.', unlinkErr));
  }

  res.status(500).json({ error: 'An internal server error occurred.' });
};

module.exports = errorHandler;
