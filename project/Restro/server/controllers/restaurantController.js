const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const User = require('../models/User');
const QRCode = require('qrcode');

// Get restaurant by slug (public - for customer QR scan)
exports.getBySlug = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug, isActive: true })
      .select('-razorpayKeySecret');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }
    res.json({ restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch restaurant.', error: error.message });
  }
};

// Get restaurant public info by ID (customer-facing - returns only safe fields)
exports.getPublicById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .select('name slug address gstin fssaiLicense cgstPercent sgstPercent serviceChargePercent defaultHsnCode loyaltyEnabled');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }
    res.json({ restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch restaurant.', error: error.message });
  }
};

/**
 * Public QR scan endpoint — called when a customer scans the table QR code.
 * Returns table info and marks the table as "occupied" if it was "available".
 * No authentication required (customer-facing).
 */
exports.scanTableQr = async (req, res) => {
  try {
    const { slug, tableNumber } = req.params;
    const tableNum = parseInt(tableNumber, 10);

    console.log(`[QR Scan] slug=${slug}, tableNumber=${tableNum}`);

    if (!slug || isNaN(tableNum) || tableNum < 1) {
      console.warn('[QR Scan] Invalid slug or tableNumber');
      return res.status(400).json({ message: 'Invalid QR code data.' });
    }

    const restaurant = await Restaurant.findOne({ slug, isActive: true }).select('_id name slug');
    if (!restaurant) {
      console.warn(`[QR Scan] Restaurant not found for slug: ${slug}`);
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    const table = await Table.findOne({ restaurantId: restaurant._id, number: tableNum });
    if (!table) {
      console.warn(`[QR Scan] Table ${tableNum} not found for restaurant ${slug}`);
      return res.status(404).json({ message: `Table ${tableNum} not found.` });
    }

    if (table.status === 'disabled') {
      console.warn(`[QR Scan] Table ${tableNum} is disabled`);
      return res.status(403).json({ message: 'This table is currently unavailable.' });
    }

    // Auto-mark as occupied if it was available
    let statusChanged = false;
    if (table.status === 'available') {
      await Table.findByIdAndUpdate(table._id, { status: 'occupied' });
      table.status = 'occupied';
      statusChanged = true;
      console.log(`[QR Scan] Table ${tableNum} marked as occupied`);

      // Emit real-time update to admin dashboard
      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`restaurant:${restaurant._id}`).emit('table:status-update', {
            tableId: table._id,
            tableNumber: tableNum,
            status: 'occupied',
          });
        }
      } catch (emitErr) {
        console.warn('[QR Scan] Socket emit failed:', emitErr.message);
      }
    }

    console.log(`[QR Scan] Success — table ${tableNum}, status=${table.status}, changed=${statusChanged}`);
    res.json({
      tableId: table._id,
      tableNumber: tableNum,
      tableName: table.name || `Table ${tableNum}`,
      status: table.status,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      statusChanged,
    });
  } catch (error) {
    console.error('[QR Scan] Error:', error);
    res.status(500).json({ message: 'Failed to process QR scan.', error: error.message });
  }
};

// Update restaurant (admin)
exports.updateRestaurant = async (req, res) => {
  try {
    const updates = req.body;
    // Prevent changing sensitive fields
    delete updates.owner;
    delete updates.approvalStatus;
    delete updates.subscription;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.user.restaurantId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    // If table count changed, generate new tables
    if (updates.tableCount) {
      await generateTablesForRestaurant(restaurant);
    }

    res.json({ restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Update failed.', error: error.message });
  }
};

// Generate QR codes for all tables
async function generateTablesForRestaurant(restaurant) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  for (let i = 1; i <= restaurant.tableCount; i++) {
    const existingTable = await Table.findOne({ restaurantId: restaurant._id, number: i });
    if (existingTable) continue;

    const url = `${clientUrl}/r/${restaurant.slug}/table/${i}`;
    const qrCode = await QRCode.toDataURL(url, { width: 400, margin: 2 });

    await Table.create({
      number: i,
      restaurantId: restaurant._id,
      name: `Table ${i}`,
      qrCode,
    });
  }
}

exports.generateTablesForRestaurant = generateTablesForRestaurant;

// Get all tables for restaurant
exports.getTables = async (req, res) => {
  try {
    const tables = await Table.find({ restaurantId: req.restaurantId || req.params.restaurantId })
      .sort({ number: 1 });
    res.json({ tables });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tables.', error: error.message });
  }
};

// Update table status
exports.updateTable = async (req, res) => {
  try {
    const table = await Table.findOneAndUpdate(
      { _id: req.params.tableId, restaurantId: req.restaurantId },
      { $set: req.body },
      { new: true }
    );
    if (!table) return res.status(404).json({ message: 'Table not found.' });
    res.json({ table });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update table.', error: error.message });
  }
};

// Get staff list
exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ restaurantId: req.restaurantId, role: { $in: ['admin', 'kitchen', 'waiter'] } })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch staff.', error: error.message });
  }
};

// Update staff member
exports.updateStaff = async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    const staff = await User.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { $set: { name, email, phone, role } },
      { new: true, runValidators: true }
    ).select('-password');
    if (!staff) return res.status(404).json({ message: 'Staff member not found.' });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update staff.', error: error.message });
  }
};

// Delete staff member
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await User.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!staff) return res.status(404).json({ message: 'Staff member not found.' });
    res.json({ message: 'Staff member removed.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete staff.', error: error.message });
  }
};

// Get restaurant settings
exports.getSettings = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId).select('-razorpayKeySecret');
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });
    res.json({
      name: restaurant.name,
      slug: restaurant.slug,
      address: restaurant.address ? `${restaurant.address.street || ''}, ${restaurant.address.city || ''}`.replace(/^,\s*/, '').trim() : '',
      phone: restaurant.phone,
      email: restaurant.email,
      // GST & billing
      gstin: restaurant.gstin || '',
      fssaiLicense: restaurant.fssaiLicense || '',
      cgstPercent: restaurant.cgstPercent ?? 2.5,
      sgstPercent: restaurant.sgstPercent ?? 2.5,
      serviceChargePercent: restaurant.serviceChargePercent ?? 0,
      defaultHsnCode: restaurant.defaultHsnCode || '996331',
      upiId: restaurant.upiId || '',
      // Loyalty
      loyaltyEnabled: restaurant.loyaltyEnabled || false,
      loyaltyPointsPerRupee: restaurant.loyaltyPointsPerRupee ?? 1,
      loyaltyRedemptionRate: restaurant.loyaltyRedemptionRate ?? 0.25,
      // Language
      language: restaurant.language || 'en',
      // Aggregators
      swiggyEnabled: restaurant.aggregators?.swiggy?.enabled || false,
      swiggyStoreId: restaurant.aggregators?.swiggy?.storeId || '',
      zomatoEnabled: restaurant.aggregators?.zomato?.enabled || false,
      zomatoResId: restaurant.aggregators?.zomato?.resId || '',
      // Theme & template
      theme: restaurant.theme || {},
      activeTemplate: restaurant.activeTemplate || 'royal-3d',
      payment: { razorpayKeyId: restaurant.razorpayKeyId || '', autoRefund: true },
      notifications: { orderAlerts: true, waiterCalls: true, lowStock: true, autoRemindDelay: 7, customerCancelDelay: 10 },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get settings.', error: error.message });
  }
};

// Update restaurant settings
exports.updateSettings = async (req, res) => {
  try {
    const {
      name, slug, email, phone, address,
      gstin, fssaiLicense, cgstPercent, sgstPercent, serviceChargePercent, defaultHsnCode, upiId,
      loyaltyEnabled, loyaltyPointsPerRupee, loyaltyRedemptionRate,
      language, swiggyEnabled, swiggyStoreId, zomatoEnabled, zomatoResId,
      theme, activeTemplate, payment, notifications,
    } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (slug) updates.slug = slug;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (address) updates.address = { street: address };
    // GST & billing
    if (gstin !== undefined) updates.gstin = gstin;
    if (fssaiLicense !== undefined) updates.fssaiLicense = fssaiLicense;
    if (cgstPercent !== undefined) updates.cgstPercent = Math.min(14, Math.max(0, Number(cgstPercent)));
    if (sgstPercent !== undefined) updates.sgstPercent = Math.min(14, Math.max(0, Number(sgstPercent)));
    if (serviceChargePercent !== undefined) updates.serviceChargePercent = Math.min(30, Math.max(0, Number(serviceChargePercent)));
    if (defaultHsnCode !== undefined) updates.defaultHsnCode = defaultHsnCode;
    if (upiId !== undefined) updates.upiId = upiId;
    // Loyalty
    if (loyaltyEnabled !== undefined) updates.loyaltyEnabled = loyaltyEnabled;
    if (loyaltyPointsPerRupee !== undefined) updates.loyaltyPointsPerRupee = Number(loyaltyPointsPerRupee);
    if (loyaltyRedemptionRate !== undefined) updates.loyaltyRedemptionRate = Number(loyaltyRedemptionRate);
    // Language & aggregators
    if (language) updates.language = language;
    if (swiggyEnabled !== undefined) updates['aggregators.swiggy.enabled'] = swiggyEnabled;
    if (swiggyStoreId !== undefined) updates['aggregators.swiggy.storeId'] = swiggyStoreId;
    if (zomatoEnabled !== undefined) updates['aggregators.zomato.enabled'] = zomatoEnabled;
    if (zomatoResId !== undefined) updates['aggregators.zomato.resId'] = zomatoResId;
    if (theme) updates.theme = theme;
    if (activeTemplate) updates.activeTemplate = activeTemplate;
    if (payment) {
      if (payment.razorpayKeyId) updates.razorpayKeyId = payment.razorpayKeyId;
      if (payment.razorpayKeySecret) updates.razorpayKeySecret = payment.razorpayKeySecret;
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-razorpayKeySecret');
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });
    res.json({ restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings.', error: error.message });
  }
};

// Batch update table floor-plan positions
exports.updateTablePositions = async (req, res) => {
  try {
    const { tables } = req.body; // [{ _id, posX, posY, area, shape, seats, name }]
    if (!Array.isArray(tables)) return res.status(400).json({ message: 'tables array required' });
    const ops = tables.map(t => ({
      updateOne: {
        filter: { _id: t._id, restaurantId: req.restaurantId },
        update: { $set: { posX: t.posX || 0, posY: t.posY || 0, area: t.area || 'Main Hall', shape: t.shape || 'square', seats: t.seats || 4, name: t.name || '' } },
      },
    }));
    await Table.bulkWrite(ops);
    const updated = await Table.find({ restaurantId: req.restaurantId }).sort({ number: 1 });
    res.json({ tables: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update positions.', error: error.message });
  }
};

// Get restaurant stats
exports.getStats = async (req, res) => {
  try {
    const Order = require('../models/Order');
    const Session = require('../models/Session');
    const rId = req.restaurantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, activeOrders, activeSessions, totalRevenue] = await Promise.all([
      Order.countDocuments({ restaurantId: rId, createdAt: { $gte: today } }),
      Order.countDocuments({ restaurantId: rId, orderStatus: { $nin: ['completed', 'cancelled', 'served'] } }),
      Session.countDocuments({ restaurantId: rId, status: 'active' }),
      Order.aggregate([
        { $match: { restaurantId: rId, paymentStatus: 'paid', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
    ]);

    res.json({
      todayOrders,
      activeOrders,
      activeSessions,
      todayRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get stats.', error: error.message });
  }
};
