'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  BarChart3,
  Bell,
  Shield,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/superadmin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/superadmin/restaurants', icon: Building2, label: 'Restaurants' },
  { href: '/superadmin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { href: '/superadmin/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loadUser } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadUser().then(() => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser || currentUser.role !== 'superadmin') {
        router.replace('/login');
      }
    });
  }, [loadUser, router]);

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-white border-r border-slate-200 flex flex-col z-40 transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-[260px]'
        )}
      >
        <div className="flex items-center gap-3 px-4 h-16 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-slate-900">Restro Platform</p>
              <p className="text-[11px] text-slate-400 truncate">Super Admin</p>
            </div>
          )}
        </div>

        <Separator className="bg-slate-200" />

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-r-full" />
                  )}
                  <item.icon className={cn('w-[18px] h-[18px] shrink-0', isActive && 'text-emerald-600')} />
                  {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-slate-200 space-y-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {collapsed ? <PanelLeft className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
            {!collapsed && <span className="text-sm">Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={cn('flex-1 transition-all duration-300', collapsed ? 'ml-[68px]' : 'ml-[260px]')}>
        <header className="sticky top-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-6 z-30">
          <h2 className="text-sm font-semibold text-slate-700">
            {navItems.find((n) => pathname === n.href || (n.href !== '/superadmin' && pathname.startsWith(n.href)))?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 hover:bg-slate-50">
              <Bell className="w-[18px] h-[18px]" />
            </Button>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-emerald-50 text-emerald-700 text-xs font-semibold">
                SA
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
