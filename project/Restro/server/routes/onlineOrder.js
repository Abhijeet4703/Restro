const router = require('express').Router();
const ctrl = require('../controllers/onlineOrderController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

// All routes need admin/waiter auth
router.use(auth, roleGuard('admin', 'waiter'), tenantScope);

router.post('/receive', ctrl.receiveOnlineOrder);
router.get('/', ctrl.getOnlineOrders);
router.put('/:orderId/status', ctrl.updateOnlineOrderStatus);
router.get('/config', ctrl.getAggregatorConfig);
router.put('/config', ctrl.updateAggregatorConfig);

module.exports = router;
