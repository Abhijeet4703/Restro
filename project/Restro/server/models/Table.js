const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, default: '' }, // e.g., "Window Seat 1", "Garden Table"
  seats: { type: Number, default: 4 },
  status: { type: String, enum: ['available', 'occupied', 'reserved', 'disabled'], default: 'available' },
  qrCode: { type: String, default: '' }, // Base64 QR code image
  currentSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  // Floor plan positioning
  area: { type: String, default: 'Main Hall' },
  shape: { type: String, enum: ['square', 'round', 'rect'], default: 'square' },
  posX: { type: Number, default: 0 }, // grid column position
  posY: { type: Number, default: 0 }, // grid row position
  currentOrderAmount: { type: Number, default: 0 },
}, { timestamps: true });

tableSchema.index({ restaurantId: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Table', tableSchema);
