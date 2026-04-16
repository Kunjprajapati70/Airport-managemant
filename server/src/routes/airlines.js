const router = require('express').Router();
const ctrl = require('../controllers/airlineController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/',   protect, authorize(ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN), ctrl.create);
router.put('/:id', protect, authorize(ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN, ROLES.AIRLINE_MANAGER), ctrl.update);
router.delete('/:id', protect, authorize(ROLES.SUPER_ADMIN), ctrl.remove);

module.exports = router;
