const router = require('express').Router();
const {
  registerUser, registerAdmin, login, getMe, createStaff,
  setupRestaurant, saveMenu, saveBranding, selectTemplate, completeOnboarding
} = require('../controllers/authController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// Auth
router.post('/register', registerUser);
router.post('/register-legacy', registerAdmin);
router.post('/login', login);
router.get('/me', auth, getMe);

// Onboarding steps (all require auth)
router.post('/onboarding/restaurant', auth, setupRestaurant);
router.post('/onboarding/menu', auth, saveMenu);
router.post('/onboarding/branding', auth, saveBranding);
router.post('/onboarding/template', auth, selectTemplate);
router.post('/onboarding/complete', auth, completeOnboarding);

// Staff
router.post('/staff', auth, roleGuard('admin'), createStaff);
router.post('/register-staff', auth, roleGuard('admin'), createStaff);

module.exports = router;
