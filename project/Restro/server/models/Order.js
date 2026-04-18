const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', default: null },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableNumber: { type: Number, required: true },

  orderType: { type: String, enum: ['dine-in', 'takeaway', 'delivery'], default: 'dine-in' },
  customerPhone: { type: String, default: '' },
  customerName: { type: String, default: '' },
  deliveryAddress: { type: String, default: '' },

  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },

  // Payment
  paymentMode: { type: String, enum: ['pay-now', 'pay-later'], required: true },
  paymentStatus: { type: String, enum: ['paid', 'unpaid', 'refunded', 'partial'], default: 'unpaid' },

  // Order lifecycle
  orderStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cooking', 'preparation', 'plating', 'ready', 'served', 'completed', 'cancelled'],
    default: 'pending',
  },

  // Admin approval
  approvedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectedAt: { type: Date, default: null },
  rejectedReason: { type: String, default: '' },

  // Kitchen
  cookingStartedAt: { type: Date, default: null },
  estimatedTime: { type: Number, default: 0 }, // in minutes
  kitchenStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  readyAt: { type: Date, default: null },
  servedAt: { type: Date, default: null },

  // Waiter
  waiterCallActive: { type: Boolean, default: false },

  // Reminders
  adminRemindedAt: { type: Date, default: null },
  customerCanCancelAfter: { type: Date, default: null },

  isPriority: { type: Boolean, default: false },

  // Online aggregator fields
  orderSource: { type: String, enum: ['dine-in', 'swiggy', 'zomato', 'manual', 'captain'], default: 'dine-in' },
  externalOrderId: { type: String, default: '' },

  // Customer feedback (from QR menu)
  feedbackRating: { type: Number, min: 0, max: 5, default: 0 },
  feedbackComment: { type: String, default: '' },
}, { timestamps: true });

orderSchema.index({ restaurantId: 1, orderStatus: 1 });
orderSchema.index({ sessionId: 1 });
orderSchema.index({ tableId: 1, orderStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
