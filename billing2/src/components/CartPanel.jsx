import { useState } from 'react';
import { menuData } from '../data/menuData';

const CGST_RATE = 0.025;
const SGST_RATE = 0.025;

export default function CartPanel({
  order, onChangeQty, onRemove, onClear, onCheckout,
  customerName, tableNum, isMobile
}) {
  const [discountType, setDiscountType] = useState('percent');
  const [discountInput, setDiscountInput] = useState('');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountTypeApplied, setDiscountTypeApplied] = useState('percent');
  const [showPromo, setShowPromo] = useState(false);

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
    setShowPromo(false);
  };

  const handleCheckout = () => {
    if (order.length === 0) return;
    onCheckout({ subtotal, discount, cgst, sgst, grandTotal });
  };

  const canCheckout = customerName && tableNum && order.length > 0;

  return (
    <div className={`flex flex-col ${isMobile ? '' : 'h-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-saffron/10 bg-gradient-to-r from-card/60 to-surface/40">
        <h2 className="font-[Playfair_Display] text-sm font-bold tracking-[3px] uppercase text-saffron flex items-center gap-2">
          <span>🛒</span>
          Your Order
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-txt3 font-medium">
            {order.reduce((s, e) => s + e.qty, 0)} items
          </span>
          {order.length > 0 && (
            <button
              onClick={() => { onClear(); setDiscountValue(0); setDiscountInput(''); }}
              className="px-3 py-1 bg-red/10 border border-red/30 rounded-full text-red-light text-[11px] font-semibold cursor-pointer hover:bg-red/25 transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className={`flex-1 overflow-y-auto p-3 ${isMobile ? 'max-h-[38vh]' : ''}`}>
        {order.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-txt3 text-center">
            <span className="text-5xl opacity-30">🛒</span>
            <p className="text-sm font-medium font-[Playfair_Display] italic">Your cart is empty</p>
            <small className="text-[11px]">Browse the menu and tap + Add to Order</small>
          </div>
        ) : (
          order.map(entry => {
            const item = menuData.find(m => m.id === entry.id);
            return (
              <div
                key={entry.id}
                className="animate-fade-right flex items-center gap-3 px-3.5 py-2.5 bg-surface/80 border border-transparent rounded-xl mb-1.5 hover:border-saffron/20 hover:bg-gradient-to-r hover:from-saffron/5 hover:to-transparent transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-txt truncate">{item.name}</div>
                  <div className="text-[11px] text-txt3 mt-0.5">
                    ₹{item.price} × {entry.qty} ={' '}
                    <span className="text-saffron font-bold">₹{item.price * entry.qty}</span>
                  </div>
                </div>
                {/* Qty controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onChangeQty(entry.id, -1)}
                    className="w-6 h-6 border border-saffron/25 rounded-full bg-surface text-saffron flex items-center justify-center cursor-pointer hover:bg-saffron/20 transition-all text-base leading-none"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-[13px] font-bold text-txt">{entry.qty}</span>
                  <button
                    onClick={() => onChangeQty(entry.id, 1)}
                    className="w-6 h-6 border border-saffron/25 rounded-full bg-surface text-saffron flex items-center justify-center cursor-pointer hover:bg-saffron/20 transition-all text-base leading-none"
                  >
                    +
                  </button>
                  <button
                    onClick={() => onRemove(entry.id)}
                    className="ml-1 w-6 h-6 border border-red/25 rounded-full bg-surface text-red-light flex items-center justify-center cursor-pointer hover:bg-red/20 transition-all text-base leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Totals + Checkout */}
      {order.length > 0 && (
        <div className="border-t border-saffron/10 p-4 space-y-2.5 bg-card/60">
          {/* Promo code */}
          {!showPromo ? (
            <button
              onClick={() => setShowPromo(true)}
              className="text-[11px] text-txt3 hover:text-saffron transition-colors underline w-full text-center cursor-pointer"
            >
              + Apply promo / discount
            </button>
          ) : (
            <div className="flex items-center gap-2 p-2.5 bg-surface/60 rounded-xl border border-saffron/15">
              <select
                value={discountType}
                onChange={e => setDiscountType(e.target.value)}
                className="bg-surface2 border border-saffron/20 rounded-lg text-txt text-[11px] px-2 py-1.5 outline-none cursor-pointer"
              >
                <option value="percent">%</option>
                <option value="flat">₹</option>
              </select>
              <input
                type="number"
                min="0"
                placeholder="Value"
                value={discountInput}
                onChange={e => setDiscountInput(e.target.value)}
                className="flex-1 bg-surface2 border border-saffron/20 rounded-lg text-txt text-[11px] px-2 py-1.5 outline-none focus:border-saffron transition-all"
              />
              <button
                onClick={applyDiscount}
                className="px-3 py-1.5 bg-saffron/15 border border-saffron/25 text-saffron rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-saffron/30 transition-all"
              >
                Apply
              </button>
              <button
                onClick={() => setShowPromo(false)}
                className="text-txt3 text-sm cursor-pointer hover:text-red-light transition-colors leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Bill summary */}
          <div className="space-y-1">
            <TotalRow label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />
            {discount > 0 && (
              <TotalRow label="Discount" value={`− ₹${discount.toFixed(2)}`} className="text-green" />
            )}
            <TotalRow label="CGST (2.5%)" value={`₹${cgst.toFixed(2)}`} />
            <TotalRow label="SGST (2.5%)" value={`₹${sgst.toFixed(2)}`} />
          </div>

          <div className="border-b border-saffron/20" />

          <div className="flex justify-between items-center py-0.5">
            <span className="font-[Playfair_Display] text-base font-extrabold text-txt">Grand Total</span>
            <span className="text-xl font-extrabold text-saffron">₹{grandTotal.toFixed(2)}</span>
          </div>

          {/* Checkout button */}
          <button
            onClick={handleCheckout}
            disabled={!canCheckout}
            className="w-full py-3.5 bg-gradient-to-r from-saffron-dark to-red rounded-xl text-white text-sm font-bold tracking-wide cursor-pointer transition-all hover:shadow-[0_0_30px_rgba(255,153,51,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {!customerName || !tableNum
              ? '⚠️ Enter your name & table first'
              : '🧾 Get My Bill'}
          </button>
        </div>
      )}
    </div>
  );
}

function TotalRow({ label, value, className }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className={className || 'text-txt3'}>{label}</span>
      <span className={className || 'text-txt2'}>{value}</span>
    </div>
  );
}
