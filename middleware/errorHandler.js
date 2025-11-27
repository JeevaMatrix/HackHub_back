// middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log the error details

  // Check for different types of error status
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token has expired' });
  }

  // Default to internal server error if no specific handler is found
  res.status(500).json({ message: 'Something went wrong, please try again later' });
};

module.exports = errorHandler;
