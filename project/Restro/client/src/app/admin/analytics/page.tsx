'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Users,
  Clock,
  Star,
  UtensilsCrossed,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type AnalyticsData = {
  daily: { day: string; orders: number; revenue: number }[];
  hourly: { hour: string; orders: number }[];
  topDishes: { name: string; orders: number; revenue: number }[];
  categories: { name: string; value: number; color: string }[];
  summary: { avgOrder: number; avgPrepTime: number; totalRevenue: number; totalOrders: number };
  paymentBreakdown: { method: string; amount: number; count: number }[];
};

const TOOLTIP_STYLE = {
  background: '#110f1e',
  border: '1px solid rgba(249,115,22,0.2)',
  borderRadius: '8px',
  fontSize: 12,
  color: '#334155',
};

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const { data: res } = await api.get(`/bills/analytics?days=${days}`);
        setData(res);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [days]);

  const weeklyOrders = data?.daily ?? [];
  const categoryBreakdown = data?.categories ?? [];
  const hourlyData = data?.hourly ?? [];
  const topDishes = data?.topDishes ?? [];
  const summary = data?.summary;

  const metrics = [
    { label: 'Avg Order Value', value: summary ? `₹${Math.round(summary.avgOrder)}` : '—', icon: DollarSign },
    { label: 'Avg Prep Time', value: summary ? `${Math.round(summary.avgPrepTime)} min` : '—', icon: Clock },
    { label: 'Total Revenue', value: summary ? `₹${(summary.totalRevenue / 1000).toFixed(1)}K` : '—', icon: TrendingUp },
    { label: 'Total Orders', value: summary ? String(summary.totalOrders) : '—', icon: ShoppingBag },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Performance insights for your restaurant</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-white border-slate-200 animate-pulse">
              <CardContent className="p-4 h-20" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white border-slate-200 animate-pulse"><CardContent className="h-64" /></Card>
          <Card className="bg-white border-slate-200 animate-pulse"><CardContent className="h-64" /></Card>
        </div>
      </div>
    );
  }

  if (!data || summary?.totalOrders === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">Performance insights for your restaurant</p>
          </div>
        </div>
        <Card className="bg-white border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <ShoppingBag className="w-12 h-12 text-slate-200" />
            <p className="text-slate-500 font-medium">No orders yet</p>
            <p className="text-xs text-slate-400">Analytics will appear once you receive your first orders</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Performance insights for your restaurant</p>
        </div>
        <div className="flex gap-1">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={cn('px-3 py-1.5 text-xs rounded-lg font-medium transition-all', days === d ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <Card key={i} className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-slate-900">{m.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{m.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Revenue */}
        <Card className="lg:col-span-2 bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Orders & Revenue ({days}d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                <YAxis stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                <ReTooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="orders" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {categoryBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                      {categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {categoryBreakdown.map((c) => (
                    <div key={c.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                      {c.name} ({c.value}%)
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 py-10">No category data</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Peak Hours (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="adminHourGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#cbd5e1" tick={{ fontSize: 10 }} />
                <YAxis stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                <ReTooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="orders" stroke="#14b8a6" strokeWidth={2} fill="url(#adminHourGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Dishes */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Top Selling Dishes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDishes.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No dish data</p>
            ) : topDishes.map((dish, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-600 w-5 text-center">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900 truncate">{dish.name}</p>
                    <span className="text-xs text-emerald-400 font-semibold">₹{(dish.revenue / 1000).toFixed(1)}K</span>
                  </div>
                  <div className="w-full bg-slate-50 rounded-full h-1.5 mt-1.5">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"
                      style={{ width: `${topDishes[0].orders > 0 ? (dish.orders / topDishes[0].orders) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{dish.orders} orders</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Payment Breakdown */}
      {data.paymentBreakdown && data.paymentBreakdown.length > 0 && (
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.paymentBreakdown.map((p) => (
                <div key={p.method} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 capitalize">{p.method}</p>
                  <p className="text-base font-bold text-slate-900 mt-1">₹{(p.amount / 1000).toFixed(1)}K</p>
                  <p className="text-[10px] text-slate-400">{p.count} bills</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
