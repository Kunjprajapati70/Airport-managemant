const router = require('express').Router();
const ctrl = require('../controllers/infrastructureController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const admins = [ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN];

// Terminals
router.get('/terminals', ctrl.getTerminals);
router.post('/terminals', protect, authorize(...admins), ctrl.createTerminal);
router.put('/terminals/:id', protect, authorize(...admins), ctrl.updateTerminal);
router.delete('/terminals/:id', protect, authorize(...admins), ctrl.deleteTerminal);

// Gates
router.get('/gates', ctrl.getGates);
router.post('/gates', protect, authorize(...admins), ctrl.createGate);
router.put('/gates/:id', protect, authorize(...admins), ctrl.updateGate);
router.delete('/gates/:id', protect, authorize(...admins), ctrl.deleteGate);

// Runways
router.get('/runways', ctrl.getRunways);
router.post('/runways', protect, authorize(...admins), ctrl.createRunway);
router.put('/runways/:id', protect, authorize(...admins), ctrl.updateRunway);
router.delete('/runways/:id', protect, authorize(...admins), ctrl.deleteRunway);

// Parking Bays
router.get('/parking-bays', ctrl.getParkingBays);
router.post('/parking-bays', protect, authorize(...admins), ctrl.createParkingBay);
router.put('/parking-bays/:id', protect, authorize(...admins), ctrl.updateParkingBay);
router.delete('/parking-bays/:id', protect, authorize(...admins), ctrl.deleteParkingBay);

module.exports = router;
