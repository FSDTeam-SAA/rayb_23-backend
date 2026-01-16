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

  return jwt.verify(token, secret);
};

module.exports = {
  createToken,
  verifyToken,
};
