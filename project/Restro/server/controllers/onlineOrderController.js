const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

// Webhook endpoint: receive orders from Swiggy/Zomato (or manual entry)
exports.receiveOnlineOrder = async (req, res) => {
  try {
    const { platform, externalOrderId, items, customerName, customerPhone, deliveryAddress, totalAmount, notes } = req.body;
    if (!platform || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'platform and items[] required' });
    }

    const restaurantId = req.restaurantId;
    // Map items to our menu items
    const orderItems = [];
    for (const item of items) {
      const menuItem = item.menuItemId
        ? await MenuItem.findOne({ _id: item.menuItemId, restaurantId })
        : await MenuItem.findOne({ name: { $regex: new RegExp(`^${item.name}$`, 'i') }, restaurantId });

      orderItems.push({
        menuItemId: menuItem ? menuItem._id : undefined,
        name: item.name || (menuItem ? menuItem.name : 'Unknown Item'),
        price: item.price || (menuItem ? menuItem.price : 0),
        quantity: item.quantity || 1,
        notes: item.notes || '',
      });
    }

    const order = new Order({
      restaurantId,
      items: orderItems,
      totalAmount: totalAmount || orderItems.reduce((s, i) => s + i.price * i.quantity, 0),
      tableNumber: 0, // 0 = online/delivery
      orderType: 'delivery',
      orderSource: platform, // 'swiggy', 'zomato', 'manual'
      externalOrderId: externalOrderId || '',
      customerName: (customerName || '').slice(0, 100),
      customerPhone: (customerPhone || '').slice(0, 15),
      deliveryAddress: (deliveryAddress || '').slice(0, 300),
      notes: (notes || '').slice(0, 500),
      orderStatus: 'pending',
      paymentMode: 'online',
      paymentStatus: 'paid',
    });
    await order.save();

    // Emit to admin dashboard
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${restaurantId}`).emit('order:new', {
        order,
        source: platform,
        message: `New ${platform} order received!`,
      });
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to receive online order.', error: error.message });
  }
};

// Get online orders (filtered by platform)
exports.getOnlineOrders = async (req, res) => {
  try {
    const filter = { restaurantId: req.restaurantId, tableNumber: 0 };
    if (req.query.platform) filter.orderSource = req.query.platform;
    if (req.query.status) filter.orderStatus = req.query.status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50);
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch online orders.', error: error.message });
  }
};

// Accept/reject online order
exports.updateOnlineOrderStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['approved', 'rejected', 'cooking', 'ready', 'dispatched', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.orderId, restaurantId: req.restaurantId },
      { $set: { orderStatus: status, ...(reason ? { rejectionReason: reason } : {}) } },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${req.restaurantId}`).emit('order:status-changed', { order });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order.', error: error.message });
  }
};

// Aggregator config
exports.getAggregatorConfig = async (req, res) => {
  try {
    const r = await Restaurant.findById(req.restaurantId).select('aggregators');
    res.json({ aggregators: r?.aggregators || {} });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get config.', error: error.message });
  }
};

exports.updateAggregatorConfig = async (req, res) => {
  try {
    const { aggregators } = req.body;
    const r = await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      { $set: { aggregators } },
      { new: true }
    ).select('aggregators');
    res.json({ aggregators: r.aggregators });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update config.', error: error.message });
  }
};
