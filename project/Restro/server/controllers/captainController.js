const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Session = require('../models/Session');

// Captain: get tables for their restaurant
exports.getTables = async (req, res) => {
  try {
    const tables = await Table.find({ restaurantId: req.restaurantId }).sort({ number: 1 });
    res.json({ tables });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tables.', error: error.message });
  }
};

// Captain: get menu items
exports.getMenu = async (req, res) => {
  try {
    const items = await MenuItem.find({ restaurantId: req.restaurantId, isAvailable: true })
      .sort({ category: 1, sortOrder: 1 });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menu.', error: error.message });
  }
};

// Captain: place order on behalf of table
exports.placeOrder = async (req, res) => {
  try {
    const { tableNumber, items, notes, orderType } = req.body;
    if (!tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'tableNumber and items[] required' });
    }

    const table = await Table.findOne({ restaurantId: req.restaurantId, number: tableNumber });
    if (!table) return res.status(404).json({ message: 'Table not found' });

    // Find or create session
    let session = await Session.findOne({
      restaurantId: req.restaurantId,
      tableNumber,
      status: 'active',
    });
    if (!session) {
      session = new Session({
        restaurantId: req.restaurantId,
        tableId: table._id,
        tableNumber,
        status: 'active',
      });
      await session.save();
      await Table.findByIdAndUpdate(table._id, { status: 'occupied', currentSessionId: session._id });
    }

    const orderItems = [];
    let totalAmount = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findOne({ _id: item.menuItemId, restaurantId: req.restaurantId, isAvailable: true });
      if (!menuItem) continue;
      const qty = Math.max(1, Math.min(item.quantity || 1, 50));
      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: qty,
        notes: (item.notes || '').slice(0, 200),
      });
      totalAmount += menuItem.price * qty;
    }

    if (orderItems.length === 0) return res.status(400).json({ message: 'No valid menu items' });

    const count = await Order.countDocuments({ restaurantId: req.restaurantId });
    const orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;

    const order = new Order({
      orderNumber,
      sessionId: session._id,
      tableId: table._id,
      restaurantId: req.restaurantId,
      tableNumber,
      orderType: orderType || 'dine-in',
      items: orderItems,
      totalAmount,
      paymentMode: 'pay-later',
      orderStatus: 'pending',
      orderSource: 'captain',
      notes: (notes || '').slice(0, 500),
    });
    await order.save();

    // Emit to admin + kitchen
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${req.restaurantId}`).emit('order:new', { order });
      io.to(`kitchen:${req.restaurantId}`).emit('order:new', { order });
      io.to(`table:${req.restaurantId}:${tableNumber}`).emit('order:status-update', {
        orderId: order._id,
        status: 'pending',
      });
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to place order.', error: error.message });
  }
};

// Captain: get active orders for a table
exports.getTableOrders = async (req, res) => {
  try {
    const tableNumber = parseInt(req.params.tableNumber);
    const orders = await Order.find({
      restaurantId: req.restaurantId,
      tableNumber,
      orderStatus: { $nin: ['completed', 'cancelled', 'rejected'] },
    }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders.', error: error.message });
  }
};
