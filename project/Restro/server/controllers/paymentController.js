const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Session = require('../models/Session');
const Restaurant = require('../models/Restaurant');

// Create Razorpay order
exports.createPaymentOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const restaurant = await Restaurant.findById(order.restaurantId);
    if (!restaurant || !restaurant.razorpayKeyId) {
      return res.status(400).json({ message: 'Payment not configured for this restaurant.' });
    }

    const razorpay = new Razorpay({
      key_id: restaurant.razorpayKeyId,
      key_secret: restaurant.razorpayKeySecret,
    });

    const rpOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100), // paise
      currency: 'INR',
      receipt: order.orderNumber,
    });

    const payment = await Payment.create({
      orderId: order._id,
      sessionId: order.sessionId,
      restaurantId: order.restaurantId,
      amount: order.totalAmount,
      method: 'razorpay',
      razorpayOrderId: rpOrder.id,
    });

    res.json({
      razorpayOrderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      keyId: restaurant.razorpayKeyId,
      paymentId: payment._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create payment.', error: error.message });
  }
};

// Verify Razorpay payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment record not found.' });

    const restaurant = await Restaurant.findById(payment.restaurantId);
    const expectedSignature = crypto
      .createHmac('sha256', restaurant.razorpayKeySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      payment.status = 'failed';
      await payment.save();
      return res.status(400).json({ message: 'Payment verification failed.' });
    }

    // Update payment
    payment.status = 'success';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    await payment.save();

    // Update order
    const order = await Order.findById(payment.orderId);
    order.paymentStatus = 'paid';
    await order.save();

    // Update session
    const session = await Session.findById(order.sessionId);
    if (session) {
      session.totalPaid += order.totalAmount;
      session.totalDue -= order.totalAmount;
      await session.save();
    }

    // Notify admin that payment is received
    const io = req.app.get('io');
    io.to(`restaurant:${order.restaurantId}`).emit('payment:received', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      amount: order.totalAmount,
    });

    res.json({ message: 'Payment verified.', order, payment });
  } catch (error) {
    res.status(500).json({ message: 'Payment verification failed.', error: error.message });
  }
};

// Process refund
exports.processRefund = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const order = await Order.findOne({ _id: orderId, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const payment = await Payment.findOne({ orderId: order._id, status: 'success' });
    if (!payment) return res.status(400).json({ message: 'No successful payment found for this order.' });

    const restaurant = await Restaurant.findById(order.restaurantId);
    const razorpay = new Razorpay({
      key_id: restaurant.razorpayKeyId,
      key_secret: restaurant.razorpayKeySecret,
    });

    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: Math.round(order.totalAmount * 100),
    });

    payment.status = 'refunded';
    payment.refundId = refund.id;
    payment.refundAmount = order.totalAmount;
    payment.refundReason = reason || 'Order rejected/cancelled';
    await payment.save();

    order.paymentStatus = 'refunded';
    await order.save();

    // Update session
    const session = await Session.findById(order.sessionId);
    if (session) {
      session.totalPaid -= order.totalAmount;
      await session.save();
    }

    const io = req.app.get('io');
    io.to(`table:${order.restaurantId}:${order.tableNumber}`).emit('payment:refunded', {
      orderId: order._id,
      amount: order.totalAmount,
      message: 'Your payment has been refunded.',
    });

    res.json({ message: 'Refund processed.', payment });
  } catch (error) {
    res.status(500).json({ message: 'Refund failed.', error: error.message });
  }
};

// Mark cash payment (admin/waiter)
exports.markCashPayment = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    order.paymentStatus = 'paid';
    await order.save();

    await Payment.create({
      orderId: order._id,
      sessionId: order.sessionId,
      restaurantId: order.restaurantId,
      amount: order.totalAmount,
      method: 'cash',
      status: 'success',
    });

    const session = await Session.findById(order.sessionId);
    if (session) {
      session.totalPaid += order.totalAmount;
      session.totalDue -= order.totalAmount;
      await session.save();
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark payment.', error: error.message });
  }
};
