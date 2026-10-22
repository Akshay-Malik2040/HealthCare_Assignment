const express = require('express');
const authController = require('./auth.controller');
const { registerSchema, loginSchema, validateBody } = require('./auth.validation');
const authenticate = require('../../middleware/authenticate');

const router = express.Router();

/**
 * Registration API
 * POST /api/auth/register and POST /api/auth/register/
 */
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/register/', validateBody(registerSchema), authController.register);

/**
 * Login API
 * POST /api/auth/login and POST /api/auth/login/
 */
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/login/', validateBody(loginSchema), authController.login);

/**
 * Token verification endpoint (demonstrates authenticate middleware usage)
 * GET /api/auth/me
 */
router.get('/me', authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

module.exports = router;
