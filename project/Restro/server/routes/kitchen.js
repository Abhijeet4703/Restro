const router = require('express').Router();
const ctrl = require('../controllers/kitchenController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

router.get('/orders', auth, roleGuard('kitchen', 'admin'), tenantScope, ctrl.getKitchenOrders);
router.post('/:orderId/start', auth, roleGuard('kitchen', 'admin'), tenantScope, ctrl.startCooking);
router.post('/:orderId/stage', auth, roleGuard('kitchen', 'admin'), tenantScope, ctrl.updateStage);
router.post('/:orderId/served', auth, roleGuard('kitchen', 'admin', 'waiter'), tenantScope, ctrl.markServed);

module.exports = router;
