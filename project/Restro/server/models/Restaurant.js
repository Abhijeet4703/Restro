const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerName: { type: String, default: '' },
  ownerPhone: { type: String, default: '' },

  // Branding
  logo: { type: String, default: null },
  coverImage: { type: String, default: null },
  photos: [{ type: String }], // additional photos for templates
  theme: {
    primaryColor: { type: String, default: '#E63946' },
    secondaryColor: { type: String, default: '#1D3557' },
    accentColor: { type: String, default: '#F4A261' },
    backgroundColor: { type: String, default: '#F1FAEE' },
    fontFamily: { type: String, default: 'Inter' },
  },

  // Contact
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  location: { type: String, default: '' }, // Google Maps / text location
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' },
  },

  // Operations
  tableCount: { type: Number, required: true, min: 1 },
  menuTemplate: { type: String, default: 'starter', enum: ['starter', 'starter-plus', 'starter-premium', 'starter-starter', 'custom'] },
  activeTemplate: { type: String, default: 'royal-3d', enum: ['neon-glow', 'royal-3d', 'minimal-zen', 'vintage-paper', 'insta-reel'] },
  templateCustomization: {
    idea: { type: String, default: '' },
    inspiration: { type: String, default: '' },
    notes: { type: String, default: '' },
    estimatedCost: { type: Number, default: 0 },
  },
  isOpen: { type: Boolean, default: true },
  operatingHours: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '23:00' },
  },

  // GST & Tax
  gstin: { type: String, default: '' },
  fssaiLicense: { type: String, default: '' },
  pan: { type: String, default: '' },
  serviceChargePercent: { type: Number, default: 0, min: 0, max: 30 },
  cgstPercent: { type: Number, default: 2.5, min: 0, max: 14 },
  sgstPercent: { type: Number, default: 2.5, min: 0, max: 14 },
  defaultHsnCode: { type: String, default: '996331' },

  // Loyalty
  loyaltyEnabled: { type: Boolean, default: false },
  loyaltyPointsPerRupee: { type: Number, default: 1, min: 0 },
  loyaltyRedemptionRate: { type: Number, default: 0.25, min: 0 },

  // Payment
  upiId: { type: String, default: '' },
  razorpayKeyId: { type: String, default: '' },
  razorpayKeySecret: { type: String, default: '' },
  commissionRate: { type: Number, default: 2.5, min: 0, max: 100 },

  // Language & Localization
  language: { type: String, default: 'en', enum: ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa'] },

  // Online Aggregators
  aggregators: {
    swiggy: { enabled: { type: Boolean, default: false }, storeId: { type: String, default: '' } },
    zomato: { enabled: { type: Boolean, default: false }, resId: { type: String, default: '' } },
  },

  // Subscription
  subscription: {
    plan: { type: String, enum: ['basic', 'advanced', 'enterprise'], default: 'basic' },
    status: { type: String, enum: ['active', 'inactive', 'expired', 'trial'], default: 'trial' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  },

  // Approval
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String, default: '' },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

restaurantSchema.index({ slug: 1 });
restaurantSchema.index({ approvalStatus: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
