const jwt = require("jsonwebtoken");

const createToken = (payload, secret, expiresIn) => {
  const options = {
    algorithm: "HS256",
    expiresIn: expiresIn,
  };

  const token = jwt.sign(payload, secret, options);
  return token;
};

const verifyToken = (token, secret) => {
//   console.log("Verifying token:", token); // Log the token

  return jwt.verify(token, secret);
};

module.exports = {
  createToken,
  verifyToken,
};
