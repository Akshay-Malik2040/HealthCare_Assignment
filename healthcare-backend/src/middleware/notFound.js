/**
 * 404 Not Found Middleware
 * Returns consistent JSON response for unmatched routes.
 */
module.exports = function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      details: null,
    },
  });
};
