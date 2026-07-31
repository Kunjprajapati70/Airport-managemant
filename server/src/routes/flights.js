/**
 * flights.js (routes)
 *
 * Public:
 *   GET  /api/flights/search       - passenger flight search
 *   GET  /api/flights/live         - live departure board
 *   GET  /api/flights              - list all flights
 *   GET  /api/flights/:id          - single flight
 *
 * Protected (admin / airline manager):
 *   GET  /api/flights/conflicts    - pre-submit conflict check
 *   POST /api/flights              - create
 *   PUT  /api/flights/:id          - update details
 *   PATCH /api/flights/:id/status  - update status
 *   PATCH /api/flights/:id/gate    - reassign gate
 *   DELETE /api/flights/:id        - soft delete
 *   GET  /api/flights/:id/bookings - bookings for a flight
 */

const router   = require('express').Router();
const ctrl     = require('../controllers/flightController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createFlightRules,
  updateFlightRules,
  updateStatusRules,
  searchFlightRules,
} = require('../validators/flightValidators');
const { ROLES } = require('../config/constants');

const MANAGERS = [ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN, ROLES.AIRLINE_MANAGER];
const ADMINS   = [ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN];

// ── Public / named routes MUST come before /:id ───────────────────────────────
router.get('/search',    searchFlightRules, validate, ctrl.search);
router.get('/live',      ctrl.getLiveStatus);
router.get('/conflicts', protect, authorize(...MANAGERS), ctrl.checkConflicts);
router.get('/',          ctrl.getAll);

// ── Parameterised routes ──────────────────────────────────────────────────────
router.get('/:id',       ctrl.getById);

// ── Protected ─────────────────────────────────────────────────────────────────
router.post('/',
  protect, authorize(...MANAGERS),
  createFlightRules, validate,
  ctrl.create
);

router.put('/:id',
  protect, authorize(...MANAGERS),
  updateFlightRules, validate,
  ctrl.update
);

router.patch('/:id/status',
  protect, authorize(...MANAGERS, ROLES.CHECKIN_STAFF),
  updateStatusRules, validate,
  ctrl.updateStatus
);

router.patch('/:id/gate',
  protect, authorize(...MANAGERS),
  ctrl.reassignGate
);

router.delete('/:id',
  protect, authorize(...ADMINS),
  ctrl.remove
);

router.get('/:id/bookings',
  protect, authorize(...MANAGERS, ROLES.CHECKIN_STAFF),
  ctrl.getFlightBookings
);

module.exports = router;
