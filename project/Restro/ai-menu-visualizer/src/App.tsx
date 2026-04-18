/**
 * AI Menu Visualizer — 100% free, no API keys needed.
 * Uses Pollinations.ai for both menu OCR (vision) and dish image generation.
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  Loader2, 
  Check, 
  ChefHat, 
  Image as ImageIcon, 
  RefreshCw, 
  Plus,
  Trash2,
  Leaf,
  Sparkles,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { cn } from './lib/utils';
import { Dish, MenuData, MenuTemplateType } from './types';

/* ─── Pollinations.ai helpers ─── */

/** Use Pollinations Vision API to extract menu items from an image */
async function extractMenuWithAI(base64DataUrl: string): Promise<{ restaurantName: string; dishes: any[] }> {
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: base64DataUrl } },
          {
            type: 'text',
            text: `You are a menu extraction expert. Analyze this restaurant menu image carefully.
Extract EVERY dish you can see. For each dish return:
- name: the dish name exactly as written
- price: the price as a string (e.g. "₹250", "$12.99", "180"). If no price visible, use "0"
- description: a short appetizing description (generate one if not visible)
- category: one of: appetizer, soup, salad, main-course, rice, noodles, bread, dessert, beverage, sides
- isVeg: true if vegetarian, false otherwise

Also extract the restaurant name if visible on the menu.

IMPORTANT: Return ONLY valid JSON in this exact format, no markdown, no explanation:
{"restaurantName": "Name or Our Menu", "dishes": [{"name": "...", "price": "...", "description": "...", "category": "...", "isVeg": true/false}]}`
          }
        ]
      }],
      temperature: 0.2,
    })
  });

  if (!res.ok) throw new Error(`Vision API error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '{}';
  
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const cleaned = (jsonMatch[1] || text).trim();
  return JSON.parse(cleaned);
}

/** Build a Pollinations image URL for a dish (generates on load, no download) */
function buildDishImageUrl(dishName: string, category: string, description: string): string {
  const platingStyles: Record<string, string> = {
    'appetizer': 'elegant small plate, garnished',
    'soup': 'in a ceramic bowl with steam rising',
    'salad': 'fresh and vibrant in a wide bowl',
    'main-course': 'beautifully plated on white ceramic',
    'rice': 'fluffy and aromatic on a plate',
    'noodles': 'twirled on a plate with chopsticks',
    'bread': 'fresh-baked on a wooden board',
    'dessert': 'artfully presented on a dessert plate',
    'beverage': 'in a tall glass with condensation',
    'sides': 'in a small serving bowl',
  };
  const style = platingStyles[category] || 'beautifully plated';
  const prompt = `Professional food photography of ${dishName}, ${description || 'delicious dish'}, ${style}, soft natural lighting, shallow depth of field, appetizing colors, restaurant quality, 4k, clean background`;
  const seed = hashCode(dishName);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&model=flux&nologo=true&seed=${seed}`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function App() {
  const [menuImage, setMenuImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MenuTemplateType>('modern');
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});
  const [processingStatus, setProcessingStatus] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setMenuImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  const processMenu = async () => {
    if (!menuImage) return;
    setIsProcessing(true);
    setProcessingStatus('Sending menu to AI for analysis...');
    try {
      const result = await extractMenuWithAI(menuImage);
      
      const dishesWithIds = (result.dishes || []).map((d: any, index: number) => ({
        ...d,
        price: String(d.price || '0'),
        id: `dish-${Date.now()}-${index}`,
      }));

      setMenuData({
        restaurantName: result.restaurantName || "Our Menu",
        dishes: dishesWithIds,
      });
      setProcessingStatus('');
    } catch (error) {
      console.error("Error processing menu:", error);
      setProcessingStatus('Failed to analyze menu. Please try again.');
      setTimeout(() => setProcessingStatus(''), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateDishImage = async (dish: Dish) => {
    setGeneratingImages(prev => ({ ...prev, [dish.id]: true }));
    try {
      const imageUrl = buildDishImageUrl(dish.name, dish.category, dish.description);
      
      // Preload the image to show loading state
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = imageUrl;
      });

      setMenuData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          dishes: prev.dishes.map(d => d.id === dish.id ? { ...d, imageUrl, isCustomImage: false } : d)
        };
      });
    } catch (error: any) {
      console.error("Error generating image:", error);
    } finally {
      setGeneratingImages(prev => ({ ...prev, [dish.id]: false }));
    }
  };

  const handleManualUpload = (dishId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setMenuData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            dishes: prev.dishes.map(d => d.id === dishId ? { ...d, imageUrl: reader.result as string, isCustomImage: true } : d)
          };
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAllImages = async () => {
    if (!menuData) return;
    for (const dish of menuData.dishes) {
      if (!dish.imageUrl) {
        await generateDishImage(dish);
      }
    }
  };

  const reset = () => {
    setMenuImage(null);
    setMenuData(null);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] font-sans selection:bg-orange-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <ChefHat size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">MenuVisualizer</h1>
        </div>
        
        {menuData && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold">
              <Zap size={14} />
              Powered by AI — No API Key Needed
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {(['thai', 'chinese', 'italian', 'modern'] as MenuTemplateType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTemplate(t)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                    selectedTemplate === t ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <button 
              onClick={reset}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {!menuData ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto mt-12"
            >
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-sm font-semibold mb-6">
                  <Sparkles size={16} />
                  100% Free AI — No API Keys Required
                </div>
                <h2 className="text-4xl font-extrabold mb-4 tracking-tight">Bring your menu to life</h2>
                <p className="text-gray-500 text-lg">Upload a photo of your menu card and AI will extract every dish &amp; generate stunning food images.</p>
              </div>

              {!menuImage ? (
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer",
                    isDragActive ? "border-orange-500 bg-orange-50/50" : "border-gray-200 hover:border-orange-300 hover:bg-gray-50/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-6">
                    <Upload size={32} />
                  </div>
                  <p className="text-xl font-semibold mb-2">Drop your menu here</p>
                  <p className="text-gray-400">or click to browse files</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                    <img src={menuImage} alt="Menu preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setMenuImage(null)}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <button
                    onClick={processMenu}
                    disabled={isProcessing}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-200 transition-all flex items-center justify-center gap-2 text-lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="animate-spin" />
                        {processingStatus || 'Analyzing Menu...'}
                      </>
                    ) : (
                      <>
                        <Check size={24} />
                        Analyze & Visualize
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-5xl font-black tracking-tight text-gray-900 mb-2">{menuData.restaurantName}</h2>
                  <p className="text-gray-400 font-medium uppercase tracking-widest text-sm">Visual Menu Preview</p>
                </div>
                <button
                  onClick={generateAllImages}
                  className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg"
                >
                  <ImageIcon size={20} />
                  Generate All Images
                </button>
              </div>

              <div className={cn(
                "grid gap-8",
                selectedTemplate === 'modern' && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                selectedTemplate === 'thai' && "grid-cols-1",
                selectedTemplate === 'chinese' && "grid-cols-1 md:grid-cols-2",
                selectedTemplate === 'italian' && "grid-cols-1 md:grid-cols-2"
              )}>
                {menuData.dishes.map((dish) => (
                  <DishCard 
                    key={dish.id} 
                    dish={dish} 
                    template={selectedTemplate}
                    onGenerate={() => generateDishImage(dish)}
                    onUpload={(e) => handleManualUpload(dish.id, e)}
                    isGenerating={generatingImages[dish.id]}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-100 py-12 px-6 text-center">
        <p className="text-gray-400 text-sm">Powered by Pollinations.ai — Free AI Menu Visualization • No API Keys Required</p>
      </footer>
    </div>
  );
}

function DishCard({ 
  dish, 
  template, 
  onGenerate, 
  onUpload, 
  isGenerating 
}: { 
  dish: Dish; 
  template: MenuTemplateType;
  onGenerate: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isGenerating: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTemplateStyles = () => {
    switch (template) {
      case 'thai':
        return "flex flex-row gap-8 bg-white p-6 rounded-none border-b border-orange-100 items-center";
      case 'chinese':
        return "bg-white border-2 border-red-50 p-4 rounded-lg shadow-sm";
      case 'italian':
        return "bg-[#fffcf5] border border-[#e8dcc4] p-8 rounded-none shadow-md text-center";
      default:
        return "bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 group";
    }
  };

  const imageContainerStyles = () => {
    switch (template) {
      case 'thai':
        return "w-48 h-48 flex-shrink-0 rounded-full overflow-hidden border-4 border-orange-500 shadow-xl";
      case 'chinese':
        return "w-full aspect-video rounded-md overflow-hidden mb-4";
      case 'italian':
        return "w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 border-2 border-[#c4a484]";
      default:
        return "w-full aspect-square overflow-hidden relative";
    }
  };

  return (
    <div className={getTemplateStyles()}>
      <div className={imageContainerStyles()}>
        {dish.imageUrl ? (
          <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-gray-300 gap-2">
            {isGenerating ? (
              <Loader2 className="animate-spin text-orange-500" size={32} />
            ) : (
              <>
                <ImageIcon size={40} strokeWidth={1} />
                <span className="text-xs font-medium uppercase tracking-tighter">No Image</span>
              </>
            )}
          </div>
        )}
        
        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button 
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-orange-500 hover:text-white transition-all shadow-lg"
            title="Generate AI Image"
          >
            <RefreshCw size={18} className={isGenerating ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
            title="Upload Custom Image"
          >
            <Plus size={18} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={onUpload} 
            className="hidden" 
            accept="image/*" 
          />
        </div>
      </div>

      <div className={cn(
        "flex-1",
        template === 'italian' && "space-y-2"
      )}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "font-bold text-gray-900",
              template === 'thai' ? "text-2xl font-serif italic" : "text-xl",
              template === 'italian' ? "text-2xl font-serif block w-full" : ""
            )}>
              {dish.name}
            </h3>
            {dish.isVeg && <Leaf size={14} className="text-green-500" />}
          </div>
          <span className={cn(
            "font-black",
            template === 'thai' ? "text-orange-600 text-xl" : "text-gray-900",
            template === 'italian' ? "block w-full text-[#c4a484]" : ""
          )}>
            {dish.price}
          </span>
        </div>
        
        <p className={cn(
          "text-sm leading-relaxed",
          template === 'thai' ? "text-gray-600 italic" : "text-gray-500",
          template === 'italian' ? "font-serif text-gray-600" : ""
        )}>
          {dish.description || "Freshly prepared with the finest ingredients and authentic spices."}
        </p>

        {template === 'modern' && (
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-300">{dish.category}</span>
            <div className="flex gap-1">
              {dish.isVeg ? (
                <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full uppercase">Veg</span>
              ) : (
                <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full uppercase">Non-Veg</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
