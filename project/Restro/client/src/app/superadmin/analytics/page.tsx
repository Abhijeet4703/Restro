'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  ShoppingBag,
  Users,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
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

const monthlyData = [
  { month: 'Aug', restaurants: 14, orders: 8200, revenue: 32000 },
  { month: 'Sep', restaurants: 16, orders: 9100, revenue: 38000 },
  { month: 'Oct', restaurants: 18, orders: 10400, revenue: 42000 },
  { month: 'Nov', restaurants: 20, orders: 11800, revenue: 51000 },
  { month: 'Dec', restaurants: 22, orders: 13500, revenue: 62000 },
  { month: 'Jan', restaurants: 24, orders: 15240, revenue: 72000 },
];

const planDistribution = [
  { name: 'Starter', value: 8, color: '#3b82f6' },
  { name: 'Pro', value: 11, color: '#6366f1' },
  { name: 'Enterprise', value: 5, color: '#8b5cf6' },
];

const topRestaurants = [
  { name: 'Urban Bites', orders: 2340, revenue: 156000 },
  { name: 'Dragon Wok', orders: 1890, revenue: 124000 },
  { name: 'Spice Garden', orders: 1650, revenue: 98000 },
  { name: 'The Blue Plate', orders: 1200, revenue: 72000 },
  { name: 'Tandoori Nights', orders: 980, revenue: 58000 },
];

const metrics = [
  { label: 'Avg Orders / Restaurant', value: '635', change: '+12%', up: true },
  { label: 'Avg Revenue / Restaurant', value: '₹19.4K', change: '+8%', up: true },
  { label: 'Customer Retention', value: '92%', change: '+3%', up: true },
  { label: 'Churn Rate', value: '2.1%', change: '-0.5%', up: false },
];

export default function SuperAdminAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Insights and metrics across the entire platform</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <Card key={i} className="bg-white border-slate-200">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{m.label}</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-xl font-bold text-slate-900">{m.value}</span>
                <span className={cn('text-[11px] flex items-center gap-0.5 mb-0.5', m.up ? 'text-emerald-400' : 'text-red-400')}>
                  {m.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {m.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Trend */}
        <Card className="lg:col-span-2 bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Monthly Orders & Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#cbd5e1" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <ReTooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: 12,
                    color: '#334155',
                  }}
                />
                <Bar yAxisId="left" dataKey="orders" fill="#059669" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar yAxisId="right" dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={24} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {planDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <ReTooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: 12,
                    color: '#334155',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {planDistribution.map((p) => (
                <div key={p.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {p.name} ({p.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restaurant Growth + Top Restaurants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Restaurant Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="saGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                <YAxis stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                <ReTooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: 12,
                    color: '#334155',
                  }}
                />
                <Area type="monotone" dataKey="restaurants" stroke="#059669" strokeWidth={2} fill="url(#saGrowthGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Restaurants */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Top Restaurants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRestaurants.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors">
                <span className="text-xs font-bold text-emerald-500 w-5 text-center">#{i + 1}</span>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                  <p className="text-[10px] text-slate-400">{r.orders.toLocaleString()} orders</p>
                </div>
                <span className="text-sm font-semibold text-emerald-400">₹{(r.revenue / 1000).toFixed(0)}K</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
