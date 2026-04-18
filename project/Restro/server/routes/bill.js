const router = require('express').Router();
const ctrl = require('../controllers/billController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

// All bill routes require admin auth
router.use(auth, roleGuard('admin', 'waiter'), tenantScope);

router.post('/', ctrl.createBill);
router.get('/', ctrl.getBills);
router.get('/z-report', ctrl.getZReport);
router.get('/analytics', ctrl.getAnalytics);
router.get('/customer', ctrl.lookupCustomer);
router.get('/:billId', ctrl.getBillById);
router.get('/:billId/pdf', ctrl.downloadInvoicePDF);
router.put('/:billId', ctrl.editBill);
router.post('/:billId/hold', ctrl.holdBill);
router.post('/:billId/resume', ctrl.resumeBill);
router.post('/:billId/settle', ctrl.settleBill);
router.post('/:billId/void', ctrl.voidBill);
router.post('/:billId/split', ctrl.splitBill);
router.post('/:billId/share', ctrl.markShared);
router.post('/:billId/feedback', ctrl.submitFeedback);

module.exports = router;
