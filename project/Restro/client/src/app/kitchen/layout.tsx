'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { connectSocket, joinKitchen, getSocket } from '@/lib/socket';
import { ChefHat, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, restaurant, logout, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser().then(() => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser || !['kitchen', 'admin'].includes(currentUser.role)) {
        router.replace('/login');
      }
    });
  }, [loadUser, router]);

  useEffect(() => {
    if (!restaurant?._id) return;
    const socket = connectSocket();
    joinKitchen(restaurant._id);

    socket.on('order:approved', (data) => {
      toast.info('New order approved!', {
        description: `Table ${data.order?.tableNumber || '?'} — ${data.order?.items?.length || 0} items`,
        duration: 10000,
      });
    });

    return () => {
      socket.off('order:approved');
    };
  }, [restaurant]);

  if (!user || !['kitchen', 'admin'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const handleLogout = () => {
    const socket = getSocket();
    if (socket) socket.disconnect();
    logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-500 rounded-lg flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900">{restaurant?.name}</span>
            <span className="text-xs text-slate-400 ml-2">Kitchen</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{user.name}</span>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>
      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
