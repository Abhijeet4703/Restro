const router = require('express').Router();
const ctrl = require('../controllers/captainController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

// Captain routes - waiter or admin can use
router.use(auth, roleGuard('admin', 'waiter'), tenantScope);

router.get('/tables', ctrl.getTables);
router.get('/menu', ctrl.getMenu);
router.post('/order', ctrl.placeOrder);
router.get('/table/:tableNumber/orders', ctrl.getTableOrders);

module.exports = router;
