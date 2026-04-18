const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: null },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  prepTime: { type: Number, default: 15 }, // in minutes
  isVeg: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  tags: [{ type: String }], // e.g., "spicy", "bestseller", "new"
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

menuItemSchema.index({ restaurantId: 1, category: 1 });
menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
