const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

// Customer
router.post('/create-order', ctrl.createPaymentOrder);
router.post('/verify', ctrl.verifyPayment);

// Admin
router.post('/refund', auth, roleGuard('admin'), tenantScope, ctrl.processRefund);
router.post('/:orderId/cash', auth, roleGuard('admin', 'waiter'), tenantScope, ctrl.markCashPayment);

module.exports = router;
