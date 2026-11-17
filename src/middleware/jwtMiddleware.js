//////////////////////////////////////////////////////
// REQUIRE DOTENV MODULE
//////////////////////////////////////////////////////
require('dotenv').config();
//////////////////////////////////////////////////////
// REQUIRE JWT MODULE
//////////////////////////////////////////////////////
const jwt = require('jsonwebtoken');
//////////////////////////////////////////////////////
// SET JWT CONFIGURATION
//////////////////////////////////////////////////////
const secretKey = process.env.JWT_SECRET_KEY;
const secretRefreshKey = process.env.JWT_SECRET_REFRESH_KEY;
const tokenDuration = process.env.JWT_EXPIRES_IN;
// const refreshTokenDuration = process.env.JWT_REFRESH_EXPIRES_IN;
const tokenAlgorithm = process.env.JWT_ALGORITHM;
//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR GENERATING JWT TOKEN
//////////////////////////////////////////////////////
module.exports.generateToken = (req, res, next) => {
  const payload = {
    userId: res.locals.userId,
    timestamp: new Date(),
  };

  const options = {
    algorithm: tokenAlgorithm,
    expiresIn: tokenDuration,
  };

  const callback = (err, token) => {
    if (err) {
      console.error('Error jwt:', err);
      return res.status(500).json(err);
    }

    res.locals.token = token;
    next();
  };

  // eslint-disable-next-line no-unused-vars
  const token = jwt.sign(payload, secretKey, options, callback);
};

//function to generate refresh token
module.exports.generateRefreshToken = (req, res, next) => {
  const payload = {
    userId: res.locals.userId,
    timestamp: new Date(),
  };

  // boolean Check if user selected "Remember Me"
  const rememberMe = req.body?.rememberMe;

  // 30 days in milliseconds
  const thirtyDays = 2592000000;

  // Default refresh token duration
  const expiryDuration = rememberMe ? thirtyDays : 86400000; // 1 day if not checked

  const data = {
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + expiryDuration),
  };

  const options = {
    algorithm: tokenAlgorithm,
    expiresIn: rememberMe ? '30d' : '1d',
  };

  const callback = (err, refreshToken) => {
    if (err) {
      console.error('Error jwt:', err);
      return res.status(500).json(err);
    }

    res.locals.data = data;
    res.locals.refreshToken = refreshToken;

    next();
  };

  jwt.sign(payload, secretRefreshKey, options, callback);
}; /////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR SENDING JWT TOKEN
//////////////////////////////////////////////////////
module.exports.sendToken = (req, res, next) => {
  res.status(200).json({
    message: res.locals.message,
    token: res.locals.token,
  });
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR VERIFYING JWT TOKEN
//////////////////////////////////////////////////////
module.exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const callback = (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }

      return res.status(401).json({ error: 'Invalid token' });
    }

    res.locals.userId = decoded.userId;
    res.locals.tokenTimestamp = decoded.timestamp;

    next();
  };

  jwt.verify(token, secretKey, callback);
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR VERIFYING EXPIRED JWT TOKEN
//////////////////////////////////////////////////////
module.exports.verifyExpiredToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, secretKey, (err) => {
    if (!err) {
      return res.status(204).json({});
    }

    if (err.name === 'TokenExpiredError') {
      next();
    }
  });
};

// function to verify refresh token
module.exports.verifyRefreshToken = (req, res, next) => {
  const token = req.signedCookies.refreshToken;

  jwt.verify(token, secretRefreshKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    res.locals.userId = decoded.userId;
    res.locals.refreshToken = token;
    next();
  });
};
