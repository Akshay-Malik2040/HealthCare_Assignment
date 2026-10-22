const authService = require('./auth.service');

/**
 * Handle user registration request.
 * POST /api/auth/register/
 */
async function register(req, res, next) {
  try {
    const user = await authService.registerUser(req.body);

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handle user login request.
 * POST /api/auth/login/
 */
async function login(req, res, next) {
  try {
    const authData = await authService.loginUser(req.body);

    return res.status(200).json({
      success: true,
      data: authData,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
};
