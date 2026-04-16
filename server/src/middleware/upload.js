/**
 * upload.js
 * Multer configuration for handling file uploads.
 *
 * Supported upload types:
 *   - avatar   → uploads/avatars/   (images only, 2 MB max)
 *   - document → uploads/documents/ (images + PDF, 5 MB max)
 *
 * Usage in routes:
 *   router.put('/profile', protect, upload.single('avatar'), ctrl.updateProfile);
 */

const multer = require('multer');
const path   = require('path');
const AppError = require('../utils/AppError');

// ── Storage engine ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.fieldname === 'avatar'
      ? 'uploads/avatars'
      : 'uploads/documents';
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Unique filename: fieldname-timestamp-random.ext
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

// ── File type filter ──────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('File type not allowed. Accepted: images, PDF, DOC, DOCX.', 400), false);
  }
};

// ── Export configured multer instance ─────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB hard limit
  },
});

module.exports = upload;
