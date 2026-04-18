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
