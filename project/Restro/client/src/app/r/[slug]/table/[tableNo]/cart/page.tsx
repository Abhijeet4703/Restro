'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Trash2, CreditCard, Clock, User, Phone, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/store/cartStore';
import api from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

const ORDER_TYPES = [
  { key: 'dine-in', label: 'Dine-In', icon: '🪑' },
  { key: 'takeaway', label: 'Takeaway', icon: '🥡' },
  { key: 'delivery', label: 'Delivery', icon: '🛵' },
] as const;

export default function CartPage({ params }: { params: Promise<{ slug: string; tableNo: string }> }) {
  const { slug, tableNo } = use(params);
  const tableNumber = parseInt(tableNo);
  const router = useRouter();

  const { items, updateQuantity, removeItem, clearCart, total, restaurantId, orderType, customerPhone, customerName, setOrderType, setCustomerInfo } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'pay-now' | 'pay-later'>('pay-now');
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [phoneInput, setPhoneInput] = useState(customerPhone);
  const [nameInput, setNameInput] = useState(customerName);

  // Restaurant config for tax rates
  const [cgstPct, setCgstPct] = useState(2.5);
  const [sgstPct, setSgstPct] = useState(2.5);
  const [serviceChargePct, setServiceChargePct] = useState(0);
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    const loadConfig = async () => {
      if (!restaurantId) return;
      try {
        const { data } = await api.get(`/restaurant/${restaurantId}/public`);
        const r = data.restaurant || data;
        setCgstPct(r.cgstPercent ?? 2.5);
        setSgstPct(r.sgstPercent ?? 2.5);
        setServiceChargePct(r.serviceChargePercent ?? 0);
        setRestaurantName(r.name || '');
      } catch {
        // fallback defaults are fine
      }
    };
    loadConfig();
  }, [restaurantId]);

  const subtotal = total();
  const serviceCharge = subtotal * (serviceChargePct / 100);
  const taxable = subtotal + serviceCharge;
  const cgst = taxable * (cgstPct / 100);
  const sgst = taxable * (sgstPct / 100);
  const rawGrandTotal = taxable + cgst + sgst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = +(grandTotal - rawGrandTotal).toFixed(2);

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    setLoading(true);

    // Save customer info
    if (phoneInput) setCustomerInfo(phoneInput, nameInput);

    try {
      const { data } = await api.post('/orders/place', {
        restaurantId,
        tableNumber,
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, notes: i.notes })),
        paymentMode,
        orderType,
        customerPhone: phoneInput || undefined,
        customerName: nameInput || undefined,
      });

      if (paymentMode === 'pay-now') {
        try {
          const { data: payData } = await api.post('/payment/create-order', {
            orderId: data.order._id,
          });

          const options = {
            key: payData.keyId,
            amount: payData.amount,
            currency: payData.currency,
            name: restaurantName || 'Restaurant Order',
            description: `Order ${data.order.orderNumber}`,
            order_id: payData.razorpayOrderId,
            prefill: {
              contact: phoneInput || '',
              name: nameInput || '',
            },
            handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
              await api.post('/payment/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                paymentId: payData.paymentId,
              });
              toast.success('Payment successful! Order placed.');
              clearCart();
              router.push(`/r/${slug}/table/${tableNo}/track?orderId=${data.order._id}`);
            },
            theme: { color: '#10b981' },
          };

          const rzp = new (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay(options);
          rzp.open();
        } catch {
          toast.error('Payment setup failed. Your order is saved as Pay Later.');
          clearCart();
          router.push(`/r/${slug}/table/${tableNo}/track?orderId=${data.order._id}`);
        }
      } else {
        toast.success('Order placed! Waiting for restaurant approval.');
        clearCart();
        router.push(`/r/${slug}/table/${tableNo}/track?orderId=${data.order._id}`);
      }
    } catch {
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <Link href={`/r/${slug}/table/${tableNo}`}>
          <button className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-orange-50">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900">Your Cart</h1>
          <p className="text-xs text-slate-400">Table {tableNumber} · {orderType === 'dine-in' ? '🪑 Dine-In' : orderType === 'takeaway' ? '🥡 Takeaway' : '🛵 Delivery'}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg">Your cart is empty</p>
          <Link href={`/r/${slug}/table/${tableNo}`}>
            <Button variant="outline" className="mt-4 border-slate-300 text-slate-500">Browse Menu</Button>
          </Link>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">
          {/* Order Type */}
          <Card className="p-3 bg-white border-slate-200">
            <p className="text-xs font-semibold text-slate-500 mb-2">Order Type</p>
            <div className="grid grid-cols-3 gap-2">
              {ORDER_TYPES.map(t => (
                <button key={t.key} onClick={() => setOrderType(t.key)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    orderType === t.key
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Cart Items */}
          {items.map((item) => (
            <Card key={item.menuItemId} className="p-4 bg-white border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-slate-900">{item.name}</h3>
                  <p className="text-sm text-slate-500">₹{item.price} each</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-100 rounded-full px-2 py-1">
                    <button
                      onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                      className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-500"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                      className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-500"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-bold text-sm w-16 text-right">₹{item.price * item.quantity}</span>

                  <button
                    onClick={() => removeItem(item.menuItemId)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}

          {/* Customer Info (collapsible) */}
          <Card className="bg-white border-slate-200 overflow-hidden">
            <button onClick={() => setShowCustomerInfo(!showCustomerInfo)}
              className="w-full p-3 flex items-center justify-between text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> Customer Info <span className="text-xs font-normal text-slate-400">(optional)</span></span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showCustomerInfo ? 'rotate-180' : ''}`} />
            </button>
            {showCustomerInfo && (
              <div className="px-3 pb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <input value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="Phone number"
                    type="tel" maxLength={10}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Your name"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
                {phoneInput.length === 10 && (
                  <p className="text-[11px] text-emerald-600 pl-6">Earn loyalty points on this order!</p>
                )}
              </div>
            )}
          </Card>

          {/* Bill Summary with GST */}
          <Card className="p-4 mt-6 bg-white border-slate-200">
            <h3 className="font-bold text-sm mb-3 text-slate-900">Bill Summary</h3>
            {items.map((item) => (
              <div key={item.menuItemId} className="flex justify-between text-sm text-slate-500 mb-1">
                <span>{item.name} × {item.quantity}</span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {serviceCharge > 0 && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Service Charge ({serviceChargePct}%)</span>
                  <span>₹{serviceCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-500">
                <span>CGST ({cgstPct}%)</span>
                <span>₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>SGST ({sgstPct}%)</span>
                <span>₹{sgst.toFixed(2)}</span>
              </div>
              {roundOff !== 0 && (
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Round Off</span>
                  <span>₹{roundOff.toFixed(2)}</span>
                </div>
              )}
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between font-bold text-base">
              <span>Grand Total</span>
              <span className="text-emerald-600">₹{grandTotal.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">* Inclusive of all taxes (GST)</p>
          </Card>

          {/* Payment mode */}
          <div className="space-y-2 mt-4">
            <h3 className="font-bold text-sm text-slate-900">Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMode('pay-now')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  paymentMode === 'pay-now'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <CreditCard className={`w-5 h-5 mx-auto mb-1 ${paymentMode === 'pay-now' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <p className="text-sm font-semibold text-slate-900">Pay Now</p>
                <p className="text-xs text-slate-400">Online Payment</p>
              </button>
              <button
                onClick={() => setPaymentMode('pay-later')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  paymentMode === 'pay-later'
                    ? 'border-orange-500 bg-slate-100'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <Clock className={`w-5 h-5 mx-auto mb-1 ${paymentMode === 'pay-later' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <p className="text-sm font-semibold text-slate-900">Pay Later</p>
                <p className="text-xs text-slate-400">After eating</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Place order bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-slate-200">
          <Button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-base font-semibold rounded-2xl border-0"
          >
            {loading ? 'Placing Order...' : `Place Order — ₹${grandTotal.toFixed(2)}`}
          </Button>
        </div>
      )}

      {/* Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}
