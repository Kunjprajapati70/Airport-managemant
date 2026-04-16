/**
 * validate.js
 * Reads the result of express-validator rule chains and returns a
 * structured 400 response if any field failed validation.
 *
 * Usage in routes:
 *   router.post('/register', registerRules, validate, authController.register);
 *
 * Error response shape:
 *   {
 *     success: false,
 *     message: "Validation failed",
 *     errors: [{ field: "email", message: "Must be a valid email" }]
 *   }
 */

const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const errors = result.array().map((e) => ({
      field:   e.path,   // field name
      message: e.msg,    // human-readable message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please check the highlighted fields.',
      errors,
    });
  }

  next();
};

module.exports = validate;
