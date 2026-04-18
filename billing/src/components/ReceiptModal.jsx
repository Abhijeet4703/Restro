import { useRef } from 'react';
import { menuData } from '../data/menuData';

export default function ReceiptModal({ open, order, totals, paymentMethod, tableNum, orderNum, guests, onClose, onNewOrder }) {
  const paperRef = useRef(null);

  if (!open) return null;

  const now = new Date();
  const date = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString('en-IN', { hour12: true });

  const barcodeWidths = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2];

  const handlePrint = () => {
    const html = paperRef.current?.outerHTML;
    if (!html) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Masala House Receipt</title>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Poppins',sans-serif;display:flex;justify-content:center;padding:20px}.receipt-paper{width:300px;padding:24px;background:#fff8e7;color:#3e2723}</style>
    </head><body>${html}</body></html>`);
    w.document.close();
    w.onload = () => w.print();
  };

  const handleShare = () => {
    const lines = ['🪷 MASALA HOUSE — Bill', '', `Order: ${orderNum}`, `Table: ${tableNum}`, `Date: ${date}`, '', '--- Items ---'];
    order.forEach(entry => {
      const item = menuData.find(m => m.id === entry.id);
      lines.push(`${item.name} x${entry.qty} — ₹${item.price * entry.qty}`);
    });
    lines.push('', `Total: ₹${totals.grandTotal.toFixed(2)}`, '', '🙏 Thank you for dining with us!');
    navigator.clipboard.writeText(lines.join('\n'));
  };

  return (
    <div className="fixed inset-0 z-[500] bg-bg/90 backdrop-blur-2xl flex items-center justify-center transition-opacity"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-[420px] max-w-[95vw] max-h-[90vh] overflow-y-auto animate-pop-in">
        {/* Close */}
        <button onClick={onClose}
          className="absolute -top-10 right-0 w-9 h-9 border border-saffron/30 rounded-full bg-surface text-saffron text-lg flex items-center justify-center cursor-pointer hover:bg-red hover:border-red hover:text-white transition-all z-10">
          ×
        </button>

        {/* Receipt Paper */}
        <div ref={paperRef} className="receipt-paper rounded-2xl p-7 shadow-[0_0_60px_rgba(255,153,51,0.15),0_20px_60px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="text-center">
            <div className="text-4xl mb-2">🪷</div>
            <h2 className="font-[Playfair_Display] text-[22px] font-black tracking-[4px] text-[#3e2723]">MASALA HOUSE</h2>
            <p className="text-[11px] text-[#8d6e63] tracking-[2px] mt-0.5 italic">Authentic Indian Kitchen · Since 1995</p>

            {/* Ornament */}
            <div className="flex items-center justify-center gap-2 my-3">
              <span className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d7a86e] to-transparent" />
              <span className="text-[#c62828] text-xs">🔥</span>
              <span className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d7a86e] to-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-left text-xs text-[#8d6e63]">
              <div><span>Order:</span> <strong className="text-[#3e2723]">{orderNum}</strong></div>
              <div><span>Table:</span> <strong className="text-[#3e2723]">{tableNum}</strong></div>
              <div><span>Date:</span> <strong className="text-[#3e2723]">{date}</strong></div>
              <div><span>Time:</span> <strong className="text-[#3e2723]">{time}</strong></div>
              <div><span>Guests:</span> <strong className="text-[#3e2723]">{guests}</strong></div>
              <div><span>Payment:</span> <strong className="text-[#3e2723]">{paymentMethod.toUpperCase()}</strong></div>
            </div>

            <div className="flex items-center justify-center gap-2 my-3">
              <span className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d7a86e] to-transparent" />
              <span className="text-[#e67e00] text-xs">🪷</span>
              <span className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d7a86e] to-transparent" />
            </div>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_40px_60px_70px] gap-2 text-[10px] font-bold uppercase tracking-wide text-[#8d6e63] py-1">
            <span>Item</span><span className="text-center">Qty</span><span className="text-right">Rate</span><span className="text-right">Amt</span>
          </div>
          <div className="border-b border-[#d7a86e]/30 mb-1" />

          {/* Items */}
          {order.map(entry => {
            const item = menuData.find(m => m.id === entry.id);
            return (
              <div key={entry.id} className="grid grid-cols-[1fr_40px_60px_70px] gap-2 text-xs py-1 border-b border-dotted border-[#d7a86e]/20">
                <span className="font-medium text-[#3e2723]">{item.name}</span>
                <span className="text-center text-[#8d6e63]">{entry.qty}</span>
                <span className="text-right text-[#8d6e63]">₹{item.price}</span>
                <span className="text-right font-semibold text-[#3e2723]">₹{item.price * entry.qty}</span>
              </div>
            );
          })}

          <div className="flex items-center justify-center gap-2 my-3">
            <span className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d7a86e] to-transparent" />
            <span className="text-xs">🍛</span>
            <span className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d7a86e] to-transparent" />
          </div>

          {/* Totals */}
          <div className="space-y-0.5">
            <ReceiptTotalRow label="Subtotal" value={`₹${totals.subtotal.toFixed(2)}`} />
            {totals.discount > 0 && (
              <ReceiptTotalRow label="Discount" value={`- ₹${totals.discount.toFixed(2)}`} />
            )}
            <ReceiptTotalRow label="CGST (2.5%)" value={`₹${totals.cgst.toFixed(2)}`} />
            <ReceiptTotalRow label="SGST (2.5%)" value={`₹${totals.sgst.toFixed(2)}`} />
          </div>

          <div className="border-b-2 border-[#e67e00] my-2" />
          <div className="flex justify-between items-center text-lg font-extrabold text-[#3e2723] py-2.5">
            <span className="font-[Playfair_Display]">TOTAL</span>
            <span className="text-[#c62828]">₹{totals.grandTotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-center gap-2 my-2">
            <span className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d7a86e] to-transparent" />
            <span className="text-xs">🪷</span>
            <span className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d7a86e] to-transparent" />
          </div>

          <p className="text-center text-[13px] font-semibold text-[#3e2723] mt-2 font-[Playfair_Display] italic">🙏 Thank you for dining with us!</p>
          <p className="text-center text-[10px] text-[#8d6e63] mt-1">"Spices that tell the story of India"</p>

          {/* Barcode */}
          <div className="flex justify-center gap-0.5 pt-3.5 pb-1">
            {barcodeWidths.map((w, i) => (
              <span key={i} className="block h-8 bg-[#3e2723] rounded-[1px]" style={{ width: `${w}px` }} />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 mt-4">
          <button onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-saffron/20 rounded-xl bg-surface text-saffron-light text-[13px] font-semibold cursor-pointer hover:bg-surface2 hover:border-saffron hover:text-saffron transition-all">
            🖨️ Print
          </button>
          <button onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-saffron/20 rounded-xl bg-surface text-saffron-light text-[13px] font-semibold cursor-pointer hover:bg-surface2 hover:border-saffron hover:text-saffron transition-all">
            📤 Share
          </button>
          <button onClick={onNewOrder}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-saffron rounded-xl bg-gradient-to-r from-saffron-dark/20 to-red/15 text-saffron text-[13px] font-semibold cursor-pointer hover:from-saffron-dark hover:to-red hover:text-white hover:shadow-[0_0_20px_rgba(255,153,51,0.3)] transition-all">
            ✨ New Order
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptTotalRow({ label, value }) {
  return (
    <div className="flex justify-between text-xs text-[#8d6e63] py-0.5">
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
