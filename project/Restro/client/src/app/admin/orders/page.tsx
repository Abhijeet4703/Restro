'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  ChefHat,
  Eye,
  Filter,
  Search,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { connectSocket, joinRestaurant, getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  tableNumber: number;
  items: OrderItem[];
  totalAmount: number;
  paymentMode: 'pay-now' | 'pay-later';
  paymentStatus: 'paid' | 'unpaid' | 'refunded' | 'partial';
  orderStatus: string;
  estimatedTime?: number;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  approvedAt?: string;
  cookingStartedAt?: string;
  readyAt?: string;
  servedAt?: string;
}

const statusColor: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  approved: 'bg-blue-50 text-blue-600 border-blue-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  cooking: 'bg-orange-50 text-orange-600 border-orange-200',
  preparation: 'bg-purple-50 text-purple-600 border-purple-200',
  plating: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  ready: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  served: 'bg-green-50 text-green-600 border-green-200',
  completed: 'bg-green-50 text-green-600 border-green-200',
  cancelled: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

export default function AdminOrdersPage() {
  const { restaurant } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders');
      setOrders(data.orders || data || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!restaurant?._id) return;
    const socket = connectSocket();
    joinRestaurant(restaurant._id);

    socket.on('order:new', () => fetchOrders());
    socket.on('order:status-update', () => fetchOrders());

    return () => {
      socket.off('order:new');
      socket.off('order:status-update');
    };
  }, [restaurant, fetchOrders]);

  const handleApprove = async (orderId: string) => {
    try {
      await api.post(`/orders/${orderId}/approve`);
      toast.success('Order approved and sent to kitchen');
      fetchOrders();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to approve';
      toast.error(msg);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      const labels: Record<string, string> = { cooking: 'Cooking started', ready: 'Order marked as ready!', served: 'Order marked as served' };
      toast.success(labels[status] || `Status updated to ${status}`);
      fetchOrders();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update status';
      toast.error(msg);
    }
  };

  const handleReject = async () => {
    if (!rejectingOrderId) return;
    try {
      await api.post(`/orders/${rejectingOrderId}/reject`, { reason: rejectReason || 'Order rejected by admin' });
      toast.success('Order rejected');
      setShowRejectDialog(false);
      setRejectReason('');
      setRejectingOrderId(null);
      fetchOrders();
    } catch {
      toast.error('Failed to reject order');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesTab =
      tab === 'all' ||
      (tab === 'pending' && o.orderStatus === 'pending') ||
      (tab === 'active' && ['approved', 'cooking', 'preparation', 'plating'].includes(o.orderStatus)) ||
      (tab === 'ready' && ['ready', 'served'].includes(o.orderStatus)) ||
      (tab === 'completed' && ['completed', 'cancelled', 'rejected'].includes(o.orderStatus));

    const matchesSearch =
      !searchQuery ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.tableNumber.toString().includes(searchQuery);

    return matchesTab && matchesSearch;
  });

  const pendingCount = orders.filter((o) => o.orderStatus === 'pending').length;
  const activeCount = orders.filter((o) => ['approved', 'cooking', 'preparation', 'plating'].includes(o.orderStatus)).length;

  const timeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and approve incoming orders</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50 h-9 gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={tab} onValueChange={setTab} className="w-full sm:w-auto">
          <TabsList className="bg-slate-50 border border-slate-200">
            <TabsTrigger value="pending" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600">
              Pending {pendingCount > 0 && <Badge className="ml-1.5 bg-amber-100 text-amber-500 text-[10px] px-1">{pendingCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">
              Active {activeCount > 0 && <Badge className="ml-1.5 bg-orange-50 text-slate-500 text-[10px] px-1">{activeCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="ready" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">Ready</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-white/10 data-[state=active]:text-slate-700">Done</TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-white/10 data-[state=active]:text-slate-700">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by order # or table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-9"
          />
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="bg-white border-slate-200">
          <CardContent className="py-16 text-center">
            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">No orders in this category</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card
              key={order._id}
              className={cn(
                'bg-white border-slate-200 transition-all table-row-hover',
                order.orderStatus === 'pending' && 'border-l-[3px] border-l-amber-500 shadow-sm shadow-amber-50'
              )}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Table badge */}
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-slate-700">T{order.tableNumber}</span>
                    <span className="text-[9px] text-slate-400 uppercase">Table</span>
                  </div>

                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold">#{order.orderNumber}</span>
                      <Badge className={cn('text-[10px] px-1.5 border', statusColor[order.orderStatus])}>
                        {order.orderStatus.toUpperCase()}
                      </Badge>
                      <Badge
                        className={cn(
                          'text-[10px] px-1.5 border',
                          order.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : order.paymentStatus === 'refunded'
                              ? 'bg-purple-50 text-purple-600 border-purple-200'
                              : 'bg-red-50 text-red-600 border-red-200'
                        )}
                      >
                        {order.paymentStatus === 'paid' ? '💰 PAID' : order.paymentStatus === 'refunded' ? '↩ REFUNDED' : '⏳ NOT PAID'}
                      </Badge>
                      <span className="text-[11px] text-slate-400">{timeSince(order.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {order.items.map((i) => `${i.quantity}× ${i.name}`).join(' • ')}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {order.customerName && (
                        <span className="text-[11px] text-slate-500">👤 {order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</span>
                      )}
                      {order.estimatedTime && (
                        <span className="text-[11px] text-blue-400/70">⏱ ETA: {order.estimatedTime} min</span>
                      )}
                      {order.paymentMode === 'pay-now' && order.paymentStatus !== 'paid' && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">⚠ Verify UPI payment</span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-slate-900 stat-number">₹{order.totalAmount.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {order.orderStatus === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(order._id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectingOrderId(order._id);
                            setShowRejectDialog(true);
                          }}
                          className="border-red-200 text-red-400 hover:bg-red-50 h-9 px-4"
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {order.orderStatus === 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order._id, 'cooking')}
                        className="bg-orange-500 hover:bg-orange-600 text-white h-9 px-4"
                      >
                        <ChefHat className="w-4 h-4 mr-1" /> Start Cooking
                      </Button>
                    )}
                    {['cooking', 'preparation', 'plating'].includes(order.orderStatus) && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order._id, 'ready')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Mark Ready
                      </Button>
                    )}
                    {order.orderStatus === 'ready' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order._id, 'served')}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Mark Served
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedOrder(order)}
                      className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-9"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription className="text-slate-500">
              Provide a reason for rejection. The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g., Item unavailable, Please pay first..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 mt-2"
            rows={3}
          />
          <div className="flex gap-3 mt-4 justify-end">
            <Button variant="ghost" onClick={() => setShowRejectDialog(false)} className="text-slate-500">
              Cancel
            </Button>
            <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white">
              <XCircle className="w-4 h-4 mr-1" /> Reject Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription className="text-slate-500">
              Table {selectedOrder?.tableNumber} • {selectedOrder && timeSince(selectedOrder.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 mt-2">
              <div className="flex gap-2 flex-wrap">
                <Badge className={cn('border', statusColor[selectedOrder.orderStatus])}>
                  {selectedOrder.orderStatus.toUpperCase()}
                </Badge>
                <Badge
                  className={cn(
                    'border',
                    selectedOrder.paymentStatus === 'paid'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  )}
                >
                  {selectedOrder.paymentStatus.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="border-slate-200 text-slate-500">
                  {selectedOrder.paymentMode === 'pay-now' ? '📱 Pay Online' : '🧾 Pay at Table'}
                </Badge>
                {selectedOrder.paymentMode === 'pay-now' && selectedOrder.paymentStatus !== 'paid' && (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">⚠ Verify UPI payment before approving</Badge>
                )}
              </div>
              {(selectedOrder.customerName || selectedOrder.customerPhone) && (
                <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                  {selectedOrder.customerName && <span className="font-medium">👤 {selectedOrder.customerName}</span>}
                  {selectedOrder.customerPhone && <span className="text-slate-400 ml-2">· {selectedOrder.customerPhone}</span>}
                </div>
              )}

              <div className="space-y-2">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white">
                    <div>
                      <span className="text-sm font-medium">{item.quantity}× {item.name}</span>
                      {item.notes && <p className="text-xs text-slate-400 mt-0.5">Note: {item.notes}</p>}
                    </div>
                    <span className="text-sm font-semibold">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-lg font-bold">₹{selectedOrder.totalAmount.toLocaleString()}</span>
              </div>

              {selectedOrder.orderStatus === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      handleApprove(selectedOrder._id);
                      setSelectedOrder(null);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-400 hover:bg-red-50"
                    onClick={() => {
                      setRejectingOrderId(selectedOrder._id);
                      setShowRejectDialog(true);
                      setSelectedOrder(null);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
              {selectedOrder.orderStatus === 'approved' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => { handleStatusUpdate(selectedOrder._id, 'cooking'); setSelectedOrder(null); }}
                  >
                    <ChefHat className="w-4 h-4 mr-1" /> Start Cooking
                  </Button>
                </div>
              )}
              {['cooking', 'preparation', 'plating'].includes(selectedOrder.orderStatus) && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => { handleStatusUpdate(selectedOrder._id, 'ready'); setSelectedOrder(null); }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Mark Ready
                  </Button>
                </div>
              )}
              {selectedOrder.orderStatus === 'ready' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => { handleStatusUpdate(selectedOrder._id, 'served'); setSelectedOrder(null); }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Mark Served
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
