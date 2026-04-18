const Bill = require('../models/Bill');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Restaurant = require('../models/Restaurant');
const Session = require('../models/Session');
const mongoose = require('mongoose');

const generateBillNumber = async (restaurantId) => {
  const today = new Date();
  const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await Bill.countDocuments({
    restaurantId,
    createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) },
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

// Create / save a bill
exports.createBill = async (req, res) => {
  try {
    const {
      items, orderType, tableNumber, guests, waiterName,
      customerPhone, customerName, deliveryAddress,
      discountType, discountValue, discountReason,
      serviceChargePercent, payments, orderIds,
      loyaltyPointsRedeemed, holdReason,
    } = req.body;

    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });

    const billNumber = await generateBillNumber(req.restaurantId);

    // Calculate amounts
    const billItems = (items || []).map(item => ({
      menuItemId: item.menuItemId || undefined,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes || '',
      isComp: item.isComp || false,
      compReason: item.compReason || '',
      itemDiscount: item.itemDiscount || 0,
      hsnCode: item.hsnCode || restaurant.defaultHsnCode || '996331',
    }));

    const subtotal = billItems.reduce((sum, item) => {
      if (item.isComp) return sum;
      return sum + ((item.price * item.quantity) - (item.itemDiscount || 0));
    }, 0);

    let discountAmount = 0;
    if (discountType === 'percent') {
      discountAmount = Math.min(subtotal * ((discountValue || 0) / 100), subtotal);
    } else if (discountType === 'flat') {
      discountAmount = Math.min(discountValue || 0, subtotal);
    }

    const afterDiscount = subtotal - discountAmount;
    const svcPct = serviceChargePercent != null ? serviceChargePercent : (restaurant.serviceChargePercent || 0);
    const serviceChargeAmount = afterDiscount * (svcPct / 100);
    const taxableAmount = afterDiscount + serviceChargeAmount;

    // Loyalty redemption
    const loyaltyDiscount = (loyaltyPointsRedeemed || 0) * (restaurant.loyaltyRedemptionRate || 0.25);

    const cgstPct = restaurant.cgstPercent || 2.5;
    const sgstPct = restaurant.sgstPercent || 2.5;
    const cgstAmount = (taxableAmount - loyaltyDiscount) * (cgstPct / 100);
    const sgstAmount = (taxableAmount - loyaltyDiscount) * (sgstPct / 100);
    const rawTotal = taxableAmount - loyaltyDiscount + cgstAmount + sgstAmount;
    const grandTotal = Math.round(rawTotal);
    const roundOff = +(grandTotal - rawTotal).toFixed(2);

    // Payment settlement
    const paymentEntries = (payments || []).map(p => ({
      method: p.method,
      amount: p.amount,
      reference: p.reference || '',
    }));
    const totalPaid = paymentEntries.reduce((s, p) => s + p.amount, 0);
    const isSettled = totalPaid >= grandTotal && paymentEntries.length > 0;

    const bill = await Bill.create({
      billNumber,
      restaurantId: req.restaurantId,
      orderIds: orderIds || [],
      orderType: orderType || 'dine-in',
      tableNumber: tableNumber || 0,
      guests: guests || 1,
      waiterName: waiterName || '',
      createdBy: req.user._id,
      customerPhone: customerPhone || '',
      customerName: customerName || '',
      deliveryAddress: deliveryAddress || '',
      items: billItems,
      subtotal,
      discountType: discountType || 'none',
      discountValue: discountValue || 0,
      discountAmount,
      discountReason: discountReason || '',
      serviceChargePercent: svcPct,
      serviceChargeAmount,
      cgstPercent: cgstPct,
      cgstAmount,
      sgstPercent: sgstPct,
      sgstAmount,
      roundOff,
      grandTotal,
      gstin: restaurant.gstin || '',
      fssaiLicense: restaurant.fssaiLicense || '',
      hsnCode: restaurant.defaultHsnCode || '996331',
      payments: paymentEntries,
      totalPaid,
      status: holdReason ? 'hold' : (isSettled ? 'settled' : 'open'),
      holdReason: holdReason || '',
      settledAt: isSettled ? new Date() : undefined,
      loyaltyPointsRedeemed: loyaltyPointsRedeemed || 0,
      loyaltyPointsEarned: restaurant.loyaltyEnabled ? Math.floor(grandTotal * (restaurant.loyaltyPointsPerRupee || 1) / 100) : 0,
    });

    // Update customer loyalty
    if (customerPhone && isSettled) {
      await updateCustomerLoyalty(req.restaurantId, customerPhone, customerName, grandTotal, bill.loyaltyPointsEarned, loyaltyPointsRedeemed || 0);
    }

    // Mark orders as completed if settled
    if (isSettled && orderIds && orderIds.length > 0) {
      await Order.updateMany(
        { _id: { $in: orderIds }, restaurantId: req.restaurantId },
        { paymentStatus: 'paid' }
      );
    }

    res.status(201).json({ bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create bill.', error: error.message });
  }
};

// Put bill on hold
exports.holdBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.billId, restaurantId: req.restaurantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    if (bill.status !== 'open') return res.status(400).json({ message: 'Only open bills can be held.' });

    bill.status = 'hold';
    bill.holdReason = req.body.reason || '';
    await bill.save();
    res.json({ bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to hold bill.', error: error.message });
  }
};

// Resume held bill
exports.resumeBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.billId, restaurantId: req.restaurantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    if (bill.status !== 'hold') return res.status(400).json({ message: 'Only held bills can be resumed.' });

    bill.status = 'open';
    bill.holdReason = '';
    await bill.save();
    res.json({ bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to resume bill.', error: error.message });
  }
};

// Settle bill with payment(s)
exports.settleBill = async (req, res) => {
  try {
    const { payments } = req.body;
    const bill = await Bill.findOne({ _id: req.params.billId, restaurantId: req.restaurantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    if (bill.status === 'settled') return res.status(400).json({ message: 'Bill already settled.' });
    if (bill.status === 'void') return res.status(400).json({ message: 'Cannot settle a voided bill.' });

    const paymentEntries = (payments || []).map(p => ({
      method: p.method,
      amount: p.amount,
      reference: p.reference || '',
    }));
    const totalPaid = paymentEntries.reduce((s, p) => s + p.amount, 0);

    if (totalPaid < bill.grandTotal) {
      return res.status(400).json({ message: `Insufficient payment. Need ₹${bill.grandTotal}, got ₹${totalPaid}` });
    }

    bill.payments = paymentEntries;
    bill.totalPaid = totalPaid;
    bill.status = 'settled';
    bill.settledAt = new Date();
    await bill.save();

    // Update customer loyalty
    const restaurant = await Restaurant.findById(req.restaurantId);
    if (bill.customerPhone && restaurant) {
      const earned = restaurant.loyaltyEnabled ? Math.floor(bill.grandTotal * (restaurant.loyaltyPointsPerRupee || 1) / 100) : 0;
      bill.loyaltyPointsEarned = earned;
      await bill.save();
      await updateCustomerLoyalty(req.restaurantId, bill.customerPhone, bill.customerName, bill.grandTotal, earned, bill.loyaltyPointsRedeemed);
    }

    // Mark orders as paid
    if (bill.orderIds && bill.orderIds.length > 0) {
      await Order.updateMany(
        { _id: { $in: bill.orderIds }, restaurantId: req.restaurantId },
        { paymentStatus: 'paid' }
      );
    }

    res.json({ bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to settle bill.', error: error.message });
  }
};

// Void a bill
exports.voidBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.billId, restaurantId: req.restaurantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    if (bill.status === 'void') return res.status(400).json({ message: 'Bill already voided.' });

    bill.status = 'void';
    bill.voidReason = req.body.reason || 'Voided by admin';
    await bill.save();
    res.json({ bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to void bill.', error: error.message });
  }
};

// Get all bills (with filters)
exports.getBills = async (req, res) => {
  try {
    const { status, date, tableNumber } = req.query;
    const filter = { restaurantId: req.restaurantId };
    if (status) filter.status = status;
    if (tableNumber) filter.tableNumber = parseInt(tableNumber);
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.createdAt = { $gte: d, $lt: next };
    }

    const bills = await Bill.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ bills });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get bills.', error: error.message });
  }
};

// Get single bill
exports.getBillById = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.billId, restaurantId: req.restaurantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    res.json({ bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get bill.', error: error.message });
  }
};

// Z-Report: daily shift close summary
exports.getZReport = async (req, res) => {
  try {
    const { date } = req.query;
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const filter = {
      restaurantId: req.restaurantId,
      createdAt: { $gte: d, $lt: next },
      status: { $ne: 'void' },
    };

    const bills = await Bill.find(filter);
    const settled = bills.filter(b => b.status === 'settled');
    const open = bills.filter(b => b.status === 'open');
    const held = bills.filter(b => b.status === 'hold');

    // Payment breakdown
    const paymentBreakdown = { cash: 0, card: 0, upi: 0, razorpay: 0, wallet: 0 };
    settled.forEach(b => {
      b.payments.forEach(p => {
        paymentBreakdown[p.method] = (paymentBreakdown[p.method] || 0) + p.amount;
      });
    });

    const totalRevenue = settled.reduce((s, b) => s + b.grandTotal, 0);
    const totalTax = settled.reduce((s, b) => s + b.cgstAmount + b.sgstAmount, 0);
    const totalDiscount = settled.reduce((s, b) => s + b.discountAmount, 0);
    const totalServiceCharge = settled.reduce((s, b) => s + b.serviceChargeAmount, 0);
    const totalOrders = settled.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Order type breakdown
    const dineIn = settled.filter(b => b.orderType === 'dine-in').length;
    const takeaway = settled.filter(b => b.orderType === 'takeaway').length;
    const delivery = settled.filter(b => b.orderType === 'delivery').length;

    // Top items
    const itemMap = {};
    settled.forEach(b => {
      b.items.forEach(item => {
        if (item.isComp) return;
        const key = item.name;
        if (!itemMap[key]) itemMap[key] = { name: key, qty: 0, revenue: 0 };
        itemMap[key].qty += item.quantity;
        itemMap[key].revenue += item.price * item.quantity;
      });
    });
    const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Comp summary
    const compItems = [];
    settled.concat(open).forEach(b => {
      b.items.filter(i => i.isComp).forEach(item => {
        compItems.push({
          name: item.name,
          quantity: item.quantity,
          reason: item.compReason,
          billNumber: b.billNumber,
        });
      });
    });

    res.json({
      date: d.toISOString().split('T')[0],
      totalBills: bills.length,
      settledBills: settled.length,
      openBills: open.length,
      heldBills: held.length,
      totalRevenue,
      totalTax,
      totalDiscount,
      totalServiceCharge,
      avgTicket: +avgTicket.toFixed(2),
      paymentBreakdown,
      orderTypeBreakdown: { dineIn, takeaway, delivery },
      topItems,
      compItems,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate Z-Report.', error: error.message });
  }
};

// Submit feedback for a bill
exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bill = await Bill.findById(req.params.billId);
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });

    bill.feedbackRating = Math.min(5, Math.max(0, rating || 0));
    bill.feedbackComment = comment || '';
    await bill.save();
    res.json({ bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit feedback.', error: error.message });
  }
};

// Lookup customer by phone
exports.lookupCustomer = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone required.' });
    const customer = await Customer.findOne({ restaurantId: req.restaurantId, phone });
    res.json({ customer: customer || null });
  } catch (error) {
    res.status(500).json({ message: 'Failed to lookup customer.', error: error.message });
  }
};

// Edit bill before settlement
exports.editBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.billId, restaurantId: req.restaurantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    if (bill.status === 'settled') return res.status(400).json({ message: 'Cannot edit a settled bill.' });
    if (bill.status === 'void') return res.status(400).json({ message: 'Cannot edit a voided bill.' });

    const {
      items, discountType, discountValue, discountReason,
      serviceChargePercent, waiterName, customerPhone, customerName,
      guests, orderType, tableNumber,
    } = req.body;

    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });

    const billItems = (items || []).map(item => ({
      menuItemId: item.menuItemId || undefined,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes || '',
      isComp: item.isComp || false,
      compReason: item.compReason || '',
      itemDiscount: item.itemDiscount || 0,
      hsnCode: item.hsnCode || restaurant.defaultHsnCode || '996331',
    }));

    const subtotal = billItems.reduce((sum, item) => {
      if (item.isComp) return sum;
      return sum + ((item.price * item.quantity) - (item.itemDiscount || 0));
    }, 0);

    const dType = discountType || bill.discountType;
    const dValue = discountValue != null ? discountValue : bill.discountValue;
    let discountAmount = 0;
    if (dType === 'percent') discountAmount = Math.min(subtotal * (dValue / 100), subtotal);
    else if (dType === 'flat') discountAmount = Math.min(dValue, subtotal);

    const afterDiscount = subtotal - discountAmount;
    const svcPct = serviceChargePercent != null ? serviceChargePercent : bill.serviceChargePercent;
    const serviceChargeAmount = afterDiscount * (svcPct / 100);
    const taxableAmount = afterDiscount + serviceChargeAmount;

    const cgstPct = restaurant.cgstPercent || 2.5;
    const sgstPct = restaurant.sgstPercent || 2.5;
    const cgstAmount = taxableAmount * (cgstPct / 100);
    const sgstAmount = taxableAmount * (sgstPct / 100);
    const rawTotal = taxableAmount + cgstAmount + sgstAmount;
    const grandTotal = Math.round(rawTotal);
    const roundOff = +(grandTotal - rawTotal).toFixed(2);

    bill.items = billItems;
    bill.subtotal = subtotal;
    bill.discountType = dType;
    bill.discountValue = dValue;
    bill.discountAmount = discountAmount;
    if (discountReason != null) bill.discountReason = discountReason;
    bill.serviceChargePercent = svcPct;
    bill.serviceChargeAmount = serviceChargeAmount;
    bill.cgstPercent = cgstPct;
    bill.cgstAmount = cgstAmount;
    bill.sgstPercent = sgstPct;
    bill.sgstAmount = sgstAmount;
    bill.roundOff = roundOff;
    bill.grandTotal = grandTotal;
    if (waiterName != null) bill.waiterName = waiterName;
    if (customerPhone != null) bill.customerPhone = customerPhone;
    if (customerName != null) bill.customerName = customerName;
    if (guests != null) bill.guests = guests;
    if (orderType) bill.orderType = orderType;
    if (tableNumber != null) bill.tableNumber = tableNumber;

    await bill.save();
    res.json({ bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to edit bill.', error: error.message });
  }
};

// Split bill into N equal parts
exports.splitBill = async (req, res) => {
  try {
    const { splitCount, names } = req.body;
    const bill = await Bill.findOne({ _id: req.params.billId, restaurantId: req.restaurantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    if (bill.status === 'void') return res.status(400).json({ message: 'Cannot split a voided bill.' });

    const count = splitCount || 2;
    if (count < 2 || count > 10) return res.status(400).json({ message: 'Split count must be 2-10.' });

    bill.status = 'void';
    bill.voidReason = `Split into ${count} bills`;
    await bill.save();

    const perPerson = Math.round(bill.grandTotal / count);
    const newBills = [];
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const amount = isLast ? bill.grandTotal - (perPerson * (count - 1)) : perPerson;
      const billNumber = await generateBillNumber(req.restaurantId);
      const splitBill = await Bill.create({
        billNumber,
        restaurantId: req.restaurantId,
        orderIds: bill.orderIds,
        orderType: bill.orderType,
        tableNumber: bill.tableNumber,
        guests: bill.guests,
        waiterName: bill.waiterName,
        createdBy: req.user._id,
        customerPhone: bill.customerPhone,
        customerName: (names && names[i]) || `${bill.customerName || 'Guest'} (${i + 1}/${count})`,
        items: bill.items,
        subtotal: +(bill.subtotal / count).toFixed(2),
        discountType: bill.discountType,
        discountValue: bill.discountValue,
        discountAmount: +(bill.discountAmount / count).toFixed(2),
        discountReason: bill.discountReason,
        serviceChargePercent: bill.serviceChargePercent,
        serviceChargeAmount: +(bill.serviceChargeAmount / count).toFixed(2),
        cgstPercent: bill.cgstPercent,
        cgstAmount: +(bill.cgstAmount / count).toFixed(2),
        sgstPercent: bill.sgstPercent,
        sgstAmount: +(bill.sgstAmount / count).toFixed(2),
        roundOff: 0,
        grandTotal: amount,
        gstin: bill.gstin,
        fssaiLicense: bill.fssaiLicense,
        hsnCode: bill.hsnCode,
        payments: [],
        totalPaid: 0,
        status: 'open',
      });
      newBills.push(splitBill);
    }
    res.json({ originalBill: bill, splitBills: newBills });
  } catch (error) {
    res.status(500).json({ message: 'Failed to split bill.', error: error.message });
  }
};

// Mark bill as shared via channel
exports.markShared = async (req, res) => {
  try {
    const { via } = req.body;
    const bill = await Bill.findOne({ _id: req.params.billId, restaurantId: req.restaurantId });
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    bill.sharedVia = via || 'none';
    await bill.save();
    res.json({ bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update share status.', error: error.message });
  }
};

// Weekly analytics (real data from bills)
exports.getAnalytics = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const now = new Date();

    // --- Daily breakdown ---
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const bills = await Bill.find({ restaurantId: req.restaurantId, status: 'settled', createdAt: { $gte: d, $lt: next } });
      daily.push({
        day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        date: d.toISOString().split('T')[0],
        orders: bills.length,
        revenue: bills.reduce((s, b) => s + b.grandTotal, 0),
      });
    }

    // --- Today's hourly breakdown ---
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayBills = await Bill.find({ restaurantId: req.restaurantId, createdAt: { $gte: todayStart } });
    const hourMap = {};
    for (let h = 10; h <= 23; h++) {
      const label = h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`;
      hourMap[h] = { hour: label, orders: 0 };
    }
    todayBills.forEach(b => {
      const h = new Date(b.createdAt).getHours();
      if (hourMap[h]) hourMap[h].orders++;
    });

    // --- Top dishes & category breakdown (last N days) ---
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - days);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeBills = await Bill.find({ restaurantId: req.restaurantId, status: 'settled', createdAt: { $gte: rangeStart } });

    const itemMap = {};
    const categoryMap = {};
    rangeBills.forEach(b => {
      b.items.forEach(item => {
        if (item.isComp) return;
        const key = item.name;
        if (!itemMap[key]) itemMap[key] = { name: key, orders: 0, revenue: 0 };
        itemMap[key].orders += item.quantity;
        itemMap[key].revenue += item.price * item.quantity;
      });
    });

    // Category from menu items
    const MenuItem = require('../models/MenuItem');
    const itemNames = Object.keys(itemMap);
    if (itemNames.length > 0) {
      const menuItems = await MenuItem.find({ restaurantId: req.restaurantId, name: { $in: itemNames } }).select('name category');
      const nameToCategory = {};
      menuItems.forEach(m => { nameToCategory[m.name] = m.category; });
      Object.values(itemMap).forEach(it => {
        const cat = nameToCategory[it.name] || 'other';
        if (!categoryMap[cat]) categoryMap[cat] = { name: cat, value: 0 };
        categoryMap[cat].value += it.orders;
      });
    }

    const CATEGORY_COLORS = ['#14b8a6', '#fb923c', '#fdba74', '#a78bfa', '#f472b6', '#60a5fa', '#34d399'];
    const categories = Object.values(categoryMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((c, i) => ({ ...c, color: CATEGORY_COLORS[i] || '#94a3b8' }));
    const topDishes = Object.values(itemMap).sort((a, b) => b.orders - a.orders).slice(0, 5);

    // --- Summary metrics ---
    const totalRevenue = rangeBills.reduce((s, b) => s + b.grandTotal, 0);
    const avgOrder = rangeBills.length > 0 ? totalRevenue / rangeBills.length : 0;

    const allOrders = await Order.find({
      restaurantId: req.restaurantId,
      cookingStartedAt: { $ne: null },
      readyAt: { $ne: null },
      createdAt: { $gte: rangeStart },
    });
    const prepTimes = allOrders.filter(o => o.cookingStartedAt && o.readyAt).map(o =>
      (new Date(o.readyAt) - new Date(o.cookingStartedAt)) / 60000
    );
    const avgPrepTime = prepTimes.length > 0 ? prepTimes.reduce((s, t) => s + t, 0) / prepTimes.length : 0;

    // Payment breakdown
    const paymentBreakdown = { cash: 0, card: 0, upi: 0 };
    rangeBills.forEach(b => b.payments.forEach(p => {
      paymentBreakdown[p.method] = (paymentBreakdown[p.method] || 0) + p.amount;
    }));

    res.json({
      daily,
      hourly: Object.values(hourMap),
      topDishes,
      categories: categories.length > 0 ? categories : [
        { name: 'No data yet', value: 1, color: '#e2e8f0' },
      ],
      summary: {
        avgOrder: +avgOrder.toFixed(0),
        avgPrepTime: +avgPrepTime.toFixed(0),
        totalRevenue: +totalRevenue.toFixed(0),
        totalOrders: rangeBills.length,
      },
      paymentBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch analytics.', error: error.message });
  }
};

// Helper: update customer loyalty
async function updateCustomerLoyalty(restaurantId, phone, name, spent, earned, redeemed) {
  let customer = await Customer.findOne({ restaurantId, phone });
  if (!customer) {
    customer = new Customer({ restaurantId, phone, name: name || '' });
  }
  if (name) customer.name = name;
  customer.totalVisits += 1;
  customer.totalSpent += spent;
  customer.loyaltyPoints += earned - (redeemed || 0);
  if (customer.loyaltyPoints < 0) customer.loyaltyPoints = 0;
  customer.lastVisit = new Date();
  await customer.save();
  return customer;
}
