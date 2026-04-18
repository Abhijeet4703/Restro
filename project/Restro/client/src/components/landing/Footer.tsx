'use client';

import Link from 'next/link';
import { ChefHat, Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react';

const productLinks = [
  { label: 'QR Ordering', href: '#features' },
  { label: 'Admin Dashboard', href: '#solutions' },
  { label: 'Kitchen Display', href: '#solutions' },
  { label: 'Inventory Management', href: '#features' },
  { label: 'Analytics & Reports', href: '#features' },
  { label: 'Online Payments', href: '#features' },
];

const companyLinks = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Contact Us', href: '#contact' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Refund Policy', href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        {/* Main grid */}
        <div className="pt-16 pb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <ChefHat className="w-[18px] h-[18px] text-slate-900" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Restro</span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-[300px]">
              Smart QR-based restaurant management platform.
              Streamline operations, delight customers, and grow your brand.
            </p>
            <div className="space-y-2.5">
              <a href="mailto:hello@restro.in" className="flex items-center gap-3 text-sm text-slate-500 hover:text-white transition-colors group">
                <Mail className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                hello@restro.in
              </a>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Phone className="w-4 h-4 text-slate-600 shrink-0" />
                +91 91234 56789
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <MapPin className="w-4 h-4 text-slate-600 shrink-0" />
                Mumbai, India
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold text-slate-300 mb-4 uppercase tracking-[0.12em]">Products</h3>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-slate-500 hover:text-white transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold text-slate-300 mb-4 uppercase tracking-[0.12em]">Company</h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-slate-500 hover:text-white transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Get Started */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold text-slate-300 mb-4 uppercase tracking-[0.12em]">Get Started</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              Set up your QR ordering system in under 10 minutes. Free for your first restaurant.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors duration-200 shadow-sm"
            >
              Register Free
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800/60" />

        {/* Bottom bar */}
        <div className="py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Restro. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {legalLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-xs text-slate-600 hover:text-slate-400 transition-colors duration-200">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
