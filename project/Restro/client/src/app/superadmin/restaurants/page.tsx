'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Ban,
  MoreHorizontal,
  Globe,
  CalendarDays,
  MapPin,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  status: 'pending' | 'active' | 'suspended';
  subscription: string;
  totalTables: number;
  createdAt: string;
}

const mockRestaurants: Restaurant[] = [
  { _id: '1', name: 'Spice Garden', slug: 'spice-garden', ownerName: 'Rahul Sharma', ownerEmail: 'rahul@spicegarden.in', phone: '+91 98765 43210', address: 'Koramangala, Bangalore', status: 'pending', subscription: 'Pro', totalTables: 15, createdAt: '2025-01-10' },
  { _id: '2', name: 'Urban Bites', slug: 'urban-bites', ownerName: 'Priya Patel', ownerEmail: 'priya@urbanbites.in', phone: '+91 99887 11223', address: 'Indiranagar, Bangalore', status: 'active', subscription: 'Enterprise', totalTables: 30, createdAt: '2024-11-05' },
  { _id: '3', name: 'The Blue Plate', slug: 'blue-plate', ownerName: 'Amit Joshi', ownerEmail: 'amit@blueplate.in', phone: '+91 88776 55443', address: 'HSR Layout, Bangalore', status: 'active', subscription: 'Starter', totalTables: 8, createdAt: '2024-12-20' },
  { _id: '4', name: 'Café Bliss', slug: 'cafe-bliss', ownerName: 'Neha Gupta', ownerEmail: 'neha@cafebliss.in', phone: '+91 77665 44332', address: 'MG Road, Bangalore', status: 'suspended', subscription: 'Pro', totalTables: 20, createdAt: '2024-09-15' },
  { _id: '5', name: 'Dragon Wok', slug: 'dragon-wok', ownerName: 'Kiran Lee', ownerEmail: 'kiran@dragonwok.in', phone: '+91 66554 33221', address: 'Whitefield, Bangalore', status: 'active', subscription: 'Pro', totalTables: 12, createdAt: '2025-01-02' },
  { _id: '6', name: 'Tandoori Nights', slug: 'tandoori-nights', ownerName: 'Suresh Reddy', ownerEmail: 'suresh@tandoorinights.in', phone: '+91 55443 22110', address: 'JP Nagar, Bangalore', status: 'pending', subscription: 'Starter', totalTables: 10, createdAt: '2025-01-18' },
];

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  active: { label: 'Active', color: 'bg-emerald-50 text-emerald-400 border-emerald-200', dot: 'bg-emerald-400' },
  suspended: { label: 'Suspended', color: 'bg-red-50 text-red-400 border-red-200', dot: 'bg-red-400' },
};

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(mockRestaurants);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const { data } = await api.get('/superadmin/restaurants');
        if (data?.length) setRestaurants(data);
      } catch {
        // Use mock data
      }
    };
    fetchRestaurants();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/superadmin/restaurants/${id}/approve`);
      setRestaurants((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'active' as const } : r)));
    } catch {
      setRestaurants((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'active' as const } : r)));
    }
  };

  const handleSuspend = async (id: string) => {
    try {
      await api.post(`/superadmin/restaurants/${id}/suspend`);
      setRestaurants((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'suspended' as const } : r)));
    } catch {
      setRestaurants((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'suspended' as const } : r)));
    }
  };

  const filtered = restaurants.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.ownerName.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'all' || r.status === tab;
    return matchSearch && matchTab;
  });

  const counts = {
    all: restaurants.length,
    pending: restaurants.filter((r) => r.status === 'pending').length,
    active: restaurants.filter((r) => r.status === 'active').length,
    suspended: restaurants.filter((r) => r.status === 'suspended').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Restaurants</h1>
          <p className="text-sm text-slate-500 mt-1">Manage all restaurants on the platform</p>
        </div>
        <Badge variant="outline" className="border-emerald-200 text-emerald-600">
          {restaurants.length} total
        </Badge>
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
            placeholder="Search restaurants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 text-sm"
          />
        </div>
      </div>

      {/* Restaurant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((restaurant) => {
          const sc = statusConfig[restaurant.status];
          return (
            <Card
              key={restaurant._id}
              className="bg-white border-slate-200 group hover:bg-slate-50 transition-colors"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{restaurant.name}</h3>
                      <p className="text-[11px] text-slate-400">/{restaurant.slug}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-slate-200">
                      <DropdownMenuItem onClick={() => setSelectedRestaurant(restaurant)} className="text-xs">
                        <Eye className="w-3 h-3 mr-2" /> View Details
                      </DropdownMenuItem>
                      {restaurant.status === 'pending' && (
                        <DropdownMenuItem onClick={() => handleApprove(restaurant._id)} className="text-xs text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 mr-2" /> Approve
                        </DropdownMenuItem>
                      )}
                      {restaurant.status === 'active' && (
                        <DropdownMenuItem onClick={() => handleSuspend(restaurant._id)} className="text-xs text-red-400">
                          <Ban className="w-3 h-3 mr-2" /> Suspend
                        </DropdownMenuItem>
                      )}
                      {restaurant.status === 'suspended' && (
                        <DropdownMenuItem onClick={() => handleApprove(restaurant._id)} className="text-xs text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 mr-2" /> Reactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    <span>{restaurant.ownerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>{restaurant.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3 h-3" />
                    <span>Joined {new Date(restaurant.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-[10px] border', sc.color)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', sc.dot)} />
                      {sc.label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-600">
                      {restaurant.subscription}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-400">{restaurant.totalTables} tables</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">No restaurants found</div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedRestaurant} onOpenChange={() => setSelectedRestaurant(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedRestaurant?.name}</DialogTitle>
          </DialogHeader>
          {selectedRestaurant && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Owner" value={selectedRestaurant.ownerName} />
                <InfoRow label="Email" value={selectedRestaurant.ownerEmail} />
                <InfoRow label="Phone" value={selectedRestaurant.phone} />
                <InfoRow label="Address" value={selectedRestaurant.address} />
                <InfoRow label="Tables" value={String(selectedRestaurant.totalTables)} />
                <InfoRow label="Plan" value={selectedRestaurant.subscription} />
                <InfoRow label="Status" value={selectedRestaurant.status} />
                <InfoRow label="Joined" value={new Date(selectedRestaurant.createdAt).toLocaleDateString()} />
              </div>
              <div className="flex gap-2 pt-2">
                {selectedRestaurant.status === 'pending' && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 flex-1"
                    onClick={() => {
                      handleApprove(selectedRestaurant._id);
                      setSelectedRestaurant(null);
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                  </Button>
                )}
                {selectedRestaurant.status !== 'suspended' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      handleSuspend(selectedRestaurant._id);
                      setSelectedRestaurant(null);
                    }}
                  >
                    <Ban className="w-3 h-3 mr-1" /> Suspend
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-slate-700 mt-0.5">{value}</p>
    </div>
  );
}
