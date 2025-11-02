const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error to console for development
  if (process.env.NODE_ENV === "development") {
    console.error("Error Details:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value: ${field}. Please use another value`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = { message, statusCode: 400 };
  }

  // JWT authentication error
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token. Please log in again";
    error = { message, statusCode: 401 };
  }

  // JWT expired error
  if (err.name === "TokenExpiredError") {
    const message = "Your token has expired. Please log in again";
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
