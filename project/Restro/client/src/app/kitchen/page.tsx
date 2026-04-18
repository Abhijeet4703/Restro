'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  Play,
  ChefHat,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Flame,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { connectSocket, joinKitchen } from '@/lib/socket';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface KitchenOrder {
  _id: string;
  orderNumber: string;
  tableNumber: number;
  items: { menuItemId: string; name: string; price: number; quantity: number; notes?: string }[];
  totalAmount: number;
  orderStatus: string;
  estimatedTime?: number;
  cookingStartedAt?: string;
  isPriority?: boolean;
  createdAt: string;
}

const stageConfig: Record<string, { label: string; color: string; icon: typeof Clock; next: string | null }> = {
  approved: { label: 'Waiting', color: 'bg-blue-50 text-blue-600', icon: Clock, next: 'cooking' },
  cooking: { label: 'Cooking', color: 'bg-orange-50 text-orange-600', icon: Flame, next: 'preparation' },
  preparation: { label: 'Preparing', color: 'bg-purple-50 text-purple-600', icon: Utensils, next: 'plating' },
  plating: { label: 'Plating', color: 'bg-cyan-50 text-cyan-600', icon: ChefHat, next: 'ready' },
  ready: { label: 'Ready', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2, next: null },
};

export default function KitchenDashboard() {
  const { restaurant } = useAuthStore();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDialog, setStartDialog] = useState<KitchenOrder | null>(null);
  const [etaInput, setEtaInput] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/kitchen/orders');
      setOrders(data.orders || data || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    if (!restaurant?._id) return;
    const socket = connectSocket();
    joinKitchen(restaurant._id);

    socket.on('order:approved', () => fetchOrders());
    return () => {
      socket.off('order:approved');
    };
  }, [restaurant, fetchOrders]);

  const handleStartCooking = async () => {
    if (!startDialog) return;
    const eta = parseInt(etaInput) || startDialog.estimatedTime || 20;
    try {
      await api.post(`/kitchen/${startDialog._id}/start`, { estimatedTime: eta });
      toast.success(`Started cooking - ETA: ${eta} min`);
      setStartDialog(null);
      setEtaInput('');
      fetchOrders();
    } catch {
      toast.error('Failed to start cooking');
    }
  };

  const handleUpdateStage = async (orderId: string, stage: string) => {
    try {
      await api.post(`/kitchen/${orderId}/stage`, { stage });
      toast.success(`Order moved to ${stage}`);
      fetchOrders();
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const handleMarkServed = async (orderId: string) => {
    try {
      await api.post(`/kitchen/${orderId}/served`);
      toast.success('Marked as served');
      fetchOrders();
    } catch {
      toast.error('Failed to mark served');
    }
  };

  const getElapsedTime = (startTime: string) => {
    const mins = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
    return mins;
  };

  // Group orders by stage
  const stages = ['approved', 'cooking', 'preparation', 'plating', 'ready'];
  const grouped = stages.map((stage) => ({
    stage,
    config: stageConfig[stage],
    orders: orders
      .filter((o) => o.orderStatus === stage)
      .sort((a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0)),
  }));

  const totalActive = orders.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Kitchen Display
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{totalActive} active {totalActive === 1 ? 'order' : 'orders'} in queue</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50 h-9">
          Refresh
        </Button>
      </div>

      {/* Pipeline counts */}
      <div className="grid grid-cols-5 gap-2">
        {grouped.map(({ stage, config, orders: stageOrders }) => (
          <div
            key={stage}
            className={cn(
              'p-3 rounded-xl text-center border transition-all',
              stageOrders.length > 0
                ? 'bg-white border-slate-200 shadow-sm'
                : 'bg-slate-50 border-slate-100'
            )}
          >
            <config.icon className={cn('w-5 h-5 mx-auto mb-1.5', config.color.split(' ')[1])} />
            <p className="text-xl font-black stat-number">{stageOrders.length}</p>
            <p className="text-[11px] text-slate-500 font-medium">{config.label}</p>
          </div>
        ))}
      </div>

      {/* Orders by column / Kanban style */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-64 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : totalActive === 0 ? (
        <Card className="bg-white border-slate-200">
          <CardContent className="py-20 text-center">
            <ChefHat className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-xl font-semibold text-slate-300">No orders in queue</p>
            <p className="text-sm text-slate-200 mt-1">Waiting for approved orders...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {grouped.map(({ stage, config, orders: stageOrders }) => (
            <div key={stage} className="space-y-3">
              {/* Column header */}
              <div className={cn('px-3 py-2.5 rounded-xl flex items-center justify-between border', config.color.split(' ')[0], 'border-current/10')}>
                <div className="flex items-center gap-2">
                  <config.icon className={cn('w-4 h-4', config.color.split(' ')[1])} />
                  <span className={cn('text-xs font-bold uppercase tracking-wider', config.color.split(' ')[1])}>
                    {config.label}
                  </span>
                </div>
                <span className={cn('text-xs font-black w-5 h-5 rounded-full flex items-center justify-center', config.color)}>
                  {stageOrders.length}
                </span>
              </div>

              {/* Order cards */}
              {stageOrders.map((order) => (
                <Card
                  key={order._id}
                  className={cn(
                    'bg-white border-slate-200 overflow-hidden transition-all',
                    order.isPriority ? 'urgent-card border-l-[3px] border-l-red-500' : 'hover:shadow-md'
                  )}
                >
                  <CardContent className="p-3 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-700">T{order.tableNumber}</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold">#{order.orderNumber}</span>
                          {order.isPriority && (
                            <Badge className="ml-1 bg-red-50 text-red-600 border-red-200 text-[9px] px-1">
                              PRIORITY
                            </Badge>
                          )}
                        </div>
                      </div>
                      {order.cookingStartedAt && order.estimatedTime && (
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-[10px]">
                            <Timer className="w-3 h-3 text-emerald-600" />
                            <span className={cn(
                              'font-mono font-bold',
                              getElapsedTime(order.cookingStartedAt) > order.estimatedTime
                                ? 'text-red-400'
                                : 'text-orange-600'
                            )}>
                              {getElapsedTime(order.cookingStartedAt)}m / {order.estimatedTime}m
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="space-y-1">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[11px] font-bold text-emerald-600 w-5 shrink-0">{item.quantity}×</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-slate-700">{item.name}</span>
                            {item.notes && (
                              <p className="text-[10px] text-amber-400/60 italic">📝 {item.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="pt-1">
                      {stage === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setStartDialog(order);
                            setEtaInput(order.estimatedTime?.toString() || '20');
                          }}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white h-8 text-xs"
                        >
                          <Play className="w-3 h-3 mr-1" /> Start Cooking
                        </Button>
                      )}
                      {config.next && stage !== 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStage(order._id, config.next!)}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 h-8 text-xs"
                        >
                          Move to {stageConfig[config.next]?.label} →
                        </Button>
                      )}
                      {stage === 'ready' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkServed(order._id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Served
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {stageOrders.length === 0 && (
                <div className="py-8 text-center text-slate-200 text-xs border border-dashed border-slate-200 rounded-lg">
                  Empty
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Start Cooking Dialog */}
      <Dialog open={!!startDialog} onOpenChange={() => setStartDialog(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm">
          <DialogHeader>
            <DialogTitle>Start Cooking</DialogTitle>
            <DialogDescription className="text-slate-500">
              Order #{startDialog?.orderNumber} • Table {startDialog?.tableNumber}
            </DialogDescription>
          </DialogHeader>
          {startDialog && (
            <div className="space-y-4 mt-2">
              <div className="space-y-1 p-3 bg-white rounded-lg">
                {startDialog.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-700">{item.quantity}× {item.name}</span>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Estimated Time (minutes)</label>
                <div className="flex gap-2">
                  {[10, 15, 20, 30, 45].map((t) => (
                    <Button
                      key={t}
                      variant="outline"
                      size="sm"
                      className={cn(
                        'border-slate-200 text-slate-500 h-8 text-xs',
                        etaInput === t.toString() && 'bg-orange-50 text-orange-600 border-orange-200'
                      )}
                      onClick={() => setEtaInput(t.toString())}
                    >
                      {t}m
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={1}
                  value={etaInput}
                  onChange={(e) => setEtaInput(e.target.value)}
                  placeholder="Custom time"
                  className="mt-2 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>

              <Button
                onClick={handleStartCooking}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Flame className="w-4 h-4 mr-2" /> Start Cooking — {etaInput || '20'}min ETA
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
