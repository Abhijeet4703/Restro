const Inventory = require('../models/Inventory');

exports.getInventory = async (req, res) => {
  try {
    const items = await Inventory.find({ restaurantId: req.restaurantId }).sort({ name: 1 });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get inventory.', error: error.message });
  }
};

exports.addItem = async (req, res) => {
  try {
    const item = await Inventory.create({ ...req.body, restaurantId: req.restaurantId });
    res.status(201).json({ item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add item.', error: error.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const item = await Inventory.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { $set: req.body },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    res.json({ item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update.', error: error.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    await Inventory.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    res.json({ message: 'Deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete.', error: error.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const items = await Inventory.find({ restaurantId: req.restaurantId, isLowStock: true });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get low stock.', error: error.message });
  }
};

// Reduce inventory stock (called by n8n when order is placed)
exports.reduceStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    const inventory = await Inventory.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    // Reduce quantity but don't go below 0
    inventory.quantity = Math.max(0, inventory.quantity - quantity);
    await inventory.save();

    res.json({
      item: inventory,
      wasLowStock: inventory.isLowStock
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reduce stock.', error: error.message });
  }
};

// Get single inventory item by ID
exports.getItem = async (req, res) => {
  try {
    const inventory = await Inventory.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    res.json({ item: inventory });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get item.', error: error.message });
  }
};

// Bulk reduce stock for multiple ingredients (more efficient)
exports.bulkReduceStock = async (req, res) => {
  try {
    const { items } = req.body; // Array of { inventoryId, quantity }

    const results = await Promise.all(items.map(async (item) => {
      const inventory = await Inventory.findOne({
        _id: item.inventoryId,
        restaurantId: req.restaurantId
      });

      if (!inventory) {
        return { inventoryId: item.inventoryId, success: false, error: 'Not found' };
      }

      const previousQuantity = inventory.quantity;
      inventory.quantity = Math.max(0, inventory.quantity - item.quantity);
      await inventory.save();

      return {
        inventoryId: item.inventoryId,
        success: true,
        previousQuantity,
        remainingQuantity: inventory.quantity,
        wasLowStock: inventory.isLowStock
      };
    }));

    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: 'Failed to bulk reduce stock.', error: error.message });
  }
};
