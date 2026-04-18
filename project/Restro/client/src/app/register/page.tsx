'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChefHat, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const perks = [
  'Set up your restaurant in under 5 minutes',
  'QR menus, orders & kitchen display included',
  'No credit card required — free to start',
];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      toast.success('Account created! Let\'s set up your restaurant.');
      router.push('/onboarding');
    } catch {
      toast.error('Registration failed. Try a different email.');
    }
  };

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[44%] relative bg-gradient-to-br from-emerald-600 via-teal-600 to-slate-900 flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[300px] h-[300px] rounded-full bg-white/5 blur-3xl" />

        <Link href="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white/20 border border-white/30 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Restro</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-white/60 text-sm font-semibold uppercase tracking-widest mb-4">Get started today</p>
            <h2 className="text-4xl xl:text-[2.75rem] font-black text-white leading-[1.1] tracking-tight">
              Your restaurant,<br />
              <span className="text-white/70">fully digital.</span>
            </h2>
            <p className="mt-5 text-white/60 text-lg leading-relaxed max-w-sm">
              Join 500+ restaurants already running smarter with Restro.
            </p>
          </div>

          <div className="space-y-3.5">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                <span className="text-white/80 text-sm font-medium">{perk}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-8">
            {[['500+','Restaurants'],['50K+','Orders'],['Free','To Start']].map(([v, l]) => (
              <div key={l}>
                <p className="text-2xl font-black text-white stat-number">{v}</p>
                <p className="text-xs text-white/50 font-medium mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 bg-white/10 border border-white/20 rounded-2xl p-5 backdrop-blur-sm">
          <p className="text-white/80 text-sm italic leading-relaxed">&quot;Setup was incredibly simple. We went digital in one afternoon.&quot;</p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">RM</div>
            <div>
              <p className="text-white text-xs font-semibold">Rohit Menon</p>
              <p className="text-white/50 text-[11px]">Coastal Bites · Bangalore</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-white overflow-y-auto">
        <Link href="/" className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">Restro</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create your account</h1>
            <p className="text-slate-500 text-sm mt-1.5">Start your restaurant&apos;s digital journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full Name</Label>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your name" required
                className="h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@email.com" required
                className="h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Password</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)}
                  placeholder="Min 6 characters" required minLength={6}
                  className="h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 rounded-xl pr-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Confirm Password</Label>
              <Input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)}
                placeholder="Re-enter password" required minLength={6}
                className="h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 rounded-xl" />
            </div>

            <Button type="submit" disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 btn-shine">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">Create Account <ArrowRight className="w-4 h-4" /></span>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
