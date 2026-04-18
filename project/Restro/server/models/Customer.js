const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  phone: { type: String, required: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  loyaltyPoints: { type: Number, default: 0 },
  totalVisits: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastVisit: { type: Date },
  tags: [{ type: String }],
  notes: { type: String, default: '' },
}, { timestamps: true });

customerSchema.index({ restaurantId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
