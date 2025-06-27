const handleCastError = (error) => {
  const errorSource = [
    {
      path: error?.path,
      message: error?.message,
    },
  ];

  const statusCode = 400;

  return {
    statusCode,
    message: "Invalid Id",
    errorSource,
  };
};

module.exports = handleCastError;
