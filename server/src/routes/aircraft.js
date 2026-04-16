const router = require('express').Router();
const ctrl = require('../controllers/aircraftController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const managers = [ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN, ROLES.AIRLINE_MANAGER];

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/seats', ctrl.getSeats);
router.post('/',   protect, authorize(...managers), ctrl.create);
router.put('/:id', protect, authorize(...managers), ctrl.update);
router.delete('/:id', protect, authorize(ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN), ctrl.remove);

module.exports = router;
