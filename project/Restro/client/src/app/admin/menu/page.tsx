'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  Clock,
  Flame,
  Leaf,
  Star,
  FileText,
  CheckSquare,
  Square,
  Loader2,
  ImageIcon,
  Camera,
  X,
  Sparkles,
  RefreshCw,
  ChefHat,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ─── Pollinations.ai AI helpers (free, no API key) ─── */

type AnalyzerTemplate = 'modern' | 'thai' | 'chinese' | 'italian';

function buildDishImageUrl(dishName: string, category: string, description: string): string {
  const platingStyles: Record<string, string> = {
    'starters': 'served as an elegant appetizer on a small white plate with micro-herb garnish',
    'appetizer': 'served as an elegant appetizer on a small white plate with micro-herb garnish',
    'soup': 'served in a deep ceramic bowl with a swirl of cream on top, steam gently rising',
    'salad': 'arranged fresh and colorful in a wide shallow bowl with visible dressing drizzle',
    'main-course': 'plated on a round white ceramic plate with artistic sauce dots and fresh herb garnish',
    'rice': 'served fluffy and aromatic on an oval plate with garnish of fried onions and herbs',
    'noodles': 'twirled neatly in a deep bowl with chopsticks resting on the side',
    'bread': 'arranged on a rustic wooden board with a small bowl of dipping sauce',
    'desserts': 'artfully presented on a slate dessert plate with powdered sugar and berry coulis',
    'dessert': 'artfully presented on a slate dessert plate with powdered sugar and berry coulis',
    'drinks': 'served in a clear tall glass with ice, condensation droplets on the glass, garnished with mint',
    'beverage': 'served in a clear tall glass with ice, condensation droplets on the glass, garnished with mint',
    'sides': 'served in a small ceramic ramekin with a sprinkle of fresh herbs',
    'specials': 'plated by a chef with artistic precision, edible flowers and microgreens as garnish',
  };
  const style = platingStyles[category] || 'beautifully plated on fine dinnerware';
  const desc = description || 'traditional authentic recipe';
  const prompt = `Ultra-realistic professional food photography, ${dishName}, ${desc}, ${style}. Shot with a Canon EOS R5, 85mm f/1.4 lens, shallow depth of field bokeh background. Warm golden-hour side lighting from the left, soft fill light. Rich saturated appetizing colors, crisp textures visible. Dark moody restaurant table background, slightly out of focus. Top-down 45 degree angle. Michelin-star restaurant presentation. 8k resolution, photorealistic`;
  let hash = 0;
  for (let i = 0; i < dishName.length; i++) { hash = ((hash << 5) - hash) + dishName.charCodeAt(i); hash |= 0; }
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&nologo=true&enhance=true&seed=${Math.abs(hash)}`;
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
  prepTime: number;
  isVeg: boolean;
  isAvailable: boolean;
  tags: string[];
  sortOrder: number;
}

const categories = [
  { value: 'all', label: 'All' },
  { value: 'starters', label: 'Starters' },
  { value: 'main-course', label: 'Main Course' },
  { value: 'soups', label: 'Soups' },
  { value: 'salads', label: 'Salads' },
  { value: 'breads', label: 'Breads' },
  { value: 'rice-biryani', label: 'Rice & Biryani' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'desserts', label: 'Desserts' },
  { value: 'specials', label: 'Specials' },
  { value: 'sides', label: 'Sides' },
];

const emptyItem = {
  name: '',
  description: '',
  price: 0,
  category: 'starters',
  prepTime: 15,
  isVeg: true,
  isAvailable: true,
  tags: [] as string[],
  image: '',
};

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Menu Analyzer state
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [analyzerMode, setAnalyzerMode] = useState<'image' | 'text'>('image');
  const [analyzerText, setAnalyzerText] = useState('');
  const [analyzerImagePreview, setAnalyzerImagePreview] = useState<string | null>(null);
  const [analyzerImageData, setAnalyzerImageData] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedItems, setAnalyzedItems] = useState<typeof emptyItem[]>([]);


  // AI Visualizer state
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [visualizerTemplate, setVisualizerTemplate] = useState<AnalyzerTemplate>('modern');
  const [visualizerDishes, setVisualizerDishes] = useState<Array<{
    id: string; name: string; price: number; description: string;
    category: string; isVeg: boolean; imageUrl?: string; prepTime: number;
  }>>([]);
  const [visualizerRestaurant, setVisualizerRestaurant] = useState('');
  const [generatingAiImages, setGeneratingAiImages] = useState<Record<string, boolean>>({});

  // AI Image Generation state
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState<string>('');
  const [selectedAnalyzed, setSelectedAnalyzed] = useState<Set<number>>(new Set());
  const [importingItems, setImportingItems] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dishImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDishId, setUploadingDishId] = useState<string | null>(null);
  const [dialogImagePreview, setDialogImagePreview] = useState<string>('');

  const fetchMenu = useCallback(async () => {
    try {
      const { data } = await api.get('/menu');
      setItems(data.items || data || []);
    } catch {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleDishImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      if (uploadingDishId) {
        // Uploading from card
        try {
          await api.put(`/menu/${uploadingDishId}`, { image: base64 });
          toast.success('Dish image updated!');
          fetchMenu();
        } catch {
          toast.error('Failed to upload image');
        }
        setUploadingDishId(null);
      } else {
        // Uploading from dialog
        setDialogImagePreview(base64);
        setForm((f) => ({ ...f, image: base64 }));
      }
      if (dishImageInputRef.current) dishImageInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const triggerDishUpload = (itemId: string) => {
    setUploadingDishId(itemId);
    dishImageInputRef.current?.click();
  };

  const triggerDialogUpload = () => {
    setUploadingDishId(null);
    dishImageInputRef.current?.click();
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyItem);
    setDialogImagePreview('');
    setTagInput('');
    setShowDialog(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setDialogImagePreview(item.image || '');
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      prepTime: item.prepTime,
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
      tags: item.tags || [],
      image: item.image || '',
    });
    setTagInput('');
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!form.name || form.price <= 0) {
      toast.error('Name and valid price are required');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/menu/${editing._id}`, form);
        toast.success('Menu item updated');
      } else {
        await api.post('/menu', form);
        toast.success('Menu item created');
      }
      setShowDialog(false);
      fetchMenu();
    } catch {
      toast.error('Failed to save menu item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/menu/${id}/toggle`);
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isAvailable: !item.isAvailable } : item))
      );
      toast.success('Availability updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/menu/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
      toast.success('Item deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  // ── Menu Analyzer handlers ──────────────────────────────────────────────
  const handleAnalyzerImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WEBP, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAnalyzerImagePreview(dataUrl);
      setAnalyzerImageData(dataUrl);
      console.log('[MenuAnalyzer] Image selected, size:', file.size, 'type:', file.type);
    };
    reader.onerror = () => toast.error('Failed to read image file');
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (analyzerMode === 'image') {
      if (!analyzerImageData) {
        toast.error('Please select an image first');
        return;
      }
      console.log('[MenuAnalyzer] Starting image analysis...');
      setAnalyzing(true);
      try {
        const { data } = await api.post('/menu/analyze', { imageData: analyzerImageData });
        console.log('[MenuAnalyzer] Got', data.items?.length, 'items');
        setAnalyzedItems(data.items || []);
        setSelectedAnalyzed(new Set((data.items || []).map((_: unknown, i: number) => i)));
        toast.success(data.message || `Extracted ${data.count} items`);
      } catch (err: unknown) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        console.error('[MenuAnalyzer] Image analysis failed:', message);
        toast.error(message || 'Failed to analyze image');
      } finally {
        setAnalyzing(false);
      }
    } else {
      if (!analyzerText.trim()) {
        toast.error('Please paste some menu text first');
        return;
      }
      console.log('[MenuAnalyzer] Starting text analysis, length:', analyzerText.length);
      setAnalyzing(true);
      try {
        const { data } = await api.post('/menu/analyze-text', { text: analyzerText });
        console.log('[MenuAnalyzer] Got', data.items?.length, 'items from text');
        setAnalyzedItems(data.items || []);
        setSelectedAnalyzed(new Set((data.items || []).map((_: unknown, i: number) => i)));
        toast.success(data.message || `Extracted ${data.count} items`);
      } catch (err: unknown) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        console.error('[MenuAnalyzer] Text analysis failed:', message);
        toast.error(message || 'Failed to analyze text');
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const toggleAnalyzedItem = (idx: number) => {
    setSelectedAnalyzed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleImportSelected = async () => {
    const toImport = analyzedItems.filter((_, i) => selectedAnalyzed.has(i));
    if (toImport.length === 0) {
      toast.error('No items selected');
      return;
    }
    setImportingItems(true);
    let succeeded = 0;
    let failed = 0;
    for (const item of toImport) {
      try {
        await api.post('/menu', item);
        succeeded++;
      } catch (err) {
        console.error('[MenuAnalyzer] Failed to import item:', item.name, err);
        failed++;
      }
    }
    setImportingItems(false);
    if (succeeded > 0) {
      toast.success(`Imported ${succeeded} item${succeeded > 1 ? 's' : ''} successfully`);
      fetchMenu();
    }
    if (failed > 0) {
      toast.error(`${failed} item${failed > 1 ? 's' : ''} failed to import`);
    }
    if (succeeded > 0) {
      setShowAnalyzer(false);
      setAnalyzedItems([]);
      setAnalyzerImagePreview(null);
      setAnalyzerImageData(null);
      setAnalyzerText('');
    }
  };

  // ── AI Visualizer handlers ──────────────────────────────────────────
  const handleGenerateAiImage = (dishId: string) => {
    const dish = visualizerDishes.find(d => d.id === dishId);
    if (!dish) return;
    setGeneratingAiImages(prev => ({ ...prev, [dishId]: true }));
    const imageUrl = buildDishImageUrl(dish.name, dish.category, dish.description);
    const img = new Image();
    img.onload = () => {
      setVisualizerDishes(prev => prev.map(d => d.id === dishId ? { ...d, imageUrl } : d));
      setGeneratingAiImages(prev => ({ ...prev, [dishId]: false }));
    };
    img.onerror = () => {
      setGeneratingAiImages(prev => ({ ...prev, [dishId]: false }));
      toast.error(`Failed to generate image for ${dish.name}`);
    };
    img.src = imageUrl;
  };

  const handleGenerateAllAiImages = () => {
    visualizerDishes.forEach((dish, i) => {
      setTimeout(() => handleGenerateAiImage(dish.id), i * 300);
    });
  };

  const handleImportFromVisualizer = async () => {
    if (visualizerDishes.length === 0) return;
    setImportingItems(true);
    let succeeded = 0;
    let failed = 0;
    for (const dish of visualizerDishes) {
      try {
        await api.post('/menu', {
          name: dish.name,
          description: dish.description,
          price: dish.price,
          category: dish.category,
          isVeg: dish.isVeg,
          isAvailable: true,
          prepTime: dish.prepTime,
          tags: [],
          image: dish.imageUrl || '',
        });
        succeeded++;
      } catch {
        failed++;
      }
    }
    setImportingItems(false);
    if (succeeded > 0) {
      toast.success(`Imported ${succeeded} dishes to your menu!`);
      fetchMenu();
    }
    if (failed > 0) toast.error(`${failed} item(s) failed to import`);
    if (succeeded > 0) {
      setShowVisualizer(false);
      setShowAnalyzer(false);
      setVisualizerDishes([]);
      setAnalyzedItems([]);
      setAnalyzerImagePreview(null);
      setAnalyzerImageData(null);
    }
  };

  const handleRemoveVisualizerDish = (dishId: string) => {
    setVisualizerDishes(prev => prev.filter(d => d.id !== dishId));
  };

  // ── AI Image Generation handler ──────────────────────────────────────────
  const handleGenerateAllImages = async (force = false) => {
    const itemsWithoutImages = items.filter(i => !i.image);
    if (!force && itemsWithoutImages.length === 0) {
      // All items have images — ask if they want to regenerate all
      const confirmed = window.confirm(
        `All ${items.length} items already have images.\n\nDo you want to regenerate ALL images with the correct AI-matched images?\n(This will replace the existing images.)`
      );
      if (!confirmed) return;
      return handleGenerateAllImages(true);
    }
    const count = force ? items.length : itemsWithoutImages.length;
    setGeneratingImages(true);
    setImageGenProgress(`0/${count}`);
    try {
      const { data } = await api.post('/menu/generate-images', { all: true, force });
      toast.success(data.message || `Generated ${data.generated} images`);
      fetchMenu(); // Refresh to show new images
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate images';
      toast.error(msg);
    } finally {
      setGeneratingImages(false);
      setImageGenProgress('');
    }
  };

  const handleGenerateSingleImage = async (itemId: string) => {
    try {
      toast.info('Generating AI image...');
      const { data } = await api.post('/menu/generate-image', { itemId });
      toast.success(data.message || 'Image generated!');
      fetchMenu();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate image';
      toast.error(msg);
    }
  };

  const filtered = items.filter((item) => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const grouped = categories
    .filter((c) => c.value !== 'all')
    .map((cat) => ({
      ...cat,
      items: filtered.filter((i) => i.category === cat.value),
    }))
    .filter((g) => activeCategory === 'all' ? g.items.length > 0 : g.items.length >= 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <p className="text-sm text-slate-500 mt-1">{items.length} items across {categories.length - 1} categories</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => { setShowAnalyzer(true); setAnalyzedItems([]); setAnalyzerImagePreview(null); setAnalyzerImageData(null); setAnalyzerText(''); setAnalyzerMode('image'); }}
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            <Upload className="w-4 h-4 mr-2" /> Import from Menu
          </Button>
          <Button
            onClick={handleGenerateAllImages}
            disabled={generatingImages}
            variant="outline"
            className="border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            {generatingImages ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {imageGenProgress || 'Generating...'}
              </span>
            ) : (
              <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> AI Images</span>
            )}
          </Button>
          <Button onClick={openCreate} className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Dish
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="bg-slate-50 border border-slate-200 flex-wrap h-auto">
            {categories.map((cat) => (
              <TabsTrigger
                key={cat.value}
                value={cat.value}
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600 text-xs"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-9"
          />
        </div>
      </div>

      {/* Menu Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white border-slate-200">
          <CardContent className="py-16 text-center">
            <p className="text-slate-400">No menu items found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {(activeCategory === 'all' ? grouped : grouped.filter(g => g.value === activeCategory)).map((group) => (
            <div key={group.value}>
              {activeCategory === 'all' && (
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{group.label}</h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((item) => (
                  <Card
                    key={item._id}
                    className={cn(
                      'bg-white border-slate-200 overflow-hidden group hover:bg-slate-50 transition-all',
                      !item.isAvailable && 'opacity-50'
                    )}
                  >
                    <CardContent className="p-0">
                      {/* Dish Image */}
                      <div className="relative h-32 bg-slate-100 overflow-hidden group/img">
                        {item.image ? (
                          <>
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            {/* Hover overlay: replace or remove */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                onClick={() => triggerDishUpload(item._id)}
                                className="text-[10px] text-white font-medium px-2 py-1 rounded bg-white/20 hover:bg-white/30 flex items-center gap-1"
                              >
                                <Camera className="w-3 h-3" /> Replace
                              </button>
                              <button
                                onClick={async () => { await api.put(`/menu/${item._id}`, { image: null }); fetchMenu(); }}
                                className="text-[10px] text-white font-medium px-2 py-1 rounded bg-white/20 hover:bg-white/30 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" /> Remove
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                            <ImageIcon className="w-6 h-6 text-slate-300" />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => triggerDishUpload(item._id)}
                                className="text-[10px] text-emerald-600 hover:text-emerald-800 font-medium px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                              >
                                <Camera className="w-3 h-3" /> Upload
                              </button>
                              <button
                                onClick={() => handleGenerateSingleImage(item._id)}
                                className="text-[10px] text-purple-600 hover:text-purple-800 font-medium px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                              >
                                AI Image
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-sm border-2', item.isVeg ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')} />
                          <h4 className="font-semibold text-sm">{item.name}</h4>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(item)} className="w-7 h-7 text-slate-500 hover:text-slate-900">
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(item._id)} className="w-7 h-7 text-red-400/40 hover:text-red-400">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{item.description}</p>
                      )}

                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {item.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                            {tag === 'spicy' && <Flame className="w-2.5 h-2.5 mr-0.5 text-red-400" />}
                            {tag === 'bestseller' && <Star className="w-2.5 h-2.5 mr-0.5 text-amber-400" />}
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-emerald-600">₹{item.price}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {item.prepTime}m
                          </span>
                        </div>
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() => handleToggle(item._id)}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input for dish image upload */}
      <input
        ref={dishImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleDishImageUpload}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Dish' : 'Add New Dish'}</DialogTitle>
            <DialogDescription className="text-slate-500">
              {editing ? 'Update dish details' : 'Add a new dish to your menu'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs text-slate-500">Dish Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Butter Chicken"
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs text-slate-500">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the dish..."
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-xs text-slate-500">Price (₹) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-500">Prep Time (min)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.prepTime || ''}
                  onChange={(e) => setForm({ ...form, prepTime: parseInt(e.target.value) || 0 })}
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-500">Category</Label>
                <Select value={form.category || 'starters'} onValueChange={(v: string | null) => setForm({ ...form, category: v ?? 'starters' })}>
                  <SelectTrigger className="mt-1 bg-slate-50 border-slate-200 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {categories.filter((c) => c.value !== 'all').map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-slate-900 hover:bg-slate-100">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.isVeg}
                    onCheckedChange={(v) => setForm({ ...form, isVeg: v })}
                    className="data-[state=checked]:bg-green-600"
                  />
                  <Label className="text-xs text-slate-500 flex items-center gap-1">
                    <Leaf className="w-3 h-3 text-green-400" /> Veg
                  </Label>
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-xs text-slate-500">Dish Photo</Label>
                <div className="mt-1 flex gap-3 items-start">
                  {/* Preview */}
                  <div className="w-20 h-20 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                    {dialogImagePreview ? (
                      <img src={dialogImagePreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={triggerDialogUpload}
                      className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 text-xs h-8"
                    >
                      <Camera className="w-3.5 h-3.5 mr-1.5" /> Upload Photo from Device
                    </Button>
                    <Input
                      value={form.image?.startsWith('data:') ? '' : form.image}
                      onChange={(e) => { setForm({ ...form, image: e.target.value }); setDialogImagePreview(e.target.value); }}
                      placeholder="Or paste image URL..."
                      className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8"
                    />
                    {dialogImagePreview && (
                      <button
                        type="button"
                        onClick={() => { setDialogImagePreview(''); setForm({ ...form, image: '' }); }}
                        className="text-[10px] text-red-400 hover:text-red-600"
                      >
                        × Remove image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-xs text-slate-500">Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="e.g., spicy, bestseller"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="bg-slate-50 border-slate-200 text-slate-900"
                  />
                  <Button type="button" variant="outline" onClick={addTag} className="border-white/[0.1] text-slate-600 shrink-0">
                    Add
                  </Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {form.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs border-white/[0.1] text-slate-600 cursor-pointer hover:border-red-200 hover:text-red-400"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => setShowDialog(false)} className="text-slate-500">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white"
              >
                {submitting ? 'Saving...' : editing ? 'Update Dish' : 'Add Dish'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* AI Menu Analyzer Dialog */}
      <Dialog open={showAnalyzer} onOpenChange={setShowAnalyzer}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto" style={{ maxWidth: '56rem', width: '90vw' }}>
          <DialogHeader>
            <DialogTitle>Import Menu Items</DialogTitle>
            <DialogDescription className="text-slate-500">
              Upload a menu image for extraction, or paste menu text directly.
            </DialogDescription>
          </DialogHeader>

          {/* Mode tabs */}
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant={analyzerMode === 'image' ? 'default' : 'outline'}
              onClick={() => setAnalyzerMode('image')}
              className={analyzerMode === 'image' ? 'bg-emerald-600 text-white' : 'border-slate-200 text-slate-600'}
            >
              <ImageIcon className="w-4 h-4 mr-1.5" /> Image / Photo
            </Button>
            <Button
              size="sm"
              variant={analyzerMode === 'text' ? 'default' : 'outline'}
              onClick={() => setAnalyzerMode('text')}
              className={analyzerMode === 'text' ? 'bg-emerald-600 text-white' : 'border-slate-200 text-slate-600'}
            >
              <FileText className="w-4 h-4 mr-1.5" /> Paste Text
            </Button>
          </div>

          {analyzerMode === 'image' ? (
            <div className="space-y-3 mt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAnalyzerImageSelect}
              />
              {analyzerImagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={analyzerImagePreview} alt="Menu preview" className="w-full max-h-64 object-contain bg-slate-50" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setAnalyzerImagePreview(null); setAnalyzerImageData(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 text-xs border-white bg-white/80"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-orange-400 hover:bg-orange-50/30 transition-colors text-slate-500 hover:text-orange-600"
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Click to upload menu image</p>
                  <p className="text-xs mt-1 opacity-70">JPG, PNG, WEBP — max 10 MB</p>
                </button>
              )}
              <p className="text-xs text-slate-400">
                Tip: Use a clear, well-lit photo with readable text for better OCR results.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mt-3">
              <Label className="text-xs text-slate-500">Paste menu text (one item per line, with price)</Label>
              <Textarea
                value={analyzerText}
                onChange={(e) => setAnalyzerText(e.target.value)}
                placeholder={'Samosa (3 pcs) ............. 80\nPaneer Butter Masala .... 320\nMango Lassi ............. 60'}
                className="bg-slate-50 border-slate-200 text-slate-900 font-mono text-xs min-h-[160px]"
                rows={8}
              />
              <p className="text-xs text-slate-400">
                Format: <code className="bg-slate-100 px-1 rounded">Item Name ......... Price</code> or <code className="bg-slate-100 px-1 rounded">Item Name  Price</code>
              </p>
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={analyzing || (analyzerMode === 'text' ? !analyzerText.trim() : !analyzerImageData)}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white mt-1"
          >
            {analyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing{analyzerMode === 'image' ? ' (OCR running…)' : '…'}</>
            ) : (
              <><Search className="w-4 h-4 mr-2" /> Extract Menu Items</>
            )}
          </Button>

          {/* Results (for OCR/Text mode — AI Vision jumps to visualizer) */}
          {analyzedItems.length > 0 && !showVisualizer && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {analyzedItems.length} items extracted — select items to import
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs text-orange-600 border-orange-200 h-7"
                    onClick={() => {
                      setVisualizerDishes(analyzedItems.map((item, i) => ({
                        id: `viz-${Date.now()}-${i}`, ...item,
                      })));
                      setVisualizerRestaurant('Extracted Menu');
                      setShowVisualizer(true);
                    }}>
                    <Eye className="w-3 h-3 mr-1" /> Visual Preview
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs text-slate-500 h-7"
                    onClick={() => setSelectedAnalyzed(new Set(analyzedItems.map((_, i) => i)))}>
                    Select all
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs text-slate-500 h-7"
                    onClick={() => setSelectedAnalyzed(new Set())}>
                    Deselect all
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                {analyzedItems.map((item, i) => (
                  <div
                    key={i}
                    className={cn('flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors', selectedAnalyzed.has(i) ? 'bg-emerald-50/40' : '')}
                    onClick={() => toggleAnalyzedItem(i)}
                  >
                    {selectedAnalyzed.has(i)
                      ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                    <div className={cn('w-3 h-3 rounded-sm border-2 shrink-0', item.isVeg ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{item.category?.replace('-', ' ')}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 shrink-0">₹{item.price}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleImportSelected}
                disabled={importingItems || selectedAnalyzed.size === 0}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white"
              >
                {importingItems
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</>
                  : `Import ${selectedAnalyzed.size} selected item${selectedAnalyzed.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Visual Preview Dialog (full-screen overlay) */}
      <Dialog open={showVisualizer} onOpenChange={setShowVisualizer}>
        <DialogContent className="bg-[#fafafa] border-slate-200 text-slate-900 max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto p-0">
          {/* Visualizer Header */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{visualizerRestaurant}</h2>
                <p className="text-xs text-slate-400">{visualizerDishes.length} dishes extracted — preview &amp; generate AI images before importing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Template switcher */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {(['modern', 'thai', 'chinese', 'italian'] as AnalyzerTemplate[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setVisualizerTemplate(t)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                      visualizerTemplate === t ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Button
                onClick={handleGenerateAllAiImages}
                size="sm"
                className="bg-black text-white hover:bg-gray-800"
              >
                <Sparkles className="w-4 h-4 mr-1.5" /> Generate All Images
              </Button>
            </div>
          </div>

          {/* Dish Grid */}
          <div className="p-6">
            <div className={cn(
              "grid gap-6",
              visualizerTemplate === 'modern' && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
              visualizerTemplate === 'thai' && "grid-cols-1 max-w-3xl mx-auto",
              visualizerTemplate === 'chinese' && "grid-cols-1 md:grid-cols-2",
              visualizerTemplate === 'italian' && "grid-cols-1 md:grid-cols-2",
            )}>
              {visualizerDishes.map((dish) => (
                <div
                  key={dish.id}
                  className={cn(
                    "group relative",
                    visualizerTemplate === 'modern' && "bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100",
                    visualizerTemplate === 'thai' && "flex flex-row gap-6 bg-white p-5 border-b border-orange-100 items-center",
                    visualizerTemplate === 'chinese' && "bg-white border-2 border-red-50 p-4 rounded-lg shadow-sm",
                    visualizerTemplate === 'italian' && "bg-[#fffcf5] border border-[#e8dcc4] p-6 rounded-none shadow-md text-center",
                  )}
                >
                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveVisualizerDish(dish.id)}
                    className="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Image area */}
                  <div className={cn(
                    "overflow-hidden relative",
                    visualizerTemplate === 'modern' && "w-full aspect-square",
                    visualizerTemplate === 'thai' && "w-36 h-36 flex-shrink-0 rounded-full border-4 border-orange-500 shadow-xl",
                    visualizerTemplate === 'chinese' && "w-full aspect-video rounded-md mb-3",
                    visualizerTemplate === 'italian' && "w-28 h-28 mx-auto rounded-full mb-4 border-2 border-[#c4a484]",
                  )}>
                    {dish.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-slate-300 gap-2">
                        {generatingAiImages[dish.id] ? (
                          <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
                        ) : (
                          <>
                            <ImageIcon className="w-10 h-10" strokeWidth={1} />
                            <button
                              onClick={() => handleGenerateAiImage(dish.id)}
                              className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded hover:bg-orange-100"
                            >
                              Generate AI Image
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {/* Hover actions on image */}
                    {dish.imageUrl && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleGenerateAiImage(dish.id)}
                          className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-900 hover:bg-orange-500 hover:text-white transition-all shadow-lg"
                          title="Regenerate AI Image"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className={cn("flex-1", visualizerTemplate === 'modern' && "p-4")}>
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "font-bold text-slate-900",
                          visualizerTemplate === 'thai' ? "text-xl font-serif italic" : "text-base",
                          visualizerTemplate === 'italian' && "text-xl font-serif",
                        )}>
                          {dish.name}
                        </h3>
                        {dish.isVeg && <Leaf className="w-3.5 h-3.5 text-green-500" />}
                      </div>
                      <span className={cn(
                        "font-black text-sm",
                        visualizerTemplate === 'thai' ? "text-orange-600 text-lg" : "text-slate-900",
                        visualizerTemplate === 'italian' && "text-[#c4a484]",
                      )}>
                        ₹{dish.price}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs leading-relaxed",
                      visualizerTemplate === 'thai' ? "text-slate-500 italic" : "text-slate-400",
                      visualizerTemplate === 'italian' && "font-serif text-slate-500",
                    )}>
                      {dish.description || 'Freshly prepared with the finest ingredients.'}
                    </p>
                    {visualizerTemplate === 'modern' && (
                      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-300">{dish.category?.replace('-', ' ')}</span>
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase",
                          dish.isVeg ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        )}>
                          {dish.isVeg ? 'Veg' : 'Non-Veg'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Import footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {visualizerDishes.filter(d => d.imageUrl).length}/{visualizerDishes.length} dishes have AI images
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowVisualizer(false)} className="border-slate-200 text-slate-600">
                Back
              </Button>
              <Button
                onClick={handleImportFromVisualizer}
                disabled={importingItems || visualizerDishes.length === 0}
                className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white px-8"
              >
                {importingItems
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</>
                  : <><Plus className="w-4 h-4 mr-2" /> Import {visualizerDishes.length} Dishes to Menu</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
