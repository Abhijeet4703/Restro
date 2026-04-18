'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChefHat, ArrowRight, ArrowLeft, Building2, MapPin, Phone, User, Hash,
  Upload, ScanLine, Plus, Trash2, Edit3, Check, Palette, Image as ImageIcon,
  Layout, QrCode, Download, Printer, CheckCircle2, X, Clock,
  Utensils, IndianRupee, Leaf, AlertCircle, FileText, Eye, Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────
interface MenuItem {
  id: string;
  name: string;
  price: string;
  prepTime: string;
  category: string;
  isVeg: boolean;
  description: string;
}

interface RestaurantForm {
  restaurantName: string;
  ownerName: string;
  address: string;
  location: string;
  ownerPhone: string;
  restaurantPhone: string;
  tableCount: string;
}

// ─── Constants ───────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Restaurant', icon: Building2 },
  { id: 2, label: 'Menu', icon: Utensils },
  { id: 3, label: 'Branding', icon: Palette },
  { id: 4, label: 'Template', icon: Layout },
  { id: 5, label: 'QR Codes', icon: QrCode },
];

const CATEGORIES = [
  { value: 'starters', label: 'Starters' },
  { value: 'main-course', label: 'Main Course' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'desserts', label: 'Desserts' },
  { value: 'specials', label: 'Specials' },
  { value: 'sides', label: 'Sides' },
];

const TEMPLATES = [
  {
    id: 'royal-3d',
    name: 'Royal 3D',
    description: 'Luxurious fine dining with 3D tilt cards and gold particle effects',
    emoji: '👑',
    badge: 'Premium',
    badgeClass: 'bg-yellow-100 text-yellow-700',
    grad: 'from-yellow-400 to-amber-600',
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    description: 'Cyberpunk-themed menu with holographic cards and neon animations',
    emoji: '⚡',
    badge: 'Futuristic',
    badgeClass: 'bg-cyan-100 text-cyan-700',
    grad: 'from-cyan-400 to-purple-600',
  },
  {
    id: 'minimal-zen',
    name: 'Minimal Zen',
    description: 'Japanese-inspired tranquil design with sakura petals and ink reveals',
    emoji: '🌸',
    badge: 'Elegant',
    badgeClass: 'bg-pink-100 text-pink-700',
    grad: 'from-pink-300 to-rose-400',
  },
  {
    id: 'vintage-paper',
    name: 'Vintage Paper',
    description: 'Newspaper-styled menu with typewriter effects and paper-fold animations',
    emoji: '📰',
    badge: 'Classic',
    badgeClass: 'bg-amber-100 text-amber-700',
    grad: 'from-amber-200 to-yellow-400',
  },
  {
    id: 'insta-reel',
    name: 'Insta Reel',
    description: 'Social media-inspired vertical reel menu — swipe, like, and order',
    emoji: '🎬',
    badge: 'Trending',
    badgeClass: 'bg-purple-100 text-purple-700',
    grad: 'from-fuchsia-400 to-purple-600',
  },
  {
    id: 'template',
    name: 'Orbital Showcase',
    description: 'Pastel animated showcase with orbital dish carousel and floating blobs',
    emoji: '🪐',
    badge: 'Modern',
    badgeClass: 'bg-orange-100 text-orange-700',
    grad: 'from-orange-300 to-amber-500',
  },
  {
    id: 'template2',
    name: 'Coffee House',
    description: 'Warm café poster with animated hand, coffee beans, and canvas-rendered mug',
    emoji: '☕',
    badge: 'Café',
    badgeClass: 'bg-amber-100 text-amber-800',
    grad: 'from-amber-600 to-yellow-900',
  },
];

// ─── Component ───────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser, setRestaurant } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Restaurant details
  const [restaurant, setRestaurantForm] = useState<RestaurantForm>({
    restaurantName: '', ownerName: user?.name || '', address: '', location: '',
    ownerPhone: '', restaurantPhone: '', tableCount: '10',
  });

  // Step 2: Menu
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanTab, setScanTab] = useState<'image' | 'text'>('image');
  const [pasteText, setPasteText] = useState('');
  const [parsingText, setParsingText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Image Generation
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState<{ done: number; total: number } | null>(null);
  const [menuImagePreviews, setMenuImagePreviews] = useState<Record<string, string>>({});

  // Manual dish image upload
  const dishImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDishItemId, setUploadingDishItemId] = useState<string | null>(null);

  const handleDishImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingDishItemId) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setMenuImagePreviews((prev) => ({ ...prev, [uploadingDishItemId]: base64 }));
      toast.success('Dish photo added!');
      setUploadingDishItemId(null);
      if (dishImageInputRef.current) dishImageInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const triggerDishUpload = (itemId: string) => {
    setUploadingDishItemId(itemId);
    dishImageInputRef.current?.click();
  };

  // Step 3: Branding
  const [logo, setLogo] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [theme, setTheme] = useState({
    primaryColor: '#059669', secondaryColor: '#1e293b',
    accentColor: '#f59e0b', backgroundColor: '#f8fafc', fontFamily: 'Inter',
  });

  // Step 4: Template
  const [selectedTemplate, setSelectedTemplate] = useState('royal-3d');
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Step 5: QR Codes
  const [tables, setTables] = useState<Array<{ number: number; qrCode: string; name: string }>>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/register');
    }
  }, [user, router]);

  // Re-send preview data when images are generated or menu items change
  useEffect(() => {
    const iframe = previewIframeRef.current;
    if (!iframe || !previewTemplate) return;
    const validItems = menuItems.filter(i => i.name.trim() && i.price);
    const items = validItems.map(i => ({
      _id: i.id,
      name: i.name,
      description: i.description || '',
      price: parseFloat(i.price) || 0,
      category: i.category,
      isVeg: i.isVeg,
      prepTime: parseInt(i.prepTime) || 15,
      image: menuImagePreviews[i.id] || null,
      tags: [],
    }));
    const grouped: Record<string, typeof items> = {};
    items.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    const payload = {
      restaurant: {
        name: restaurant.restaurantName || 'My Restaurant',
        description: '',
        slug: '',
        template: previewTemplate,
        logo: logo || null,
        coverImage: coverImage || null,
      },
      items,
      grouped,
    };
    // Debounce: small delay so frame script is ready and rapid state changes are batched
    const timer = setTimeout(() => {
      iframe.contentWindow?.postMessage({ type: 'ONBOARDING_PREVIEW_DATA', payload }, '*');
    }, 400);
    return () => clearTimeout(timer);
  }, [menuImagePreviews, menuItems, previewTemplate, restaurant.restaurantName, logo, coverImage]);

  // ─── Helpers ──────────────────────────────────────────────
  const updateRestaurant = (field: string, value: string) =>
    setRestaurantForm((p) => ({ ...p, [field]: value }));

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addMenuItem = () => {
    const newItem: MenuItem = {
      id: generateId(), name: '', price: '', prepTime: '15',
      category: 'main-course', isVeg: false, description: '',
    };
    setMenuItems((prev) => [...prev, newItem]);
    setEditingItem(newItem);
  };

  const updateMenuItem = (id: string, field: string, value: string | boolean) => {
    setMenuItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
    if (editingItem?.id === id) {
      setEditingItem((prev) => prev ? { ...prev, [field]: value } : prev);
    }
  };

  const removeMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    if (editingItem?.id === id) setEditingItem(null);
  };

  // ─── File to Base64 (raw, for non-OCR uses) ─────────────
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Pre-process a menu image for better OCR accuracy:
   * 1. Resize to max 2000px (avoid huge base64 payloads)
   * 2. Convert to grayscale
   * 3. Boost contrast so text stands out against coloured backgrounds
   * 4. Return as PNG base64 data-URL
   */
  const preprocessImageForOCR = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          // 1. Resize — keep aspect ratio, max 2000px on largest side
          const MAX = 2000;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
            else { width = Math.round((width * MAX) / height); height = MAX; }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;

          // White background (helps with transparent PNGs)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // 2. Grayscale + contrast via pixel manipulation
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          const contrastFactor = 1.8; // 1.0 = no change, >1 = more contrast
          const intercept = 128 * (1 - contrastFactor);

          for (let i = 0; i < data.length; i += 4) {
            // Luminance-weighted grayscale
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            // Apply contrast
            const enhanced = Math.min(255, Math.max(0, gray * contrastFactor + intercept));
            data[i] = data[i + 1] = data[i + 2] = enhanced;
            data[i + 3] = 255; // fully opaque
          }
          ctx.putImageData(imageData, 0, 0);

          resolve(canvas.toDataURL('image/png'));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // ─── Menu Scanner (Claude Vision API) ──────────────────
  const handleMenuScan = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, WebP, or PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }

    setScanning(true);
    try {
      // Pre-process: grayscale + contrast boost for better OCR accuracy
      const base64Image = await preprocessImageForOCR(file);

      // Send to backend for analysis
      const response = await api.post('/menu/analyze', {
        imageData: base64Image,
      });

      const { items, count } = response.data;

      if (!items || items.length === 0) {
        toast.error('No menu items found in the image. Please try another image or add items manually.');
        return;
      }

      // Convert API response to MenuItem format
      const extractedItems: MenuItem[] = items.map((item: { name: string; price: number; prepTime: number; category: string; isVeg: boolean; description: string }) => ({
        id: generateId(),
        name: item.name,
        price: String(item.price),
        prepTime: String(item.prepTime || 15),
        category: item.category,
        isVeg: item.isVeg,
        description: item.description,
      }));

      setMenuItems((prev) => [...prev, ...extractedItems]);
      const msg = response.data.missingPrices > 0
        ? `Extracted ${count} item names — please fill in the prices highlighted in red`
        : `Successfully extracted ${count} menu items. Review and edit as needed.`;
      toast.success(msg);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to analyze menu image';
      console.error('Menu scan error:', err);
      toast.error(errorMessage);
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  // ─── Paste Text Parser ────────────────────────────────────
  const handleTextParse = useCallback(async () => {
    if (!pasteText.trim()) { toast.error('Please paste your menu text first'); return; }
    setParsingText(true);
    try {
      const response = await api.post('/menu/analyze-text', { text: pasteText });
      const { items, count } = response.data;
      if (!items || items.length === 0) {
        toast.error('No items found. Try format: "Item Name ₹Price" per line.');
        return;
      }
      const extracted: MenuItem[] = items.map((item: { name: string; price: number; prepTime: number; category: string; isVeg: boolean; description: string }) => ({
        id: generateId(),
        name: item.name,
        price: String(item.price || ''),
        prepTime: String(item.prepTime || 15),
        category: item.category,
        isVeg: item.isVeg,
        description: item.description || '',
      }));
      setMenuItems((prev) => [...prev, ...extracted]);
      setPasteText('');
      toast.success(`Extracted ${count} menu items from text!`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to parse text';
      toast.error(msg);
    } finally {
      setParsingText(false);
    }
  }, [pasteText]);

  // ─── AI Image Generation ──────────────────────────────────
  const handleGenerateImages = useCallback(async () => {
    if (menuItems.length === 0) { toast.error('Add menu items first'); return; }
    const itemsToGenerate = menuItems.filter(i => i.name.trim() && i.price);
    if (itemsToGenerate.length === 0) { toast.error('Add item names first'); return; }

    setGeneratingImages(true);
    setImageGenProgress({ done: 0, total: itemsToGenerate.length });
    let completed = 0;
    let succeeded = 0;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    const errors: string[] = [];

    const generateOne = async (item: MenuItem) => {
      try {
        const params = new URLSearchParams({
          dishName: item.name,
          category: item.category,
          template: selectedTemplate,
          isVeg: String(item.isVeg),
        });
        const res = await fetch(`${API_BASE}/menu/download-preview-image?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          const errMsg = data?.message || data?.error || `HTTP ${res.status}`;
          console.error(`[ImageGen] Failed for "${item.name}": ${errMsg}`);
          errors.push(`${item.name}: ${errMsg}`);
          return;
        }
        if (data.imageUrl) {
          setMenuImagePreviews(p => ({ ...p, [item.id]: data.imageUrl }));
          succeeded++;
        } else {
          console.warn(`[ImageGen] No imageUrl returned for "${item.name}":`, data);
          errors.push(`${item.name}: no image returned`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ImageGen] Network error for "${item.name}": ${msg}`);
        errors.push(`${item.name}: ${msg}`);
      } finally {
        completed++;
        setImageGenProgress({ done: completed, total: itemsToGenerate.length });
      }
    };

    try {
      // Process in small batches of 3 to avoid overwhelming the server
      for (let i = 0; i < itemsToGenerate.length; i += 3) {
        await Promise.all(itemsToGenerate.slice(i, i + 3).map(generateOne));
      }
      if (succeeded > 0) {
        toast.success(`Generated ${succeeded} dish image${succeeded > 1 ? 's' : ''}!`);
        if (errors.length > 0) {
          console.warn('[ImageGen] Some items failed:', errors);
          toast.warning(`${errors.length} item(s) failed — check console for details`);
        }
      } else {
        const firstError = errors[0] || 'Unknown error — check browser console';
        toast.error(`Image generation failed: ${firstError}`);
        console.error('[ImageGen] All items failed:', errors);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ImageGen] Unexpected error:', err);
      toast.error(`Image generation error: ${msg}`);
    } finally {
      setGeneratingImages(false);
      setImageGenProgress(null);
    }
  }, [menuItems, selectedTemplate]);

  // ─── Step Handlers ────────────────────────────────────────
  const handleStep1 = async () => {
    if (!restaurant.restaurantName.trim()) {
      toast.error('Restaurant name is required');
      return;
    }
    if (!restaurant.tableCount || parseInt(restaurant.tableCount) < 1) {
      toast.error('Table count must be at least 1');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/onboarding/restaurant', restaurant);
      setRestaurant(data.restaurant);
      if (user) setUser({ ...user, onboardingStep: 2, restaurantId: data.restaurant._id });
      setStep(2);
      toast.success('Restaurant profile saved!');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save restaurant details';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    const validItems = menuItems.filter((item) => item.name.trim() && item.price);
    if (validItems.length === 0) {
      toast.error('Add at least one menu item');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/onboarding/menu', {
        items: validItems.map((item) => ({
          name: item.name, price: item.price, prepTime: item.prepTime,
          category: item.category, isVeg: item.isVeg, description: item.description,
          image: menuImagePreviews[item.id] || null,
        })),
      });
      if (user) setUser({ ...user, onboardingStep: 3 });
      toast.success(`${data.count} menu items saved!`);
      setStep(3);
    } catch {
      toast.error('Failed to save menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/onboarding/branding', {
        logo, coverImage, photos, theme,
      });
      setRestaurant(data.restaurant);
      if (user) setUser({ ...user, onboardingStep: 4 });
      setStep(4);
      toast.success('Branding saved!');
    } catch {
      toast.error('Failed to save branding');
    } finally {
      setLoading(false);
    }
  };

  const handleStep4 = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/onboarding/template', {
        activeTemplate: selectedTemplate,
      });
      setRestaurant(data.restaurant);
      if (user) setUser({ ...user, onboardingStep: 5 });
      setStep(5);
      toast.success('Template selected!');
    } catch {
      toast.error('Failed to save template selection');
    } finally {
      setLoading(false);
    }
  };

  const handleStep5 = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/onboarding/complete');
      setTables(data.tables);
      setRestaurant(data.restaurant);
      if (user) setUser({ ...user, onboardingStep: 6 });
      toast.success('QR codes generated! Your restaurant is ready.');
    } catch {
      toast.error('Failed to generate QR codes');
    } finally {
      setLoading(false);
    }
  };

  const goToAdmin = () => router.push('/admin');

  // ─── Image Upload Handler ─────────────────────────────────
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const base64 = await fileToBase64(file);
    setter(base64);
  };

  const handleMultiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: string[] = [];
    for (let i = 0; i < Math.min(files.length, 6 - photos.length); i++) {
      if (files[i].size > 5 * 1024 * 1024) continue;
      newPhotos.push(await fileToBase64(files[i]));
    }
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const progress = tables.length > 0 ? 100 : (step / STEPS.length) * 100;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-500 rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Restro</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">Welcome, {user.name}</span>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs">
              Step {step} of {STEPS.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <Progress value={progress} className="h-1.5 bg-slate-100" />

        {/* Step Indicators */}
        <div className="flex items-center justify-between mt-4 mb-8">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isComplete = step > s.id || tables.length > 0;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                  isComplete ? 'bg-emerald-600 text-white' :
                  isActive ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600' :
                  'bg-slate-100 text-slate-400'
                )}>
                  {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={cn(
                  'text-[11px] font-medium hidden sm:block',
                  isActive ? 'text-emerald-700' : isComplete ? 'text-emerald-600' : 'text-slate-400'
                )}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 pb-24">

        {/* ─── STEP 1: Restaurant Profile ─────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Restaurant Details</h2>
              <p className="text-slate-500 mt-1">Tell us about your restaurant</p>
            </div>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Restaurant Name *
                    </Label>
                    <Input
                      value={restaurant.restaurantName}
                      onChange={(e) => updateRestaurant('restaurantName', e.target.value)}
                      placeholder="The Grand Kitchen"
                      required
                      className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Owner Name
                    </Label>
                    <Input
                      value={restaurant.ownerName}
                      onChange={(e) => updateRestaurant('ownerName', e.target.value)}
                      placeholder="John Doe"
                      className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Address
                  </Label>
                  <Textarea
                    value={restaurant.address}
                    onChange={(e) => updateRestaurant('address', e.target.value)}
                    placeholder="123, Main Street, City"
                    rows={2}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Location (Google Maps link or area)
                  </Label>
                  <Input
                    value={restaurant.location}
                    onChange={(e) => updateRestaurant('location', e.target.value)}
                    placeholder="Koramangala, Bangalore or paste Google Maps link"
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label className="text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Owner Phone
                    </Label>
                    <Input
                      value={restaurant.ownerPhone}
                      onChange={(e) => updateRestaurant('ownerPhone', e.target.value)}
                      placeholder="+91 98765 43210"
                      className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Restaurant Phone
                    </Label>
                    <Input
                      value={restaurant.restaurantPhone}
                      onChange={(e) => updateRestaurant('restaurantPhone', e.target.value)}
                      placeholder="+91 80 4567 8900"
                      className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" /> Number of Tables *
                    </Label>
                    <Input
                      type="number"
                      value={restaurant.tableCount}
                      onChange={(e) => updateRestaurant('tableCount', e.target.value)}
                      min="1"
                      max="500"
                      required
                      className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleStep1} disabled={loading} className="h-11 px-8 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                {loading ? 'Saving...' : <span className="flex items-center gap-2">Next: Menu Setup <ArrowRight className="w-4 h-4" /></span>}
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Menu Scanner & Editor ─────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Menu Setup</h2>
              <p className="text-slate-500 mt-1">Scan your menu card or add items manually</p>
            </div>

            {/* Scanner / Paste Tabs */}
            <Card className="bg-white border-slate-200">
              <CardContent className="p-0">
                {/* Tab Bar */}
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setScanTab('image')}
                    className={cn(
                      'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors rounded-tl-xl',
                      scanTab === 'image' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <ScanLine className="w-4 h-4" /> Scan Image
                  </button>
                  <button
                    onClick={() => setScanTab('text')}
                    className={cn(
                      'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors rounded-tr-xl',
                      scanTab === 'text' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <FileText className="w-4 h-4" /> Paste Text
                  </button>
                </div>

                {/* Image Upload Tab */}
                {scanTab === 'image' && (
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                      <ScanLine className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Scan Menu Card</h3>
                    <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
                      Upload a photo of your printed menu card. Works best on plain-text / black &amp; white menus.
                    </p>
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleMenuScan} className="hidden" />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={scanning}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      {scanning ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          Scanning...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Menu Image</span>
                      )}
                    </Button>
                    <p className="text-xs text-slate-400 mt-3">
                      💡 If scan fails, use the <button onClick={() => setScanTab('text')} className="text-emerald-600 underline">Paste Text</button> tab instead
                    </p>
                  </div>
                )}

                {/* Paste Text Tab */}
                {scanTab === 'text' && (
                  <div className="p-6">
                    <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" /> Paste Menu Text
                    </h3>
                    <p className="text-sm text-slate-500 mb-3">
                      Type or paste your menu. One item per line — <span className="font-medium text-slate-700">Item Name ₹Price</span> or <span className="font-medium text-slate-700">Item Name ... Price</span>
                    </p>
                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-400 mb-3 font-mono">
                      Paneer Tikka ₹280<br />
                      Chicken Biryani ₹320<br />
                      Mango Lassi ₹80<br />
                      Gulab Jamun ₹90
                    </div>
                    <Textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={"Paneer Tikka ₹280\nChicken Biryani ₹320\nMango Lassi ₹80"}
                      rows={6}
                      className="bg-white border-slate-200 text-sm font-mono resize-none mb-3"
                    />
                    <Button
                      onClick={handleTextParse}
                      disabled={parsingText || !pasteText.trim()}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {parsingText ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Parsing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Extract Menu Items</span>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Manual Button + Generate Images */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                {menuItems.length} item{menuItems.length !== 1 ? 's' : ''} added
              </span>
              <div className="flex gap-2">
                {menuItems.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleGenerateImages}
                    disabled={generatingImages}
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    {generatingImages ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        {imageGenProgress ? `${imageGenProgress.done}/${imageGenProgress.total}` : 'Generating...'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Generate AI Images</span>
                    )}
                  </Button>
                )}
                <Button variant="outline" onClick={addMenuItem} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Item Manually
                </Button>
              </div>
            </div>

            {/* Generated Image Previews */}
            {(Object.keys(menuImagePreviews).length > 0 || generatingImages) && (
              <Card className="bg-purple-50/50 border-purple-200">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-purple-700 mb-3 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> AI-Generated Dish Images Preview
                    {generatingImages && imageGenProgress && (
                      <span className="ml-auto text-purple-500">{imageGenProgress.done}/{imageGenProgress.total} done</span>
                    )}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {menuItems.filter(item => item.name.trim() && item.price).map(item => (
                      <div key={item.id} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-purple-200">
                          {menuImagePreviews[item.id] ? (
                            <img
                              src={menuImagePreviews[item.id]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-slate-100">
                              {generatingImages ? (
                                <span className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-slate-300" />
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1 truncate text-center">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Menu Items List */}
            {menuItems.length > 0 && (
              <div className="space-y-3">
                {menuItems.map((item) => (
                  <Card key={item.id} className={cn(
                    'bg-white border transition-all',
                    editingItem?.id === item.id ? 'border-emerald-300 ring-1 ring-emerald-200' :
                    (!item.price || item.price === '0') ? 'border-orange-300 ring-1 ring-orange-100' :
                    'border-slate-200'
                  )}>
                    <CardContent className="p-4">
                      {editingItem?.id === item.id ? (
                        /* Edit Mode */
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500">Dish Name *</Label>
                              <Input
                                value={item.name}
                                onChange={(e) => updateMenuItem(item.id, 'name', e.target.value)}
                                placeholder="Paneer Tikka"
                                className="bg-slate-50 border-slate-200 text-sm"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                  <IndianRupee className="w-3 h-3" /> Price *
                                </Label>
                                <Input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => updateMenuItem(item.id, 'price', e.target.value)}
                                  placeholder="249"
                                  min="0"
                                  className="bg-slate-50 border-slate-200 text-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Prep (min)
                                </Label>
                                <Input
                                  type="number"
                                  value={item.prepTime}
                                  onChange={(e) => updateMenuItem(item.id, 'prepTime', e.target.value)}
                                  placeholder="15"
                                  min="1"
                                  className="bg-slate-50 border-slate-200 text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500">Category</Label>
                              <select
                                value={item.category}
                                onChange={(e) => updateMenuItem(item.id, 'category', e.target.value)}
                                className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900"
                              >
                                {CATEGORIES.map((cat) => (
                                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500">Description</Label>
                              <Input
                                value={item.description}
                                onChange={(e) => updateMenuItem(item.id, 'description', e.target.value)}
                                placeholder="Short description"
                                className="bg-slate-50 border-slate-200 text-sm"
                              />
                            </div>
                            <div className="flex items-end gap-3">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={item.isVeg}
                                  onCheckedChange={(checked) => updateMenuItem(item.id, 'isVeg', checked)}
                                />
                                <Label className="text-xs text-slate-600 flex items-center gap-1">
                                  <Leaf className="w-3 h-3" /> Veg
                                </Label>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => setEditingItem(null)}
                                className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                              >
                                <Check className="w-3 h-3 mr-1" /> Done
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              item.isVeg ? 'bg-green-500' : 'bg-red-500'
                            )} />
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-slate-900 truncate">
                                {item.name || <span className="text-slate-400 italic">Unnamed item</span>}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[10px] border-slate-200">{CATEGORIES.find(c => c.value === item.category)?.label}</Badge>
                                {item.prepTime && <span className="text-[10px] text-slate-400">{item.prepTime} min</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {(!item.price || item.price === '0')
                              ? <span className="text-xs font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded cursor-pointer" onClick={() => setEditingItem(item)}>Add price ✏️</span>
                              : <span className="font-semibold text-sm text-slate-900">₹{item.price}</span>
                            }
                            {/* Manual dish photo upload */}
                            <button
                              onClick={() => triggerDishUpload(item.id)}
                              title={menuImagePreviews[item.id] ? 'Replace photo' : 'Upload dish photo'}
                              className={cn(
                                'h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 transition-colors',
                                menuImagePreviews[item.id] ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-600'
                              )}
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)} className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600">
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removeMenuItem(item.id)} className="h-7 w-7 p-0 text-slate-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {menuItems.length === 0 && (
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-10 text-center">
                  <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No menu items yet. Scan your menu card or add items manually.</p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              {/* Hidden file input for per-dish photo upload */}
              <input
                ref={dishImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleDishImageFileChange}
              />
              <Button variant="outline" onClick={() => setStep(1)} className="border-slate-200 text-slate-700">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button onClick={handleStep2} disabled={loading} className="h-11 px-8 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                {loading ? 'Saving...' : <span className="flex items-center gap-2">Next: Branding <ArrowRight className="w-4 h-4" /></span>}
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Branding ──────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Branding & Assets</h2>
              <p className="text-slate-500 mt-1">Upload your logo, choose colors, and add photos</p>
            </div>

            {/* Logo & Cover */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" /> Restaurant Logo
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {logo ? (
                    <div className="relative">
                      <img src={logo} alt="Logo" className="w-full h-32 object-contain rounded-lg bg-slate-50 p-2" />
                      <button onClick={() => setLogo(null)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                      <Upload className="w-6 h-6 text-slate-400 mb-2" />
                      <span className="text-xs text-slate-500">Upload Logo</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setLogo)} className="hidden" />
                    </label>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" /> Cover Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {coverImage ? (
                    <div className="relative">
                      <img src={coverImage} alt="Cover" className="w-full h-32 object-cover rounded-lg" />
                      <button onClick={() => setCoverImage(null)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                      <Upload className="w-6 h-6 text-slate-400 mb-2" />
                      <span className="text-xs text-slate-500">Upload Cover Image</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setCoverImage)} className="hidden" />
                    </label>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Theme Colors */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Palette className="w-4 h-4" /> Theme Colors
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { key: 'primaryColor', label: 'Primary' },
                    { key: 'secondaryColor', label: 'Secondary' },
                    { key: 'accentColor', label: 'Accent' },
                    { key: 'backgroundColor', label: 'Background' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs text-slate-500">{label}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme[key as keyof typeof theme]}
                          onChange={(e) => setTheme((p) => ({ ...p, [key]: e.target.value }))}
                          className="w-8 h-8 rounded-md cursor-pointer border border-slate-200"
                        />
                        <Input
                          value={theme[key as keyof typeof theme]}
                          onChange={(e) => setTheme((p) => ({ ...p, [key]: e.target.value }))}
                          className="h-8 bg-slate-50 border-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Font</Label>
                    <select
                      value={theme.fontFamily}
                      onChange={(e) => setTheme((p) => ({ ...p, fontFamily: e.target.value }))}
                      className="w-full h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-900"
                    >
                      {['Inter', 'Poppins', 'Playfair Display', 'Lora', 'Roboto', 'Montserrat'].map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Photos */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" /> Restaurant Photos
                  <span className="text-xs font-normal text-slate-400 ml-1">({photos.length}/6)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover rounded-lg" />
                      <button
                        onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 6 && (
                    <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                      <Plus className="w-4 h-4 text-slate-400" />
                      <span className="text-[10px] text-slate-400 mt-0.5">Add</span>
                      <input type="file" accept="image/*" multiple onChange={handleMultiImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="border-slate-200 text-slate-700">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button onClick={handleStep3} disabled={loading} className="h-11 px-8 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                {loading ? 'Saving...' : <span className="flex items-center gap-2">Next: Templates <ArrowRight className="w-4 h-4" /></span>}
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Template Selection ────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Choose a Template</h2>
              <p className="text-slate-500 mt-1">Select how your digital menu will look to customers</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((tmpl) => (
                <Card
                  key={tmpl.id}
                  className={cn(
                    'bg-white cursor-pointer transition-all hover:shadow-md relative overflow-hidden',
                    selectedTemplate === tmpl.id
                      ? 'border-emerald-500 ring-2 ring-emerald-200'
                      : 'border-slate-200'
                  )}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                >
                  <CardContent className="p-4">
                    {/* Gradient preview banner */}
                    <div className={cn('w-full h-24 rounded-lg mb-3 bg-gradient-to-br flex items-center justify-center', tmpl.grad)}>
                      <span className="text-3xl">{tmpl.emoji}</span>
                    </div>

                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-slate-900">{tmpl.name}</h3>
                      <Badge className={cn('text-[10px] shrink-0', tmpl.badgeClass)}>
                        {tmpl.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{tmpl.description}</p>

                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTemplate(previewTemplate === tmpl.id ? null : tmpl.id);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {previewTemplate === tmpl.id ? 'Hide Preview' : 'Preview'}
                      </Button>
                      {selectedTemplate === tmpl.id && (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Live Template Preview (iframe with postMessage) */}
            {previewTemplate && (
              <Card className="bg-white border-slate-200 overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Eye className="w-4 h-4" /> Live Preview — {TEMPLATES.find(t => t.id === previewTemplate)?.name}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full bg-slate-100 border-t border-slate-200" style={{ height: '520px' }}>
                    <iframe
                      ref={previewIframeRef}
                      key={previewTemplate}
                      src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '')}/onboarding-preview?template=${previewTemplate}`}
                      className="w-full h-full border-0"
                      title="Template Preview"
                      onLoad={(e) => {
                        const iframe = e.currentTarget;
                        const validItems = menuItems.filter(i => i.name.trim() && i.price);
                        const items = validItems.map(i => ({
                          _id: i.id,
                          name: i.name,
                          description: i.description || '',
                          price: parseFloat(i.price) || 0,
                          category: i.category,
                          isVeg: i.isVeg,
                          prepTime: parseInt(i.prepTime) || 15,
                          image: menuImagePreviews[i.id] || null,
                          tags: [],
                        }));
                        const grouped: Record<string, typeof items> = {};
                        items.forEach(item => {
                          if (!grouped[item.category]) grouped[item.category] = [];
                          grouped[item.category].push(item);
                        });
                        const payload = {
                          restaurant: {
                            name: restaurant.restaurantName || 'My Restaurant',
                            description: '',
                            slug: '',
                            template: previewTemplate,
                            logo: logo || null,
                            coverImage: coverImage || null,
                          },
                          items,
                          grouped,
                        };
                        // Small delay to ensure iframe script is loaded
                        setTimeout(() => {
                          iframe.contentWindow?.postMessage({ type: 'ONBOARDING_PREVIEW_DATA', payload }, '*');
                        }, 500);
                      }}
                    />
                  </div>
                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <p className="text-[11px] text-slate-500">This preview shows your menu items and branding applied to the template.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="border-slate-200 text-slate-700">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button onClick={handleStep4} disabled={loading} className="h-11 px-8 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                {loading ? 'Saving...' : <span className="flex items-center gap-2">Next: Generate QR Codes <ArrowRight className="w-4 h-4" /></span>}
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 5: QR Code Panel ────────────────────── */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">QR Code Panel</h2>
              <p className="text-slate-500 mt-1">Generate unique QR codes for each table</p>
            </div>

            {tables.length === 0 ? (
              <Card className="bg-white border-slate-200">
                <CardContent className="p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <QrCode className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">Generate QR Codes</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                    Click below to generate a unique QR code for each of your {restaurant.tableCount} tables. Each QR code links to your restaurant&apos;s digital menu with the specific table ID.
                  </p>
                  <Button onClick={handleStep5} disabled={loading} className="h-11 px-8 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2"><QrCode className="w-4 h-4" /> Generate All QR Codes</span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* QR Actions */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{tables.length} QR codes generated</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Download all QR codes
                        tables.forEach((table) => {
                          const link = document.createElement('a');
                          link.download = `table-${table.number}-qr.png`;
                          link.href = table.qrCode;
                          link.click();
                        });
                        toast.success('All QR codes downloaded!');
                      }}
                      className="border-slate-200 text-slate-700 text-sm"
                    >
                      <Download className="w-4 h-4 mr-1.5" /> Download All
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (!printWindow) return;
                        printWindow.document.write(`
                          <html><head><title>QR Codes - ${restaurant.restaurantName}</title>
                          <style>
                            body { font-family: sans-serif; padding: 20px; }
                            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                            .qr-card { text-align: center; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; }
                            .qr-card img { width: 160px; height: 160px; }
                            .qr-card h3 { margin: 8px 0 0; font-size: 14px; }
                            @media print { .grid { grid-template-columns: repeat(3, 1fr); } }
                          </style></head><body>
                          <h1 style="text-align:center;margin-bottom:24px;">${restaurant.restaurantName} - Table QR Codes</h1>
                          <div class="grid">
                          ${tables.map((t) => `
                            <div class="qr-card">
                              <img src="${t.qrCode}" alt="Table ${t.number}" />
                              <h3>Table ${t.number}</h3>
                            </div>
                          `).join('')}
                          </div></body></html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }}
                      className="border-slate-200 text-slate-700 text-sm"
                    >
                      <Printer className="w-4 h-4 mr-1.5" /> Print All
                    </Button>
                  </div>
                </div>

                {/* QR Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tables.map((table) => (
                    <Card key={table.number} className="bg-white border-slate-200 hover:border-emerald-300 transition-colors group">
                      <CardContent className="p-3 text-center">
                        <img
                          src={table.qrCode}
                          alt={`Table ${table.number}`}
                          className="w-full aspect-square rounded-lg p-1"
                        />
                        <p className="font-semibold text-sm text-slate-900 mt-2">Table {table.number}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 text-xs text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.download = `table-${table.number}-qr.png`;
                            link.href = table.qrCode;
                            link.click();
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" /> Download
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Completion */}
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-emerald-900 mb-1">Your Restaurant is Ready!</h3>
                    <p className="text-sm text-emerald-700 mb-5 max-w-md mx-auto">
                      All QR codes have been generated. Place them on your tables and customers can scan to order. Head to your admin panel to manage everything.
                    </p>
                    <Button onClick={goToAdmin} className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25">
                      <span className="flex items-center gap-2">Go to Admin Panel <ArrowRight className="w-4 h-4" /></span>
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {tables.length === 0 && (
              <div className="flex justify-start">
                <Button variant="outline" onClick={() => setStep(4)} className="border-slate-200 text-slate-700">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
