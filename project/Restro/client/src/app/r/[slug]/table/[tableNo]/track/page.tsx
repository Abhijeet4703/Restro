'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Phone, CheckCircle2, Clock, ChefHat, UtensilsCrossed, CircleDot, Star, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getSocket, connectSocket, joinTable, callWaiter } from '@/lib/socket';
import api from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

const STAGES = [
  { key: 'pending', label: 'Order Placed', icon: CircleDot, color: 'text-slate-400' },
  { key: 'approved', label: 'Confirmed', icon: CheckCircle2, color: 'text-blue-500' },
  { key: 'cooking', label: 'Cooking', icon: ChefHat, color: 'text-slate-9000' },
  { key: 'preparation', label: 'Preparation', icon: ChefHat, color: 'text-slate-9000' },
  { key: 'plating', label: 'Plating', icon: UtensilsCrossed, color: 'text-purple-500' },
  { key: 'ready', label: 'Ready!', icon: CheckCircle2, color: 'text-emerald-500' },
];

const STAGE_MAP: Record<string, number> = {
  pending: 0, approved: 1, cooking: 2, preparation: 3, plating: 4, ready: 5, served: 5,
};

interface Order {
  _id: string;
  orderNumber: string;
  tableNumber: number;
  items: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  estimatedTime: number;
  cookingStartedAt: string | null;
  rejectedReason: string;
  orderType?: string;
  customerPhone?: string;
  customerName?: string;
  restaurantId?: string;
}

interface RestaurantConfig {
  name: string;
  gstin: string;
  fssaiLicense: string;
  cgstPercent: number;
  sgstPercent: number;
  serviceChargePercent: number;
}

export default function TrackPage({ params }: { params: Promise<{ slug: string; tableNo: string }> }) {
  const { slug, tableNo } = use(params);
  const tableNumber = parseInt(tableNo);
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [canCancel, setCanCancel] = useState(false);
  const [restConfig, setRestConfig] = useState<RestaurantConfig | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showBillDetail, setShowBillDetail] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        setOrder(data.order);
      } catch {
        toast.error('Failed to load order');
      }
    };
    fetchOrder();
  }, [orderId]);

  // Load restaurant config for GST display
  useEffect(() => {
    if (!order?.restaurantId) return;
    const loadConfig = async () => {
      try {
        const { data } = await api.get(`/restaurant/${order.restaurantId}/public`);
        const r = data.restaurant || data;
        setRestConfig({
          name: r.name || '',
          gstin: r.gstin || '',
          fssaiLicense: r.fssaiLicense || '',
          cgstPercent: r.cgstPercent ?? 2.5,
          sgstPercent: r.sgstPercent ?? 2.5,
          serviceChargePercent: r.serviceChargePercent ?? 0,
        });
      } catch { /* fallback */ }
    };
    loadConfig();
  }, [order?.restaurantId]);

  // Real-time updates
  useEffect(() => {
    if (!order) return;
    const socket = connectSocket();
    joinTable(order._id.slice(0, 24), tableNumber);

    socket.on('order:status-update', (data: { orderId: string; status: string; estimatedTime?: number; message?: string }) => {
      if (data.orderId === orderId) {
        setOrder((prev) => prev ? { ...prev, orderStatus: data.status, estimatedTime: data.estimatedTime || prev.estimatedTime } : prev);
        if (data.message) toast.info(data.message);
      }
    });

    socket.on('payment:refunded', (data: { orderId: string; message: string }) => {
      if (data.orderId === orderId) {
        setOrder((prev) => prev ? { ...prev, paymentStatus: 'refunded' } : prev);
        toast.success(data.message);
      }
    });

    return () => {
      socket.off('order:status-update');
      socket.off('payment:refunded');
    };
  }, [order, orderId, tableNumber]);

  // Countdown timer
  useEffect(() => {
    if (!order?.cookingStartedAt || !order?.estimatedTime) return;
    const interval = setInterval(() => {
      const started = new Date(order.cookingStartedAt!).getTime();
      const eta = order.estimatedTime * 60 * 1000;
      const remaining = Math.max(0, Math.round((started + eta - Date.now()) / 1000 / 60));
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [order?.cookingStartedAt, order?.estimatedTime]);

  // Cancel eligibility (after 10 min of pending)
  useEffect(() => {
    if (!order || order.orderStatus !== 'pending') {
      setCanCancel(false);
      return;
    }
    const timer = setTimeout(() => setCanCancel(true), 10 * 60 * 1000);
    // Also check immediately in case order was placed > 10 min ago
    const createdAt = new Date(order.cookingStartedAt || Date.now()).getTime();
    if (Date.now() - createdAt > 10 * 60 * 1000) setCanCancel(true);
    return () => clearTimeout(timer);
  }, [order]);

  const handleCancel = async () => {
    if (!orderId) return;
    try {
      await api.post(`/orders/${orderId}/cancel`);
      toast.success('Order cancelled');
      setOrder((prev) => prev ? { ...prev, orderStatus: 'cancelled' } : prev);
    } catch {
      toast.error('Cannot cancel order');
    }
  };

  const handleCallWaiter = () => {
    if (!order) return;
    callWaiter(order._id.slice(0, 24), tableNumber, orderId || undefined);
    toast.success('Waiter has been called!');
  };

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading order...</div>
      </div>
    );
  }

  const currentStageIndex = STAGE_MAP[order.orderStatus] ?? 0;
  const progressPercent = Math.min(100, ((currentStageIndex + 1) / STAGES.length) * 100);

  const isRejected = order.orderStatus === 'rejected';
  const isCancelled = order.orderStatus === 'cancelled';
  const isReady = order.orderStatus === 'ready';
  const isCompleted = ['served', 'completed'].includes(order.orderStatus);

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <Link href={`/r/${slug}/table/${tableNo}`}>
          <button className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-orange-50">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900">Order Tracking</h1>
          <p className="text-xs text-slate-400">
            {order.orderNumber} · Table {tableNumber}
            {order.orderType && order.orderType !== 'dine-in' && (
              <span className="ml-1">· {order.orderType === 'takeaway' ? '🥡 Takeaway' : '🛵 Delivery'}</span>
            )}
          </p>
        </div>
        <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'destructive'}>
          {order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Unpaid'}
        </Badge>
      </div>

      <div className="px-4 pt-6 space-y-4">
        {/* Status card */}
        {isRejected ? (
          <Card className="p-6 text-center border-red-200 bg-red-50">
            <p className="text-red-400 font-bold text-lg">Order Rejected</p>
            <p className="text-red-600/60 text-sm mt-1">{order.rejectedReason}</p>
            {order.paymentStatus === 'paid' && (
              <p className="text-emerald-600 text-sm mt-2">Refund will be processed automatically.</p>
            )}
            <Link href={`/r/${slug}/table/${tableNo}`}>
              <Button className="mt-4" variant="outline">Order Again</Button>
            </Link>
          </Card>
        ) : isCancelled ? (
          <Card className="p-6 text-center border-slate-200 bg-white">
            <p className="text-slate-500 font-bold text-lg">Order Cancelled</p>
            <Link href={`/r/${slug}/table/${tableNo}`}>
              <Button className="mt-4" variant="outline">Order Again</Button>
            </Link>
          </Card>
        ) : isCompleted ? (
          <Card className="p-6 text-center border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-emerald-700 font-bold text-lg">Enjoy your meal!</p>
            <Link href={`/r/${slug}/table/${tableNo}`}>
              <Button className="mt-4" variant="outline">Order More</Button>
            </Link>
          </Card>
        ) : isReady ? (
          <>
            <Card className="p-6 text-center border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg shadow-emerald-100 animate-pulse">
              <div className="text-5xl mb-3">🍽️</div>
              <p className="text-emerald-700 font-black text-xl">Your order is ready!</p>
              <p className="text-emerald-600/70 text-sm mt-1">A waiter will bring it to your table shortly.</p>
            </Card>
            {/* Progress (completed) */}
            <Card className="p-6 bg-white border-slate-200">
              <Progress value={100} className="h-2 mb-6" />
              <div className="space-y-4">
                {STAGES.map((stage, i) => (
                  <div key={stage.key} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-50">
                      <stage.icon className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{stage.label}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Button onClick={handleCallWaiter} variant="outline" className="w-full h-12">
              <Phone className="w-4 h-4 mr-2" /> Call Waiter
            </Button>
          </>
        ) : (
          <>
            {/* Progress */}
            <Card className="p-6 bg-white border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Order Progress</h3>
                {timeLeft !== null && (
                  <div className="flex items-center gap-1.5 text-slate-9000">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-bold">{timeLeft} min left</span>
                  </div>
                )}
              </div>

              <Progress value={progressPercent} className="h-2 mb-6" />

              <div className="space-y-4">
                {STAGES.map((stage, i) => {
                  const isActive = i <= currentStageIndex;
                  const isCurrent = i === currentStageIndex;
                  return (
                    <div key={stage.key} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCurrent ? 'bg-orange-50' : isActive ? 'bg-emerald-50' : 'bg-slate-50'
                      }`}>
                        <stage.icon className={`w-4 h-4 ${
                          isCurrent ? 'text-slate-9000' : isActive ? 'text-emerald-500' : 'text-slate-400'
                        }`} />
                      </div>
                      <span className={`text-sm font-medium ${
                        isCurrent ? 'text-emerald-600' : isActive ? 'text-slate-700' : 'text-slate-400'
                      }`}>
                        {stage.label}
                        {isCurrent && order.orderStatus === 'pending' && ' — Waiting for approval...'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ETA info */}
            {order.estimatedTime > 0 && !order.cookingStartedAt && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-600">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Estimated preparation time: <strong>{order.estimatedTime} minutes</strong>
                </p>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleCallWaiter}
                variant="outline"
                className="flex-1 h-12"
              >
                <Phone className="w-4 h-4 mr-2" /> Call Waiter
              </Button>
              {canCancel && order.orderStatus === 'pending' && (
                <Button
                  onClick={handleCancel}
                  variant="destructive"
                  className="flex-1 h-12"
                >
                  Cancel Order
                </Button>
              )}
            </div>
          </>
        )}

        {/* Order items + GST Bill */}
        <Card className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900">Order Details</h3>
            <button onClick={() => setShowBillDetail(!showBillDetail)}
              className="text-xs text-emerald-600 font-semibold">
              {showBillDetail ? 'Hide Tax Details' : 'View Tax Details'}
            </button>
          </div>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5">
              <span className="text-slate-500">{item.name} × {item.quantity}</span>
              <span className="font-medium">₹{item.price * item.quantity}</span>
            </div>
          ))}

          {showBillDetail && restConfig && (() => {
            const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
            const svcCharge = subtotal * (restConfig.serviceChargePercent / 100);
            const taxable = subtotal + svcCharge;
            const cgst = taxable * (restConfig.cgstPercent / 100);
            const sgst = taxable * (restConfig.sgstPercent / 100);
            const raw = taxable + cgst + sgst;
            const grand = Math.round(raw);
            const roff = +(grand - raw).toFixed(2);
            return (
              <>
                <Separator className="my-2" />
                <div className="space-y-1 text-sm text-slate-500">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                  {svcCharge > 0 && <div className="flex justify-between"><span>Service Charge ({restConfig.serviceChargePercent}%)</span><span>₹{svcCharge.toFixed(2)}</span></div>}
                  <div className="flex justify-between"><span>CGST ({restConfig.cgstPercent}%)</span><span>₹{cgst.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>SGST ({restConfig.sgstPercent}%)</span><span>₹{sgst.toFixed(2)}</span></div>
                  {roff !== 0 && <div className="flex justify-between text-slate-400"><span>Round Off</span><span>₹{roff.toFixed(2)}</span></div>}
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>Grand Total</span>
                  <span className="text-emerald-600">₹{grand.toFixed(2)}</span>
                </div>
                {restConfig.gstin && <p className="text-[10px] text-slate-400 mt-1">GSTIN: {restConfig.gstin}</p>}
                {restConfig.fssaiLicense && <p className="text-[10px] text-slate-400">FSSAI: {restConfig.fssaiLicense}</p>}
              </>
            );
          })()}

          {!showBillDetail && (
            <>
              <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </>
          )}
        </Card>

        {/* Feedback — show when served or completed */}
        {(isCompleted || isReady) && (
          <Card className="p-4 bg-white border-slate-200 text-center">
            <h3 className="font-bold text-sm text-slate-900 mb-1">{feedbackSent ? 'Thanks for your feedback!' : 'How was your experience?'}</h3>
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} disabled={feedbackSent}
                  onClick={async () => {
                    setFeedbackRating(star);
                    setFeedbackSent(true);
                    toast.success('Thanks for your feedback!');
                    // Try to submit to bill feedback endpoint if a bill exists
                    try { await api.post(`/bills/${orderId}/feedback`, { rating: star }); } catch { /* ok */ }
                  }}
                  className={`text-2xl transition-transform border-0 bg-transparent ${
                    star <= feedbackRating ? 'scale-110' : 'opacity-30 hover:opacity-60'
                  } ${feedbackSent ? 'cursor-default' : 'cursor-pointer'}`}>
                  ⭐
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Share / WhatsApp — show when completed */}
        {(isCompleted || isReady) && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-11"
              onClick={() => {
                const text = `${restConfig?.name || 'Restaurant'} — Order ${order.orderNumber}\nTable ${order.tableNumber}\n\n${
                  order.items.map(i => `${i.name} x${i.quantity} — ₹${i.price * i.quantity}`).join('\n')
                }\n\nTotal: ₹${order.totalAmount}\n\nThank you!`;
                navigator.clipboard.writeText(text);
                toast.success('Bill copied!');
              }}>
              📋 Copy Bill
            </Button>
            <Button variant="outline" className="flex-1 h-11"
              onClick={() => {
                const text = encodeURIComponent(`${restConfig?.name || 'Restaurant'} — Order ${order.orderNumber}\nTable ${order.tableNumber}\n\n${
                  order.items.map(i => `${i.name} x${i.quantity} — ₹${i.price * i.quantity}`).join('\n')
                }\n\nTotal: ₹${order.totalAmount}\n\nThank you!`);
                const phone = order.customerPhone?.replace(/\D/g, '') || '';
                window.open(phone ? `https://wa.me/91${phone}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
              }}>
              💬 WhatsApp
            </Button>
          </div>
        )}

        {/* Continue ordering */}
        <Link href={`/r/${slug}/table/${tableNo}`}>
          <Button variant="outline" className="w-full h-12">
            Browse Menu & Order More
          </Button>
        </Link>
      </div>
    </div>
  );
}
