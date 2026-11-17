const model = require('../models/authModel.js');

//function to check if either username or email already exists in the db.
module.exports.checkUsernameOrEmailExist = (req, res, next) => {
  if (
    req.body.username === undefined ||
    req.body.email === undefined ||
    req.body.password === undefined
  ) {
    return res.status(400).json({
      message: "Error: username, email or password doesn't exist",
    });
  }

  const data = {
    username: req.body.username,
    email: req.body.email,
  };

  const callback = (error, results, fields) => {
    if (error) {
      console.error('Error checkUsernameOrEmailExist:', error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 1) {
      return res.status(409).json({
        message: 'Username or email already exists',
      });
    }

    next();
  };

  model.checkUsernameOrEmailExist(data, callback);
};

// function to create new user
module.exports.createNewUser = (req, res, next) => {
  // Get username from req.locals if it exists else get it from the request body
  const data = {
    username: req.body.username,
    email: req.body.email,
    password: res.locals.hash,
  };
  const callback = (error, results, fields) => {
    if (error) {
      console.error('Error CreateNewUser: ', error);
      return res.status(500).json(error);
    }

    // Get userid from newly created row and set it in res.locals
    res.locals.userId = results.rows[0].user_id;

    next();
  };

  model.createNewUser(data, callback);
};

// function to login
module.exports.login = (req, res, next) => {
  if (req.body.username === undefined || req.body.password === undefined) {
    return res.status(400).json({
      message: "Error: username or password doesn't exist",
    });
  }

  const data = {
    username: req.body.username,
  };

  const callback = (error, results, fields) => {
    if (error) {
      console.log('Error login: ', error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.locals.hash = results.rows[0].password;
    res.locals.userId = results.rows[0].user_id;
    next();
  };

  model.checkExistingUsernames(data, callback);
};

//function to save refresh token to cookies and save a copy to db too
module.exports.issueRefreshToken = (req, res, next) => {
  const data = {
    ...res.locals.data,
    userId: res.locals.userId,
    refreshToken: res.locals.refreshToken,
  };

  const callback = (error, results, fields) => {
    if (error) {
      console.log('Error issuseRefreshToken: ', error);
      return res.status(500).json(error);
    }

    const refreshToken = results.rows[0].token;
    res.cookie('refreshToken', refreshToken, {
      httpOnly: false,
      secure: true, // HTTPS only
      sameSite: 'strict', // or "none" for cross-site setups
      signed: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    next();
  };

  model.saveRefreshToken(data, callback);
};

//function to compare refresh token in db with one in cookies
// and also check if refresh token is expired or not
module.exports.checkRefreshToken = (req, res, next) => {
  const data = {
    refreshToken: req.signedCookies.refreshToken,
  };

  if (!data.refreshToken) {
    return res.status(401).json({
      error: 'No refresh token provided',
    });
  }

  const callback = (error, results, fields) => {
    if (error) {
      console.log('Error CheckRefreshToken: ', error);
      return res.status(500).json(error);
    }

    if (results.rows.length === 0) {
      return res.status(401).json({
        error: 'Refresh token not found',
      });
    }

    const refreshTokenData = results.rows[0];

    if (new Date() > new Date(refreshTokenData.expires_at)) {
      return res.status(401).json({
        error: 'Refresh token expired',
      });
    }

    res.locals.userId = refreshTokenData.user_id;
    res.locals.refreshToken = data.refreshToken;

    next();
  };

  model.checkRefreshToken(data, callback);
};

module.exports.VerifyCaptcha = (req, res, next) => {
  return req.body.captchaInput === req.body.captchaAnswer
    ? next()
    : res.status(400).json('Incorrect captcha. Please try again.');
};
