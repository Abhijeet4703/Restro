const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['razorpay', 'cash', 'upi', 'card'], default: 'razorpay' },
  status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending' },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },
  refundId: { type: String, default: '' },
  refundAmount: { type: Number, default: 0 },
  refundReason: { type: String, default: '' },
}, { timestamps: true });

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ restaurantId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
