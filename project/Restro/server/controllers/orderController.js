const Order = require('../models/Order');
const Session = require('../models/Session');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const mongoose = require('mongoose');

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// Place order (customer)
exports.placeOrder = async (req, res) => {
  try {
    const { restaurantId, tableNumber, items, paymentMode, orderType, customerPhone, customerName } = req.body;

    // Validate items exist and are available
    const menuItemIds = items.map(i => i.menuItemId);
    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      restaurantId,
      isAvailable: true,
    });

    if (menuItems.length !== items.length) {
      return res.status(400).json({ message: 'Some items are unavailable.' });
    }

    // Find or create active session for this table
    const table = await Table.findOne({ restaurantId, number: tableNumber });
    if (!table) return res.status(404).json({ message: 'Table not found.' });

    let session = await Session.findOne({ tableId: table._id, status: 'active' });
    if (!session) {
      session = await Session.create({
        tableId: table._id,
        restaurantId,
        tableNumber,
      });
      table.status = 'occupied';
      table.currentSessionId = session._id;
      await table.save();
    }

    // Build order items with prices from DB (prevent price manipulation)
    const orderItems = items.map(item => {
      const menuItem = menuItems.find(m => m._id.toString() === item.menuItemId);
      return {
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        notes: item.notes || '',
      };
    });

    const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Calculate estimated time from admin-set prep times
    const maxPrepTime = Math.max(...menuItems.map(m => m.prepTime || 15));
    const queuedOrders = await Order.countDocuments({
      restaurantId,
      orderStatus: { $in: ['approved', 'cooking', 'preparation'] },
    });
    const estimatedTime = maxPrepTime + (queuedOrders * 5);

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      sessionId: session._id,
      tableId: table._id,
      restaurantId,
      tableNumber,
      orderType: orderType || 'dine-in',
      customerPhone: customerPhone || '',
      customerName: customerName || '',
      items: orderItems,
      totalAmount,
      paymentMode,
      paymentStatus: paymentMode === 'pay-now' ? 'unpaid' : 'unpaid',
      estimatedTime,
      customerCanCancelAfter: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    // Update session
    session.orders.push(order._id);
    session.totalAmount += totalAmount;
    session.totalDue += totalAmount;
    await session.save();

    // Emit to admin dashboard
    const io = req.app.get('io');
    io.to(`restaurant:${restaurantId}`).emit('order:new', {
      order: await order.populate('items.menuItemId'),
      tableNumber,
    });

    // Auto-remind admin after 7 minutes
    setTimeout(async () => {
      const currentOrder = await Order.findById(order._id);
      if (currentOrder && currentOrder.orderStatus === 'pending') {
        io.to(`restaurant:${restaurantId}`).emit('order:remind', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          tableNumber,
          message: `Order ${order.orderNumber} from Table ${tableNumber} waiting for approval for 7 minutes!`,
        });
        currentOrder.adminRemindedAt = new Date();
        await currentOrder.save();
      }
    }, 7 * 60 * 1000);

    res.status(201).json({ order, session });
  } catch (error) {
    res.status(500).json({ message: 'Failed to place order.', error: error.message });
  }
};

// Admin approve order
exports.approveOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (order.orderStatus !== 'pending') {
      return res.status(400).json({ message: `Cannot approve order in '${order.orderStatus}' status.` });
    }

    // Check payment for pay-now orders
    if (order.paymentMode === 'pay-now' && order.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Payment not received. Cannot approve.' });
    }

    order.orderStatus = 'approved';
    order.approvedAt = new Date();
    order.approvedBy = req.user._id;
    await order.save();

    const io = req.app.get('io');
    // Notify kitchen
    io.to(`kitchen:${req.restaurantId}`).emit('order:approved', { order });
    // Notify customer
    io.to(`table:${req.restaurantId}:${order.tableNumber}`).emit('order:status-update', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'approved',
      message: 'Your order has been confirmed!',
    });

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve order.', error: error.message });
  }
};

// Admin reject order
exports.rejectOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOne({ _id: req.params.orderId, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    order.orderStatus = 'rejected';
    order.rejectedAt = new Date();
    order.rejectedReason = reason || 'Order rejected by restaurant.';
    await order.save();

    // Update session
    const session = await Session.findById(order.sessionId);
    if (session) {
      session.totalAmount -= order.totalAmount;
      session.totalDue -= order.totalAmount;
      await session.save();
    }

    const io = req.app.get('io');
    // If paid, trigger refund notification
    const refundNeeded = order.paymentStatus === 'paid';
    io.to(`table:${req.restaurantId}:${order.tableNumber}`).emit('order:status-update', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'rejected',
      reason: order.rejectedReason,
      refundNeeded,
      message: refundNeeded
        ? 'Your order was rejected. Refund will be processed.'
        : 'Your order was rejected. Please pay first or try different items.',
    });

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject order.', error: error.message });
  }
};

// Admin update order status: approved → cooking → ready → served
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['cooking', 'ready', 'served', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findOne({ _id: req.params.orderId, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Enforce valid transitions
    const transitions = {
      approved: ['cooking'],
      cooking: ['ready'],
      preparation: ['ready'],
      plating: ['ready'],
      ready: ['served'],
      served: ['completed'],
    };
    const allowed = transitions[order.orderStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Cannot move from '${order.orderStatus}' to '${status}'.` });
    }

    order.orderStatus = status;
    if (status === 'cooking') order.cookingStartedAt = new Date();
    if (status === 'ready') order.readyAt = new Date();
    if (status === 'served') order.servedAt = new Date();

    await order.save();

    const io = req.app.get('io');
    const messages = {
      cooking: 'Your order is being prepared! 🍳',
      ready: 'Your order is ready! 🎉',
      served: 'Order served. Enjoy your meal! 😊',
      completed: 'Order completed. Thank you!',
    };

    io.to(`kitchen:${req.restaurantId}`).emit('order:status-update', { order });
    io.to(`table:${req.restaurantId}:${order.tableNumber}`).emit('order:status-update', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status,
      message: messages[status],
    });

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status.', error: error.message });
  }
};

// Customer cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Can only cancel if pending or approved (not yet cooking)
    if (!['pending', 'approved'].includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Cannot cancel. Your order is being prepared.' });
    }

    order.orderStatus = 'cancelled';
    await order.save();

    // Update session
    const session = await Session.findById(order.sessionId);
    if (session) {
      session.totalAmount -= order.totalAmount;
      if (order.paymentStatus === 'paid') {
        // Refund needed
        session.totalPaid -= order.totalAmount;
      } else {
        session.totalDue -= order.totalAmount;
      }
      await session.save();
    }

    const io = req.app.get('io');
    io.to(`restaurant:${order.restaurantId}`).emit('order:cancelled', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
    });

    res.json({ order, refundNeeded: order.paymentStatus === 'paid' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel order.', error: error.message });
  }
};

// Customer edit order (within 1-minute window, only if pending/approved)
exports.editOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (!['pending', 'approved'].includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Cannot edit — order is already being prepared.' });
    }

    const ageMs = Date.now() - new Date(order.createdAt).getTime();
    if (ageMs > 60 * 1000) {
      return res.status(400).json({ message: 'Edit window has expired (1 minute limit).' });
    }

    const { items } = req.body; // [{ menuItemId, quantity, notes? }]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item.' });
    }

    const menuItemIds = items.filter(i => i.quantity > 0).map(i => i.menuItemId);
    if (menuItemIds.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item.' });
    }

    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds }, restaurantId: order.restaurantId, isAvailable: true });

    const orderItems = items
      .filter(i => i.quantity > 0)
      .map(i => {
        const m = menuItems.find(mi => mi._id.toString() === i.menuItemId);
        if (!m) return null;
        return { menuItemId: m._id, name: m.name, price: m.price, quantity: i.quantity, notes: i.notes || '' };
      })
      .filter(Boolean);

    if (orderItems.length === 0) {
      return res.status(400).json({ message: 'No valid items found.' });
    }

    const newTotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const diff = newTotal - order.totalAmount;

    order.items = orderItems;
    order.totalAmount = newTotal;
    await order.save();

    if (diff !== 0) {
      await Session.findByIdAndUpdate(order.sessionId, { $inc: { totalAmount: diff, totalDue: diff } });
    }

    const io = req.app.get('io');
    io.to(`restaurant:${order.restaurantId}`).emit('order:updated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      items: orderItems,
      totalAmount: newTotal,
    });

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to edit order.', error: error.message });
  }
};

// Get orders for restaurant (admin)
exports.getOrders = async (req, res) => {
  try {
    const { status, date } = req.query;
    const filter = { restaurantId: req.restaurantId };
    if (status) filter.orderStatus = status;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.createdAt = { $gte: d, $lt: next };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('items.menuItemId');
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get orders.', error: error.message });
  }
};

// Get order by ID (customer)
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('items.menuItemId');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get order.', error: error.message });
  }
};

// Get session with orders (customer)
exports.getSession = async (req, res) => {
  try {
    const { restaurantId, tableNumber } = req.params;
    const table = await Table.findOne({ restaurantId, number: tableNumber });
    if (!table) return res.status(404).json({ message: 'Table not found.' });

    const session = await Session.findOne({ tableId: table._id, status: 'active' })
      .populate({ path: 'orders', populate: { path: 'items.menuItemId' } });

    res.json({ session, table });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get session.', error: error.message });
  }
};

// Complete session (admin/waiter)
exports.completeSession = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.sessionId, restaurantId: req.restaurantId });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();

    // Free the table
    const table = await Table.findById(session.tableId);
    if (table) {
      table.status = 'available';
      table.currentSessionId = null;
      await table.save();
    }

    const io = req.app.get('io');
    io.to(`restaurant:${req.restaurantId}`).emit('table:freed', { tableNumber: session.tableNumber });

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Failed to complete session.', error: error.message });
  }
};

// Customer feedback (no auth — from QR menu)
exports.submitCustomerFeedback = async (req, res) => {
  try {
    const { restaurantId, tableNumber, rating, comment } = req.body;
    if (!restaurantId || !tableNumber || !rating) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const sanitizedRating = Math.min(5, Math.max(1, parseInt(rating) || 0));
    const sanitizedComment = (comment || '').substring(0, 500);

    // Find active session for this table
    const table = await Table.findOne({ restaurantId, number: tableNumber });
    if (!table) return res.status(404).json({ message: 'Table not found.' });

    const session = await Session.findOne({ tableId: table._id, status: 'active' });

    // Store feedback on the most recent order in this session
    if (session) {
      const latestOrder = await Order.findOne({ sessionId: session._id })
        .sort({ createdAt: -1 });
      if (latestOrder) {
        latestOrder.feedbackRating = sanitizedRating;
        latestOrder.feedbackComment = sanitizedComment;
        await latestOrder.save();
      }
    }

    // Also emit to admin dashboard
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${restaurantId}`).emit('customer:feedback', {
        tableNumber,
        rating: sanitizedRating,
        comment: sanitizedComment,
        timestamp: new Date(),
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit feedback.', error: error.message });
  }
};
