const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const QRCode = require('qrcode');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// Step 1: Register user only (name, email, password)
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password, role: 'admin', onboardingStep: 1 });
    const token = generateToken(user._id);
    res.status(201).json({ token, user, onboardingStep: 1 });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
};

// Step 2: Setup restaurant profile
exports.setupRestaurant = async (req, res) => {
  try {
    const { restaurantName, ownerName, address, location, ownerPhone, restaurantPhone, tableCount } = req.body;

    if (!restaurantName || !tableCount) {
      return res.status(400).json({ message: 'Restaurant name and table count are required.' });
    }

    // Check if user already has a restaurant
    if (req.user.restaurantId) {
      // Update existing
      const restaurant = await Restaurant.findByIdAndUpdate(
        req.user.restaurantId,
        {
          name: restaurantName,
          ownerName: ownerName || req.user.name,
          ownerPhone: ownerPhone || '',
          phone: restaurantPhone || '',
          location: location || '',
          address: typeof address === 'object' ? address : { street: address || '' },
          tableCount: parseInt(tableCount) || 10,
        },
        { new: true }
      );
      req.user.onboardingStep = 2;
      await req.user.save();
      return res.json({ restaurant, onboardingStep: 2 });
    }

    const slug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingSlug = await Restaurant.findOne({ slug });
    if (existingSlug) {
      return res.status(400).json({ message: 'Restaurant name already taken. Try a different name.' });
    }

    const restaurant = await Restaurant.create({
      name: restaurantName,
      slug,
      owner: req.user._id,
      ownerName: ownerName || req.user.name,
      ownerPhone: ownerPhone || '',
      phone: restaurantPhone || '',
      email: req.user.email,
      location: location || '',
      address: typeof address === 'object' ? address : { street: address || '' },
      tableCount: parseInt(tableCount) || 10,
    });

    req.user.restaurantId = restaurant._id;
    req.user.onboardingStep = 2;
    await req.user.save();

    res.status(201).json({ restaurant, onboardingStep: 2 });
  } catch (error) {
    res.status(500).json({ message: 'Restaurant setup failed.', error: error.message });
  }
};

// Step 3: Save menu items (from scanner or manual entry)
exports.saveMenu = async (req, res) => {
  try {
    const { items } = req.body; // Array of { name, price, prepTime, category, isVeg, description }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one menu item is required.' });
    }

    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant not set up yet.' });
    }

    // Clear previous menu items from onboarding (if re-doing this step)
    await MenuItem.deleteMany({ restaurantId });

    const menuItems = items.map((item) => ({
      name: item.name,
      description: item.description || '',
      price: parseFloat(item.price) || 0,
      category: item.category || 'main-course',
      prepTime: parseInt(item.prepTime) || 15,
      isVeg: item.isVeg || false,
      image: item.image || null,
      restaurantId,
      isAvailable: true,
    }));

    const created = await MenuItem.insertMany(menuItems);

    req.user.onboardingStep = 3;
    await req.user.save();

    res.json({ items: created, count: created.length, onboardingStep: 3 });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save menu.', error: error.message });
  }
};

// Step 4: Save branding (logo, theme, photos)
exports.saveBranding = async (req, res) => {
  try {
    const { logo, coverImage, photos, theme } = req.body;
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant not set up yet.' });
    }

    const updateData = {};
    if (logo) updateData.logo = logo;
    if (coverImage) updateData.coverImage = coverImage;
    if (photos && Array.isArray(photos)) updateData.photos = photos;
    if (theme) updateData.theme = theme;

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { $set: updateData },
      { new: true }
    );

    req.user.onboardingStep = 4;
    await req.user.save();

    res.json({ restaurant, onboardingStep: 4 });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save branding.', error: error.message });
  }
};

// Step 5: Select template
exports.selectTemplate = async (req, res) => {
  try {
    const { activeTemplate } = req.body;
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant not set up yet.' });
    }

    const validTemplates = ['neon-glow', 'royal-3d', 'minimal-zen', 'vintage-paper', 'insta-reel'];
    const template = validTemplates.includes(activeTemplate) ? activeTemplate : 'royal-3d';

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { $set: { activeTemplate: template } },
      { new: true }
    );

    req.user.onboardingStep = 5;
    await req.user.save();

    res.json({ restaurant, onboardingStep: 5 });
  } catch (error) {
    res.status(500).json({ message: 'Failed to select template.', error: error.message });
  }
};

// Step 6: Generate QR codes and complete onboarding
exports.completeOnboarding = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant not set up yet.' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    const serverUrl = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;

    // Generate tables + QR codes
    const tables = [];
    for (let i = 1; i <= restaurant.tableCount; i++) {
      const existingTable = await Table.findOne({ restaurantId: restaurant._id, number: i });
      if (existingTable) {
        tables.push(existingTable);
        continue;
      }

      const url = `${serverUrl}/template-preview/${restaurant.slug}?table=${i}`;
      const qrCode = await QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#1e293b' } });

      const table = await Table.create({
        number: i,
        restaurantId: restaurant._id,
        name: `Table ${i}`,
        qrCode,
      });
      tables.push(table);
    }

    req.user.onboardingStep = 6;
    await req.user.save();

    res.json({ tables, restaurant, onboardingStep: 6 });
  } catch (error) {
    res.status(500).json({ message: 'Failed to complete onboarding.', error: error.message });
  }
};

// Legacy: Register restaurant admin (single step — kept for backward compatibility)
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password, restaurantName, tableCount, phone, address } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const slug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingSlug = await Restaurant.findOne({ slug });
    if (existingSlug) {
      return res.status(400).json({ message: 'Restaurant name already taken.' });
    }

    const user = await User.create({ name, email, password, role: 'admin', onboardingStep: 6 });

    const restaurant = await Restaurant.create({
      name: restaurantName,
      slug,
      owner: user._id,
      tableCount: tableCount || 10,
      phone: phone || '',
      address: address || {},
    });

    user.restaurantId = restaurant._id;
    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({ token, user, restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated.' });
    }

    const token = generateToken(user._id);
    let restaurant = null;
    if (user.restaurantId) {
      restaurant = await Restaurant.findById(user.restaurantId);
    }

    res.json({ token, user, restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    let restaurant = null;
    if (req.user.restaurantId) {
      restaurant = await Restaurant.findById(req.user.restaurantId);
    }
    res.json({ user: req.user, restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get user.', error: error.message });
  }
};

// Create staff member (admin creates kitchen/waiter)
exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!['kitchen', 'waiter'].includes(role)) {
      return res.status(400).json({ message: 'Staff role must be kitchen or waiter.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    const user = await User.create({
      name, email, password, role,
      restaurantId: req.user.restaurantId,
    });

    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create staff.', error: error.message });
  }
};
