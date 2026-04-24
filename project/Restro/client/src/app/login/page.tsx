'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChefHat, Eye, EyeOff, ArrowRight, QrCode, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const highlights = [
  { icon: QrCode,    text: 'QR ordering — zero app downloads' },
  { icon: BarChart3, text: 'Live analytics & revenue insights' },
  { icon: Zap,       text: 'Real-time kitchen & order sync' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      toast.success('Welcome back!');
      if (user?.role === 'superadmin') router.push('/superadmin');
      else if (user?.role === 'kitchen') router.push('/kitchen');
      else if (user?.role === 'admin' && (user?.onboardingStep ?? 0) < 6) router.push('/onboarding');
      else router.push('/admin');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Login failed — check your credentials or network');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[56%] relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex-col justify-between p-12 overflow-hidden">
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.4) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Glow orbs */}
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] rounded-full bg-teal-500/10 blur-3xl" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Restro</span>
        </Link>

        {/* Hero text */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-4">Restaurant Management Platform</p>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
              Run your restaurant<br />
              <span className="text-emerald-400">smarter, faster.</span>
            </h2>
            <p className="mt-5 text-slate-400 text-lg leading-relaxed max-w-md">
              One platform for QR ordering, kitchen management, inventory, payments and analytics.
            </p>
          </div>

          <div className="space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-slate-300 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex gap-8 pt-2">
            {[['500+','Restaurants'],['50K+','Orders'],['4.9★','Rating']].map(([v, l]) => (
              <div key={l}>
                <p className="text-2xl font-black text-white stat-number">{v}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <p className="text-slate-300 text-sm italic leading-relaxed">&quot;Our kitchen efficiency went up 40% and customers love the QR ordering experience.&quot;</p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">VP</div>
            <div>
              <p className="text-white text-xs font-semibold">Vikram Patel</p>
              <p className="text-slate-500 text-[11px]">Spice Garden · Mumbai</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-white">
        {/* Mobile logo */}
        <Link href="/" className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">Restro</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1.5">Sign in to your admin dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@restaurant.com"
                required
                className="h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 rounded-xl pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-lg shadow-slate-900/10 btn-shine"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></span>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-semibold">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
