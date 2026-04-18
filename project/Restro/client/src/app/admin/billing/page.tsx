'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { connectSocket, joinRestaurant, getSocket } from '@/lib/socket';

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface CustomerOrder {
  _id: string;
  orderNumber: string;
  tableNumber: number;
  items: OrderItem[];
  totalAmount: number;
  paymentMode: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
}

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  isVeg: boolean;
  image: string | null;
  isAvailable: boolean;
}

interface CartEntry {
  id: string; name: string; price: number; qty: number;
  isComp?: boolean; compReason?: string; itemDiscount?: number; notes?: string;
}
interface Totals {
  subtotal: number; discount: number; serviceCharge: number;
  cgst: number; sgst: number; roundOff: number; grandTotal: number;
}
interface TableInfo { _id: string; number: number; name: string; status: string; }
interface PaymentEntry { method: string; amount: number; reference?: string; }
interface CustomerInfo { phone: string; name: string; loyaltyPoints: number; totalVisits: number; totalSpent: number; }
interface HeldBill {
  _id: string; billNumber: string; tableNumber: number; grandTotal: number;
  items: CartEntry[]; holdReason: string; createdAt: string; orderType: string;
  customerPhone: string; customerName: string;
}
interface ZReport {
  date: string; totalBills: number; settledBills: number; openBills: number; heldBills: number;
  totalRevenue: number; totalTax: number; totalDiscount: number; totalServiceCharge: number; avgTicket: number;
  paymentBreakdown: Record<string, number>; orderTypeBreakdown: { dineIn: number; takeaway: number; delivery: number; };
  topItems: { name: string; qty: number; revenue: number; }[];
  compItems: { name: string; quantity: number; reason: string; billNumber: string; }[];
}

interface OnlineOrder {
  _id: string;
  orderNumber: string;
  orderSource: string;
  externalOrderId: string;
  items: OrderItem[];
  totalAmount: number;
  orderStatus: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  createdAt: string;
}

// i18n translations (English + Hindi inline, others fetched)
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    billing: 'Billing', invoice: 'Invoice', orders: 'Orders', menu: 'Menu', held: 'Held',
    dineIn: 'Dine-In', takeaway: 'Takeaway', delivery: 'Delivery',
    table: 'Table', guests: 'Guests', order: 'Order', items: 'items',
    subtotal: 'Subtotal', discount: 'Discount', serviceCharge: 'Service Charge',
    grandTotal: 'Grand Total', generateBill: 'Generate Bill',
    cash: 'Cash', card: 'Card', upi: 'UPI', split: 'Split',
    search: 'Search', clear: 'Clear', hold: 'Hold', void: 'Void',
    print: 'Print', copy: 'Copy', whatsapp: 'WhatsApp', sms: 'SMS',
    newOrder: 'New Order', cancelOrder: 'Cancel Order',
    customer: 'Customer', phone: 'Phone', name: 'Name', waiter: 'Waiter',
    zReport: 'Z-Report', revenue: 'Revenue', avgTicket: 'Avg Ticket',
    noItems: 'No items yet', addFromMenu: 'Add items from orders or menu',
    onlineOrders: 'Online', floorPlan: 'Floor Plan', kot: 'KOT', printKot: 'Print KOT',
    offline: 'Offline', syncing: 'Syncing...', synced: 'Synced', terminal: 'Terminal',
    language: 'Language', free: 'Free', occupied: 'Occupied', active: 'Active',
  },
  hi: {
    billing: 'बिलिंग', invoice: 'चालान', orders: 'ऑर्डर', menu: 'मेन्यू', held: 'रोके गए',
    dineIn: 'डाइन-इन', takeaway: 'टेकअवे', delivery: 'डिलीवरी',
    table: 'टेबल', guests: 'मेहमान', order: 'ऑर्डर', items: 'आइटम',
    subtotal: 'उप-कुल', discount: 'छूट', serviceCharge: 'सर्विस चार्ज',
    grandTotal: 'कुल राशि', generateBill: 'बिल बनाएं',
    cash: 'नकद', card: 'कार्ड', upi: 'UPI', split: 'विभाजित',
    search: 'खोजें', clear: 'साफ़', hold: 'रोकें', void: 'रद्द',
    print: 'प्रिंट', copy: 'कॉपी', whatsapp: 'व्हाट्सएप', sms: 'एसएमएस',
    newOrder: 'नया ऑर्डर', cancelOrder: 'रद्द',
    customer: 'ग्राहक', phone: 'फ़ोन', name: 'नाम', waiter: 'वेटर',
    zReport: 'जेड-रिपोर्ट', revenue: 'राजस्व', avgTicket: 'औसत टिकट',
    noItems: 'कोई आइटम नहीं', addFromMenu: 'मेन्यू से जोड़ें',
    onlineOrders: 'ऑनलाइन', floorPlan: 'फ्लोर प्लान', kot: 'KOT', printKot: 'KOT प्रिंट',
    offline: 'ऑफ़लाइन', syncing: 'सिंक हो रहा...', synced: 'सिंक', terminal: 'टर्मिनल',
    language: 'भाषा', free: 'खाली', occupied: 'व्यस्त', active: 'सक्रिय',
  },
};

const LANG_NAMES: Record<string, string> = {
  en: 'EN', hi: 'हिं', ta: 'தமி', te: 'తె', kn: 'ಕನ', ml: 'മല', mr: 'मरा', bn: 'বাং', gu: 'ગુજ', pa: 'ਪੰ',
};

const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '🍽️' },
  { key: 'starters', label: 'Starters', emoji: '🍢' },
  { key: 'main-course', label: 'Main Course', emoji: '🍛' },
  { key: 'breads', label: 'Breads', emoji: '🫓' },
  { key: 'desserts', label: 'Desserts', emoji: '🍧' },
  { key: 'drinks', label: 'Drinks', emoji: '🥤' },
  { key: 'sides', label: 'Sides', emoji: '🥗' },
  { key: 'specials', label: 'Specials', emoji: '⭐' },
];

const ORDER_TYPES = [
  { key: 'dine-in', label: 'Dine-In', icon: '🪑' },
  { key: 'takeaway', label: 'Takeaway', icon: '🥡' },
  { key: 'delivery', label: 'Delivery', icon: '🛵' },
];

const statusColor: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  approved: 'bg-blue-50 text-blue-600 border-blue-200',
  cooking: 'bg-orange-50 text-orange-600 border-orange-200',
  preparation: 'bg-purple-50 text-purple-600 border-purple-200',
  plating: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  ready: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  served: 'bg-green-50 text-green-600 border-green-200',
};

function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour12: true }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function ReceiptModal({ open, cart, totals, paymentMethod, payments, tableNum, orderNum, guests, restaurantName, gstin, fssai, serviceChargePct, orderType, customerPhone, customerName, waiterName, upiId, billId, onClose, onNewOrder }: {
  open: boolean; cart: CartEntry[]; totals: Totals; paymentMethod: string; payments: PaymentEntry[];
  tableNum: number; orderNum: string; guests: number; restaurantName: string;
  gstin?: string; fssai?: string; serviceChargePct?: number; orderType: string;
  customerPhone?: string; customerName?: string; waiterName?: string; upiId?: string; billId?: string;
  onClose: () => void; onNewOrder: () => void;
}) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);

  if (!open) return null;
  const now = new Date();
  const date = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString('en-IN', { hour12: true });
  const barcodeWidths = [2,1,3,1,2,1,1,3,2,1,1,2,3,1,1,2,1,3,1,2,1,1,3,2,1,2,1,3,1,1,2,3,1,2,1,1,3,2];

  const handlePrint = () => {
    const html = paperRef.current?.outerHTML;
    if (!html) return;
    const w = window.open('', '_blank')!;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:sans-serif;display:flex;justify-content:center;padding:20px}</style>
    </head><body>${html}</body></html>`);
    w.document.close();
    w.onload = () => w.print();
  };

  const buildBillText = () => {
    const lines = [
      `${restaurantName.toUpperCase()} — TAX INVOICE`,
      gstin ? `GSTIN: ${gstin}` : '', fssai ? `FSSAI: ${fssai}` : '',
      '', `Bill: ${orderNum}`, `Type: ${orderType.toUpperCase()}`,
      orderType === 'dine-in' ? `Table: ${tableNum} | Guests: ${guests}` : '',
      customerName ? `Customer: ${customerName}` : '',
      customerPhone ? `Phone: ${customerPhone}` : '',
      waiterName ? `Waiter: ${waiterName}` : '',
      `Date: ${date} ${time}`, '', '--- Items ---',
    ].filter(Boolean);
    cart.forEach(e => {
      if (e.isComp) lines.push(`${e.name} x${e.qty} — COMP (${e.compReason || 'Complimentary'})`);
      else lines.push(`${e.name} x${e.qty} — ₹${e.price * e.qty}`);
    });
    lines.push('', `Subtotal: ₹${totals.subtotal.toFixed(2)}`);
    if (totals.discount > 0) lines.push(`Discount: -₹${totals.discount.toFixed(2)}`);
    if (totals.serviceCharge > 0) lines.push(`Service Charge (${serviceChargePct || 0}%): ₹${totals.serviceCharge.toFixed(2)}`);
    lines.push(`CGST (2.5%): ₹${totals.cgst.toFixed(2)}`);
    lines.push(`SGST (2.5%): ₹${totals.sgst.toFixed(2)}`);
    if (totals.roundOff !== 0) lines.push(`Round Off: ₹${totals.roundOff.toFixed(2)}`);
    lines.push(`GRAND TOTAL: ₹${totals.grandTotal.toFixed(2)}`);
    if (payments.length > 1) {
      lines.push('', '--- Payments ---');
      payments.forEach(p => lines.push(`${p.method.toUpperCase()}: ₹${p.amount}`));
    } else {
      lines.push(`Payment: ${paymentMethod.toUpperCase()}`);
    }
    lines.push('', 'Thank you for dining with us!');
    return lines.join('\n');
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(buildBillText());
    toast.success('Bill copied to clipboard!');
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(buildBillText());
    const phone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/91${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
    if (billId) api.post(`/bills/${billId}/share`, { via: 'whatsapp' }).catch(() => {});
  };

  const handleSms = () => {
    const text = encodeURIComponent(buildBillText());
    const phone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
    const url = phone ? `sms:+91${phone}?body=${text}` : `sms:?body=${text}`;
    window.open(url, '_self');
    if (billId) api.post(`/bills/${billId}/share`, { via: 'sms' }).catch(() => {});
  };

  const handleFeedback = async (rating: number) => {
    setFeedbackRating(rating);
    if (billId) {
      try {
        await api.post(`/bills/${billId}/feedback`, { rating });
        setFeedbackSent(true);
        toast.success('Feedback recorded!');
      } catch { /* ignore */ }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-[440px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <button onClick={onClose}
          className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center text-lg shadow-sm cursor-pointer">x</button>

        <div ref={paperRef} style={{ background: '#fafafa', color: '#1a1a1a', borderRadius: 12, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px dashed #d1d5db', paddingBottom: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: '#6b7280', letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 4 }}>Tax Invoice</p>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: '#111827' }}>{restaurantName.toUpperCase()}</h2>
            {gstin && <p style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>GSTIN: {gstin}</p>}
            {fssai && <p style={{ fontSize: 10, color: '#6b7280' }}>FSSAI: {fssai}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', textAlign: 'left' as const, fontSize: 12, color: '#6b7280', marginTop: 12 }}>
              <div>Bill: <strong style={{ color: '#111827' }}>{orderNum}</strong></div>
              <div>Type: <strong style={{ color: '#111827' }}>{orderType === 'dine-in' ? '🪑 Dine-In' : orderType === 'takeaway' ? '🥡 Takeaway' : '🛵 Delivery'}</strong></div>
              {orderType === 'dine-in' && <div>Table: <strong style={{ color: '#111827' }}>{tableNum}</strong></div>}
              {orderType === 'dine-in' && <div>Guests: <strong style={{ color: '#111827' }}>{guests}</strong></div>}
              <div>Date: <strong style={{ color: '#111827' }}>{date}</strong></div>
              <div>Time: <strong style={{ color: '#111827' }}>{time}</strong></div>
              {customerName && <div>Customer: <strong style={{ color: '#111827' }}>{customerName}</strong></div>}
              {customerPhone && <div>Phone: <strong style={{ color: '#111827' }}>{customerPhone}</strong></div>}
              {waiterName && <div>Waiter: <strong style={{ color: '#111827' }}>{waiterName}</strong></div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px 70px', gap: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, color: '#9ca3af', padding: '4px 0' }}>
            <span>Item</span><span style={{ textAlign: 'center' }}>Qty</span><span style={{ textAlign: 'right' }}>Rate</span><span style={{ textAlign: 'right' }}>Amt</span>
          </div>
          <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 4 }} />
          {cart.map((e, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px 70px', gap: 8, fontSize: 12, padding: '5px 0', borderBottom: '1px dotted #e5e7eb' }}>
              <span style={{ fontWeight: 500, color: e.isComp ? '#9ca3af' : '#111827' }}>
                {e.name}{e.isComp ? <span style={{ fontSize: 9, color: '#ef4444', marginLeft: 4 }}>[COMP]</span> : ''}
              </span>
              <span style={{ textAlign: 'center', color: '#6b7280' }}>{e.qty}</span>
              <span style={{ textAlign: 'right', color: '#6b7280' }}>{e.isComp ? '—' : `₹${e.price}`}</span>
              <span style={{ textAlign: 'right', fontWeight: 700, color: e.isComp ? '#9ca3af' : '#111827' }}>{e.isComp ? 'COMP' : `₹${e.price * e.qty}`}</span>
            </div>
          ))}

          <div style={{ borderTop: '2px dashed #d1d5db', marginTop: 12, paddingTop: 12 }}>
            {[
              { label: 'Subtotal', val: `₹${totals.subtotal.toFixed(2)}` },
              ...(totals.discount > 0 ? [{ label: 'Discount', val: `- ₹${totals.discount.toFixed(2)}` }] : []),
              ...(totals.serviceCharge > 0 ? [{ label: `Service Charge (${serviceChargePct || 0}%)`, val: `₹${totals.serviceCharge.toFixed(2)}` }] : []),
              { label: 'CGST (2.5%)', val: `₹${totals.cgst.toFixed(2)}` },
              { label: 'SGST (2.5%)', val: `₹${totals.sgst.toFixed(2)}` },
              ...(totals.roundOff !== 0 ? [{ label: 'Round Off', val: `₹${totals.roundOff.toFixed(2)}` }] : []),
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', padding: '2px 0' }}>
                <span>{r.label}</span><span>{r.val}</span>
              </div>
            ))}
            <div style={{ borderTop: '2px solid #111827', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#111827', padding: '4px 0' }}>
              <span>GRAND TOTAL</span>
              <span style={{ color: '#059669' }}>₹{totals.grandTotal.toFixed(2)}</span>
            </div>
            {payments.length > 1 && (
              <div style={{ borderTop: '1px dashed #d1d5db', marginTop: 8, paddingTop: 8 }}>
                <p style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, marginBottom: 4 }}>PAYMENT SPLIT</p>
                {payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#374151', padding: '1px 0' }}>
                    <span>{p.method.toUpperCase()}</span><span>₹{p.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px dashed #d1d5db', marginTop: 16, paddingTop: 12, textAlign: 'center' as const }}>
            <p style={{ fontSize: 10, color: '#6b7280' }}>HSN/SAC: 996331 | Payment: {payments.length > 1 ? 'SPLIT' : paymentMethod.toUpperCase()}</p>
            {waiterName && <p style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>Served by: {waiterName}</p>}
            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 6 }}>Thank you for dining with us!</p>
            {upiId && (
              <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px dashed #d1d5db' }}>
                <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>Scan to pay via UPI</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(restaurantName)}&am=${totals.grandTotal}&cu=INR&tn=${encodeURIComponent('Bill ' + orderNum)}`)}`}
                  alt="UPI QR"
                  width={140} height={140}
                  style={{ margin: '0 auto', borderRadius: 8, border: '2px solid #e5e7eb' }}
                />
                <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>{upiId}</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 2, paddingTop: 12 }}>
              {barcodeWidths.map((w, i) => <span key={i} style={{ display: 'block', height: 28, width: w, background: '#374151', borderRadius: 1 }} />)}
            </div>
          </div>
        </div>

        {/* Feedback stars */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mt-2 text-center">
          <p className="text-xs text-gray-500 mb-1.5">{feedbackSent ? 'Thanks for your feedback!' : 'Rate this experience'}</p>
          <div className="flex justify-center gap-1">
            {[1,2,3,4,5].map(star => (
              <button key={star} onClick={() => !feedbackSent && handleFeedback(star)}
                className={`text-2xl transition-transform cursor-pointer border-0 bg-transparent ${star <= feedbackRating ? 'scale-110' : 'opacity-30 hover:opacity-60'}`}>
                ⭐
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          {[
            { icon: '🖨️', label: 'Print', fn: handlePrint },
            { icon: '📋', label: 'Copy', fn: handleShare },
            { icon: '💬', label: 'WhatsApp', fn: handleWhatsApp },
            { icon: '💬', label: 'SMS', fn: handleSms },
          ].map(b => (
            <button key={b.label} onClick={b.fn}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm">
              {b.icon} {b.label}
            </button>
          ))}
          <button onClick={onNewOrder}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 rounded-lg text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer shadow-sm">
            + New
          </button>
        </div>
      </div>
    </div>
  );
}

function TableModal({ open, tables, currentTable, onClose, onSelectTable }: {
  open: boolean; tables: TableInfo[]; currentTable: number;
  onClose: () => void; onSelectTable: (n: number) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-[520px] max-w-[95vw] bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-lg cursor-pointer border-0">✕</button>
        <h3 className="font-bold text-gray-800 text-base mb-0.5">Change Table</h3>
        <p className="text-xs text-gray-500 mb-4">Select any table — admin can access all tables</p>
        <div className="flex gap-4 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />Free</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Active (you)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Occupied</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {tables.map(t => {
            const isActive = t.number === currentTable;
            const isOccupied = t.status === 'occupied' && !isActive;
            const statusLabel = isActive ? 'Active' : isOccupied ? 'Occupied' : 'Free';
            const statusDot = isActive ? 'bg-amber-400' : isOccupied ? 'bg-red-400' : 'bg-emerald-400';
            const btnCls = isActive
              ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm'
              : isOccupied
              ? 'border-red-200 bg-red-50 text-red-500 hover:border-red-400 hover:bg-red-100 hover:shadow-sm'
              : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm';
            return (
              <button key={t._id}
                onClick={() => onSelectTable(t.number)}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${btnCls}`}>
                {/* Table Number — big & bold */}
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">No.</span>
                  <span className="text-2xl font-extrabold leading-none">{t.number}</span>
                </div>
                {/* Table name */}
                <span className="text-[10px] text-gray-400 font-normal truncate w-full text-center leading-tight">
                  {t.name && t.name !== `Table ${t.number}` ? t.name : `Table ${t.number}`}
                </span>
                {/* Status badge */}
                <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border
                  ${isActive ? 'bg-amber-100 border-amber-300 text-amber-700' :
                    isOccupied ? 'bg-red-100 border-red-200 text-red-400' :
                      'bg-emerald-100 border-emerald-200 text-emerald-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                  {statusLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { restaurant } = useAuthStore();
  const time = useClock();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Left panel tab: 'orders' | 'menu' | 'held'
  const [leftTab, setLeftTab] = useState<'orders' | 'menu' | 'held' | 'online' | 'floor'>('orders');
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  const [cart, setCart] = useState<CartEntry[]>([]);
  const [tableNum, setTableNum] = useState(1);
  const [guests, setGuests] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderNum, setOrderNum] = useState(() => `BL-${String(Math.floor(1000 + Math.random() * 9000))}`);

  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountInput, setDiscountInput] = useState('');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountTypeApplied, setDiscountTypeApplied] = useState<'percent' | 'flat'>('percent');
  const [discountReason, setDiscountReason] = useState('');

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);

  // New features state
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | 'delivery'>('dine-in');
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(true);
  const [serviceChargePct, setServiceChargePct] = useState(0);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [waiterName, setWaiterName] = useState('');
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [splitPayments, setSplitPayments] = useState<PaymentEntry[]>([]);
  const [showZReport, setShowZReport] = useState(false);
  const [zReport, setZReport] = useState<ZReport | null>(null);
  const [showCompModal, setShowCompModal] = useState(false);
  const [compItemId, setCompItemId] = useState<string | null>(null);
  const [compReason, setCompReason] = useState('');
  const [gstin, setGstin] = useState('');
  const [fssai, setFssai] = useState('');
  const [upiId, setUpiId] = useState('');
  const [cgstPct, setCgstPct] = useState(2.5);
  const [sgstPct, setSgstPct] = useState(2.5);
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [splitCount, setSplitCount] = useState(2);

  // ─── NEW FEATURE STATES ──────────────────────────
  const [lang, setLang] = useState('en');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [terminalId] = useState(() => `T-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([]);
  const [floorPlanMode, setFloorPlanMode] = useState(false);

  // i18n helper
  const t = useCallback((key: string) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
  }, [lang]);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders');
      const orders: CustomerOrder[] = data.orders || data || [];
      const active = orders.filter(o =>
        ['pending', 'approved', 'cooking', 'preparation', 'plating', 'ready', 'served'].includes(o.orderStatus)
      );
      setCustomerOrders(active);
    } catch {
      // silently fail
    }
  }, []);

  const fetchHeldBills = useCallback(async () => {
    try {
      const { data } = await api.get('/bills?status=hold');
      setHeldBills(data.bills || []);
    } catch { /* ignore */ }
  }, []);


  useEffect(() => {
    const load = async () => {
      try {
        const [menuRes, tableRes] = await Promise.all([
          api.get('/menu'),
          api.get('/restaurant/tables'),
        ]);
        setMenuItems(menuRes.data.items || menuRes.data || []);
        const tList: TableInfo[] = tableRes.data.tables || tableRes.data || [];
        setTables(tList);
        if (tList.length > 0) setTableNum(tList[0].number);

        // Load restaurant GST config
        if (restaurant) {
          const r = restaurant as Record<string, unknown>;
          setGstin((r.gstin as string) || '');
          setFssai((r.fssaiLicense as string) || '');
          setUpiId((r.upiId as string) || '');
          setServiceChargePct(typeof r.serviceChargePercent === 'number' ? r.serviceChargePercent : 0);
          setCgstPct(typeof r.cgstPercent === 'number' ? r.cgstPercent : 2.5);
          setSgstPct(typeof r.sgstPercent === 'number' ? r.sgstPercent : 2.5);
        }
      } catch {
        toast.error('Failed to load menu/tables');
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchOrders();
    fetchHeldBills();
  }, [fetchOrders, fetchHeldBills, restaurant]);

  // Real-time order updates via socket
  useEffect(() => {
    if (!restaurant?._id) return;
    const socket = connectSocket();
    joinRestaurant(restaurant._id);
    socket.on('order:new', fetchOrders);
    socket.on('order:status-update', fetchOrders);
    socket.on('order:status-changed', fetchOrders);
    return () => {
      socket.off('order:new', fetchOrders);
      socket.off('order:status-update', fetchOrders);
      socket.off('order:status-changed', fetchOrders);
    };
  }, [restaurant, fetchOrders]);

  // ─── ONLINE/OFFLINE + MULTI-TERMINAL + ONLINE ORDERS ────
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setIsOnline(navigator.onLine);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Multi-terminal registration
  useEffect(() => {
    if (!restaurant?._id) return;
    const socket = connectSocket();
    socket.emit('terminal:register', { restaurantId: restaurant._id, terminalId, terminalName: terminalId });
    // Listen for table claims from other terminals
    socket.on('terminal:table-claimed', (d: { terminalId: string; tableNumber: number }) => {
      if (d.terminalId !== terminalId) {
        toast.info(`Table ${d.tableNumber} claimed by ${d.terminalId}`);
      }
    });
    return () => { socket.off('terminal:table-claimed'); };
  }, [restaurant, terminalId]);

  // Fetch online orders (Swiggy/Zomato)
  const fetchOnlineOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/online-orders');
      setOnlineOrders(data.orders || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchOnlineOrders(); const iv = setInterval(fetchOnlineOrders, 30000); return () => clearInterval(iv); }, [fetchOnlineOrders]);

  // Print KOT
  const printKOT = useCallback(async (orderId: string) => {
    try {
      const { data } = await api.get(`/kot/order/${orderId}`);
      const w = window.open('', '_blank', 'width=300,height=600');
      if (w) { w.document.write(`<pre style="font-family:monospace;font-size:12px;width:80mm">${data.text}</pre>`); w.print(); }
    } catch { toast.error('KOT print failed'); }
  }, []);

  // Accept/reject online order
  const updateOnlineOrderStatus = useCallback(async (orderId: string, status: string) => {
    try {
      await api.put(`/online-orders/${orderId}/status`, { status });
      fetchOnlineOrders();
      toast.success(`Order ${status}`);
    } catch { toast.error('Failed to update order'); }
  }, [fetchOnlineOrders]);

  const filtered = useMemo(() => {
    let items = activeCat === 'all' ? menuItems : menuItems.filter(i => i.category === activeCat);
    if (search.trim()) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    return items;
  }, [menuItems, activeCat, search]);

  const filteredOrders = useMemo(() => {
    // Only show orders for the currently selected table
    let orders = customerOrders.filter(o => o.tableNumber === tableNum);
    if (!orderSearch.trim()) return orders;
    const q = orderSearch.toLowerCase();
    return orders.filter(o =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.tableNumber.toString().includes(q)
    );
  }, [customerOrders, orderSearch, tableNum]);

  // Load a customer order into the invoice
  const loadOrder = useCallback((order: CustomerOrder) => {
    const newCart: CartEntry[] = order.items.map((item, idx) => ({
      id: typeof item.menuItemId === 'object' && item.menuItemId !== null
        ? (item.menuItemId as unknown as { _id: string })._id?.toString() ?? `item-${idx}`
        : String(item.menuItemId ?? `item-${idx}`),
      name: item.name,
      price: item.price,
      qty: item.quantity,
    }));
    setCart(newCart);
    setTableNum(order.tableNumber);
    setOrderNum(order.orderNumber);
    setSelectedOrderId(order._id);
    setDiscountValue(0);
    setDiscountInput('');
    setPaymentMethod(order.paymentMode === 'pay-now' ? 'card' : 'cash');
    toast.success(`Loaded order ${order.orderNumber} for Table ${order.tableNumber}`);
  }, []);

  const cancelOrder = useCallback(async (order: CustomerOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Cancel order ${order.orderNumber} for Table ${order.tableNumber}?`)) return;
    try {
      await api.post(`/orders/${order._id}/reject`, { reason: 'Cancelled by admin' });
      toast.success(`Order ${order.orderNumber} cancelled`);
      if (selectedOrderId === order._id) {
        setCart([]);
        setSelectedOrderId(null);
        setOrderNum(`BL-${String(Math.floor(1000 + Math.random() * 9000))}`);
      }
      fetchOrders();
    } catch {
      toast.error('Failed to cancel order');
    }
  }, [selectedOrderId, fetchOrders]);

  const addItem = useCallback((item: MenuItem) => {
    setCart(prev => {
      const ex = prev.find(e => e.id === item._id);
      if (ex) return prev.map(e => e.id === item._id ? { ...e, qty: e.qty + 1 } : e);
      return [...prev, { id: item._id, name: item.name, price: item.price, qty: 1 }];
    });
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    setCart(prev => prev.map(e => e.id === id ? { ...e, qty: Math.max(0, e.qty + delta) } : e).filter(e => e.qty > 0));
  }, []);

  const removeItem = useCallback((id: string) => setCart(prev => prev.filter(e => e.id !== id)), []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountValue(0);
    setDiscountInput('');
    setSelectedOrderId(null);
    setOrderNum(`BL-${String(Math.floor(1000 + Math.random() * 9000))}`);
  }, []);

  const subtotal = cart.reduce((s, e) => e.isComp ? s : s + ((e.price * e.qty) - (e.itemDiscount || 0)), 0);
  const discount = Math.min(discountTypeApplied === 'percent' ? subtotal * (discountValue / 100) : discountValue, subtotal);
  const afterDiscount = subtotal - discount;
  const svcPct = serviceChargeEnabled ? serviceChargePct : 0;
  const serviceCharge = afterDiscount * (svcPct / 100);
  const taxable = afterDiscount + serviceCharge;
  const cgst = taxable * (cgstPct / 100);
  const sgst = taxable * (sgstPct / 100);
  const rawTotal = taxable + cgst + sgst;
  const grandTotal = Math.round(rawTotal);
  const roundOff = +(grandTotal - rawTotal).toFixed(2);

  const applyDiscount = () => {
    const val = parseFloat(discountInput);
    setDiscountValue(isNaN(val) || val < 0 ? 0 : discountType === 'percent' ? Math.min(val, 100) : val);
    setDiscountTypeApplied(discountType);
    setShowDiscount(false);
  };

  const handleGenerateBill = async () => {
    if (cart.length === 0) { toast.error('No items to bill'); return; }
    const currentTotals: Totals = { subtotal, discount, serviceCharge, cgst, sgst, roundOff, grandTotal };
    setTotals(currentTotals);

    if (paymentMethod === 'split') {
      // Open split payment modal
      setSplitPayments([{ method: 'cash', amount: 0 }, { method: 'upi', amount: 0 }]);
      setShowSettleModal(true);
      return;
    }

    // Create or update bill via API
    const billPayload = {
      items: cart.map(e => ({
        menuItemId: e.id.startsWith('item-') && e.id.startsWith('held-') ? undefined : e.id,
        name: e.name, price: e.price, quantity: e.qty,
        isComp: e.isComp || false, compReason: e.compReason || '',
        itemDiscount: e.itemDiscount || 0,
      })),
      orderType, tableNumber: tableNum, guests, waiterName,
      customerPhone, customerName,
      discountType: discountTypeApplied, discountValue, discountReason,
      serviceChargePercent: svcPct,
      payments: [{ method: paymentMethod, amount: grandTotal }],
      orderIds: selectedOrderId ? [selectedOrderId] : [],
    };
    try {
      // If we have an existing open/held bill, update it; otherwise create new
      const { data } = currentBillId
        ? await api.put(`/bills/${currentBillId}`, billPayload)
        : await api.post('/bills', billPayload);

      // If editing, settle the bill with payment
      if (currentBillId) {
        await api.post(`/bills/${currentBillId}/settle`, {
          payments: [{ method: paymentMethod, amount: grandTotal }],
        });
      }
      setCurrentBillId(data.bill._id);
      setOrderNum(data.bill.billNumber);
      setReceiptOpen(true);
      toast.success('Bill generated!');
    } catch {
      // Fallback: show receipt without API
      setReceiptOpen(true);
    }
  };

  const handleSettleSplit = async () => {
    const total = splitPayments.reduce((s, p) => s + p.amount, 0);
    if (total < grandTotal) { toast.error(`Short by ₹${(grandTotal - total).toFixed(2)}`); return; }

    try {
      const { data } = await api.post('/bills', {
        items: cart.map(e => ({
          menuItemId: e.id.startsWith('item-') ? undefined : e.id,
          name: e.name, price: e.price, quantity: e.qty,
          isComp: e.isComp || false, compReason: e.compReason || '',
          itemDiscount: e.itemDiscount || 0,
        })),
        orderType, tableNumber: tableNum, guests, waiterName,
        customerPhone, customerName,
        discountType: discountTypeApplied, discountValue, discountReason,
        serviceChargePercent: svcPct,
        payments: splitPayments.filter(p => p.amount > 0),
        orderIds: selectedOrderId ? [selectedOrderId] : [],
      });
      setCurrentBillId(data.bill._id);
      setOrderNum(data.bill.billNumber);
      setShowSettleModal(false);
      setTotals({ subtotal, discount, serviceCharge, cgst, sgst, roundOff, grandTotal });
      setReceiptOpen(true);
      toast.success('Split bill settled!');
    } catch {
      toast.error('Failed to settle split');
    }
  };

  const handleHoldBill = async () => {
    if (cart.length === 0) { toast.error('No items to hold'); return; }
    try {
      const { data } = await api.post('/bills', {
        items: cart.map(e => ({
          menuItemId: e.id.startsWith('item-') ? undefined : e.id,
          name: e.name, price: e.price, quantity: e.qty,
          isComp: e.isComp || false, compReason: e.compReason || '',
          itemDiscount: e.itemDiscount || 0,
        })),
        orderType, tableNumber: tableNum, guests, waiterName,
        customerPhone, customerName,
        discountType: discountTypeApplied, discountValue, discountReason,
        serviceChargePercent: svcPct,
        holdReason: 'Held by admin',
        orderIds: selectedOrderId ? [selectedOrderId] : [],
      });
      toast.success(`Bill held: ${data.bill.billNumber}`);
      clearCart();
      fetchHeldBills();
    } catch {
      toast.error('Failed to hold bill');
    }
  };

  const resumeHeldBill = async (bill: HeldBill) => {
    try {
      await api.post(`/bills/${bill._id}/resume`);
      const restoredCart: CartEntry[] = bill.items.map((item: HeldBill['items'][0], idx: number) => ({
        id: `held-${idx}`,
        name: item.name, price: item.price, qty: item.qty,
        isComp: item.isComp || false, compReason: item.compReason || '',
        itemDiscount: item.itemDiscount || 0,
      }));
      setCart(restoredCart);
      setTableNum(bill.tableNumber);
      setOrderType(bill.orderType as 'dine-in' | 'takeaway' | 'delivery');
      setCustomerPhone(bill.customerPhone || '');
      setCustomerName(bill.customerName || '');
      setCurrentBillId(bill._id);
      setOrderNum(bill.billNumber);
      setLeftTab('orders');
      fetchHeldBills();
      toast.success(`Resumed bill ${bill.billNumber}`);
    } catch {
      toast.error('Failed to resume bill');
    }
  };

  const handleVoidBill = async () => {
    if (!currentBillId) return;
    if (!confirm('Void this bill? This cannot be undone.')) return;
    try {
      await api.post(`/bills/${currentBillId}/void`, { reason: 'Voided by admin' });
      toast.success('Bill voided');
      clearCart();
    } catch {
      toast.error('Failed to void bill');
    }
  };

  const handleSplitBill = async () => {
    if (!currentBillId) { toast.error('Generate a bill first, then split'); return; }
    if (splitCount < 2 || splitCount > 10) { toast.error('Split between 2-10 people'); return; }
    try {
      const { data } = await api.post(`/bills/${currentBillId}/split`, { splitCount });
      setShowSplitBill(false);
      const bills = data.splitBills || [];
      toast.success(`Bill split into ${bills.length} parts (₹${Math.round(grandTotal / splitCount)} each)`);
      clearCart();
      setCurrentBillId(null);
    } catch {
      toast.error('Failed to split bill');
    }
  };

  const lookupCustomer = async () => {
    if (!customerPhone || customerPhone.length < 10) return;
    try {
      const { data } = await api.get(`/bills/customer?phone=${encodeURIComponent(customerPhone)}`);
      if (data.customer) {
        setCustomerInfo(data.customer);
        setCustomerName(data.customer.name || customerName);
        toast.success(`Found: ${data.customer.name || 'Customer'} — ${data.customer.loyaltyPoints} pts`);
      } else {
        setCustomerInfo(null);
        toast.info('New customer');
      }
    } catch { /* ignore */ }
  };

  const fetchZReport = async () => {
    try {
      const { data } = await api.get('/bills/z-report');
      setZReport(data);
      setShowZReport(true);
    } catch {
      toast.error('Failed to load Z-Report');
    }
  };

  const markComp = (itemId: string) => {
    setCompItemId(itemId);
    setCompReason('');
    setShowCompModal(true);
  };

  const confirmComp = () => {
    if (!compItemId) return;
    setCart(prev => prev.map(e => e.id === compItemId ? { ...e, isComp: true, compReason: compReason || 'Complimentary' } : e));
    setShowCompModal(false);
    setCompItemId(null);
    toast.success('Item marked as complimentary');
  };

  const unComp = (itemId: string) => {
    setCart(prev => prev.map(e => e.id === itemId ? { ...e, isComp: false, compReason: '' } : e));
  };

  const handleNewOrder = () => {
    setCart([]);
    setReceiptOpen(false);
    setTotals(null);
    setDiscountValue(0);
    setDiscountInput('');
    setDiscountReason('');
    setPaymentMethod('cash');
    setSelectedOrderId(null);
    setCurrentBillId(null);
    setCustomerPhone('');
    setCustomerName('');
    setCustomerInfo(null);
    setOrderType('dine-in');
    setOrderNum(`BL-${String(Math.floor(1000 + Math.random() * 9000))}`);
    fetchOrders();
    fetchHeldBills();
  };

  const restaurantName = restaurant?.name || 'Restaurant';
  const payMethods = [
    { key: 'cash', label: 'Cash', icon: '💵' },
    { key: 'card', label: 'Card', icon: '💳' },
    { key: 'upi', label: 'UPI', icon: '📱' },
    { key: 'split', label: 'Split', icon: '✂️' },
  ];

  const timeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading billing terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 -m-6" style={{ height: 'calc(100vh - 64px)' }}>

      {/* Info Bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0 overflow-x-auto">
        {/* Order Type Toggle */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden shrink-0">
          {ORDER_TYPES.map(t => (
            <button key={t.key} onClick={() => setOrderType(t.key as 'dine-in' | 'takeaway' | 'delivery')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold cursor-pointer border-0 transition-colors
                ${orderType === t.key ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {orderType === 'dine-in' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 shrink-0">
            <span className="text-gray-400 font-normal">T</span><span className="font-bold">{tableNum}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0 text-xs">
          <span className="text-gray-400 font-normal">Order:</span>
          <span className={`font-semibold ${selectedOrderId ? 'text-blue-700' : 'text-gray-600'}`}>{orderNum}</span>
        </div>

        {orderType === 'dine-in' && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 shrink-0">
            <span className="text-xs text-gray-500">Guests:</span>
            <button onClick={() => setGuests(g => Math.max(1, g - 1))} className="w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-sm font-bold cursor-pointer leading-none">-</button>
            <span className="text-xs font-bold text-gray-800 min-w-[16px] text-center">{guests}</span>
            <button onClick={() => setGuests(g => g + 1)} className="w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-sm font-bold cursor-pointer leading-none">+</button>
          </div>
        )}

        {/* Service Charge Toggle */}
        {serviceChargePct > 0 && (
          <button onClick={() => setServiceChargeEnabled(p => !p)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium shrink-0 cursor-pointer transition-colors
              ${serviceChargeEnabled ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
            {serviceChargeEnabled ? '✓' : '○'} Svc {serviceChargePct}%
          </button>
        )}

        {selectedOrderId && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
            Order Loaded
          </div>
        )}

        <div className="text-[10px] font-medium text-gray-400 shrink-0">🕐 {time}</div>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {/* Terminal ID badge */}
          <span className="px-2 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-bold shrink-0">
            🖥️ {terminalId}
          </span>

          {/* Online/Offline indicator */}
          <span className={`px-2 py-1 rounded-lg border text-[10px] font-bold shrink-0
            ${isOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>

          {/* Language switcher */}
          <select value={lang} onChange={e => setLang(e.target.value)}
            className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs font-semibold cursor-pointer outline-none">
            {Object.entries(LANG_NAMES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <button onClick={fetchZReport}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            📊 Z-Report
          </button>
          <button onClick={fetchOrders}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            ↻
          </button>
          {orderType === 'dine-in' && (
            <button onClick={() => setTableModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm">
              🪑 Table
            </button>
          )}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left Panel */}
        <div className="flex flex-col flex-1 border-r border-gray-200 bg-white overflow-hidden">

          {/* Left panel tabs */}
          <div className="flex items-center gap-0 border-b border-gray-200 shrink-0 px-4 overflow-x-auto">
            <button onClick={() => setLeftTab('orders')}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer border-0 border-b-2
                ${leftTab === 'orders' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              📋 {t('orders')}
              {customerOrders.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {customerOrders.length}
                </span>
              )}
            </button>
            <button onClick={() => setLeftTab('menu')}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer border-0 border-b-2
                ${leftTab === 'menu' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              🍽️ Menu
            </button>
            <button onClick={() => { setLeftTab('held'); fetchHeldBills(); }}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer border-0 border-b-2
                ${leftTab === 'held' ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              ⏸️ {t('held')}
              {heldBills.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {heldBills.length}
                </span>
              )}
            </button>
            <button onClick={() => { setLeftTab('online'); fetchOnlineOrders(); }}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer border-0 border-b-2 whitespace-nowrap
                ${leftTab === 'online' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              🛵 {t('onlineOrders')}
              {onlineOrders.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {onlineOrders.length}
                </span>
              )}
            </button>
            <button onClick={() => setLeftTab('floor')}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer border-0 border-b-2 whitespace-nowrap
                ${leftTab === 'floor' ? 'border-violet-500 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              🗺️ {t('floorPlan')}
            </button>
          </div>

          {/* Orders tab */}
          {leftTab === 'orders' && (
            <>
              <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                  <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                    placeholder="Search by order # or table..."
                    className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
                {filteredOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 pt-16 text-center">
                    <span className="text-5xl opacity-20">📋</span>
                    <p className="text-sm font-medium text-gray-500">No orders for Table {tableNum}</p>
                    <small className="text-xs text-gray-400 max-w-[200px]">No customer has ordered from Table {tableNum} yet</small>
                  </div>
                ) : (
                  filteredOrders.map(order => {
                    const isSelected = selectedOrderId === order._id;
                    const statusCls = statusColor[order.orderStatus] || 'bg-gray-50 text-gray-600 border-gray-200';
                    const canCancel = ['pending', 'approved'].includes(order.orderStatus);
                    return (
                      <div key={order._id} onClick={() => loadOrder(order)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all
                          ${isSelected ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-800">Table {order.tableNumber}</span>
                            <span className="text-xs text-gray-400 font-mono">{order.orderNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize ${statusCls}`}>
                              {order.orderStatus}
                            </span>
                            {isSelected && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold">Active</span>}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2 line-clamp-1">
                          {order.items.map(i => `${i.name} x${i.quantity}`).join(' · ')}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-400">{timeSince(order.createdAt)}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {canCancel && (
                              <button
                                onClick={(e) => cancelOrder(order, e)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 text-[10px] font-semibold border border-red-200 transition-colors cursor-pointer">
                                ✕ Cancel
                              </button>
                            )}
                            <span className="text-sm font-bold text-emerald-600">₹{order.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                        {!isSelected && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <span className="text-[10px] text-emerald-600 font-semibold">Click to load for billing →</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Menu tab */}
          {leftTab === 'menu' && (
            <>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <span className="text-xs text-gray-500">Add items manually to the invoice</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dishes..."
                    className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-44" />
                </div>
              </div>
              <div className="flex gap-2 px-4 py-2.5 overflow-x-auto border-b border-gray-100 shrink-0" style={{ scrollbarWidth: 'none' }}>
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setActiveCat(c.key)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer border
                      ${activeCat === c.key ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
                {filtered.length === 0 && <div className="text-center text-gray-400 py-12 text-sm">No dishes found 🍽️</div>}
                {filtered.map(item => {
                  const inCart = cart.find(e => e.id === item._id);
                  return (
                    <div key={item._id} onClick={() => addItem(item)}
                      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">🍽️</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800 truncate">{item.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0
                            ${item.isVeg ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {item.isVeg ? '● Veg' : '● Non-Veg'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 capitalize">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-emerald-600">₹{item.price}</span>
                        {inCart ? (
                          <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full px-2 py-0.5 text-xs font-bold">{inCart.qty}</span>
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-600 font-bold flex items-center justify-center text-lg group-hover:bg-emerald-100 transition-colors">+</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Held Bills tab */}
          {leftTab === 'held' && (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
              {heldBills.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 pt-16 text-center">
                  <span className="text-5xl opacity-20">⏸️</span>
                  <p className="text-sm font-medium text-gray-500">No held bills</p>
                  <small className="text-xs text-gray-400">Bills you put on hold will appear here</small>
                </div>
              ) : (
                heldBills.map(bill => (
                  <div key={bill._id} onClick={() => resumeHeldBill(bill)}
                    className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50 cursor-pointer hover:border-amber-400 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-sm font-bold text-gray-800">{bill.billNumber}</span>
                        <span className="text-xs text-gray-400 ml-2">Table {bill.tableNumber}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-300 bg-amber-100 text-amber-700 font-semibold">HELD</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-1.5">
                      {bill.items.map((i: HeldBill['items'][0]) => `${i.name} x${i.qty}`).join(' · ')}
                    </div>
                    {bill.holdReason && <p className="text-[10px] text-amber-600 mb-1.5">Reason: {bill.holdReason}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{timeSince(bill.createdAt)}</span>
                      <span className="text-sm font-bold text-emerald-600">₹{bill.grandTotal}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <span className="text-[10px] text-amber-600 font-semibold">Click to resume →</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Online Orders tab */}
          {leftTab === 'online' && (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
              {onlineOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 pt-16 text-center">
                  <span className="text-5xl opacity-20">🛵</span>
                  <p className="text-sm font-medium text-gray-500">No online orders</p>
                  <small className="text-xs text-gray-400">Swiggy/Zomato orders will appear here</small>
                </div>
              ) : (
                onlineOrders.map(order => (
                  <div key={order._id} className="p-3 rounded-xl border-2 border-orange-200 bg-orange-50/50 hover:border-orange-400 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-sm font-bold text-gray-800">{order.orderNumber}</span>
                        <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold
                          ${order.orderSource === 'swiggy' ? 'bg-orange-100 text-orange-700 border border-orange-300'
                          : order.orderSource === 'zomato' ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                          {order.orderSource.toUpperCase()}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold
                        ${order.orderStatus === 'pending' ? 'border-amber-300 bg-amber-100 text-amber-700'
                        : order.orderStatus === 'accepted' ? 'border-blue-300 bg-blue-100 text-blue-700'
                        : order.orderStatus === 'cooking' ? 'border-orange-300 bg-orange-100 text-orange-700'
                        : 'border-emerald-300 bg-emerald-100 text-emerald-700'}`}>
                        {order.orderStatus.toUpperCase()}
                      </span>
                    </div>
                    {order.externalOrderId && <p className="text-[10px] text-gray-400 mb-1">Ext: {order.externalOrderId}</p>}
                    <div className="text-xs text-gray-500 mb-2">
                      {order.items?.map(i => `${i.name} x${i.quantity}`).join(' · ')}
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">{timeSince(order.createdAt)}</span>
                      <span className="text-sm font-bold text-emerald-600">₹{order.totalAmount}</span>
                    </div>
                    {order.orderStatus === 'pending' && (
                      <div className="flex gap-2 pt-2 border-t border-orange-200">
                        <button onClick={() => updateOnlineOrderStatus(order._id, 'accepted')}
                          className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer border-0">
                          ✓ Accept
                        </button>
                        <button onClick={() => updateOnlineOrderStatus(order._id, 'rejected')}
                          className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 cursor-pointer border-0">
                          ✕ Reject
                        </button>
                      </div>
                    )}
                    {order.orderStatus === 'accepted' && (
                      <div className="flex gap-2 pt-2 border-t border-orange-200">
                        <button onClick={() => updateOnlineOrderStatus(order._id, 'cooking')}
                          className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-orange-500 text-white hover:bg-orange-600 cursor-pointer border-0">
                          🍳 Start Cooking
                        </button>
                      </div>
                    )}
                    {order.orderStatus === 'cooking' && (
                      <div className="flex gap-2 pt-2 border-t border-orange-200">
                        <button onClick={() => updateOnlineOrderStatus(order._id, 'ready')}
                          className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer border-0">
                          ✅ Mark Ready
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Floor Plan tab */}
          {leftTab === 'floor' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">🗺️ {t('floorPlan')}</h3>
                <span className="text-[10px] text-gray-400">{tables.length} tables</span>
              </div>
              <div className="relative bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl min-h-[400px] p-4">
                {/* Visual table grid layout */}
                <div className="grid grid-cols-4 gap-3">
                  {tables.map(tb => {
                    const hasOrder = customerOrders.some(o => o.tableNumber === tb.number && ['pending','approved','cooking','preparation','plating','ready'].includes(o.orderStatus));
                    const isSelected = tableNum === tb.number;
                    return (
                      <button key={tb._id || tb.number}
                        onClick={() => { setTableNum(tb.number); setLeftTab('orders'); }}
                        className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer text-center
                          ${isSelected ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                          : hasOrder ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
                          : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'}`}
                        style={{ aspectRatio: tb.shape === 'round' ? '1' : 'auto', borderRadius: tb.shape === 'round' ? '50%' : '12px' }}>
                        <span className="text-lg font-black text-gray-800">{tb.number}</span>
                        <div className="text-[9px] font-semibold mt-0.5 text-gray-500">{tb.name || `Table ${tb.number}`}</div>
                        <div className="text-[9px] text-gray-400">{tb.seats} seats</div>
                        {hasOrder && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
                        )}
                        {tb.area && tb.area !== 'Main Hall' && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] bg-violet-100 text-violet-600 px-1.5 rounded-full font-bold">{tb.area}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200">
                  <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-gray-200" /> {t('free')}</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> {t('occupied')}</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Selected</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Invoice Panel */}
        <div className="flex flex-col bg-white overflow-hidden" style={{ width: '400px', minWidth: '360px', maxWidth: '440px' }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">Invoice</span>
              <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">{cart.length} items</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={handleHoldBill}
                className="text-[10px] text-amber-600 hover:text-amber-800 border border-amber-200 hover:border-amber-300 px-2 py-1 rounded-full bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer font-medium">
                ⏸ Hold
              </button>
              {currentBillId && (
                <button onClick={handleVoidBill}
                  className="text-[10px] text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-2 py-1 rounded-full bg-red-50 hover:bg-red-100 transition-colors cursor-pointer font-medium">
                  ✕ Void
                </button>
              )}
              {currentBillId && (
                <button onClick={() => setShowSplitBill(true)}
                  className="text-[10px] text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-300 px-2 py-1 rounded-full bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer font-medium">
                  ✂ Split
                </button>
              )}
              <button onClick={clearCart}
                className="text-[10px] text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-2 py-1 rounded-full bg-red-50 hover:bg-red-100 transition-colors cursor-pointer font-medium">
                Clear
              </button>
            </div>
          </div>

          {/* Customer Info + Waiter */}
          <div className="px-4 py-2 border-b border-gray-100 space-y-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone" onBlur={lookupCustomer}
                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-300 bg-gray-50" />
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Name"
                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-300 bg-gray-50" />
              <input value={waiterName} onChange={e => setWaiterName(e.target.value)} placeholder="Waiter"
                className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-300 bg-gray-50" />
            </div>
            {customerInfo && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="px-1.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold">
                  ⭐ {customerInfo.loyaltyPoints} pts
                </span>
                <span className="text-gray-400">{customerInfo.totalVisits} visits · ₹{customerInfo.totalSpent} spent</span>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 pt-14 text-gray-400 text-center">
                <span className="text-5xl opacity-30">🧾</span>
                <p className="text-sm font-medium text-gray-500">No items yet</p>
                <small className="text-xs text-gray-400 max-w-[180px]">Add items from orders or menu</small>
              </div>
            ) : (
              cart.map(e => (
                <div key={e.id} className={`flex items-center gap-1.5 p-2.5 border rounded-xl group ${e.isComp ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-medium truncate block ${e.isComp ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{e.name}</span>
                    {e.isComp && <span className="text-[9px] text-yellow-600 font-semibold">COMP: {e.compReason}</span>}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => changeQty(e.id, -1)} className="w-5 h-5 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs font-bold cursor-pointer">-</button>
                    <span className="text-xs font-bold text-gray-800 min-w-[18px] text-center">{e.qty}</span>
                    <button onClick={() => changeQty(e.id, 1)} className="w-5 h-5 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs font-bold cursor-pointer">+</button>
                  </div>
                  <span className={`text-xs font-bold min-w-[48px] text-right shrink-0 ${e.isComp ? 'text-gray-300' : 'text-emerald-600'}`}>
                    {e.isComp ? 'COMP' : `₹${e.price * e.qty}`}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {e.isComp ? (
                      <button onClick={() => unComp(e.id)} className="px-1.5 py-0.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 text-[9px] font-semibold cursor-pointer border border-green-200">Undo</button>
                    ) : (
                      <button onClick={() => markComp(e.id)} className="px-1.5 py-0.5 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 text-[9px] font-semibold cursor-pointer border border-yellow-200">Comp</button>
                    )}
                    <button onClick={() => removeItem(e.id)} className="px-1.5 py-0.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 text-[9px] font-semibold cursor-pointer border border-red-200">✕</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <div className="space-y-1 mb-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span className="font-medium text-gray-700">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  Discount
                  <button onClick={() => setShowDiscount(!showDiscount)}
                    className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center text-xs font-bold cursor-pointer border-0 leading-none">+</button>
                </span>
                <span className="font-medium text-emerald-600">- ₹{discount.toFixed(2)}</span>
              </div>
              {showDiscount && (
                <div className="space-y-1 py-1">
                  <div className="flex items-center gap-1.5">
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden shrink-0">
                      {(['percent', 'flat'] as const).map(t => (
                        <button key={t} onClick={() => setDiscountType(t)}
                          className={`px-2 py-1 text-xs font-bold cursor-pointer border-0 transition-colors
                            ${discountType === t ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                          {t === 'percent' ? '%' : '₹'}
                        </button>
                      ))}
                    </div>
                    <input type="number" value={discountInput} onChange={e => setDiscountInput(e.target.value)}
                      placeholder={discountType === 'percent' ? 'Enter %' : 'Enter ₹'} min="0"
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-300 bg-white" />
                    <button onClick={applyDiscount}
                      className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 cursor-pointer">Apply</button>
                  </div>
                  <input value={discountReason} onChange={e => setDiscountReason(e.target.value)} placeholder="Reason (manager override, loyalty, etc.)"
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-300 bg-white" />
                </div>
              )}
              {serviceCharge > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Service Charge ({svcPct}%)</span>
                  <span className="font-medium text-gray-700">₹{serviceCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-gray-500">
                <span>CGST ({cgstPct}%)</span>
                <span className="font-medium text-gray-700">₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>SGST ({sgstPct}%)</span>
                <span className="font-medium text-gray-700">₹{sgst.toFixed(2)}</span>
              </div>
              {roundOff !== 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Round Off</span>
                  <span className="font-medium text-gray-700">₹{roundOff.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 pt-2 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-800">Grand Total</span>
                <span className="text-xl font-extrabold text-emerald-600">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {payMethods.map(m => (
                <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer
                    ${paymentMethod === m.key
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}>
                  <span className="text-base">{m.icon}</span>
                  <span className="text-[10px]">{m.label}</span>
                </button>
              ))}
            </div>

            <button onClick={handleGenerateBill}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-sm tracking-wide">
              {t('generateBill')}
            </button>
            {selectedOrderId && (
              <button onClick={() => printKOT(selectedOrderId)}
                className="w-full py-2 mt-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm">
                🖨️ {t('printKot')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Split Payment Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowSettleModal(false)}>
          <div className="w-[400px] max-w-[95vw] bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 text-base mb-1">Split Payment</h3>
            <p className="text-xs text-gray-500 mb-4">Total: ₹{grandTotal.toFixed(2)}</p>
            <div className="space-y-3 mb-4">
              {splitPayments.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={p.method} onChange={e => setSplitPayments(prev => prev.map((x, i) => i === idx ? { ...x, method: e.target.value } : x))}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-300">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                  </select>
                  <input type="number" value={p.amount || ''} onChange={e => setSplitPayments(prev => prev.map((x, i) => i === idx ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))}
                    placeholder="₹ Amount" min="0"
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-300 bg-white" />
                  {splitPayments.length > 1 && (
                    <button onClick={() => setSplitPayments(prev => prev.filter((_, i) => i !== idx))}
                      className="w-6 h-6 rounded-full bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 flex items-center justify-center text-xs cursor-pointer">✕</button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setSplitPayments(prev => [...prev, { method: 'cash', amount: 0 }])}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold cursor-pointer border-0 bg-transparent">+ Add Payment</button>
              <span className={`text-xs font-bold ${splitPayments.reduce((s, p) => s + p.amount, 0) >= grandTotal ? 'text-emerald-600' : 'text-red-500'}`}>
                Paid: ₹{splitPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSettleModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={handleSettleSplit} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-semibold text-white cursor-pointer">Settle Split</button>
            </div>
          </div>
        </div>
      )}

      {/* Comp Item Modal */}
      {showCompModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowCompModal(false)}>
          <div className="w-[360px] max-w-[95vw] bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 text-base mb-1">Mark as Complimentary</h3>
            <p className="text-xs text-gray-500 mb-4">This item will be shown on the bill but not charged</p>
            <input value={compReason} onChange={e => setCompReason(e.target.value)} placeholder="Reason: e.g., Manager treat, Birthday"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-gray-50 mb-4" autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setShowCompModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={confirmComp} className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-xs font-semibold text-white cursor-pointer">Mark Comp</button>
            </div>
          </div>
        </div>
      )}

      {/* Split Bill Modal */}
      {showSplitBill && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowSplitBill(false)}>
          <div className="w-[360px] max-w-[95vw] bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 text-base mb-1">Split Bill by Person</h3>
            <p className="text-xs text-gray-500 mb-4">
              Splits ₹{grandTotal.toFixed(2)} into equal parts. Each person gets a separate bill.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-gray-600 font-medium">People:</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSplitCount(c => Math.max(2, c - 1))}
                  className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 flex items-center justify-center text-lg font-bold cursor-pointer">-</button>
                <span className="text-xl font-bold text-gray-800 min-w-[32px] text-center">{splitCount}</span>
                <button onClick={() => setSplitCount(c => Math.min(10, c + 1))}
                  className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 flex items-center justify-center text-lg font-bold cursor-pointer">+</button>
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-center">
              <p className="text-xs text-purple-500 mb-0.5">Each person pays</p>
              <p className="text-lg font-bold text-purple-700">₹{Math.round(grandTotal / splitCount)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSplitBill(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={handleSplitBill} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-semibold text-white cursor-pointer">Split into {splitCount}</button>
            </div>
          </div>
        </div>
      )}

      {/* Z-Report Modal */}
      {showZReport && zReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowZReport(false)}>
          <div className="w-[560px] max-w-[95vw] max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Z-Report — Shift Close</h3>
                <p className="text-xs text-gray-500">{zReport.date} · {restaurantName}</p>
              </div>
              <button onClick={() => setShowZReport(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-lg cursor-pointer border-0">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Revenue', value: `₹${zReport.totalRevenue.toFixed(0)}`, color: 'text-emerald-600' },
                { label: 'Bills', value: zReport.settledBills, color: 'text-blue-600' },
                { label: 'Avg Ticket', value: `₹${zReport.avgTicket.toFixed(0)}`, color: 'text-purple-600' },
                { label: 'Tax Collected', value: `₹${zReport.totalTax.toFixed(0)}`, color: 'text-orange-600' },
                { label: 'Discounts', value: `₹${zReport.totalDiscount.toFixed(0)}`, color: 'text-red-600' },
                { label: 'Service Charge', value: `₹${zReport.totalServiceCharge.toFixed(0)}`, color: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Payment Breakdown</p>
                {Object.entries(zReport.paymentBreakdown).filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1 border-b border-gray-100">
                    <span className="text-gray-500 capitalize">{k}</span>
                    <span className="font-medium text-gray-700">₹{v.toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Order Types</p>
                {[
                  { label: 'Dine-In', val: zReport.orderTypeBreakdown.dineIn },
                  { label: 'Takeaway', val: zReport.orderTypeBreakdown.takeaway },
                  { label: 'Delivery', val: zReport.orderTypeBreakdown.delivery },
                ].filter(r => r.val > 0).map(r => (
                  <div key={r.label} className="flex justify-between text-xs py-1 border-b border-gray-100">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="font-medium text-gray-700">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {zReport.topItems.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Top Items</p>
                <div className="space-y-1">
                  {zReport.topItems.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs py-1 border-b border-gray-100">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="flex-1 text-gray-700">{item.name}</span>
                      <span className="text-gray-400">{item.qty} sold</span>
                      <span className="font-medium text-gray-700">₹{item.revenue.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {zReport.compItems.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Complimentary Items</p>
                {zReport.compItems.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-100">
                    <span className="flex-1 text-gray-700">{c.name} x{c.quantity}</span>
                    <span className="text-gray-400">{c.reason}</span>
                    <span className="text-[10px] text-gray-400">{c.billNumber}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Open: {zReport.openBills} · Held: {zReport.heldBills}</span>
              <span>Total Bills: {zReport.totalBills}</span>
            </div>
          </div>
        </div>
      )}

      {totals && (
        <ReceiptModal
          open={receiptOpen}
          cart={cart}
          totals={totals}
          paymentMethod={paymentMethod}
          payments={paymentMethod === 'split' ? splitPayments : [{ method: paymentMethod, amount: grandTotal }]}
          tableNum={tableNum}
          orderNum={orderNum}
          guests={guests}
          restaurantName={restaurantName}
          gstin={gstin}
          fssai={fssai}
          serviceChargePct={svcPct}
          orderType={orderType}
          customerPhone={customerPhone}
          customerName={customerName}
          waiterName={waiterName}
          upiId={upiId}
          billId={currentBillId || undefined}
          onClose={() => setReceiptOpen(false)}
          onNewOrder={handleNewOrder}
        />
      )}
      <TableModal
        open={tableModalOpen}
        tables={tables}
        currentTable={tableNum}
        onClose={() => setTableModalOpen(false)}
        onSelectTable={n => {
          setTableNum(n);
          setTableModalOpen(false);
          setCart([]);
          setDiscountValue(0);
          setDiscountInput('');
          setDiscountReason('');
          setSelectedOrderId(null);
          setCurrentBillId(null);
          setCustomerPhone('');
          setCustomerName('');
          setCustomerInfo(null);
          setOrderNum(`BL-${String(Math.floor(1000 + Math.random() * 9000))}`);
          toast.success(`Switched to Table ${n} — invoice cleared`);
        }}
      />
    </div>
  );
}
