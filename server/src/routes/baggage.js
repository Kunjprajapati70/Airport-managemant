/**
 * baggage.js (routes)
 * All routes require authentication.
 */

const router   = require('express').Router();
const ctrl     = require('../controllers/baggageController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  updateStatusRules,
  reportLostRules,
  complaintRules,
  markFeePaidRules,
} = require('../validators/baggageValidators');
const { ROLES } = require('../config/constants');

const STAFF = [
  ROLES.BAGGAGE_STAFF, ROLES.CHECKIN_STAFF,
  ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN,
];

router.use(protect);

// ── Named routes (must come before /:id) ──────────────────────────────────────
router.get('/my',              ctrl.getMyBaggage);
router.get('/stats',           authorize(...STAFF), ctrl.getStats);
router.get('/tag/:tag',        ctrl.getByTag);
router.get('/complaints/my',   ctrl.getMyComplaints);
router.get('/complaints',      authorize(...STAFF), ctrl.getAllComplaints);
router.patch('/complaints/:id',authorize(...STAFF), ctrl.updateComplaint);

// ── Parameterised routes ──────────────────────────────────────────────────────
router.get('/',    authorize(...STAFF), ctrl.getAll);
router.get('/:id', ctrl.getById);

router.patch('/:id/status',
  authorize(...STAFF),
  updateStatusRules, validate,
  ctrl.updateStatus
);

router.patch('/:id/fee-paid',
  authorize(...STAFF),
  markFeePaidRules, validate,
  ctrl.markFeePaid
);

router.post('/:id/lost',
  reportLostRules, validate,
  ctrl.reportLost
);

router.post('/:id/found',
  authorize(...STAFF),
  ctrl.markFound
);

router.post('/:id/complaint',
  authorize(ROLES.PASSENGER, ...STAFF),
  complaintRules, validate,
  ctrl.fileComplaint
);

module.exports = router;
