import { useState } from 'react';
import { menuData } from '../data/menuData';

const CGST_RATE = 0.025;
const SGST_RATE = 0.025;

export default function InvoicePanel({ order, onChangeQty, onRemove, onClear, onGenerateBill, paymentMethod, onPaymentChange }) {
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState('percent');
  const [discountInput, setDiscountInput] = useState('');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountTypeApplied, setDiscountTypeApplied] = useState('percent');

  const subtotal = order.reduce((sum, entry) => {
    const item = menuData.find(m => m.id === entry.id);
    return sum + item.price * entry.qty;
  }, 0);

  const discount = Math.min(
    discountTypeApplied === 'percent' ? subtotal * (discountValue / 100) : discountValue,
    subtotal
  );
  const afterDiscount = subtotal - discount;
  const cgst = afterDiscount * CGST_RATE;
  const sgst = afterDiscount * SGST_RATE;
  const grandTotal = afterDiscount + cgst + sgst;

  const applyDiscount = () => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0) {
      setDiscountValue(0);
    } else {
      setDiscountValue(discountType === 'percent' ? Math.min(val, 100) : val);
      setDiscountTypeApplied(discountType);
    }
    setShowDiscount(false);
  };

  const handleGenerate = () => {
    if (order.length === 0) return;
    onGenerateBill({ subtotal, discount, cgst, sgst, grandTotal });
  };

  const payMethods = [
    { key: 'cash', label: 'Cash', icon: '💵' },
    { key: 'card', label: 'Card', icon: '💳' },
    { key: 'upi',  label: 'UPI',  icon: '📱' },
    { key: 'split', label: 'Split', icon: '✂️' },
  ];

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-saffron/10 bg-gradient-to-r from-card/60 to-surface/40">
        <h2 className="font-[Playfair_Display] text-sm font-bold tracking-[3px] uppercase text-saffron flex items-center gap-2">
          <span>🧾</span>
          Invoice
        </h2>
        <span className="text-[11px] text-txt3 font-medium">{order.length} items</span>
        <button onClick={() => { onClear(); setDiscountValue(0); setDiscountInput(''); }}
          className="px-3.5 py-1.5 bg-red/10 border border-red/30 rounded-full text-red-light text-[11px] font-semibold tracking-wide uppercase cursor-pointer hover:bg-red/25 hover:shadow-[0_0_16px_rgba(198,40,40,0.2)] transition-all">
          🗑️ Clear All
        </button>
      </div>

      {/* Order Items */}
      <div className="flex-1 overflow-y-auto p-3">
        {order.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-txt3 text-center">
            <span className="text-5xl opacity-30">🍽️</span>
            <p className="text-sm font-medium font-[Playfair_Display] italic">No items added yet</p>
            <small className="text-[11px]">Tap items from the menu to begin your order</small>
          </div>
        ) : (
          order.map(entry => {
            const item = menuData.find(m => m.id === entry.id);
            return (
              <div key={entry.id} className="animate-fade-right grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-3.5 py-2.5 bg-surface/80 border border-transparent rounded-xl mb-1.5 hover:border-saffron/20 hover:bg-gradient-to-r hover:from-saffron/5 hover:to-transparent transition-all">
                <span className="text-[13px] font-semibold text-txt truncate">{item.name}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onChangeQty(entry.id, -1)}
                    className="w-6 h-6 border border-saffron/20 rounded-full bg-surface2 text-saffron text-sm font-bold flex items-center justify-center cursor-pointer hover:border-saffron hover:bg-saffron/20 transition-all">−</button>
                  <span className="text-xs font-bold min-w-[20px] text-center text-saffron-light">{entry.qty}</span>
                  <button onClick={() => onChangeQty(entry.id, 1)}
                    className="w-6 h-6 border border-saffron/20 rounded-full bg-surface2 text-saffron text-sm font-bold flex items-center justify-center cursor-pointer hover:border-saffron hover:bg-saffron/20 transition-all">+</button>
                </div>
                <span className="text-[13px] font-bold text-saffron text-right min-w-[60px]">₹{item.price * entry.qty}</span>
                <button onClick={() => onRemove(entry.id)}
                  className="w-6 h-6 rounded-full bg-red/10 text-red-light text-sm flex items-center justify-center cursor-pointer hover:bg-red/25 transition-all">✕</button>
              </div>
            );
          })
        )}
      </div>

      {/* Totals */}
      <div className="px-5 py-3.5 border-t border-saffron/15 bg-card/60">
        <TotalRow label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />
        <div className="flex justify-between items-center py-1 text-[13px] text-txt2">
          <span className="flex items-center gap-1.5">
            Discount
            <button onClick={() => setShowDiscount(!showDiscount)} className="text-saffron hover:scale-110 transition-transform text-sm">
              ➕
            </button>
          </span>
          <span className="text-xs font-semibold text-green">- ₹{discount.toFixed(2)}</span>
        </div>

        {showDiscount && (
          <div className="flex items-center gap-1.5 py-2">
            <div className="flex border border-saffron/20 rounded-lg overflow-hidden">
              <button onClick={() => setDiscountType('percent')}
                className={`px-2.5 py-1 text-xs font-bold cursor-pointer transition-all ${discountType === 'percent' ? 'bg-saffron-dim text-saffron' : 'bg-surface2 text-txt3'}`}>%</button>
              <button onClick={() => setDiscountType('flat')}
                className={`px-2.5 py-1 text-xs font-bold cursor-pointer transition-all ${discountType === 'flat' ? 'bg-saffron-dim text-saffron' : 'bg-surface2 text-txt3'}`}>₹</button>
            </div>
            <input
              type="number"
              value={discountInput}
              onChange={e => setDiscountInput(e.target.value)}
              placeholder={discountType === 'percent' ? 'Enter %' : 'Enter ₹'}
              min="0"
              className="flex-1 min-w-0 px-2.5 py-1.5 bg-surface2 border border-saffron/15 rounded-lg text-txt text-xs outline-none focus:border-saffron"
            />
            <button onClick={applyDiscount}
              className="px-3 py-1.5 border border-saffron rounded-lg bg-saffron-dim text-saffron text-[11px] font-semibold cursor-pointer hover:bg-saffron hover:text-bg transition-all">Apply</button>
          </div>
        )}

        <TotalRow label="CGST (2.5%)" value={`₹${cgst.toFixed(2)}`} />
        <TotalRow label="SGST (2.5%)" value={`₹${sgst.toFixed(2)}`} />

        <div className="flex items-center gap-2 my-2">
          <span className="flex-1 h-px bg-gradient-to-r from-transparent via-saffron/40 to-transparent" />
          <span className="text-saffron text-xs">🪷</span>
          <span className="flex-1 h-px bg-gradient-to-r from-transparent via-saffron/40 to-transparent" />
        </div>

        <div className="flex justify-between items-center text-lg font-extrabold text-txt">
          <span className="font-[Playfair_Display]">Grand Total</span>
          <span className="text-lg bg-gradient-to-br from-saffron to-turmeric bg-clip-text text-transparent">
            ₹{grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment */}
      <div className="px-5 py-3.5 border-t border-saffron/15 bg-surface/60">
        <div className="grid grid-cols-4 gap-2 mb-3">
          {payMethods.map(m => (
            <button key={m.key} onClick={() => onPaymentChange(m.key)}
              className={`flex flex-col items-center gap-1 py-2.5 px-2 border rounded-xl text-[11px] font-semibold cursor-pointer transition-all ${
                paymentMethod === m.key
                  ? 'border-saffron bg-gradient-to-br from-saffron/20 to-red/10 text-saffron shadow-[0_0_16px_rgba(255,153,51,0.2)]'
                  : 'border-saffron/10 bg-surface text-txt3 hover:border-saffron/30 hover:text-saffron-light'
              }`}>
              <span className="text-lg">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={handleGenerate}
          className="relative w-full py-3.5 border-2 border-saffron rounded-full bg-gradient-to-r from-saffron-dark to-red text-white text-sm font-bold tracking-[4px] uppercase cursor-pointer overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(255,153,51,0.4)] hover:scale-[1.02] active:scale-100">
          <span className="relative z-10">🔥 GENERATE BILL</span>
          <span className="absolute top-0 w-[60px] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-sweep" />
        </button>
      </div>
    </div>
  );
}

function TotalRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1 text-[13px] text-txt2">
      <span>{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}
