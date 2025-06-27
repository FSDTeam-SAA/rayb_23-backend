const notFound = () => (req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Api not found",
    errorMessage: {
      path: req.originalUrl,
      message: `Api ${req.originalUrl} not found`,
    },
  });
  next();
};

module.exports = notFound;
