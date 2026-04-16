/**
 * maintenance.js (routes)
 * All routes require authentication.
 */

const router   = require('express').Router();
const ctrl     = require('../controllers/maintenanceController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createLogRules,
  updateLogRules,
  groundAircraftRules,
} = require('../validators/maintenanceValidators');
const { ROLES } = require('../config/constants');

const MAINT_ROLES = [
  ROLES.MAINTENANCE_STAFF, ROLES.SUPER_ADMIN,
  ROLES.AIRPORT_ADMIN, ROLES.AIRLINE_MANAGER,
];
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN];

router.use(protect);

// ── Named routes before /:id ──────────────────────────────────────────────────
router.get('/stats',                authorize(...MAINT_ROLES), ctrl.getStats);
router.get('/due',                  ctrl.getDueAircraft);
router.get('/aircraft/:id',         authorize(...MAINT_ROLES), ctrl.getAircraftHistory);
router.post('/aircraft/:id/ground', authorize(...ADMIN_ROLES), groundAircraftRules, validate, ctrl.groundAircraft);
router.post('/aircraft/:id/unground', authorize(...ADMIN_ROLES), ctrl.ungroundAircraft);

// ── Parameterised routes ──────────────────────────────────────────────────────
router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize(...MAINT_ROLES),
  createLogRules, validate,
  ctrl.create
);

router.put('/:id',
  authorize(...MAINT_ROLES),
  updateLogRules, validate,
  ctrl.update
);

router.patch('/:id/start',
  authorize(...MAINT_ROLES),
  ctrl.startMaintenance
);

router.patch('/:id/complete',
  authorize(...MAINT_ROLES),
  ctrl.completeMaintenance
);

module.exports = router;
