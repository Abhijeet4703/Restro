/**
 * generateInvoicePDF.js
 * Produces a GST-compliant A4 tax invoice PDF for Indian restaurants.
 * Uses pdfkit — no external fonts required.
 */

const PDFDocument = require('pdfkit');

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(n) {
  return '\u20B9' + Number(n || 0).toFixed(2);
}
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * @param {Object} bill  - Mongoose Bill document (lean or populated)
 * @param {Object} restaurant - Mongoose Restaurant document (lean)
 * @returns {Promise<Buffer>}
 */
function generateInvoicePDF(bill, restaurant) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Invoice ${bill.billNumber}` } });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - 80; // usable width (margins 40 each side)
      const L = 40; // left margin
      let y = 40;

      // ── HEADER ────────────────────────────────────────────────────────────
      doc.rect(L, y, W, 90).fill('#1a1a2e');

      doc.fillColor('#ffffff')
        .font('Helvetica-Bold').fontSize(20)
        .text(restaurant.name || 'Restaurant', L + 16, y + 14, { width: W - 32 });

      const restAddr = [restaurant.address, restaurant.city, restaurant.state].filter(Boolean).join(', ');
      doc.font('Helvetica').fontSize(9).fillColor('#ccccdd')
        .text(restAddr || '', L + 16, y + 38, { width: W - 32 });

      const restContact = [restaurant.phone, restaurant.email].filter(Boolean).join('  |  ');
      doc.fontSize(9).text(restContact || '', L + 16, y + 52, { width: W - 32 });

      // GSTIN / FSSAI on the right side of header
      const gstin = bill.gstin || restaurant.gstin || '';
      const fssai = bill.fssaiLicense || restaurant.fssaiLicense || '';
      if (gstin) {
        doc.fillColor('#a5f3fc').fontSize(8).font('Helvetica-Bold')
          .text(`GSTIN: ${gstin}`, L + 16, y + 66, { width: W - 32 });
      }
      if (fssai) {
        doc.fillColor('#a5f3fc').fontSize(8).font('Helvetica')
          .text(`FSSAI: ${fssai}`, L + 16 + (gstin ? 200 : 0), y + 66);
      }

      y += 100;

      // ── TAX INVOICE TITLE BAR ─────────────────────────────────────────────
      doc.rect(L, y, W, 22).fill('#f0f0f0');
      doc.fillColor('#1a1a2e').font('Helvetica-Bold').fontSize(11)
        .text('TAX INVOICE', L, y + 5, { width: W, align: 'center' });
      y += 30;

      // ── INVOICE META (two-column grid) ────────────────────────────────────
      const col1 = L;
      const col2 = L + W / 2 + 10;
      const colW = W / 2 - 10;

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#555555').text('Invoice No:', col1, y);
      doc.font('Helvetica').fillColor('#111111').text(bill.billNumber || '', col1 + 75, y);

      doc.font('Helvetica-Bold').fillColor('#555555').text('Date:', col2, y);
      doc.font('Helvetica').fillColor('#111111').text(fmtDate(bill.createdAt), col2 + 45, y);

      y += 14;

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#555555').text('Table:', col1, y);
      doc.font('Helvetica').fillColor('#111111').text(
        bill.tableNumber > 0 ? `Table ${bill.tableNumber}` : (bill.orderType || 'Dine-In'),
        col1 + 75, y
      );

      doc.font('Helvetica-Bold').fillColor('#555555').text('Time:', col2, y);
      doc.font('Helvetica').fillColor('#111111').text(fmtTime(bill.createdAt), col2 + 45, y);

      y += 14;

      if (bill.customerName) {
        doc.font('Helvetica-Bold').fillColor('#555555').text('Customer:', col1, y);
        doc.font('Helvetica').fillColor('#111111').text(bill.customerName, col1 + 75, y);
        y += 14;
      }
      if (bill.customerPhone) {
        doc.font('Helvetica-Bold').fillColor('#555555').text('Mobile:', col1, y);
        doc.font('Helvetica').fillColor('#111111').text(bill.customerPhone, col1 + 75, y);
        y += 14;
      }
      if (bill.waiterName) {
        doc.font('Helvetica-Bold').fillColor('#555555').text('Served by:', col1, y);
        doc.font('Helvetica').fillColor('#111111').text(bill.waiterName, col1 + 75, y);
        y += 14;
      }

      y += 10;

      // ── ITEMS TABLE ───────────────────────────────────────────────────────
      const colWidths = [30, 200, 55, 60, 60, 70]; // #, Name, HSN, Rate, Qty, Amount
      const colHeaders = ['#', 'Item Description', 'HSN', 'Rate', 'Qty', 'Amount'];
      const colX = [L];
      for (let i = 0; i < colWidths.length - 1; i++) colX.push(colX[i] + colWidths[i]);

      // Table header
      doc.rect(L, y, W, 18).fill('#1a1a2e');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
      colHeaders.forEach((h, i) => {
        const align = i >= 2 ? 'right' : (i === 1 ? 'left' : 'center');
        doc.text(h, colX[i] + 3, y + 5, { width: colWidths[i] - 3, align });
      });
      y += 20;

      // Table rows
      const items = bill.items || [];
      items.forEach((item, idx) => {
        const rowH = 16;
        if (idx % 2 === 0) doc.rect(L, y - 1, W, rowH + 1).fill('#f9f9f9');
        else doc.rect(L, y - 1, W, rowH + 1).fill('#ffffff');

        const lineAmt = (item.price * item.quantity) - (item.itemDiscount || 0);
        doc.fillColor(item.isComp ? '#888888' : '#111111').font('Helvetica').fontSize(8);

        doc.text(String(idx + 1), colX[0] + 3, y + 3, { width: colWidths[0] - 3, align: 'center' });
        let itemName = item.name;
        if (item.isComp) itemName += ' (COMP)';
        doc.text(itemName, colX[1] + 3, y + 3, { width: colWidths[1] - 6 });
        doc.text(item.hsnCode || '996331', colX[2] + 3, y + 3, { width: colWidths[2] - 3, align: 'right' });
        doc.text(fmtCurrency(item.price), colX[3] + 3, y + 3, { width: colWidths[3] - 3, align: 'right' });
        doc.text(String(item.quantity), colX[4] + 3, y + 3, { width: colWidths[4] - 3, align: 'right' });
        doc.text(item.isComp ? 'COMP' : fmtCurrency(lineAmt), colX[5] + 3, y + 3, { width: colWidths[5] - 6, align: 'right' });

        y += rowH;
      });

      // Bottom border of table
      doc.moveTo(L, y).lineTo(L + W, y).stroke('#cccccc');
      y += 12;

      // ── TOTALS SECTION ────────────────────────────────────────────────────
      const totalsX = L + W - 210;
      const labelW = 130;
      const valW = 75;

      function totalsRow(label, value, bold = false, highlight = false) {
        if (highlight) doc.rect(totalsX, y - 2, 210, 16).fill('#1a1a2e');
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
          .fillColor(highlight ? '#ffffff' : '#333333')
          .text(label, totalsX + 5, y, { width: labelW });
        doc.text(value, totalsX + labelW, y, { width: valW, align: 'right' });
        y += 16;
      }

      totalsRow('Subtotal', fmtCurrency(bill.subtotal));

      if (bill.discountAmount > 0) {
        const dlabel = bill.discountType === 'percent'
          ? `Discount (${bill.discountValue}%)`
          : 'Discount';
        totalsRow(dlabel, `- ${fmtCurrency(bill.discountAmount)}`);
      }
      if (bill.serviceChargeAmount > 0) {
        totalsRow(`Service Charge (${bill.serviceChargePercent}%)`, fmtCurrency(bill.serviceChargeAmount));
      }
      if (bill.cgstAmount > 0) {
        totalsRow(`CGST (${bill.cgstPercent}%)`, fmtCurrency(bill.cgstAmount));
      }
      if (bill.sgstAmount > 0) {
        totalsRow(`SGST (${bill.sgstPercent}%)`, fmtCurrency(bill.sgstAmount));
      }
      if (bill.roundOff && bill.roundOff !== 0) {
        totalsRow('Round Off', fmtCurrency(bill.roundOff));
      }

      doc.moveTo(totalsX, y - 2).lineTo(totalsX + 210, y - 2).stroke('#cccccc');
      totalsRow('Grand Total', fmtCurrency(bill.grandTotal), true, true);

      y += 6;

      // ── PAYMENT DETAILS ────────────────────────────────────────────────────
      if (bill.payments && bill.payments.length > 0 && bill.status === 'settled') {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1a1a2e').text('Payment Details:', L, y);
        y += 14;
        bill.payments.forEach(p => {
          const methodLabel = p.method.charAt(0).toUpperCase() + p.method.slice(1);
          doc.font('Helvetica').fontSize(9).fillColor('#333333')
            .text(`${methodLabel}${p.reference ? ' (' + p.reference + ')' : ''}`, L + 10, y, { width: 180 })
            .text(fmtCurrency(p.amount), L + 200, y, { width: 100, align: 'right' });
          y += 13;
        });
        y += 4;
      }

      // ── LOYALTY POINTS ─────────────────────────────────────────────────────
      if (bill.loyaltyPointsEarned > 0) {
        doc.font('Helvetica').fontSize(9).fillColor('#16a34a')
          .text(`You earned ${bill.loyaltyPointsEarned} loyalty points on this visit!`, L, y, { width: W, align: 'center' });
        y += 14;
      }

      // ── FOOTER ────────────────────────────────────────────────────────────
      y += 10;
      doc.moveTo(L, y).lineTo(L + W, y).stroke('#cccccc');
      y += 10;

      doc.font('Helvetica').fontSize(8).fillColor('#888888')
        .text('Thank you for dining with us!', L, y, { width: W, align: 'center' });
      y += 12;
      doc.text('This is a computer-generated invoice and does not require a signature.', L, y, { width: W, align: 'center' });
      y += 12;

      if (restaurant.website) {
        doc.fillColor('#3b82f6').text(restaurant.website, L, y, { width: W, align: 'center' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateInvoicePDF;
