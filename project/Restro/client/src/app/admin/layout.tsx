'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChefHat,
  PanelLeftClose,
  PanelLeft,
  Bell,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { connectSocket, joinRestaurant, getSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/orders', icon: ClipboardList, label: 'Orders' },
  { href: '/admin/menu', icon: UtensilsCrossed, label: 'Menu' },
  { href: '/admin/tables', icon: QrCode, label: 'Tables & QR' },
  { href: '/admin/billing', icon: Receipt, label: 'Billing' },
  { href: '/admin/inventory', icon: Package, label: 'Inventory' },
  { href: '/admin/staff', icon: Users, label: 'Staff' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, restaurant, logout, loadUser } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  // authReady: true once we've attempted loadUser at least once
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const tok = useAuthStore.getState().token;
    if (!tok) {
      router.replace('/login');
      setAuthReady(true);
      return;
    }
    loadUser().then(() => {
      const { user: u, token: t } = useAuthStore.getState();
      if (!t) {
        router.replace('/login');
      } else if (u && u.role !== 'admin') {
        router.replace('/login');
      }
      setAuthReady(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restaurant?._id) return;
    const socket = connectSocket();
    joinRestaurant(restaurant._id);

    socket.on('order:new', (data) => {
      setPendingOrders((p) => p + 1);
      toast.info(`New order from Table ${data.tableNumber}`, {
        description: `${data.order.items.length} items - ₹${data.order.totalAmount}`,
        action: { label: 'View', onClick: () => router.push('/admin/orders') },
      });
    });

    socket.on('order:remind', (data) => {
      toast.warning('Order pending approval!', { description: data.message, duration: 10000 });
    });

    socket.on('waiter:called', (data) => {
      toast('Waiter Called!', {
        description: `Table ${data.tableNumber} needs assistance`,
        duration: 15000,
      });
    });

    return () => {
      socket.off('order:new');
      socket.off('order:remind');
      socket.off('waiter:called');
    };
  }, [restaurant, router]);

  // Show loading until auth check completes (prevents SSR null / hydration mismatch)
  if (!authReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }
  if (user.role !== 'admin') return null;

  const handleLogout = () => {
    const socket = getSocket();
    if (socket) socket.disconnect();
    logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full flex flex-col z-40 transition-all duration-300',
          'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950',
          collapsed ? 'w-[68px]' : 'w-[260px]'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 shrink-0">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-white">{restaurant?.name || 'Restro'}</p>
              <p className="text-[11px] text-slate-400 truncate">Admin Panel</p>
            </div>
          )}
        </div>

        <div className="h-px bg-white/10 mx-4" />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-emerald-400 to-teal-400 rounded-r-full" />
                  )}
                  <item.icon className={cn('w-[18px] h-[18px] shrink-0', isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-white')} />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {!collapsed && item.label === 'Orders' && pendingOrders > 0 && (
                    <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5">
                      {pendingOrders}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-white/10 space-y-0.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            {collapsed ? <PanelLeft className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
            {!collapsed && <span className="text-sm">Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn('flex-1 transition-all duration-300', collapsed ? 'ml-[68px]' : 'ml-[260px]')}>
        {/* Top bar */}
        <header className="sticky top-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-6 z-30">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">
              {navItems.find((n) => pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href)))?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {restaurant?.slug && (
              <a
                href={`/r/${restaurant.slug}/table/1`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Customer View
              </a>
            )}
            <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-600 hover:bg-slate-50">
              <Bell className="w-[18px] h-[18px]" />
              {pendingOrders > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  {user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span className="text-sm text-slate-500 hidden md:block">{user.name}</span>
              )}
            </div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
