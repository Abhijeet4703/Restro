'use client';

import Link from 'next/link';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import {
  QrCode, ChefHat, LayoutDashboard, Shield, ArrowRight, Zap,
  BarChart3, Bell, Smartphone, UtensilsCrossed, Package,
  Users, Clock, CheckCircle2, Star, TrendingUp, Headphones, Wallet,
  ArrowUpRight, Play, Sparkles, MonitorSmartphone, Globe, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

/* ── Fade-in section wrapper ── */
function Section({ children, className = '', delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ── Tag/badge above section headings ── */
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-5">
      {children}
    </span>
  );
}

/* ── Data ── */
const features = [
  { icon: QrCode, title: 'QR Code Ordering', desc: 'Customers scan a table QR, browse the full menu, and order from their phone — no app downloads, no waiting.', color: 'emerald' },
  { icon: LayoutDashboard, title: 'Live Dashboard', desc: 'Real-time order management with instant notifications, one-tap approval, and live status tracking.', color: 'blue' },
  { icon: UtensilsCrossed, title: 'Kitchen Display', desc: 'Kanban-style kitchen board. Orders flow through stages — Cooking, Preparing, Ready — with timers.', color: 'amber' },
  { icon: Package, title: 'Inventory Control', desc: 'Track stock levels, get low-stock alerts, and auto-deduct ingredients on every order placed.', color: 'purple' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'Revenue trends, peak-hour analysis, popular items, and weekly performance comparisons.', color: 'rose' },
  { icon: Wallet, title: 'Online Payments', desc: 'Integrated Razorpay payments, auto-refunds on cancellations. Cash option always available.', color: 'teal' },
];

const featureColorMap: Record<string, { icon: string; bg: string; ring: string }> = {
  emerald: { icon: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  blue:    { icon: 'text-blue-600',    bg: 'bg-blue-50',    ring: 'ring-blue-200' },
  amber:   { icon: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-200' },
  purple:  { icon: 'text-purple-600',  bg: 'bg-purple-50',  ring: 'ring-purple-200' },
  rose:    { icon: 'text-rose-600',    bg: 'bg-rose-50',    ring: 'ring-rose-200' },
  teal:    { icon: 'text-teal-600',    bg: 'bg-teal-50',    ring: 'ring-teal-200' },
};

const steps = [
  { num: '01', icon: Smartphone, title: 'Scan QR Code', desc: 'Customer scans the unique QR code placed at their table.' },
  { num: '02', icon: UtensilsCrossed, title: 'Browse & Order', desc: 'Menu loads with categories, search, dietary filters. Add to cart and checkout.' },
  { num: '03', icon: Bell, title: 'Admin Approves', desc: 'Restaurant admin reviews and approves. Customer sees real-time updates.' },
  { num: '04', icon: ChefHat, title: 'Kitchen Prepares', desc: 'Order flows on the kitchen display. Staff moves it through stages until served.' },
];

const metrics = [
  { value: '500+', label: 'Restaurants', icon: TrendingUp },
  { value: '50K+', label: 'Orders Served', icon: CheckCircle2 },
  { value: '99.9%', label: 'Uptime', icon: Shield },
  { value: '24/7', label: 'Support', icon: Headphones },
];

const solutions = [
  {
    title: 'For Restaurant Owners',
    desc: 'Complete dashboard to manage orders, menu, tables, staff, inventory, and analytics. Customise branding with your own colours and logo.',
    points: ['Order approval workflow', 'Menu & inventory management', 'Staff role management', 'Revenue analytics'],
    icon: LayoutDashboard,
    accent: 'emerald',
  },
  {
    title: 'For Kitchen Staff',
    desc: 'Dedicated Kanban-style kitchen display with real-time order flow. Clear visual stages and timers to keep everything moving.',
    points: ['Real-time order queue', 'Stage-based workflow', 'Timer & priority alerts', 'One-tap status updates'],
    icon: ChefHat,
    accent: 'amber',
  },
  {
    title: 'For Customers',
    desc: 'Scan, browse, order, pay, and track — all from their own phone. No app download, no waiting for the waiter.',
    points: ['Instant QR menu access', 'Live order tracking', 'Online & cash payments', 'Call waiter button'],
    icon: Smartphone,
    accent: 'blue',
  },
];

const solutionColorMap: Record<string, { iconBg: string; iconColor: string; border: string; badge: string }> = {
  emerald: { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', border: 'hover:border-emerald-300', badge: 'bg-emerald-600' },
  amber:   { iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   border: 'hover:border-amber-300',   badge: 'bg-amber-500' },
  blue:    { iconBg: 'bg-blue-50',    iconColor: 'text-blue-600',    border: 'hover:border-blue-300',    badge: 'bg-blue-600' },
};

const testimonials = [
  { quote: 'Restro transformed how we handle orders. Our kitchen efficiency went up 40% and customers love the QR ordering experience.', name: 'Vikram Patel', role: 'Owner, Spice Garden · Mumbai', avatar: 'VP' },
  { quote: 'The real-time dashboard and analytics helped us identify peak hours and best-selling items. Our revenue grew 25% in 3 months.', name: 'Priya Sharma', role: 'Manager, The Urban Plate · Delhi', avatar: 'PS' },
  { quote: 'Setup was incredibly simple. We went from paper orders to a fully digital system in one afternoon. The support team is fantastic.', name: 'Rohit Menon', role: 'Founder, Coastal Bites · Bangalore', avatar: 'RM' },
];

const platformFeatures = [
  { icon: MonitorSmartphone, title: 'Works on Any Device', desc: 'Tablet, phone, laptop — runs beautifully in any browser.' },
  { icon: Globe, title: 'Multi-Tenant SaaS', desc: 'Each restaurant gets its own branded space, custom subdomain.' },
  { icon: Lock, title: 'Secure & Reliable', desc: 'Role-based access, encrypted payments, 99.9% uptime.' },
  { icon: Zap, title: 'Real-Time Updates', desc: 'Socket-powered live sync across dashboard, kitchen, and customer.' },
];

const trustedBrands = ['Spice Garden', 'Urban Plate', 'Coastal Bites', 'Royal Thali', 'Biryani House', 'Café Artisan', 'Dosa Factory', 'Tandoor Express'];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <Navbar />

      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <section className="relative pt-32 md:pt-40 pb-20 md:pb-32 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 right-[-8%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-emerald-100/50 via-teal-50/30 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-emerald-50/40 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-[15%] w-3 h-3 rounded-full bg-emerald-300/40 animate-float" />
        <div className="absolute top-60 right-[20%] w-2 h-2 rounded-full bg-teal-300/50 animate-float-slow" />

        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-7 text-sm font-medium bg-white text-slate-700 border border-slate-200 rounded-full shadow-sm"
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Smart QR-Based Restaurant Platform
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight leading-[1.1]">
              Everything Your{' '}
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                Restaurant Needs
              </span>
              <br className="hidden sm:block" />
              In One Platform
            </h1>

            <p className="mt-6 text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-light">
              QR ordering, kitchen management, inventory tracking, payments & analytics
              — unified into one clean, powerful system.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-9">
              <Link href="/register">
                <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 text-[15px] font-semibold rounded-xl shadow-lg shadow-slate-900/10 transition-all hover:shadow-xl hover:shadow-slate-900/15">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 px-8 h-12 text-[15px] font-medium rounded-xl">
                  <Play className="w-4 h-4 mr-2 fill-slate-500 text-slate-500" />
                  See How It Works
                </Button>
              </a>
            </div>

            {/* Micro stats under CTA */}
            <div className="flex items-center justify-center gap-6 md:gap-10 mt-9">
              {[
                { val: '500+', label: 'Restaurants' },
                { val: '50K+', label: 'Orders' },
                { val: '4.9★', label: 'Rating' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-lg font-bold text-slate-900">{s.val}</p>
                  <p className="text-xs text-slate-400 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Hero Mockup ── */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-16 md:mt-20 max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-white rounded-md border border-slate-200 text-xs text-slate-400 font-mono">
                    dashboard.restro.in
                  </div>
                </div>
              </div>
              {/* Dashboard mockup content */}
              <div className="p-5 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                  {[
                    { label: 'Active Orders', val: '24', delta: '+12%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Revenue Today', val: '₹18,450', delta: '+8%', color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Tables Occupied', val: '12 / 20', delta: '60%', color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Avg Order Time', val: '18 min', delta: '-3 min', color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map((card, i) => (
                    <div key={i} className={`${card.bg} rounded-xl p-3.5 md:p-4`}>
                      <p className="text-[11px] text-slate-500 font-medium mb-1">{card.label}</p>
                      <p className={`text-lg md:text-xl font-bold ${card.color}`}>{card.val}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{card.delta}</p>
                    </div>
                  ))}
                </div>
                {/* Order rows */}
                <div className="space-y-2.5">
                  {[
                    { table: 'Table 5', items: 'Butter Chicken, Naan ×2', time: '3 min ago', status: 'Cooking', sc: 'bg-amber-50 text-amber-700' },
                    { table: 'Table 12', items: 'Paneer Tikka, Dal Makhani', time: '8 min ago', status: 'Ready', sc: 'bg-emerald-50 text-emerald-700' },
                    { table: 'Table 3', items: 'Masala Dosa, Filter Coffee', time: 'Just now', status: 'Pending', sc: 'bg-orange-50 text-orange-700' },
                  ].map((o, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50/70 rounded-lg border border-slate-100 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {o.table.split(' ')[1]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{o.table}</p>
                          <p className="text-xs text-slate-400">{o.items}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 hidden sm:inline">{o.time}</span>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${o.sc}`}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Bottom fade */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            </div>
          </motion.div>

          {/* ── Trust logos marquee ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-16 overflow-hidden"
          >
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-slate-400 text-center mb-6">
              Trusted by restaurants across India
            </p>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
              <div className="flex animate-marquee">
                {[...trustedBrands, ...trustedBrands].map((brand, i) => (
                  <span key={i} className="shrink-0 mx-8 text-sm font-semibold text-slate-300 whitespace-nowrap">{brand}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════ FEATURES ═══════════════════════════ */}
      <Section id="features" className="py-24 md:py-32 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-16">
            <Tag>Features</Tag>
            <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-tight">
              Powerful tools, beautifully simple
            </h2>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto text-base">
              Everything you need to run a modern restaurant — from the first scan to the final bill.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const c = featureColorMap[f.color];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                  className="group relative bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300"
                >
                  <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.icon} ring-1 ${c.ring} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-[17px] font-semibold mb-2 text-slate-900">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════ HOW IT WORKS ═══════════════════════════ */}
      <Section id="how-it-works" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-16">
            <Tag>How It Works</Tag>
            <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-tight">
              From scan to served in minutes
            </h2>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto text-base">
              A seamless four-step journey that delights your customers and streamlines your kitchen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-14 left-[12.5%] right-[12.5%] h-[2px]">
              <div className="w-full h-full bg-gradient-to-r from-emerald-200 via-teal-200 to-emerald-200 rounded-full" />
            </div>

            {steps.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative text-center"
              >
                <div className="relative inline-flex items-center justify-center w-[72px] h-[72px] rounded-2xl bg-white border border-slate-200 shadow-sm mb-5">
                  <item.icon className="w-7 h-7 text-slate-700" />
                  <span className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-slate-900 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shadow-md">
                    {item.num}
                  </span>
                </div>
                <h3 className="text-base font-semibold mb-1.5 text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-[240px] mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════ METRICS BANNER ═══════════════════════════ */}
      <Section className="py-16 md:py-20 bg-slate-900">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {metrics.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center"
              >
                <m.icon className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
                <p className="text-3xl md:text-4xl font-bold text-white tracking-tight">{m.value}</p>
                <p className="text-sm text-slate-400 mt-1 font-medium">{m.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════ SOLUTIONS ═══════════════════════════ */}
      <Section id="solutions" className="py-24 md:py-32 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-16">
            <Tag>Solutions</Tag>
            <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-tight">
              Built for every role in your restaurant
            </h2>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto text-base">
              Tailored experiences for owners, kitchen staff, and customers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {solutions.map((sol, i) => {
              const c = solutionColorMap[sol.accent];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`group bg-white rounded-2xl border border-slate-200/80 ${c.border} overflow-hidden hover:shadow-lg hover:shadow-slate-100 transition-all duration-300`}
                >
                  <div className="p-6 md:p-7">
                    <div className={`w-11 h-11 rounded-xl ${c.iconBg} ${c.iconColor} flex items-center justify-center mb-4`}>
                      <sol.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-900">{sol.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-5">{sol.desc}</p>
                    <ul className="space-y-2.5">
                      {sol.points.map((p, j) => (
                        <li key={j} className="flex items-center gap-2.5 text-sm text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════ PLATFORM HIGHLIGHTS ═══════════════════════════ */}
      <Section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left text */}
            <div>
              <Tag>Platform</Tag>
              <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-tight">
                Modern architecture,<br />built for reliability
              </h2>
              <p className="mt-4 text-slate-500 text-base leading-relaxed max-w-lg">
                Cloud-native, real-time, and secure. Restro runs on modern web infrastructure
                designed for speed and scale — whether you manage one outlet or a hundred.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {platformFeatures.map((pf, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <pf.icon className="w-4.5 h-4.5 text-slate-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-0.5">{pf.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{pf.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right visual */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Real-Time Sync</p>
                    <p className="text-xs text-slate-400">All screens update instantly</p>
                  </div>
                </div>
                {/* Connection flow visual */}
                <div className="space-y-3">
                  {[
                    { from: 'Customer', action: 'Places order', to: 'Admin Dashboard', color: 'bg-blue-500' },
                    { from: 'Admin', action: 'Approves order', to: 'Kitchen Display', color: 'bg-emerald-500' },
                    { from: 'Kitchen', action: 'Marks ready', to: 'Customer Phone', color: 'bg-amber-500' },
                  ].map((flow, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3">
                      <div className={`w-2 h-2 rounded-full ${flow.color} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-slate-700">{flow.from}</span>
                        <span className="text-xs text-slate-400 mx-2">→</span>
                        <span className="text-xs text-slate-500">{flow.action}</span>
                        <span className="text-xs text-slate-400 mx-2">→</span>
                        <span className="text-xs font-semibold text-slate-700">{flow.to}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Decorative dots */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-100/30 rounded-full blur-2xl pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════ TESTIMONIALS ═══════════════════════════ */}
      <Section id="testimonials" className="py-24 md:py-32 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-16">
            <Tag>Testimonials</Tag>
            <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight leading-tight">
              What our partners say
            </h2>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto text-base">
              Hear from restaurant owners who transformed their operations with Restro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[15px] text-slate-600 leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{t.avatar}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════ FINAL CTA ═══════════════════════════ */}
      <Section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-slate-900 rounded-3xl p-10 md:p-16 relative overflow-hidden"
          >
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Ready to modernise your restaurant?
              </h2>
              <p className="mt-4 text-slate-400 max-w-lg mx-auto text-base">
                Join 500+ restaurants already using Restro. Get your QR ordering system
                live in under 10 minutes — completely free to start.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8">
                <Link href="/register">
                  <Button size="lg" className="bg-white hover:bg-slate-50 text-slate-900 px-8 h-12 text-[15px] font-semibold rounded-xl shadow-lg transition-all">
                    Get Started Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-8 h-12 text-[15px] font-medium rounded-xl">
                    Sign In to Dashboard
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-xs text-slate-500">No credit card required · Free for your first restaurant</p>
            </div>
          </motion.div>
        </div>
      </Section>

      <Footer />
    </div>
  );
}
