'use client';

import { useEffect, useState } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Subscription {
  _id: string;
  restaurantName: string;
  plan: 'Starter' | 'Pro' | 'Enterprise';
  status: 'active' | 'expiring' | 'expired' | 'cancelled';
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
}

const planColors: Record<string, string> = {
  Starter: 'border-blue-200 text-blue-600',
  Pro: 'border-emerald-200 text-emerald-600',
  Enterprise: 'border-violet-200 text-violet-600',
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', color: 'bg-emerald-50 text-emerald-400 border-emerald-200', icon: CheckCircle2 },
  expiring: { label: 'Expiring Soon', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: AlertTriangle },
  expired: { label: 'Expired', color: 'bg-red-50 text-red-400 border-red-200', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'bg-zinc-50 text-zinc-400 border-zinc-200', icon: Clock },
};

const mockData: Subscription[] = [
  { _id: '1', restaurantName: 'Spice Garden', plan: 'Pro', status: 'active', amount: 2999, billingCycle: 'monthly', startDate: '2025-01-01', endDate: '2025-07-01' },
  { _id: '2', restaurantName: 'Urban Bites', plan: 'Enterprise', status: 'active', amount: 49999, billingCycle: 'yearly', startDate: '2024-11-01', endDate: '2025-11-01' },
  { _id: '3', restaurantName: 'The Blue Plate', plan: 'Starter', status: 'expiring', amount: 999, billingCycle: 'monthly', startDate: '2025-01-15', endDate: '2025-02-15' },
  { _id: '4', restaurantName: 'Café Bliss', plan: 'Pro', status: 'expired', amount: 2999, billingCycle: 'monthly', startDate: '2024-12-01', endDate: '2025-01-01' },
  { _id: '5', restaurantName: 'Dragon Wok', plan: 'Pro', status: 'active', amount: 29999, billingCycle: 'yearly', startDate: '2025-01-10', endDate: '2026-01-10' },
  { _id: '6', restaurantName: 'Tandoori Nights', plan: 'Starter', status: 'cancelled', amount: 999, billingCycle: 'monthly', startDate: '2024-10-01', endDate: '2024-11-01' },
];

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(mockData);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/superadmin/subscriptions');
        if (data?.length) setSubscriptions(data);
      } catch {
        // Use mock data
      }
    };
    fetchData();
  }, []);

  const filtered = subscriptions.filter((s) => {
    const matchSearch = s.restaurantName.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'all' || s.status === tab;
    return matchSearch && matchTab;
  });

  const totalMRR = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (s.billingCycle === 'monthly' ? s.amount : Math.round(s.amount / 12)), 0);

  const counts = {
    all: subscriptions.length,
    active: subscriptions.filter((s) => s.status === 'active').length,
    expiring: subscriptions.filter((s) => s.status === 'expiring').length,
    expired: subscriptions.filter((s) => s.status === 'expired').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor and manage restaurant subscription plans</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Monthly Recurring</p>
              <p className="text-xl font-bold text-slate-900">₹{totalMRR.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Active Plans</p>
              <p className="text-xl font-bold text-slate-900">{counts.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Expiring Soon</p>
              <p className="text-xl font-bold text-slate-900">{counts.expiring}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-slate-50">
            {Object.entries(counts).map(([key, count]) => (
              <TabsTrigger key={key} value={key} className="text-xs capitalize data-[state=active]:bg-emerald-600/30 data-[state=active]:text-emerald-700">
                {key} ({count})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 text-sm"
          />
        </div>
      </div>

      {/* Subscription List */}
      <div className="space-y-3">
        {filtered.map((sub) => {
          const sc = statusConfig[sub.status];
          const StatusIcon = sc.icon;
          return (
            <Card key={sub._id} className="bg-white border-slate-200 hover:bg-slate-50 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-emerald-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-slate-900 truncate">{sub.restaurantName}</h3>
                    <Badge variant="outline" className={cn('text-[10px] border', planColors[sub.plan])}>
                      {sub.plan}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(sub.startDate).toLocaleDateString()} — {new Date(sub.endDate).toLocaleDateString()}
                    </span>
                    <span className="capitalize">{sub.billingCycle}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-900">₹{sub.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">/{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}</p>
                </div>

                <Badge variant="outline" className={cn('text-[10px] border shrink-0', sc.color)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {sc.label}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">No subscriptions found</div>
      )}
    </div>
  );
}
