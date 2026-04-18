const router = require('express').Router();
const ctrl = require('../controllers/orderController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

// Customer (no auth)
router.post('/place', ctrl.placeOrder);
router.post('/feedback', ctrl.submitCustomerFeedback);
router.get('/:orderId', ctrl.getOrderById);
router.post('/:orderId/cancel', ctrl.cancelOrder);
router.patch('/:orderId/edit', ctrl.editOrder);
router.get('/session/:restaurantId/:tableNumber', ctrl.getSession);

// Admin
router.get('/', auth, roleGuard('admin', 'waiter'), tenantScope, ctrl.getOrders);
router.post('/:orderId/approve', auth, roleGuard('admin'), tenantScope, ctrl.approveOrder);
router.post('/:orderId/reject', auth, roleGuard('admin'), tenantScope, ctrl.rejectOrder);
router.patch('/:orderId/status', auth, roleGuard('admin', 'waiter'), tenantScope, ctrl.updateOrderStatus);
router.post('/session/:sessionId/complete', auth, roleGuard('admin', 'waiter'), tenantScope, ctrl.completeSession);

module.exports = router;
