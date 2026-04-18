const router = require('express').Router();
const ctrl = require('../controllers/inventoryController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

router.get('/', auth, roleGuard('admin'), tenantScope, ctrl.getInventory);
router.post('/', auth, roleGuard('admin'), tenantScope, ctrl.addItem);
router.put('/:id', auth, roleGuard('admin'), tenantScope, ctrl.updateItem);
router.delete('/:id', auth, roleGuard('admin'), tenantScope, ctrl.deleteItem);
router.get('/low-stock', auth, roleGuard('admin'), tenantScope, ctrl.getLowStock);

module.exports = router;
