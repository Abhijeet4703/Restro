const router = require('express').Router();
const ctrl = require('../controllers/superadminController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.get('/restaurants', auth, roleGuard('superadmin'), ctrl.getAllRestaurants);
router.post('/restaurants/:id/approve', auth, roleGuard('superadmin'), ctrl.approveRestaurant);
router.post('/restaurants/:id/reject', auth, roleGuard('superadmin'), ctrl.rejectRestaurant);
router.post('/restaurants/:id/suspend', auth, roleGuard('superadmin'), ctrl.suspendRestaurant);
router.get('/stats', auth, roleGuard('superadmin'), ctrl.getPlatformStats);
router.post('/seed', ctrl.createSuperAdmin);

module.exports = router;
