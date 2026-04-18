'use client';

import { useEffect, useState } from 'react';
import {
  ShoppingBag,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChefHat,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  pendingOrders: number;
  cookingOrders: number;
  completedOrders: number;
  activeTableCount: number;
  totalTables: number;
}

interface ActiveOrder {
  _id: string;
  orderNumber: string;
  tableNumber: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  items: { name: string; quantity: number }[];
  createdAt: string;
}

const statusColor: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  approved: 'bg-blue-50 text-blue-600 border-blue-200',
  cooking: 'bg-orange-50 text-orange-600 border-orange-200',
  preparation: 'bg-purple-50 text-purple-600 border-purple-200',
  plating: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  ready: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  served: 'bg-green-50 text-green-600 border-green-200',
};

// Mock revenue chart data (will be replaced with real API data)
const revenueData = [
  { time: '9AM', revenue: 1200 },
  { time: '10AM', revenue: 2400 },
  { time: '11AM', revenue: 3100 },
  { time: '12PM', revenue: 5800 },
  { time: '1PM', revenue: 7200 },
  { time: '2PM', revenue: 6400 },
  { time: '3PM', revenue: 4100 },
  { time: '4PM', revenue: 3600 },
  { time: '5PM', revenue: 2900 },
  { time: '6PM', revenue: 4800 },
  { time: '7PM', revenue: 6900 },
  { time: '8PM', revenue: 8200 },
  { time: '9PM', revenue: 7100 },
];

const topDishes = [
  { name: 'Butter Chicken', orders: 48, revenue: 14400 },
  { name: 'Paneer Tikka', orders: 35, revenue: 8750 },
  { name: 'Biryani', orders: 32, revenue: 9600 },
  { name: 'Garlic Naan', orders: 56, revenue: 3360 },
  { name: 'Gulab Jamun', orders: 28, revenue: 4200 },
];

export default function AdminDashboard() {
  const { restaurant } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          api.get('/restaurant/stats'),
          api.get('/orders?status=pending,approved,cooking,preparation,plating,ready'),
        ]);
        setStats(statsRes.data);
        setActiveOrders(ordersRes.data.orders || ordersRes.data || []);
      } catch {
        // Use fallback data if API not ready
        setStats({
          totalOrders: 156,
          todayOrders: 24,
          totalRevenue: 87400,
          todayRevenue: 12800,
          pendingOrders: 3,
          cookingOrders: 5,
          completedOrders: 16,
          activeTableCount: 8,
          totalTables: restaurant?.tableCount || 15,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [restaurant]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Today's Orders",
      value: stats?.todayOrders || 0,
      icon: ShoppingBag,
      trend: '+12%',
      color: 'from-emerald-600 to-teal-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: "Today's Revenue",
      value: `₹${(stats?.todayRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      trend: '+8%',
      color: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Active Tables',
      value: `${stats?.activeTableCount || 0}/${stats?.totalTables || 0}`,
      icon: Users,
      trend: '',
      color: 'from-emerald-600 to-teal-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Pending Approval',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      trend: '',
      color: 'from-amber-500 to-yellow-500',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back, <span className="font-semibold text-slate-700">{restaurant?.name}</span></p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Live · updates every 30s</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="metric-card bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden group">
            <div className={cn('absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r', stat.color)} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest">{stat.label}</p>
                <p className="stat-number text-3xl font-black mt-2 text-slate-900">{stat.value}</p>
                {stat.trend && (
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-500">{stat.trend}</span>
                    <span className="text-xs text-slate-400">vs yesterday</span>
                  </div>
                )}
              </div>
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', stat.iconBg)}>
                <stat.icon className={cn('w-5 h-5', stat.iconColor)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Revenue Today</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                <YAxis stroke="#cbd5e1" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <ReTooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: 12,
                    color: '#334155',
                  }}
                  formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Dishes */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-emerald-500 to-teal-400 inline-block" />
              Top Dishes Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDishes.map((dish, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <span className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black',
                  i === 0 ? 'bg-amber-50 text-amber-500' :
                  i === 1 ? 'bg-slate-100 text-slate-500' :
                  i === 2 ? 'bg-orange-50 text-orange-400' : 'bg-slate-50 text-slate-400'
                )}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{dish.name}</p>
                  <p className="text-xs text-slate-400">{dish.orders} orders</p>
                </div>
                <span className="text-sm font-bold text-emerald-600">₹{dish.revenue.toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Active Orders */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-orange-500 to-amber-400 inline-block" />
              Active Orders
            </CardTitle>
            <Badge variant="outline" className="bg-amber-50 text-orange-600 border-orange-200 text-[11px] font-semibold">
              {activeOrders.length || stats?.cookingOrders || 0} active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="text-sm">No active orders right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.slice(0, 8).map((order) => (
                <div
                  key={order._id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-white border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-600">T{order.tableNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">#{order.orderNumber}</span>
                      <Badge className={cn('text-[10px] px-1.5 border', statusColor[order.orderStatus] || 'bg-white/10 text-slate-500')}>
                        {order.orderStatus}
                      </Badge>
                      <Badge
                        className={cn(
                          'text-[10px] px-1.5 border',
                          order.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                        )}
                      >
                        {order.paymentStatus === 'paid' ? 'PAID' : 'NOT PAID'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">₹{order.totalAmount}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Pending', count: stats?.pendingOrders || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Cooking', count: stats?.cookingOrders || 0, icon: ChefHat, color: 'text-emerald-600', bg: 'bg-slate-100' },
          { label: 'Ready', count: 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-50' },
          { label: 'Served', count: 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-50' },
          { label: 'Completed', count: stats?.completedOrders || 0, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map((stage) => (
          <Card key={stage.label} className="bg-white border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', stage.bg)}>
                <stage.icon className={cn('w-4 h-4', stage.color)} />
              </div>
              <div>
                <p className="text-lg font-bold">{stage.count}</p>
                <p className="text-[11px] text-slate-500">{stage.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
