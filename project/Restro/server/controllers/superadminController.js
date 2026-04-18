const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Order = require('../models/Order');
const Subscription = require('../models/Restaurant');

// Get all restaurants
exports.getAllRestaurants = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.approvalStatus = status;

    const restaurants = await Restaurant.find(filter)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });
    res.json({ restaurants });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get restaurants.', error: error.message });
  }
};

// Approve restaurant
exports.approveRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'approved', 'subscription.status': 'trial' },
      { new: true }
    );
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });
    res.json({ restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve.', error: error.message });
  }
};

// Reject restaurant
exports.rejectRestaurant = async (req, res) => {
  try {
    const { reason } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'rejected', rejectionReason: reason || '' },
      { new: true }
    );
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });
    res.json({ restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject.', error: error.message });
  }
};

// Suspend restaurant
exports.suspendRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isActive: false, 'subscription.status': 'inactive' },
      { new: true }
    );
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });
    res.json({ restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Failed to suspend.', error: error.message });
  }
};

// Platform analytics
exports.getPlatformStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalRestaurants, pendingApprovals, totalOrders, todayRevenue] = await Promise.all([
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ approvalStatus: 'pending' }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
    ]);

    res.json({
      totalRestaurants,
      pendingApprovals,
      totalOrders,
      todayRevenue: todayRevenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get stats.', error: error.message });
  }
};

// Create super admin (seed)
exports.createSuperAdmin = async (req, res) => {
  try {
    const existing = await User.findOne({ role: 'superadmin' });
    if (existing) return res.status(400).json({ message: 'Super admin already exists.' });

    const { name, email, password } = req.body;
    const user = await User.create({ name, email, password, role: 'superadmin' });
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create super admin.', error: error.message });
  }
};
