const handleValidationError = (error) => {
  const errorSource = Object.values(error.errors).map((val) => {
    return {
      path: val?.path,
      message: val?.message,
    };
  });

  const statusCode = 400;

  return {
    statusCode,
    message: errorSource[0]?.message || "Validation Error",
    errorSource,
  };
};

module.exports = handleValidationError;
