const mongoose = require('mongoose');

const billPaymentSchema = new mongoose.Schema({
  method: { type: String, enum: ['cash', 'card', 'upi', 'razorpay', 'wallet'], required: true },
  amount: { type: Number, required: true, min: 0 },
  reference: { type: String, default: '' },
}, { _id: false });

const billItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '' },
  isComp: { type: Boolean, default: false },
  compReason: { type: String, default: '' },
  itemDiscount: { type: Number, default: 0 },
  hsnCode: { type: String, default: '996331' },
}, { _id: false });

const billSchema = new mongoose.Schema({
  billNumber: { type: String, required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],

  // Order info
  orderType: { type: String, enum: ['dine-in', 'takeaway', 'delivery'], default: 'dine-in' },
  tableNumber: { type: Number, default: 0 },
  guests: { type: Number, default: 1 },
  waiterName: { type: String, default: '' },
  waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Customer
  customerPhone: { type: String, default: '' },
  customerName: { type: String, default: '' },
  deliveryAddress: { type: String, default: '' },

  // Items
  items: [billItemSchema],

  // Amounts
  subtotal: { type: Number, required: true },
  discountType: { type: String, enum: ['percent', 'flat', 'none'], default: 'none' },
  discountValue: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  discountReason: { type: String, default: '' },
  serviceChargePercent: { type: Number, default: 0 },
  serviceChargeAmount: { type: Number, default: 0 },
  cgstPercent: { type: Number, default: 2.5 },
  cgstAmount: { type: Number, default: 0 },
  sgstPercent: { type: Number, default: 2.5 },
  sgstAmount: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },

  // GST info
  gstin: { type: String, default: '' },
  fssaiLicense: { type: String, default: '' },
  hsnCode: { type: String, default: '996331' },

  // Multi-payment settlement
  payments: [billPaymentSchema],
  totalPaid: { type: Number, default: 0 },

  // Status
  status: { type: String, enum: ['open', 'hold', 'settled', 'void'], default: 'open' },
  holdReason: { type: String, default: '' },
  voidReason: { type: String, default: '' },

  // Loyalty
  loyaltyPointsEarned: { type: Number, default: 0 },
  loyaltyPointsRedeemed: { type: Number, default: 0 },

  // Feedback
  feedbackRating: { type: Number, min: 0, max: 5, default: 0 },
  feedbackComment: { type: String, default: '' },

  // Sharing
  sharedVia: { type: String, enum: ['none', 'whatsapp', 'sms', 'email', 'print'], default: 'none' },

  settledAt: { type: Date },
}, { timestamps: true });

billSchema.index({ restaurantId: 1, createdAt: -1 });
billSchema.index({ restaurantId: 1, status: 1 });
billSchema.index({ restaurantId: 1, billNumber: 1 }, { unique: true });

module.exports = mongoose.model('Bill', billSchema);
