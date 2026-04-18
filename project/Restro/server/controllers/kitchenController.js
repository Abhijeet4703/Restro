const Order = require('../models/Order');

// Get kitchen orders (only approved, in-progress)
exports.getKitchenOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      restaurantId: req.restaurantId,
      orderStatus: { $in: ['approved', 'cooking', 'preparation', 'plating', 'ready'] },
    })
      .sort({ isPriority: -1, createdAt: 1 })
      .populate('items.menuItemId');
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get kitchen orders.', error: error.message });
  }
};

// Start cooking
exports.startCooking = async (req, res) => {
  try {
    const { estimatedTime } = req.body;
    const order = await Order.findOne({ _id: req.params.orderId, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (order.orderStatus !== 'approved') {
      return res.status(400).json({ message: 'Only approved orders can be started.' });
    }

    order.orderStatus = 'cooking';
    order.cookingStartedAt = new Date();
    order.kitchenStaffId = req.user._id;
    if (estimatedTime) order.estimatedTime = estimatedTime;
    await order.save();

    const io = req.app.get('io');
    io.to(`table:${order.restaurantId}:${order.tableNumber}`).emit('order:status-update', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'cooking',
      estimatedTime: order.estimatedTime,
      cookingStartedAt: order.cookingStartedAt,
      message: `Your order is being prepared! Estimated time: ${order.estimatedTime} minutes`,
    });
    io.to(`restaurant:${order.restaurantId}`).emit('order:status-changed', { order });

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to start cooking.', error: error.message });
  }
};

// Update cooking stage
exports.updateStage = async (req, res) => {
  try {
    const { stage } = req.body; // preparation, cooking, plating, ready
    const validStages = ['preparation', 'cooking', 'plating', 'ready'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: 'Invalid stage.' });
    }

    const order = await Order.findOne({ _id: req.params.orderId, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    order.orderStatus = stage;
    if (stage === 'ready') {
      order.readyAt = new Date();
    }
    await order.save();

    const io = req.app.get('io');
    io.to(`table:${order.restaurantId}:${order.tableNumber}`).emit('order:status-update', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: stage,
      estimatedTime: order.estimatedTime,
      cookingStartedAt: order.cookingStartedAt,
      message: stage === 'ready'
        ? 'Your order is ready! It will be served shortly.'
        : `Your order is now in ${stage} stage.`,
    });
    io.to(`restaurant:${order.restaurantId}`).emit('order:status-changed', { order });

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update stage.', error: error.message });
  }
};

// Mark served
exports.markServed = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    order.orderStatus = 'served';
    order.servedAt = new Date();
    await order.save();

    const io = req.app.get('io');
    io.to(`table:${order.restaurantId}:${order.tableNumber}`).emit('order:status-update', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'served',
      message: 'Enjoy your meal!',
    });

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark served.', error: error.message });
  }
};
