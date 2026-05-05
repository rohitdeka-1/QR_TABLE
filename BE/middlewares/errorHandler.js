function errorHandler(err, req, res, next) {
  console.error(err);
  
  // Handle multer file size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File size must be less than 1 MB' });
  }
  
  // Handle multer unexpected field errors
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Unexpected file field. Expected "image" field.' });
  }
  
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
}

export default errorHandler;
