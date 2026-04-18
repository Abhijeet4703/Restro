/**
 * Local Menu Analyzer - No API Required
 * Uses pattern matching and OCR-like text extraction to analyze menu images
 * 
 * v2: Added sharp-based image preprocessing for much better OCR accuracy.
 *     Added PSM 4 (column-based) mode. Improved deduplication and price validation.
 */

/**
 * Common menu item patterns and keywords for categorization
 * Order matters: more specific categories checked first to avoid mis-classification.
 * e.g. "naan" should be "sides" not "main-course"
 */
const MENU_PATTERNS = {
  drinks: {
    keywords: [
      'drink', 'juice', 'coffee', 'tea', 'cola', 'water', 'lassi', 'shake',
      'smoothie', 'beverage', 'lemonade', 'soda', 'beer', 'wine', 'mocktail',
      'milkshake', 'frappe', 'buttermilk', 'chaas', 'nimbu pani', 'sharbat',
      'jaljeera', 'aam panna', 'thandai', 'badam milk', 'cold coffee',
    ],
    priceRange: [20, 300],
  },
  desserts: {
    keywords: [
      'dessert', 'sweet', 'cake', 'ice cream', 'kheer', 'gulab jamun', 'brownie',
      'pastry', 'pudding', 'chocolate', 'waffle', 'cheesecake', 'tiramisu', 'gelato',
      'halwa', 'halva', 'ladoo', 'laddoo', 'barfi', 'jalebi', 'rasgulla',
      'rasmalai', 'kulfi', 'payasam', 'kesari', 'mysore pak', 'peda',
    ],
    priceRange: [50, 400],
  },
  sides: {
    keywords: [
      'side', 'bread', 'naan', 'roti', 'gravy', 'pickle', 'sauce',
      'dipping', 'coleslaw', 'onion rings', 'raita', 'chutney', 'papad',
      'chapati', 'chapathi', 'paratha', 'kulcha', 'bhatura', 'poori', 'puri',
      'parotta', 'porotta', 'appam', 'phulka',
    ],
    priceRange: [20, 200],
  },
  starters: {
    keywords: [
      'starter', 'appetizer', 'samosa', 'pakora', 'spring roll', 'momos',
      'cutlet', 'kebab', 'soup', 'salad', 'finger food', 'avocado', 'bruschetta',
      'nachos', 'wings', 'fries', 'wedges', 'pakoda', 'bajji', 'bonda',
      'vadai', 'vada', 'tikki', 'chaat', 'bhel', 'sev puri', 'kachori',
      'manchurian', 'gobi', '65', 'crispy', 'fried',
    ],
    priceRange: [20, 400],
  },
  'main-course': {
    keywords: [
      'curry', 'biryani', 'rice', 'pasta', 'main', 'special', 'chicken', 'fish',
      'mutton', 'goat', 'paneer', 'dal', 'sabzi', 'thali', 'burger', 'sandwich',
      'wrap', 'pizza', 'steak', 'roast', 'masala', 'korma', 'tikka masala',
      'butter chicken', 'kadai', 'handi', 'dum', 'pulao', 'khichdi', 'dosa',
      'idli', 'uttapam', 'uthappam', 'upma', 'pongal', 'noodles', 'chow mein',
      'fried rice', 'schezwan', 'manchow',
    ],
    priceRange: [100, 800],
  },
};

const VEG_KEYWORDS = ['veg', 'vegetarian', 'paneer', 'dal', 'sabzi', 'mushroom', 'tofu', 'beans', 'vegetables'];
const NONVEG_KEYWORDS = ['chicken', 'fish', 'mutton', 'goat', 'beef', 'shrimp', 'crab', 'meat', 'non-veg', 'nonveg'];

/**
 * Preprocess image with sharp for much better OCR accuracy.
 * Returns TWO variants so OCR can try both and pick the best.
 *   Variant A: grayscale + sharpen + high contrast (NO threshold — preserves text on colorful backgrounds)
 *   Variant B: same + moderate threshold 128 (great for simple dark-on-light menus)
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<Buffer[]>} - Array of preprocessed image buffers (PNG)
 */
async function preprocessImage(imageBuffer) {
  try {
    const sharp = require('sharp');
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1000;
    const height = metadata.height || 1000;

    // Tesseract works best at 300 DPI. Upscale small images, downscale huge ones.
    const longestSide = Math.max(width, height);
    let resizeWidth = null;
    if (longestSide < 1500) {
      resizeWidth = Math.round(width * (3000 / longestSide));
    } else if (longestSide > 5000) {
      resizeWidth = Math.round(width * (3000 / longestSide));
    }

    const makeBase = () => {
      let p = sharp(imageBuffer);
      if (resizeWidth) p = p.resize(resizeWidth, null, { fit: 'inside', withoutEnlargement: false });
      return p.grayscale().sharpen({ sigma: 1.5, m1: 1.0, m2: 0.5 }).normalize();
    };

    // Variant A: high contrast, NO hard threshold (best for colorful / gradient menus)
    const variantA = makeBase().linear(1.5, -(128 * 0.5)).png();
    // Variant B: moderate contrast + threshold (best for simple text-on-white menus)
    const variantB = makeBase().linear(1.3, -(128 * 0.3)).threshold(128).png();

    const [bufA, bufB] = await Promise.all([variantA.toBuffer(), variantB.toBuffer()]);
    console.log(`[MenuAnalyzer] Preprocessed: ${width}x${height} → ${resizeWidth || width}px, variantA=${Math.round(bufA.length / 1024)}KB, variantB=${Math.round(bufB.length / 1024)}KB`);
    return [bufA, bufB];
  } catch (err) {
    console.warn('[MenuAnalyzer] Sharp preprocessing failed, using raw image:', err.message);
    return [imageBuffer];
  }
}

/**
 * Extract text from image using Tesseract.js OCR with sharp preprocessing.
 * Runs 3 PSM modes in parallel on preprocessed image and picks the best result.
 * @param {string} imageData - Base64 encoded image data
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromImage(imageData) {
  try {
    console.log('[MenuAnalyzer] Starting Tesseract OCR...');
    const Tesseract = require('tesseract.js');

    // Decode base64 to a Buffer
    const base64Clean = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    const rawBuffer = Buffer.from(base64Clean, 'base64');

    // Preprocess image — returns [variantA, variantB] (or [raw] on failure)
    const variants = await preprocessImage(rawBuffer);

    const makeParams = (psm) => ({
      logger: () => {},
      tessedit_pageseg_mode: String(psm),
    });

    // Score: count lines matching "text followed by a 2-5 digit number" (menu-item pattern)
    const menuLineRe = /[A-Za-z]{2,}.+\d{2,5}/gm;
    const priceRe = /\d{2,5}(?:\.\d{1,2})?/g;
    const scoreText = (text) => {
      const menuLines = (text.match(menuLineRe) || []).length;
      const prices = (text.match(priceRe) || []).length;
      return menuLines * 3 + prices;
    };

    // Phase 1: quick scout — run PSM 6 on each variant to find the best image variant
    const scoutResults = await Promise.all(
      variants.map(buf => Tesseract.recognize(buf, 'eng', makeParams(6)))
    );
    const scoutScores = scoutResults.map((r, i) => ({
      idx: i,
      text: (r.data && r.data.text) || '',
      score: scoreText((r.data && r.data.text) || ''),
    }));
    scoutScores.sort((a, b) => b.score - a.score);
    const bestVariantIdx = scoutScores[0].idx;
    const bestBuf = variants[bestVariantIdx];
    console.log(`[MenuAnalyzer] Scout scores: ${scoutScores.map(s => `variant${s.idx}=${s.score}`).join(', ')} → using variant${bestVariantIdx}`);

    // Phase 2: run PSM 4, 6, 11 on the winning variant
    // (reuse the PSM 6 result from the scout phase)
    const psm6Text = scoutScores.find(s => s.idx === bestVariantIdx).text;
    const [res4, res11] = await Promise.all([
      Tesseract.recognize(bestBuf, 'eng', makeParams(4)),
      Tesseract.recognize(bestBuf, 'eng', makeParams(11)),
    ]);

    const results = [
      { text: (res4.data && res4.data.text) || '', label: 'PSM4' },
      { text: psm6Text, label: 'PSM6' },
      { text: (res11.data && res11.data.text) || '', label: 'PSM11' },
    ].map(r => ({ ...r, score: scoreText(r.text) })).sort((a, b) => b.score - a.score);

    console.log(`[MenuAnalyzer] OCR scores — ${results.map(r => `${r.label}:${r.score}`).join(', ')}`);

    // Take best; merge top two if close
    let extractedText;
    const best = results[0];
    const second = results[1];

    if (best.score > 0 && second.score > 0 && second.score >= best.score * 0.7) {
      const linesA = new Set(best.text.split('\n').map(l => l.trim()).filter(Boolean));
      second.text.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => linesA.add(l));
      extractedText = Array.from(linesA).join('\n');
      console.log(`[MenuAnalyzer] Merged ${best.label} + ${second.label} (${linesA.size} unique lines)`);
    } else {
      extractedText = best.text;
      console.log(`[MenuAnalyzer] Best result: ${best.label} (score ${best.score})`);
    }

    console.log('[MenuAnalyzer] OCR complete. Extracted text length:', extractedText.length);
    console.log('[MenuAnalyzer] Raw OCR text (first 800 chars):', extractedText.substring(0, 800));

    if (!extractedText || extractedText.trim().length < 10) {
      console.warn('[MenuAnalyzer] OCR returned insufficient text');
      return null;
    }

    return extractedText;
  } catch (error) {
    console.error('[MenuAnalyzer] Tesseract OCR failed:', error.message);
    return null;
  }
}

/**
 * Categorize menu item based on name and keywords
 * @param {string} name - Item name
 * @returns {string} - Category
 */
function categorizeItem(name) {
  const nameLower = name.toLowerCase();
  
  for (const [category, patterns] of Object.entries(MENU_PATTERNS)) {
    for (const keyword of patterns.keywords) {
      if (nameLower.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'main-course'; // Default category
}

/**
 * Determine if item is vegetarian based on name
 * @param {string} name - Item name
 * @returns {boolean} - True if vegetarian
 */
function isVegetarian(name) {
  const nameLower = name.toLowerCase();
  
  // Check for non-veg keywords first
  for (const keyword of NONVEG_KEYWORDS) {
    if (nameLower.includes(keyword)) {
      return false;
    }
  }
  
  // Check for veg keywords
  for (const keyword of VEG_KEYWORDS) {
    if (nameLower.includes(keyword)) {
      return true;
    }
  }
  
  // Default to veg if uncertain
  return true;
}

/**
 * Extract price from menu text
 * Looks for price patterns (numbers after item name)
 * @param {string} line - Menu line containing item name and/or price
 * @returns {number} - Extracted price or 0
 */
function extractPrice(line) {
  // Look for patterns like: 299, ₹299, Rs.299, $299
  const priceMatch = line.match(/(?:₹|Rs\.?|\$)?(\d+(?:\.\d{1,2})?)/);
  if (priceMatch) {
    return parseFloat(priceMatch[1]);
  }
  return 0;
}

/**
 * Split an OCR line that has multiple items merged side-by-side.
 * Tesseract often reads two menu columns as a single line, e.g.:
 *   "Sambar Idli (2 Nos) 60 Masal Vadai 20"
 * Strategy: every occurrence of "\d{2,5} Letter" mid-line is a split boundary.
 * @param {string} line
 * @returns {string[]}
 */
function splitCompoundOCRLine(line) {
  // Find positions where a 2-5 digit number is followed by whitespace then a letter
  // (indicates end of one item's price and start of next item's name)
  // BUT skip numbers that are inside parentheses (e.g., "(14 Pieces)" or "(2 Nos)")
  const splitPoints = [];
  let depth = 0; // parenthesis nesting depth
  let i = 0;

  while (i < line.length) {
    if (line[i] === '(') { depth++; i++; continue; }
    if (line[i] === ')') { depth = Math.max(0, depth - 1); i++; continue; }

    if (depth === 0) {
      // Check for a 2-5 digit number followed by whitespace then a letter
      const numMatch = line.slice(i).match(/^(\d{2,5})\s+(?=[A-Za-z])/);
      if (numMatch) {
        const endIdx = i + numMatch[0].length;
        // Only split if there is meaningful content remaining (not near end of line)
        if (endIdx < line.length - 2) {
          splitPoints.push(endIdx);
        }
        i += numMatch[1].length; // advance past the digits
        continue;
      }
    }
    i++;
  }

  const parts = [];
  let start = 0;
  for (const sp of splitPoints) {
    const part = line.slice(start, sp).trim();
    if (part.length >= 3) parts.push(part);
    start = sp;
  }
  const last = line.slice(start).trim();
  if (last.length >= 3) parts.push(last);
  return parts.length > 1 ? parts : [line];
}

/**
 * Clean OCR garbage from a parsed item name — both leading and trailing.
 * Examples:
 *   "pA 5 Mushroom Noodles" → "Mushroom Noodles"
 *   "N Schezuwan Chicken"   → "Schezuwan Chicken"
 *   "BY «INS —_——"          → "" (rejected by isValidDishName later)
 *   "Sambar Idli (2 Nos) s" → "Sambar Idli (2 Nos)"
 *   "Chicken Biryani ——"    → "Chicken Biryani"
 *   "   Dal Makhani  ...."  → "Dal Makhani"
 */
function cleanItemName(name) {
  let cleaned = name;

  // Step 1: Remove known OCR artifact characters
  cleaned = cleaned
    .replace(/[«»—_~`|}{[\]\\<>°©®™•·†‡§¶]/g, '')  // OCR special chars
    .replace(/[^\x20-\x7E()]/g, '')                    // non-printable / non-ASCII
    .replace(/\.{2,}/g, ' ')                           // dotted separators → space
    .replace(/[-–]{2,}/g, ' ')                          // multi-dash → space
    .replace(/[=:;]{2,}/g, ' ')                         // repeated punctuation → space
    .replace(/\s{2,}/g, ' ')                            // collapse whitespace
    .trim();

  // Step 2: Strip leading noise tokens (single/double chars, lone digits, symbols)
  // "pA 5 Mushroom Noodles" → "Mushroom Noodles"
  // "N Schezuwan Chicken"   → "Schezuwan Chicken"
  const tokens = cleaned.split(/\s+/);
  let startIdx = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const alpha = (t.match(/[a-zA-Z]/g) || []).length;
    const isParenGroup = /^\(.*\)$/.test(t);  // preserve "(2 Nos)" etc.
    if (isParenGroup) break;
    // A real word has 3+ alpha chars; anything shorter/noisier at the start is garbage
    if (alpha >= 3) break;
    startIdx = i + 1;
  }
  if (startIdx > 0 && startIdx < tokens.length) {
    cleaned = tokens.slice(startIdx).join(' ');
  }

  // Step 3: Strip trailing noise (1-3 char garbage, lone consonants, symbols)
  cleaned = cleaned
    .replace(/\s+[A-Za-z]{1,2}\s*$/, '')       // trailing 1-2 char token
    .replace(/\s+[bcdfghjklmnpqrstvwxyz]{1,3}\s*$/i, '')  // trailing consonant cluster
    .trim();

  // Step 4: Remove leading/trailing punctuation
  cleaned = cleaned
    .replace(/^[^a-zA-Z0-9(]+/, '')
    .replace(/[^a-zA-Z0-9)]+$/, '')
    .trim();

  // Step 5: Title-case normalization for ALL CAPS
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3 && /[A-Z]/.test(cleaned)) {
    cleaned = cleaned.replace(/\w\S*/g, w =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
  }

  return cleaned;
}

/**
 * Validate that a cleaned name actually looks like a dish name, not OCR garbage.
 * @param {string} name - Cleaned item name
 * @returns {boolean}
 */
function isValidDishName(name) {
  if (!name || name.length < 3) return false;

  // Must have reasonable alpha ratio (at least 60%)
  const alphaChars = (name.match(/[a-zA-Z]/g) || []).length;
  if (name.length > 0 && alphaChars / name.length < 0.5) return false;

  // Must contain at least one word with 3+ letters
  const words = name.split(/\s+/).filter(w => !/^\(.*\)$/.test(w)); // skip paren groups like (2 Nos)
  const realWords = words.filter(w => (w.match(/[a-zA-Z]/g) || []).length >= 3);
  if (realWords.length === 0) return false;

  // Total alpha chars across all words must be >= 4
  if (alphaChars < 4) return false;

  // Reject if all consonants (no vowels) — not a real word
  const vowels = (name.match(/[aeiouAEIOU]/g) || []).length;
  if (alphaChars > 4 && vowels === 0) return false;

  // Reject if too many digits relative to letters
  const digits = (name.match(/\d/g) || []).length;
  if (digits > alphaChars) return false;

  return true;
}

/**
 * Clean and parse menu text to extract items.
 * Handles multiple real-world formats:
 *   1. Multi-line: NAME on one line, optional description, price on its own line ($40 / ₹40 / 40)
 *   2. Single-line with dots/dashes: "Item Name ........... 299"
 *   3. Inline currency: "Item Name ₹299" or "Item Name - $40"
 *   4. Compound OCR lines: "Item A (qty) Price Item B (qty) Price" (split first)
 * @param {string} text - Raw menu text from OCR or paste
 * @returns {Array} - Array of menu items
 */
function parseMenuText(text) {
  const items = [];

  // Step 0: raw line split + OCR cleanup
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Step 0a: clean common OCR artifacts across all lines
  const cleanedLines = rawLines.map(l =>
    l.replace(/[«»|}{[\]\\~`]/g, '')        // remove OCR bracket/pipe/special noise
     .replace(/[^\x20-\x7E()₹$]/g, '')      // strip non-ASCII except currency/parens
     .replace(/\s{3,}/g, '  ')              // collapse excessive whitespace to double-space
     .replace(/^[\W\d]{1,4}\s+/, '')         // strip leading 1-4 char non-word prefix
     .replace(/^\W+/, '')                    // strip leading non-word chars
     .trim()
  ).filter(l => l.length > 1);

  // Step 0b: expand compound OCR lines (two items merged on one line by Tesseract)
  const lines = [];
  for (const raw of cleanedLines) {
    lines.push(...splitCompoundOCRLine(raw));
  }

  const SECTION_HEADERS = new Set([
    'MENU', 'STARTERS', 'APPETIZERS', 'MAIN', 'MAIN COURSE', 'DRINKS',
    'DESSERTS', 'BREADS', 'RICE', 'SIDES', 'SPECIALS', 'BEVERAGES',
    'SOUPS', 'SALADS', 'SNACKS', 'COMBOS', 'HEALTHY FOOD MENU',
    'NON VEG', 'VEG', 'VEGETARIAN', 'NON VEGETARIAN', 'BREAKFAST',
    'LUNCH', 'DINNER', 'FOOD MENU', 'OUR MENU', 'TODAY SPECIAL',
  ]);

  // Regex: standalone price line  e.g. "$40"  "₹299"  "Rs.299"  "299"  "299/-"
  const standalonePriceRe = /^(?:₹|Rs\.?|\$|USD\s?)?\s*(\d+(?:\.\d{1,2})?)\s*(?:\/\-|only)?$/i;

  // ── Strategy 1: find standalone price lines, look back for the item name ──
  const priceLineIndices = [];
  lines.forEach((line, idx) => {
    const m = line.match(standalonePriceRe);
    if (m) priceLineIndices.push({ idx, price: parseFloat(m[1]) });
  });

  if (priceLineIndices.length > 0) {
    for (const { idx, price } of priceLineIndices) {
      if (price <= 0 || price > 100000) continue;

      // Scan backwards up to 10 lines — collect best candidate name
      // Scoring: ALL-CAPS > Title Case, prefer shorter, skip description lines
      let bestName = null;
      let bestScore = -1;

      for (let j = idx - 1; j >= Math.max(0, idx - 10); j--) {
        const candidate = lines[j];
        if (candidate.match(standalonePriceRe)) break; // hit another price — stop
        const upper = candidate.toUpperCase();
        if (SECTION_HEADERS.has(upper)) continue;
        if (candidate.length < 3) continue;

        // Skip description/sentence lines:
        if (/^[a-z]/.test(candidate)) continue;          // starts with lowercase
        if (candidate.length > 60) continue;              // paragraph-length
        if (candidate.includes(',') && candidate.length > 25) continue; // comma-laden sentence

        // Score: ALL CAPS dishes score highest, shorter is better
        const isAllCaps = candidate === candidate.toUpperCase() && /[A-Z]/.test(candidate);
        const score = (isAllCaps ? 100 : 0) + Math.max(0, 60 - candidate.length);

        if (score > bestScore) {
          bestScore = score;
          bestName = candidate.replace(/[:.]+$/, '').trim();
        }
      }

      if (bestName && bestName.length >= 3) {
        const cleaned = cleanItemName(bestName);
        if (isValidDishName(cleaned)) {
          const category = categorizeItem(cleaned);
          items.push({
            name: cleaned,
            price,
            category,
            description: `${category.replace(/-/g, ' ')} item`,
            isVeg: isVegetarian(cleaned),
            prepTime: category === 'drinks' ? 5 : category === 'starters' ? 10 : 20,
          });
        }
      }
    }
    if (items.length > 0) return items;
  }

  // ── Strategy 2: inline price on the same line ──
  // Patterns:  "Name .... 299"  |  "Name - ₹299"  |  "Name $40"  |  "Name    299"
  // The LAST pattern is the broadest — handles OCR items with qty info like "(2 Nos)"
  const inlinePatterns = [
    /^(.+?)\s*[-–—.]{2,}\s*(?:₹|Rs\.?|\$)?\s*(\d+(?:\.\d{1,2})?)/, // dotted/dashed
    /^(.+?)\s+(?:₹|Rs\.?|\$)\s*(\d+(?:\.\d{1,2})?)$/,              // inline currency symbol
    /^(.+?)\s{2,}(\d{2,5}(?:\.\d{1,2})?)\s*$/,                     // multiple spaces before price
    /^(.+?)\s+(\d{2,5})\s*(?:\/\-|only)\s*$/i,                     // "Name 299/-"
    /^([A-Za-z][A-Za-z\s&'\-]{2,})\s+(\d{2,5}(?:\.\d{1,2})?)\s*$/, // "Name 280" (single space, letters only)
    // Broad OCR pattern: name may contain parens, qty digits, commas (e.g. "Idli (2 Nos) 35")
    /^([A-Za-z][A-Za-z\s&'()\-\.,=0-9]{2,50})\s+(\d{2,5}(?:\.\d{1,2})?)\s*$/,
  ];

  for (const line of lines) {
    if (SECTION_HEADERS.has(line.toUpperCase())) continue;
    for (const re of inlinePatterns) {
      const m = line.match(re);
      if (m) {
        // Clean trailing OCR noise from name (e.g. trailing "s", "Bp", "=")
        const rawName = m[1].trim().replace(/[:.=]+$/, '');
        const name = cleanItemName(rawName);
        const price = parseFloat(m[2]);
        if (isValidDishName(name) && price > 0 && price < 100000) {
          const category = categorizeItem(name);
          items.push({
            name,
            price,
            category,
            description: `${category.replace(/-/g, ' ')} item`,
            isVeg: isVegetarian(name),
            prepTime: category === 'drinks' ? 5 : category === 'starters' ? 10 : 20,
          });
          break; // don't double-match the same line
        }
      }
    }
  }

  // ── Strategy 3 (relaxed): LAST RESORT — only runs when strategies 1 & 2 found nothing ──
  // Extracts food-looking lines even with garbled/missing prices → price=0, user fills in.
  if (items.length > 0) return items;
  const SECTION_EXCLUDE = new Set([
    'MENU', 'FOOD MENU', 'STARTER', 'STARTERS', 'MAIN COURSE', 'MAIN',
    'DRINKS', 'DESSERTS', 'SIDES', 'BEVERAGES', 'SPECIALS', 'SOUPS',
    'SALADS', 'SNACKS', 'RICE', 'BREADS', 'COMBO', 'COMBOS',
    'FOOD NAME', 'ITEM NAME', 'PRICE',
  ]);

  const foodHints = /biryani|rice|curry|paneer|chicken|mutton|fish|naan|roti|salad|soup|dal|tikka|kebab|masala|burger|pasta|pizza|cake|shake|lassi|coffee|tea|juice|dessert|sweet|special|thali/i;

  const relaxedItems = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 3 || trimmed.length > 60) continue;
    if (SECTION_EXCLUDE.has(trimmed.toUpperCase())) continue;
    // Must look like a dish name: ALL CAPS or Title Case, possibly containing food keywords
    const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]{2,}/.test(trimmed);
    const isTitleCase = /^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(trimmed);
    const hasFoodWord = foodHints.test(trimmed);
    if ((isAllCaps || isTitleCase || hasFoodWord) && !/^\d/.test(trimmed)) {
      // Clean up garbled suffix (e.g. "MUTTON BIRYANI sa" → "MUTTON BIRYANI")
      const cleaned = cleanItemName(trimmed);
      if (isValidDishName(cleaned)) {
        const category = categorizeItem(cleaned);
        relaxedItems.push({
          name: cleaned,
          price: 0,        // user must fill in
          category,
          description: '',
          isVeg: isVegetarian(cleaned),
          prepTime: category === 'drinks' ? 5 : category === 'starters' ? 10 : 20,
        });
      }
    }
  }

  // Deduplicate by name
  const seen = new Set();
  for (const item of relaxedItems) {
    if (!seen.has(item.name.toUpperCase())) {
      seen.add(item.name.toUpperCase());
      items.push(item);
    }
  }

  return deduplicateItems(items);
}

/**
 * Deduplicate extracted items by normalized name.
 * Keeps the entry with the best price (non-zero preferred).
 */
function deduplicateItems(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.name.toUpperCase().replace(/\s+/g, ' ').trim();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else if (existing.price === 0 && item.price > 0) {
      map.set(key, item); // prefer the one with a price
    }
  }
  return Array.from(map.values());
}

/**
 * Analyze menu image and extract menu items
 * @param {string} imageData - Base64 encoded image data
 * @returns {Promise<Array>} - Array of extracted menu items
 */
async function analyzeMenuImage(imageData) {
  try {
    console.log('[MenuAnalyzer] analyzeMenuImage called, image data length:', imageData ? imageData.length : 0);

    if (!imageData) {
      console.error('[MenuAnalyzer] No image data provided');
      return getDefaultMenuItems();
    }

    // Extract text from image using Tesseract OCR
    const text = await extractTextFromImage(imageData);

    if (!text) {
      console.warn('[MenuAnalyzer] OCR returned no text, returning default items');
      return getDefaultMenuItems();
    }

    console.log('[MenuAnalyzer] Parsing extracted text...');
    // Parse the text to extract menu items
    const items = parseMenuText(text);
    console.log('[MenuAnalyzer] Parsed', items.length, 'raw items');

    // Validate items — keep price=0 items so users can fill in missing prices
    const validatedItems = items.filter(item => item.name && item.name.length >= 2).map(item => ({
      name: String(item.name).trim(),
      price: Math.round(parseFloat(item.price || 0) * 100) / 100,
      category: String(item.category).toLowerCase(),
      description: String(item.description).trim(),
      isVeg: Boolean(item.isVeg),
      prepTime: Math.max(5, Math.min(45, parseInt(item.prepTime) || 15)),
    }));

    console.log('[MenuAnalyzer] Validated', validatedItems.length, 'items after filtering');

    return validatedItems.length > 0
      ? validatedItems
      : getDefaultMenuItems();

  } catch (error) {
    console.error('[MenuAnalyzer] analyzeMenuImage error:', error);
    return getDefaultMenuItems();
  }
}

/**
 * Return empty array if analysis fails — let the UI show a proper error
 * instead of misleading fake/hardcoded items.
 * @returns {Array}
 */
function getDefaultMenuItems() {
  return [];
}

/**
 * Analyze plain text (pasted menu text or extracted from PDF)
 * @param {string} text - Raw menu text
 * @returns {Array} - Array of extracted menu items
 */
function analyzeMenuText(text) {
  if (!text || text.trim().length < 5) return getDefaultMenuItems();
  const items = parseMenuText(text);
  const validated = items.filter(i => i.name && i.name.length >= 2).map(item => ({
    name: String(item.name).trim(),
    price: Math.round(parseFloat(item.price) * 100) / 100,
    category: String(item.category).toLowerCase(),
    description: String(item.description).trim(),
    isVeg: Boolean(item.isVeg),
    prepTime: Math.max(5, Math.min(45, parseInt(item.prepTime) || 15)),
  }));
  return validated.length > 0 ? validated : getDefaultMenuItems();
}

module.exports = {
  analyzeMenuImage,
  analyzeMenuText,
  extractTextFromImage,
  parseMenuText,
  categorizeItem,
  isVegetarian,
  extractPrice,
  getDefaultMenuItems,
};
