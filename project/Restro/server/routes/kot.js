const router = require('express').Router();
const ctrl = require('../controllers/kotController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

router.use(auth, roleGuard('admin', 'waiter', 'kitchen'), tenantScope);

router.get('/order/:orderId', ctrl.generateKOT);
router.get('/bill/:billId', ctrl.generatePrintBill);

module.exports = router;
