const router = require('express').Router();
const ctrl = require('../controllers/menuController');
const analyzerCtrl = require('../controllers/menuAnalyzerController');
const imageCtrl = require('../controllers/imageController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const tenantScope = require('../middleware/tenantScope');

// Public
router.get('/public/:restaurantId', ctrl.getMenuByRestaurant);

// Menu analyzer (authenticated)
router.post('/analyze', auth, analyzerCtrl.analyzeMenuImage);
router.post('/analyze-text', auth, analyzerCtrl.analyzeMenuText);

// AI Dish Image Generation (authenticated admin)
router.post('/generate-image', auth, roleGuard('admin'), tenantScope, imageCtrl.generateImage);
router.post('/generate-images', auth, roleGuard('admin'), tenantScope, imageCtrl.generateImages);
router.get('/image-url/:itemId', auth, roleGuard('admin'), tenantScope, imageCtrl.getImageUrl);
router.post('/generate-image-url', auth, imageCtrl.previewImageUrl);
// No auth — used in onboarding to download real AI images as base64
router.get('/download-preview-image', imageCtrl.downloadPreviewImage);

// Admin
router.get('/', auth, roleGuard('admin'), tenantScope, ctrl.getAllMenuItems);
router.post('/', auth, roleGuard('admin'), tenantScope, ctrl.createMenuItem);
router.put('/:id', auth, roleGuard('admin'), tenantScope, ctrl.updateMenuItem);
router.delete('/:id', auth, roleGuard('admin'), tenantScope, ctrl.deleteMenuItem);
router.patch('/:id/toggle', auth, roleGuard('admin'), tenantScope, ctrl.toggleAvailability);

module.exports = router;
