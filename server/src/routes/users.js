const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const admins = [ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN];

router.use(protect);
router.get('/',    authorize(...admins), ctrl.getAllUsers);
router.get('/:id', authorize(...admins), ctrl.getUserById);
router.post('/',   authorize(ROLES.SUPER_ADMIN), ctrl.createUser);
router.put('/:id', authorize(...admins), ctrl.updateUser);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), ctrl.deleteUser);

module.exports = router;
