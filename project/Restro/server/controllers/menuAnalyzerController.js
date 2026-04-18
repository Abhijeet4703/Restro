const menuAnalyzer = require('../utils/menuAnalyzer');
const http = require('http');

const PYTHON_API = process.env.ANALYSER_URL || 'http://127.0.0.1:8765';

/**
 * Normalize any AI-returned category string to a clean, consistent slug.
 * This prevents items from silently failing to save due to unexpected category values.
 */
function normalizeCategory(raw) {
  const c = String(raw || '').toLowerCase().trim();
  if (c.includes('starter') || c.includes('appetizer') || c.includes('snack')) return 'starters';
  if (c.includes('biryani') || c.includes('rice') || c.includes('pulao') || c.includes('fried rice')) return 'rice-biryani';
  if (c.includes('main') || c.includes('curry') || c.includes('gravy') || c.includes('entree')) return 'main-course';
  if (c.includes('bread') || c.includes('roti') || c.includes('naan') || c.includes('paratha')) return 'breads';
  if (c.includes('soup')) return 'soups';
  if (c.includes('salad') || c.includes('raita')) return 'salads';
  if (c.includes('dessert') || c.includes('sweet') || c.includes('mithai') || c.includes('ice cream')) return 'desserts';
  if (c.includes('drink') || c.includes('beverage') || c.includes('juice') || c.includes('cocktail') || c.includes('mocktail') || c.includes('chai') || c.includes('coffee') || c.includes('lassi') || c.includes('tea') || c.includes('smoothie') || c.includes('shake')) return 'drinks';
  if (c.includes('special') || c.includes('chef') || c.includes('signature')) return 'specials';
  if (c.includes('side') || c.includes('accompaniment') || c.includes('condiment')) return 'sides';
  // If it's already a short clean slug (no spaces), keep it as-is
  if (c && !c.includes(' ') && c.length < 30) return c;
  return 'main-course';
}

/**
 * POST JSON to the Python analyser API and return parsed body.
 */
function callPythonApi(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts = {
      hostname: '127.0.0.1',
      port: parseInt((new URL(PYTHON_API)).port || 8765),
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => { data += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error('Invalid JSON from Python API')); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Analyze a menu image — tries Python OCR first, falls back to JS OCR.
 */
exports.analyzeMenuImage = async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    console.log('[MenuAnalyzerController] Received analyze request, data length:', imageData.length);

    // ── Try Python analyser API first ──
    let extractedItems;
    try {
      const pyRes = await callPythonApi('/analyze-image', { imageData });
      if (pyRes.status === 200 && Array.isArray(pyRes.body.items) && pyRes.body.items.length > 0) {
        console.log('[MenuAnalyzerController] Python API returned', pyRes.body.items.length, 'item(s)');
        extractedItems = pyRes.body.items;
      } else {
        throw new Error('Python API returned no items');
      }
    } catch (pyErr) {
      console.warn('[MenuAnalyzerController] Python API unavailable, falling back to JS OCR:', pyErr.message);
      extractedItems = await menuAnalyzer.analyzeMenuImage(imageData);
    }

    // Allow items with price=0 — the frontend will prompt users to fill in missing prices
    const validatedItems = extractedItems.filter(item => item.name).map(item => ({
      name: String(item.name).trim(),
      price: Math.round(parseFloat(item.price || 0) * 100) / 100,
      category: normalizeCategory(item.category),
      description: String(item.description || '').trim(),
      isVeg: Boolean(item.isVeg),
      prepTime: Math.max(5, Math.min(45, parseInt(item.prepTime) || 15)),
    }));

    if (!validatedItems || validatedItems.length === 0) {
      return res.status(422).json({
        message: 'Could not extract menu items from this image. The OCR could not read the text clearly. Please try a sharper/higher-contrast image, or add items manually.',
      });
    }

    const missingPrices = validatedItems.filter(i => i.price === 0).length;
    console.log('[MenuAnalyzerController] Returning', validatedItems.length, 'items,', missingPrices, 'need prices');
    res.json({
      items: validatedItems,
      count: validatedItems.length,
      missingPrices,
      message: missingPrices > 0
        ? `Extracted ${validatedItems.length} item names — please fill in the prices for ${missingPrices} item(s)`
        : `Successfully extracted ${validatedItems.length} menu items`,
    });
  } catch (error) {
    console.error('[MenuAnalyzerController] analyzeMenuImage error:', error);
    res.status(500).json({
      message: 'Failed to analyze menu image. Please try again or add items manually.',
      error: error.message,
    });
  }
};

/**
 * Analyze pasted menu text and extract menu items
 */
exports.analyzeMenuText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Menu text is required' });
    }

    console.log('[MenuAnalyzerController] analyzeMenuText called, text length:', text.length);

    // ── Try Python analyser API first ──
    let extractedItems;
    try {
      const pyRes = await callPythonApi('/analyze-text', { text });
      if (pyRes.status === 200 && Array.isArray(pyRes.body.items) && pyRes.body.items.length > 0) {
        extractedItems = pyRes.body.items;
      } else {
        throw new Error('Python API returned no items');
      }
    } catch (pyErr) {
      console.warn('[MenuAnalyzerController] Python API unavailable, falling back to JS parser:', pyErr.message);
      extractedItems = menuAnalyzer.analyzeMenuText(text);
    }

    if (!extractedItems || extractedItems.length === 0) {
      return res.status(400).json({
        message: 'No valid menu items could be extracted from the text. Please check the format and try again.',
      });
    }

    const normalizedItems = extractedItems.map(item => ({
      ...item,
      category: normalizeCategory(item.category),
    }));
    console.log('[MenuAnalyzerController] Returning', normalizedItems.length, 'items from text');
    res.json({
      items: normalizedItems,
      count: normalizedItems.length,
      message: `Successfully extracted ${normalizedItems.length} menu items`,
    });
  } catch (error) {
    console.error('[MenuAnalyzerController] analyzeMenuText error:', error);
    res.status(500).json({
      message: 'Failed to analyze menu text.',
      error: error.message,
    });
  }
};
