'use client';

import { useEffect, useState } from 'react';
import {
  Settings,
  Store,
  Palette,
  CreditCard,
  Bell,
  Globe,
  Shield,
  Save,
  Clock,
  LayoutTemplate,
  Eye,
  Receipt,
  Heart,
  Zap,
} from 'lucide-react';

const TEMPLATES = [
  { id: 'royal-3d', name: 'Royal 3D', description: 'Luxurious fine dining with 3D tilt cards and gold particle effects', emoji: '👑', badge: 'Premium', badgeClass: 'bg-yellow-100 text-yellow-700', grad: 'from-yellow-400 to-amber-600' },
  { id: 'neon-glow', name: 'Neon Glow', description: 'Cyberpunk-themed menu with holographic cards and neon animations', emoji: '⚡', badge: 'Futuristic', badgeClass: 'bg-cyan-100 text-cyan-700', grad: 'from-cyan-400 to-purple-600' },
  { id: 'minimal-zen', name: 'Minimal Zen', description: 'Japanese-inspired tranquil design with sakura petals and ink reveals', emoji: '🌸', badge: 'Elegant', badgeClass: 'bg-pink-100 text-pink-700', grad: 'from-pink-300 to-rose-400' },
  { id: 'vintage-paper', name: 'Vintage Paper', description: 'Newspaper-styled menu with typewriter effects and paper-fold animations', emoji: '📰', badge: 'Classic', badgeClass: 'bg-amber-100 text-amber-700', grad: 'from-amber-200 to-yellow-400' },
  { id: 'insta-reel', name: 'Insta Reel', description: 'Social media-inspired vertical reel menu — swipe, like, and order', emoji: '🎬', badge: 'Viral', badgeClass: 'bg-purple-100 text-purple-700', grad: 'from-purple-400 to-pink-500' },
];

const LANGS = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'हिंदी' },
  { code: 'ta', label: 'தமிழ்' }, { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' }, { code: 'ml', label: 'മലയാളം' },
  { code: 'mr', label: 'मराठी' }, { code: 'bn', label: 'বাংলা' },
  { code: 'gu', label: 'ગુજરાતી' }, { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

const BACKEND_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('general');
  const [activeTemplate, setActiveTemplate] = useState('royal-3d');

  const [general, setGeneral] = useState({ name: '', slug: '', address: '', phone: '', email: '' });

  const [billing, setBilling] = useState({
    gstin: '', fssaiLicense: '',
    cgstPercent: 2.5, sgstPercent: 2.5,
    serviceChargePercent: 0, defaultHsnCode: '996331',
    upiId: '', language: 'en',
  });

  const [loyalty, setLoyalty] = useState({ loyaltyEnabled: false, loyaltyPointsPerRupee: 1, loyaltyRedemptionRate: 0.25 });

  const [aggregators, setAggregators] = useState({ swiggyEnabled: false, swiggyStoreId: '', zomatoEnabled: false, zomatoResId: '' });

  const [theme, setTheme] = useState({ primaryColor: '#14b8a6', accentColor: '#f43f5e', logoUrl: '', bannerUrl: '' });

  const [payment, setPayment] = useState({ razorpayKeyId: '', razorpayKeySecret: '', autoRefund: true });

  const [notifications, setNotifications] = useState({ orderAlerts: true, waiterCalls: true, lowStock: true, autoRemindDelay: 7, customerCancelDelay: 10 });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/restaurant/settings');
        if (data) {
          setGeneral({ name: data.name || '', slug: data.slug || '', address: data.address || '', phone: data.phone || '', email: data.email || '' });
          setBilling({
            gstin: data.gstin || '',
            fssaiLicense: data.fssaiLicense || '',
            cgstPercent: data.cgstPercent ?? 2.5,
            sgstPercent: data.sgstPercent ?? 2.5,
            serviceChargePercent: data.serviceChargePercent ?? 0,
            defaultHsnCode: data.defaultHsnCode || '996331',
            upiId: data.upiId || '',
            language: data.language || 'en',
          });
          setLoyalty({ loyaltyEnabled: data.loyaltyEnabled || false, loyaltyPointsPerRupee: data.loyaltyPointsPerRupee ?? 1, loyaltyRedemptionRate: data.loyaltyRedemptionRate ?? 0.25 });
          setAggregators({ swiggyEnabled: data.swiggyEnabled || false, swiggyStoreId: data.swiggyStoreId || '', zomatoEnabled: data.zomatoEnabled || false, zomatoResId: data.zomatoResId || '' });
          if (data.theme) setTheme((t) => ({ ...t, ...data.theme }));
          if (data.activeTemplate) setActiveTemplate(data.activeTemplate);
          if (data.payment) setPayment((p) => ({ ...p, ...data.payment }));
          if (data.notifications) setNotifications((n) => ({ ...n, ...data.notifications }));
        }
      } catch { /* use defaults */ }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/restaurant/settings', {
        ...general, ...billing, ...loyalty, ...aggregators,
        theme, activeTemplate,
        payment: { razorpayKeyId: payment.razorpayKeyId, razorpayKeySecret: payment.razorpayKeySecret, autoRefund: payment.autoRefund },
        notifications,
      });
      toast.success('Settings saved!');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure your restaurant preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600">
          <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-50 flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="text-xs data-[state=active]:bg-emerald-600/30 data-[state=active]:text-slate-700"><Store className="w-3 h-3 mr-1" />General</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs data-[state=active]:bg-emerald-600/30 data-[state=active]:text-slate-700"><Receipt className="w-3 h-3 mr-1" />Billing & Tax</TabsTrigger>
          <TabsTrigger value="loyalty" className="text-xs data-[state=active]:bg-emerald-600/30 data-[state=active]:text-slate-700"><Heart className="w-3 h-3 mr-1" />Loyalty</TabsTrigger>
          <TabsTrigger value="aggregators" className="text-xs data-[state=active]:bg-emerald-600/30 data-[state=active]:text-slate-700"><Zap className="w-3 h-3 mr-1" />Aggregators</TabsTrigger>
          <TabsTrigger value="theme" className="text-xs data-[state=active]:bg-emerald-600/30 data-[state=active]:text-slate-700"><Palette className="w-3 h-3 mr-1" />Theme</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs data-[state=active]:bg-emerald-600/30 data-[state=active]:text-slate-700"><LayoutTemplate className="w-3 h-3 mr-1" />Templates</TabsTrigger>
          <TabsTrigger value="payment" className="text-xs data-[state=active]:bg-emerald-600/30 data-[state=active]:text-slate-700"><CreditCard className="w-3 h-3 mr-1" />Payment</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs data-[state=active]:bg-emerald-600/30 data-[state=active]:text-slate-700"><Bell className="w-3 h-3 mr-1" />Notifications</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card className="bg-white border-slate-200">
            <CardHeader><CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Store className="w-4 h-4 text-emerald-600" />Restaurant Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Restaurant Name</Label>
                  <Input
                    value={general.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const autoSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                      setGeneral({ ...general, name, slug: autoSlug });
                    }}
                    className="bg-slate-50 border-slate-200 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">URL Slug</Label>
                  <Input
                    value={general.slug}
                    onChange={(e) => setGeneral({ ...general, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="bg-slate-50 border-slate-200 text-sm mt-1 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Customer URL: <span className="font-mono">/r/{general.slug || '...'}/table/1</span></p>
                </div>
                <div><Label className="text-xs text-slate-500">Email</Label><Input value={general.email} onChange={(e) => setGeneral({ ...general, email: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" /></div>
                <div><Label className="text-xs text-slate-500">Phone</Label><Input value={general.phone} onChange={(e) => setGeneral({ ...general, phone: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" /></div>
                <div className="md:col-span-2"><Label className="text-xs text-slate-500">Address</Label><Input value={general.address} onChange={(e) => setGeneral({ ...general, address: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing & Tax */}
        <TabsContent value="billing">
          <div className="space-y-4">
            <Card className="bg-white border-slate-200">
              <CardHeader><CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Receipt className="w-4 h-4 text-emerald-600" />GST & Compliance</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">GSTIN</Label>
                    <Input value={billing.gstin} onChange={(e) => setBilling({ ...billing, gstin: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1 font-mono" placeholder="22AAAAA0000A1Z5" maxLength={15} />
                    <p className="text-[10px] text-slate-400 mt-1">Printed on GST-compliant tax invoices</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">FSSAI License No.</Label>
                    <Input value={billing.fssaiLicense} onChange={(e) => setBilling({ ...billing, fssaiLicense: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1 font-mono" placeholder="12345678901234" maxLength={14} />
                    <p className="text-[10px] text-slate-400 mt-1">Food safety license number</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Default HSN / SAC Code</Label>
                    <Input value={billing.defaultHsnCode} onChange={(e) => setBilling({ ...billing, defaultHsnCode: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1 font-mono" placeholder="996331" maxLength={8} />
                    <p className="text-[10px] text-slate-400 mt-1">996331 = Restaurant services (recommended)</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">UPI ID (for receipt QR)</Label>
                    <Input value={billing.upiId} onChange={(e) => setBilling({ ...billing, upiId: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" placeholder="yourname@upi" />
                    <p className="text-[10px] text-slate-400 mt-1">Shown as QR on receipts & customer pay panel</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader><CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-600" />Tax Rates & Charges</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">CGST %</Label>
                    <Input type="number" step="0.5" min="0" max="14" value={billing.cgstPercent} onChange={(e) => setBilling({ ...billing, cgstPercent: parseFloat(e.target.value) || 0 })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
                    <p className="text-[10px] text-slate-400 mt-1">Default: 2.5% (5% GST slab)</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">SGST %</Label>
                    <Input type="number" step="0.5" min="0" max="14" value={billing.sgstPercent} onChange={(e) => setBilling({ ...billing, sgstPercent: parseFloat(e.target.value) || 0 })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
                    <p className="text-[10px] text-slate-400 mt-1">Default: 2.5% (5% GST slab)</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Service Charge %</Label>
                    <Input type="number" step="0.5" min="0" max="30" value={billing.serviceChargePercent} onChange={(e) => setBilling({ ...billing, serviceChargePercent: parseFloat(e.target.value) || 0 })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
                    <p className="text-[10px] text-slate-400 mt-1">Set 0 to disable (optional)</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-700">
                  <strong>Preview:</strong> ₹1000 bill → CGST ₹{(1000 * billing.cgstPercent / 100).toFixed(2)} + SGST ₹{(1000 * billing.sgstPercent / 100).toFixed(2)}{billing.serviceChargePercent > 0 ? ` + Service ₹${(1000 * billing.serviceChargePercent / 100).toFixed(2)}` : ''} = Grand Total ₹{(1000 * (1 + billing.cgstPercent / 100 + billing.sgstPercent / 100 + billing.serviceChargePercent / 100)).toFixed(0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader><CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-600" />Billing Language</CardTitle></CardHeader>
              <CardContent>
                <Label className="text-xs text-slate-500">Default language for billing UI</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {LANGS.map(l => (
                    <button key={l.code} onClick={() => setBilling({ ...billing, language: l.code })}
                      className={cn('p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all', billing.language === l.code ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Loyalty */}
        <TabsContent value="loyalty">
          <Card className="bg-white border-slate-200">
            <CardHeader><CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Heart className="w-4 h-4 text-emerald-600" />Customer Loyalty Program</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">Enable Loyalty Program</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customers earn points on every bill and can redeem them for discounts</p>
                </div>
                <Switch checked={loyalty.loyaltyEnabled} onCheckedChange={(v) => setLoyalty({ ...loyalty, loyaltyEnabled: v })} />
              </div>
              {loyalty.loyaltyEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500">Points earned per ₹100 spent</Label>
                      <Input type="number" step="0.5" min="0" value={loyalty.loyaltyPointsPerRupee} onChange={(e) => setLoyalty({ ...loyalty, loyaltyPointsPerRupee: parseFloat(e.target.value) || 0 })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
                      <p className="text-[10px] text-slate-400 mt-1">e.g. 1 point per ₹100</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Redemption value (₹ per point)</Label>
                      <Input type="number" step="0.05" min="0" value={loyalty.loyaltyRedemptionRate} onChange={(e) => setLoyalty({ ...loyalty, loyaltyRedemptionRate: parseFloat(e.target.value) || 0 })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
                      <p className="text-[10px] text-slate-400 mt-1">e.g. 0.25 = 1 point → ₹0.25 off</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-100 text-xs text-purple-700">
                    <strong>Example:</strong> ₹500 bill → earns {(5 * loyalty.loyaltyPointsPerRupee).toFixed(1)} points. 100 points = ₹{(100 * loyalty.loyaltyRedemptionRate).toFixed(0)} discount.
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aggregators */}
        <TabsContent value="aggregators">
          <div className="space-y-4">
            {([
              { key: 'swiggy', label: 'Swiggy', emoji: '🧡', enabledKey: 'swiggyEnabled' as const, idKey: 'swiggyStoreId' as const, placeholder: 'Store ID from Swiggy dashboard' },
              { key: 'zomato', label: 'Zomato', emoji: '❤️', enabledKey: 'zomatoEnabled' as const, idKey: 'zomatoResId' as const, placeholder: 'Restaurant ID from Zomato Partner' },
            ]).map(agg => (
              <Card key={agg.key} className="bg-white border-slate-200">
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{agg.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{agg.label} Integration</p>
                        <p className="text-[10px] text-slate-400">Receive online orders in your billing dashboard</p>
                      </div>
                    </div>
                    <Switch checked={aggregators[agg.enabledKey]} onCheckedChange={(v) => setAggregators({ ...aggregators, [agg.enabledKey]: v })} />
                  </div>
                  {aggregators[agg.enabledKey] && (
                    <div>
                      <Label className="text-xs text-slate-500">{agg.label} Store / Restaurant ID</Label>
                      <Input value={aggregators[agg.idKey]} onChange={(e) => setAggregators({ ...aggregators, [agg.idKey]: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1 font-mono" placeholder={agg.placeholder} />
                      <p className="text-[10px] text-slate-400 mt-1">Webhook: <code className="bg-slate-100 px-1 rounded">POST /api/online-orders/receive</code></p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Theme */}
        <TabsContent value="theme">
          <Card className="bg-white border-slate-200">
            <CardHeader><CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Palette className="w-4 h-4 text-emerald-600" />Branding & Theme</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={theme.primaryColor} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })} className="w-10 h-10 rounded border-0 cursor-pointer bg-transparent" />
                    <Input value={theme.primaryColor} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })} className="bg-slate-50 border-slate-200 text-sm flex-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Accent Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={theme.accentColor} onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })} className="w-10 h-10 rounded border-0 cursor-pointer bg-transparent" />
                    <Input value={theme.accentColor} onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })} className="bg-slate-50 border-slate-200 text-sm flex-1" />
                  </div>
                </div>
                <div><Label className="text-xs text-slate-500">Logo URL</Label><Input value={theme.logoUrl} onChange={(e) => setTheme({ ...theme, logoUrl: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" placeholder="https://..." /></div>
                <div><Label className="text-xs text-slate-500">Banner URL</Label><Input value={theme.bannerUrl} onChange={(e) => setTheme({ ...theme, bannerUrl: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" placeholder="https://..." /></div>
              </div>
              <div className="p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Theme Preview</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})` }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: theme.primaryColor }}>{general.name || 'Restaurant Name'}</p>
                    <p className="text-xs text-slate-500">Customer-facing color theme</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-emerald-600" />Menu Display Template</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Choose how your menu looks when customers scan the QR code</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {TEMPLATES.map((tmpl) => (
                  <button key={tmpl.id} onClick={() => setActiveTemplate(tmpl.id)}
                    className={cn('relative text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-md', activeTemplate === tmpl.id ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300')}>
                    {activeTemplate === tmpl.id && <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow"><span className="text-white text-[10px] font-bold">✓</span></div>}
                    <div className={cn('w-full h-1.5 rounded-full mb-3 bg-gradient-to-r', tmpl.grad)} />
                    <div className="text-2xl mb-2">{tmpl.emoji}</div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="text-sm font-semibold text-slate-800">{tmpl.name}</h3>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium', tmpl.badgeClass)}>{tmpl.badge}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{tmpl.description}</p>
                  </button>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">Preview opens your live menu with your saved items in the selected template.</p>
                <Button variant="outline" size="sm" className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => { const slug = general.slug; if (slug) window.open(`${BACKEND_BASE}/template-preview/${slug}`, '_blank'); }} disabled={!general.slug}>
                  <Eye className="w-3 h-3 mr-1" /> Preview Live Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment */}
        <TabsContent value="payment">
          <Card className="bg-white border-slate-200">
            <CardHeader><CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-600" />Razorpay Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-xs text-slate-500">Razorpay Key ID</Label><Input value={payment.razorpayKeyId} onChange={(e) => setPayment({ ...payment, razorpayKeyId: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1 font-mono" placeholder="rzp_live_..." /></div>
                <div><Label className="text-xs text-slate-500">Razorpay Key Secret</Label><Input type="password" value={payment.razorpayKeySecret} onChange={(e) => setPayment({ ...payment, razorpayKeySecret: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1 font-mono" placeholder="••••••••" /></div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100">
                <div><p className="text-sm text-slate-700">Auto-refund on rejection</p><p className="text-[10px] text-slate-400 mt-0.5">Automatically refund paid orders when admin rejects them</p></div>
                <Switch checked={payment.autoRefund} onCheckedChange={(v) => setPayment({ ...payment, autoRefund: v })} />
              </div>
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-xs text-amber-600/70"><Shield className="w-3 h-3 inline mr-1" />Payment keys are encrypted and stored securely. They are never exposed in API responses.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="bg-white border-slate-200">
            <CardHeader><CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Bell className="w-4 h-4 text-emerald-600" />Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'orderAlerts', label: 'New Order Alerts', desc: 'Get notified when a new order is placed' },
                { key: 'waiterCalls', label: 'Waiter Call Alerts', desc: 'Get notified when a customer calls waiter' },
                { key: 'lowStock', label: 'Low Stock Alerts', desc: 'Get notified when inventory items fall below minimum' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100">
                  <div><p className="text-sm text-slate-700">{item.label}</p><p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p></div>
                  <Switch checked={notifications[item.key as keyof typeof notifications] as boolean} onCheckedChange={(v) => setNotifications({ ...notifications, [item.key]: v })} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <Label className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />Auto-remind delay (minutes)</Label>
                  <Input type="number" value={notifications.autoRemindDelay} onChange={(e) => setNotifications({ ...notifications, autoRemindDelay: Number(e.target.value) })} className="bg-slate-50 border-slate-200 text-sm mt-1" min={1} max={30} />
                  <p className="text-[10px] text-slate-400 mt-1">Remind admin if order not approved within this time</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />Customer cancel after (minutes)</Label>
                  <Input type="number" value={notifications.customerCancelDelay} onChange={(e) => setNotifications({ ...notifications, customerCancelDelay: Number(e.target.value) })} className="bg-slate-50 border-slate-200 text-sm mt-1" min={5} max={60} />
                  <p className="text-[10px] text-slate-400 mt-1">Allow customer to cancel if order not approved within this time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
