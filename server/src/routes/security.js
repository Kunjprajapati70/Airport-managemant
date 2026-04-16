/**
 * security.js (routes)
 * All routes require authentication.
 */

const router   = require('express').Router();
const ctrl     = require('../controllers/securityController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  updateCheckRules,
  restrictedItemRules,
  incidentRules,
  overrideRules,
} = require('../validators/securityValidators');
const { ROLES } = require('../config/constants');

const SEC_ROLES   = [ROLES.SECURITY_OFFICER, ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN];
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN];

router.use(protect);

// ── Named routes before /:id ──────────────────────────────────────────────────
router.get('/stats',                    authorize(...SEC_ROLES),   ctrl.getStats);
router.get('/flight/:flightId',         authorize(...SEC_ROLES),   ctrl.getFlightSecurityStatus);
router.get('/passenger/:bookingId/:passengerId',
  authorize(...SEC_ROLES, ROLES.CHECKIN_STAFF, ROLES.BOARDING_STAFF),
  ctrl.getPassengerCheck
);

// ── Parameterised routes ──────────────────────────────────────────────────────
router.get('/',    authorize(...SEC_ROLES), ctrl.getAll);
router.get('/:id', authorize(...SEC_ROLES), ctrl.getById);

router.patch('/:id',
  authorize(...SEC_ROLES),
  updateCheckRules, validate,
  ctrl.updateCheck
);

router.post('/:id/restricted-item',
  authorize(...SEC_ROLES),
  restrictedItemRules, validate,
  ctrl.logRestrictedItem
);

router.post('/:id/incident',
  authorize(...SEC_ROLES),
  incidentRules, validate,
  ctrl.logIncident
);

router.post('/:id/override',
  authorize(...ADMIN_ROLES),
  overrideRules, validate,
  ctrl.boardingOverride
);

module.exports = router;
