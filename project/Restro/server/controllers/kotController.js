const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');

// Generate KOT (Kitchen Order Ticket) data for thermal printer
exports.generateKOT = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      restaurantId: req.restaurantId,
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const restaurant = await Restaurant.findById(req.restaurantId).select('name');
    const now = new Date();

    // Plain text KOT for thermal printer (80mm/58mm)
    const divider = '--------------------------------';
    const lines = [
      divider,
      centerText('** KOT **', 32),
      divider,
      `Order: ${order.orderNumber}`,
      `Table: ${order.tableNumber}  Type: ${order.orderType}`,
      `Date: ${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN', { hour12: true })}`,
      order.customerName ? `Customer: ${order.customerName}` : '',
      order.orderSource !== 'dine-in' ? `Source: ${order.orderSource.toUpperCase()}` : '',
      divider,
      padLine('ITEM', 'QTY', 20, 4),
      divider,
    ].filter(Boolean);

    order.items.forEach(item => {
      lines.push(padLine(item.name.slice(0, 20), `x${item.quantity}`, 20, 4));
      if (item.notes) lines.push(`  > ${item.notes.slice(0, 28)}`);
    });

    lines.push(divider);
    if (order.isPriority) lines.push(centerText('*** PRIORITY ***', 32));
    lines.push(centerText(restaurant?.name || 'Kitchen', 32));
    lines.push(divider);
    lines.push('');

    // ESC/POS commands for thermal printer
    const escpos = {
      init: '\x1B\x40',           // Initialize
      bold_on: '\x1B\x45\x01',    // Bold on
      bold_off: '\x1B\x45\x00',   // Bold off
      center: '\x1B\x61\x01',     // Center align
      left: '\x1B\x61\x00',       // Left align
      cut: '\x1D\x56\x00',        // Full cut
      feed: '\x0A',               // Line feed
      double_h: '\x1B\x21\x10',   // Double height
      normal: '\x1B\x21\x00',     // Normal size
    };

    res.json({
      text: lines.join('\n'),
      escpos: buildEscPos(escpos, order, restaurant?.name || 'Kitchen', now),
      order: {
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        items: order.items,
        orderType: order.orderType,
        orderSource: order.orderSource,
        isPriority: order.isPriority,
        customerName: order.customerName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate KOT.', error: error.message });
  }
};

// Generate printable bill for thermal printer
exports.generatePrintBill = async (req, res) => {
  try {
    const Bill = require('../models/Bill');
    const bill = await Bill.findOne({
      _id: req.params.billId,
      restaurantId: req.restaurantId,
    });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const restaurant = await Restaurant.findById(req.restaurantId)
      .select('name gstin fssaiLicense address');
    const now = new Date(bill.createdAt);
    const divider = '================================';
    const thinDiv = '--------------------------------';

    const lines = [
      centerText(restaurant?.name?.toUpperCase() || 'RESTAURANT', 32),
      restaurant?.gstin ? centerText(`GSTIN: ${restaurant.gstin}`, 32) : '',
      restaurant?.fssaiLicense ? centerText(`FSSAI: ${restaurant.fssaiLicense}`, 32) : '',
      divider,
      centerText('TAX INVOICE', 32),
      thinDiv,
      `Bill: ${bill.billNumber}`,
      `Type: ${bill.orderType}`,
      bill.tableNumber ? `Table: ${bill.tableNumber}  Guests: ${bill.guests || '-'}` : '',
      bill.customerName ? `Customer: ${bill.customerName}` : '',
      bill.customerPhone ? `Phone: ${bill.customerPhone}` : '',
      bill.waiterName ? `Waiter: ${bill.waiterName}` : '',
      `Date: ${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN', { hour12: true })}`,
      thinDiv,
      padLine('ITEM', 'AMT', 20, 8),
      thinDiv,
    ].filter(Boolean);

    (bill.items || []).forEach(item => {
      if (item.isComp) {
        lines.push(padLine(`${item.name.slice(0, 18)}`, 'COMP', 20, 8));
      } else {
        lines.push(padLine(`${item.name.slice(0, 14)} x${item.quantity}`, `${item.price * item.quantity}`, 20, 8));
      }
    });

    lines.push(thinDiv);
    lines.push(padLine('Subtotal:', `${bill.subtotal || 0}`, 20, 8));
    if (bill.discountAmount > 0) lines.push(padLine('Discount:', `-${bill.discountAmount}`, 20, 8));
    if (bill.serviceChargeAmount > 0) lines.push(padLine('Svc Charge:', `${bill.serviceChargeAmount}`, 20, 8));
    lines.push(padLine('CGST:', `${bill.cgstAmount || 0}`, 20, 8));
    lines.push(padLine('SGST:', `${bill.sgstAmount || 0}`, 20, 8));
    if (bill.roundOff) lines.push(padLine('Round Off:', `${bill.roundOff}`, 20, 8));
    lines.push(divider);
    lines.push(padLine('TOTAL:', `Rs.${bill.grandTotal}`, 18, 10));
    lines.push(divider);
    const paymentStr = (bill.payments || []).map(p => `${p.method}: Rs.${p.amount}`).join(' | ');
    lines.push(centerText(paymentStr || 'CASH', 32));
    lines.push(thinDiv);
    lines.push(centerText('Thank you!', 32));
    lines.push('');

    res.json({ text: lines.join('\n'), bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate print bill.', error: error.message });
  }
};

// Helpers
function centerText(text, width) {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

function padLine(left, right, leftW, rightW) {
  const l = left.slice(0, leftW).padEnd(leftW);
  const r = right.toString().slice(0, rightW).padStart(rightW);
  const gap = Math.max(1, 32 - leftW - rightW);
  return l + ' '.repeat(gap) + r;
}

function buildEscPos(esc, order, restName, now) {
  // Returns a hex string that can be sent to USB/Bluetooth thermal printer
  let data = esc.init;
  data += esc.center + esc.double_h + '** KOT **' + esc.feed;
  data += esc.normal + esc.left;
  data += `Order: ${order.orderNumber}` + esc.feed;
  data += `Table: ${order.tableNumber}  ${order.orderType}` + esc.feed;
  data += `${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN', { hour12: true })}` + esc.feed;
  data += '--------------------------------' + esc.feed;
  data += esc.bold_on;
  order.items.forEach(item => {
    data += `${item.name.slice(0, 22).padEnd(22)} x${item.quantity}` + esc.feed;
    if (item.notes) data += esc.bold_off + `  > ${item.notes.slice(0, 28)}` + esc.feed + esc.bold_on;
  });
  data += esc.bold_off;
  data += '--------------------------------' + esc.feed;
  data += esc.center + restName + esc.feed;
  data += esc.feed + esc.feed + esc.cut;
  return data;
}
