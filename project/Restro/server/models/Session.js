const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableNumber: { type: Number, required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  totalAmount: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  totalDue: { type: Number, default: 0 },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
}, { timestamps: true });

sessionSchema.index({ restaurantId: 1, status: 1 });
sessionSchema.index({ tableId: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
