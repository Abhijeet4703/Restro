const MenuItem = require('../models/MenuItem');

// Get menu items (public - for customer)
exports.getMenuByRestaurant = async (req, res) => {
  try {
    const items = await MenuItem.find({
      restaurantId: req.params.restaurantId,
      isAvailable: true,
    }).sort({ category: 1, sortOrder: 1 });

    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    res.json({ items, grouped });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menu.', error: error.message });
  }
};

// Get all menu items including unavailable (admin)
exports.getAllMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.find({ restaurantId: req.restaurantId })
      .sort({ category: 1, sortOrder: 1 });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menu.', error: error.message });
  }
};

// Create menu item (admin)
exports.createMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.create({
      ...req.body,
      restaurantId: req.restaurantId,
    });
    res.status(201).json({ item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create item.', error: error.message });
  }
};

// Update menu item (admin)
exports.updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    res.json({ item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update item.', error: error.message });
  }
};

// Delete menu item (admin)
exports.deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    res.json({ message: 'Item deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete item.', error: error.message });
  }
};

// Toggle availability (admin)
exports.toggleAvailability = async (req, res) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json({ item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle availability.', error: error.message });
  }
};

// Get single menu item with ingredients (for n8n integration)
exports.getMenuItemWithIngredients = async (req, res) => {
  try {
    const item = await MenuItem.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    }).populate('ingredients.inventoryId', 'name quantity unit lowStockThreshold isLowStock');

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    res.json({ item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get menu item.', error: error.message });
  }
};

// Get ingredients for multiple menu items (bulk)
exports.getBulkIngredients = async (req, res) => {
  try {
    const { menuItemIds } = req.body;
    
    const items = await MenuItem.find({
      _id: { $in: menuItemIds },
      restaurantId: req.restaurantId
    }).populate('ingredients.inventoryId', 'name quantity unit lowStockThreshold isLowStock');

    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get ingredients.', error: error.message });
  }
};
