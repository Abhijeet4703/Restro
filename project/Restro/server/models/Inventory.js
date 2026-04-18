const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true }, // kg, litres, pieces
  lowStockThreshold: { type: Number, default: 10 },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  category: { type: String, default: 'general' },
  isLowStock: { type: Boolean, default: false },
}, { timestamps: true });

inventorySchema.pre('save', function (next) {
  this.isLowStock = this.quantity <= this.lowStockThreshold;
  next();
});

inventorySchema.index({ restaurantId: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
