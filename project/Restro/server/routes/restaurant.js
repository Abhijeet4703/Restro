const router = require('express').Router();
const ctrl = require('../controllers/restaurantController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

// Public
router.get('/slug/:slug', ctrl.getBySlug);
router.get('/:id/public', ctrl.getPublicById);
// Public QR scan — no auth (customer facing)
router.get('/slug/:slug/table/:tableNumber/scan', ctrl.scanTableQr);

// Admin - Staff management
router.get('/staff', auth, roleGuard('admin'), tenantScope, ctrl.getStaff);
router.put('/staff/:id', auth, roleGuard('admin'), tenantScope, ctrl.updateStaff);
router.delete('/staff/:id', auth, roleGuard('admin'), tenantScope, ctrl.deleteStaff);

// Admin - Settings
router.get('/settings', auth, roleGuard('admin'), tenantScope, ctrl.getSettings);
router.put('/settings', auth, roleGuard('admin'), tenantScope, ctrl.updateSettings);

// Admin
router.put('/update', auth, roleGuard('admin'), tenantScope, ctrl.updateRestaurant);
router.get('/tables', auth, roleGuard('admin', 'waiter'), tenantScope, ctrl.getTables);
router.put('/tables/:tableId', auth, roleGuard('admin', 'waiter'), tenantScope, ctrl.updateTable);
router.put('/tables-positions', auth, roleGuard('admin'), tenantScope, ctrl.updateTablePositions);
router.get('/stats', auth, roleGuard('admin'), tenantScope, ctrl.getStats);

module.exports = router;
