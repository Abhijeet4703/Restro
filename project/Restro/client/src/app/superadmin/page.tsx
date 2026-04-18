'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const platformRevenue = [
  { month: 'Jan', revenue: 45000 },
  { month: 'Feb', revenue: 52000 },
  { month: 'Mar', revenue: 61000 },
  { month: 'Apr', revenue: 58000 },
  { month: 'May', revenue: 72000 },
  { month: 'Jun', revenue: 85000 },
  { month: 'Jul', revenue: 94000 },
];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalRestaurants: 24,
    pendingApprovals: 3,
    totalOrders: 15240,
    platformRevenue: 467000,
    activeSubscriptions: 21,
    monthlyGrowth: 18,
  });
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'approval', message: 'New restaurant "Spice Garden" awaiting approval', time: '5m ago' },
    { id: 2, type: 'alert', message: 'Restaurant "Café Bliss" subscription expiring in 3 days', time: '1h ago' },
    { id: 3, type: 'info', message: 'System maintenance scheduled for Sunday 2AM–4AM', time: '3h ago' },
  ]);

  useEffect(() => {
    // Fetch real data when API is available
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/superadmin/stats');
        if (data) setStats(data);
      } catch {
        // Use fallback data
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Restaurants',
      value: stats.totalRestaurants,
      icon: Building2,
      color: 'from-emerald-600 to-teal-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Platform Revenue',
      value: `₹${(stats.platformRevenue / 1000).toFixed(0)}K`,
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingBag,
      color: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-400',
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: Clock,
      color: 'from-slate-600 to-slate-500',
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Manage all restaurants and platform operations</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="bg-white border-slate-200 overflow-hidden relative group hover:bg-slate-50 transition-colors">
            <div className={cn('absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r', stat.color)} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold mt-2 text-slate-900">{stat.value}</p>
                </div>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.iconBg)}>
                  <stat.icon className={cn('w-5 h-5', stat.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Platform Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={platformRevenue}>
                <defs>
                  <linearGradient id="saRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#cbd5e1" tick={{ fontSize: 11 }} />
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
                <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fill="url(#saRevGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">System Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-100">
                {alert.type === 'approval' && <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />}
                {alert.type === 'alert' && <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
                {alert.type === 'info' && <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700">{alert.message}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{alert.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Growth metric */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Monthly Growth</p>
            <p className="text-2xl font-bold">+{stats.monthlyGrowth}%</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm text-slate-500">Active Subscriptions</p>
            <p className="text-2xl font-bold text-emerald-500">{stats.activeSubscriptions}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
