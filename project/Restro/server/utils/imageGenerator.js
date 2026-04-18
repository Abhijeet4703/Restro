/**
 * Dish Image Generator
 * =====================
 * 4-tier image lookup — each tier runs only if the previous fails:
 *
 *  Tier 1 — Pollinations.ai (AI-generated food photography)
 *    Free, no key. Generates a photorealistic image of the EXACT dish using
 *    a fine-tuned food photography prompt. Best accuracy for Indian cuisine
 *    because it actually "knows" what each dish looks like.
 *
 *  Tier 2 — Wikipedia Pageimages API
 *    Free, no key. Returns the real food photo from the Wikipedia article.
 *    Good for well-known dishes with dedicated Wikipedia pages.
 *
 *  Tier 3 — TheMealDB
 *    Free, no key. Works well for globally common dishes.
 *
 *  Tier 4 — Unsplash CDN (curated pool)
 *    Always succeeds. Deterministic keyword-matched photo from a verified pool.
 */

'use strict';
const https = require('https');
const http = require('http');

// ─── Utility: deterministic hash ─────────────────────────────
function nameHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// ─── Utility: clean dish name for searching ───────────────────
// "Curd Vadai (1 Pcs)" → "Curd Vadai"
// "Idli (2 Nos) - Ghee" → "Idli"
// "BREAKFAST Veg Biriyani" → "Veg Biriyani"
function cleanDishName(raw) {
  return raw
    .replace(/\([^)]*\)/g, '')                          // remove parenthesised text
    .replace(/\b(BREAKFAST|LUNCH|DINNER|VEG|NON\s*VEG)\b/gi, '') // remove meal-type prefixes
    .replace(/\d+\s*(nos|pcs|pc|gm|grms?|ml|kg|g|l)\b/gi, '')   // remove quantity units
    .replace(/[-–—_]+\s*$/, '')                          // trailing dashes
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════════════════════════
// TIER 1 — WIKIPEDIA PAGEIMAGES
// ═══════════════════════════════════════════════════════════════

/**
 * Prebuilt aliases for dishes that need disambiguation on Wikipedia,
 * or where a different article title gives a better/any image.
 *
 * Key   → lowercase keyword that appears anywhere in the dish name
 * Value → exact Wikipedia article title to query
 *
 * Ordering matters: more-specific multi-word keys come first.
 */
const WIKI_ALIASES = [
  // ── Multi-word keys first (more specific) ──────────────────
  ['paneer butter masala', 'Butter paneer'],
  ['butter paneer',        'Butter paneer'],
  ['matar paneer',         'Matar paneer'],
  ['palak paneer',         'Saag paneer'],
  ['saag paneer',          'Saag paneer'],
  ['paneer tikka masala',  'Paneer tikka masala'],
  ['chicken tikka masala', 'Chicken tikka masala'],
  ['butter chicken',       'Butter chicken'],
  ['chicken tikka',        'Chicken tikka'],
  ['gulab jamun',          'Gulab jamun'],
  ['fried rice',           'Fried rice'],
  ['masala chai',          'Masala chai'],
  ['filter coffee',        'Indian filter coffee'],
  ['ghee podi',            'Podi (spice mix)'],
  ['podi idli',            'Idli'],
  ['veg biryani',          'Biryani'],
  ['chicken biryani',      'Biryani'],
  ['lamb biryani',         'Biryani'],
  ['mutton biryani',       'Biryani'],
  ['egg biryani',          'Biryani'],
  ['paper roast',          'Dosai'],
  ['ghee roast',           'Dosai'],
  ['plain dosa',           'Dosai'],
  ['masala dosa',          'Masala dosa'],
  ['curd vadai',           'Vada (food)'],
  ['sambar vadai',         'Vada (food)'],
  ['medu vada',            'Vada (food)'],
  ['rava idli',            'Rava idli'],
  ['mini idli',            'Idli'],
  ['ghee podi idli',       'Idli'],
  ['podi uthappam',        'Uttapam'],
  ['wheat poratta',        'Parotta'],
  ['wheat porota',         'Parotta'],
  ['today chef special',   'Chef\'s table'],

  // ── Single-word keys ───────────────────────────────────────
  ['idiyappam',  'Idiyappam'],
  ['iddiyappam', 'Idiyappam'],
  ['idiyappa',   'Idiyappam'],
  ['uthappam',   'Uttapam'],
  ['uttapam',    'Uttapam'],
  ['uppuma',     'Upma'],
  ['upma',       'Upma'],
  ['upuma',      'Upma'],
  ['pongal',     'Pongal (dish)'],
  ['sambar',     'Sambar (dish)'],
  ['rasam',      'Rasam (dish)'],
  ['vadai',      'Vada (food)'],
  ['vada',       'Vada (food)'],
  ['dosa',       'Dosai'],
  ['dosai',      'Dosai'],
  ['idli',       'Idli'],
  ['idly',       'Idli'],
  ['appam',      'Appam'],
  ['biryani',    'Biryani'],
  ['biriyani',   'Biryani'],
  ['pulao',      'Pilaf'],
  ['pilaf',      'Pilaf'],
  ['paneer',     'Paneer'],
  ['tikka',      'Chicken tikka'],
  ['korma',      'Korma'],
  ['rogan',      'Rogan josh'],
  ['dal',        'Dal fry'],
  ['dhal',       'Dal fry'],
  ['lentil',     'Dal fry'],
  ['halwa',      'Halva'],
  ['halva',      'Halva'],
  ['kheer',      'Kheer'],
  ['payasam',    'Kheer'],
  ['payasam',    'Kheer'],
  ['kesari',     'Sooji halwa'],
  ['ladoo',      'Laddoo'],
  ['laddoo',     'Laddoo'],
  ['barfi',      'Barfi (confectionery)'],
  ['pakora',     'Pakora'],
  ['pakoda',     'Pakora'],
  ['bhaji',      'Pakora'],
  ['bajji',      'Pakora'],
  ['bonda',      'Batata vada'],
  ['samosa',     'Samosa'],
  ['kachori',    'Kachori'],
  ['chapati',    'Chapati'],
  ['chapathi',   'Chapati'],
  ['chappati',   'Chapati'],
  ['chappathi',  'Chapati'],
  ['roti',       'Chapati'],
  ['paratha',    'Paratha'],
  ['parotta',    'Parotta'],
  ['porotta',    'Parotta'],
  ['poratta',    'Parotta'],
  ['naan',       'Naan'],
  ['kulcha',     'Kulcha'],
  ['poori',      'Puri (food)'],
  ['puri',       'Puri (food)'],
  ['bhatura',    'Bhatura'],
  ['lassi',      'Lassi'],
  ['chai',       'Masala chai'],
  ['coffee',     'Indian filter coffee'],
  ['chutney',    'Chutney'],
  ['raita',      'Raita'],
  ['pickle',     'Indian pickle'],
  ['curry',      'Curry'],
  ['biryani',    'Biryani'],
  ['chicken',    'Chicken curry'],
  ['mutton',     'Mutton curry'],
  ['fish',       'Fish curry'],
  ['prawns',     'Prawn curry'],
  ['shrimp',     'Prawn curry'],
  ['kichadi',    'Khichdi'],
  ['kitchdi',    'Khichdi'],
  ['khichdi',    'Khichdi'],
  ['sundal',     'Sundal'],
  // ── Additional common items ────────────────────────────────
  ['manchurian', 'Manchurian (dish)'],
  ['gobi',       'Gobi Manchurian'],
  ['schezwan',   'Szechuan pepper'],
  ['chow mein',  'Chow mein'],
  ['noodles',    'Noodle'],
  ['fried rice', 'Fried rice'],
  ['momos',      'Momo (food)'],
  ['spring roll','Spring roll'],
  ['tandoori',   'Tandoori chicken'],
  ['seekh',      'Seekh kebab'],
  ['malai',      'Malai kofta'],
  ['kofta',      'Kofta'],
  ['aloo',       'Aloo gobi'],
  ['rajma',      'Rajma'],
  ['chole',      'Chana masala'],
  ['chana',      'Chana masala'],
  ['kadai',      'Kadai paneer'],
  ['jalfrezi',   'Jalfrezi'],
  ['vindaloo',   'Vindaloo'],
  ['saag',       'Saag'],
  ['palak',      'Palak paneer'],
  ['bhindi',     'Bhindi masala'],
  ['rasgulla',   'Rasgulla'],
  ['rasmalai',   'Ras malai'],
  ['jalebi',     'Jalebi'],
  ['kulfi',      'Kulfi'],
  ['peda',       'Peda'],
  ['mysore pak', 'Mysore pak'],
  ['burger',     'Hamburger'],
  ['pizza',      'Pizza'],
  ['pasta',      'Pasta'],
  ['sandwich',   'Sandwich'],
  ['wrap',       'Wrap (food)'],
  ['thali',      'Thali'],
];

/**
 * Query Wikipedia's pageimages API for a specific article title.
 * Returns the thumbnail URL or null. Retries once on 429 with a 2s delay.
 */
async function queryWikipedia(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=600&redirects=1`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await fetchJson(url, 8000);
      const pages = Object.values(data.query?.pages || {});
      const thumb = pages[0]?.thumbnail?.source;
      if (thumb && !thumb.includes('.svg')) return thumb; // skip SVGs (icons/flags)
      return null;
    } catch (err) {
      if (err.message.includes('429') && attempt === 0) {
        await new Promise(r => setTimeout(r, 2000)); // back off 2s on rate limit
        continue;
      }
      throw err;
    }
  }
  return null;
}

/**
 * Tier 1: Fetch a dish-specific image from Wikipedia.
 * Strategy:
 *   1. Check WIKI_ALIASES for an exact article title
 *   2. Try the cleaned dish name directly
 *   3. Try first two words of the dish name
 *   4. Try first word of the dish name
 */
async function searchWikipedia(dishName) {
  const nameLower = dishName.toLowerCase();
  const clean = cleanDishName(dishName);

  // Step 1: alias table (most-specific match wins)
  for (const [keyword, articleTitle] of WIKI_ALIASES) {
    if (nameLower.includes(keyword)) {
      const img = await queryWikipedia(articleTitle);
      if (img) {
        console.log(`[ImageGen] Wikipedia alias "${keyword}" → "${articleTitle}" for "${dishName}"`);
        return img;
      }
    }
  }

  // Step 2–4: progressive name shortening
  const words = clean.split(/\s+/).filter(w => w.length >= 3);
  const attempts = [clean, words.slice(0, 2).join(' '), words[0]]
    .filter(Boolean)
    .filter((t, i, a) => a.indexOf(t) === i && t.length >= 3);

  for (const term of attempts) {
    const img = await queryWikipedia(term);
    if (img) {
      console.log(`[ImageGen] Wikipedia direct search "${term}" for "${dishName}"`);
      return img;
    }
    await new Promise(r => setTimeout(r, 300)); // small gap between attempts
    // Also try with "(dish)" disambiguator
    const img2 = await queryWikipedia(`${term} (dish)`);
    if (img2) {
      console.log(`[ImageGen] Wikipedia "${term} (dish)" for "${dishName}"`);
      return img2;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// TIER 2 — THEMEALDB
// ═══════════════════════════════════════════════════════════════

const MEALDB_INGREDIENTS = {
  paneer: 'paneer', chicken: 'chicken', lamb: 'lamb', mutton: 'lamb',
  fish: 'salmon', prawn: 'prawns', shrimp: 'prawns',
  egg: 'egg', mushroom: 'mushrooms', spinach: 'spinach',
  lentil: 'lentils', dal: 'lentils', dhal: 'lentils',
};

async function searchMealDB(dishName) {
  const clean = cleanDishName(dishName);
  const words = clean.split(/\s+/).filter(w => w.length >= 3);
  // Only use the full cleaned name and first-two-words — avoid single generic words
  // like "Butter" that match completely unrelated dishes (e.g. "Canadian Butter Tarts")
  const terms = [clean, words.slice(0, 2).join(' ')]
    .filter(Boolean)
    .filter((t, i, a) => a.indexOf(t) === i && t.length >= 3);

  // Name search — validate that the returned meal name shares at least one word with our dish
  const dishWords = new Set(clean.toLowerCase().split(/\s+/).filter(w => w.length >= 3));
  for (const term of terms) {
    try {
      const data = await fetchJson(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`, 7000
      );
      if (data.meals) {
        // Find a meal that actually shares a keyword with our dish
        const match = data.meals.find(m => {
          const mealWords = m.strMeal.toLowerCase().split(/\s+/);
          return mealWords.some(w => dishWords.has(w) && w.length >= 3);
        }) || data.meals[0]; // fallback to first result if nothing matches better
        if (match?.strMealThumb) {
          const mealWords = match.strMeal.toLowerCase().split(/\s+/);
          const hasOverlap = mealWords.some(w => dishWords.has(w) && w.length >= 3);
          if (hasOverlap) {
            console.log(`[ImageGen] TheMealDB "${term}" → ${match.strMeal}`);
            return match.strMealThumb;
          }
          // No overlap → skip this result (e.g., "Butter" → "Canadian Butter Tarts" for "Butter Naan")
          console.log(`[ImageGen] TheMealDB "${term}" → "${match.strMeal}" — skipped (no keyword overlap with "${dishName}")`);
        }
      }
    } catch { /* continue */ }
  }

  // Ingredient filter
  const nameLower = clean.toLowerCase();
  for (const [kw, ingredient] of Object.entries(MEALDB_INGREDIENTS)) {
    if (nameLower.includes(kw)) {
      try {
        const data = await fetchJson(
          `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`, 7000
        );
        if (data.meals?.length > 0) {
          const meal = data.meals[nameHash(dishName) % data.meals.length];
          console.log(`[ImageGen] TheMealDB ingredient[${ingredient}] → ${meal.strMeal}`);
          return meal.strMealThumb;
        }
      } catch { /* continue */ }
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// TIER 3 — POLLINATIONS.AI (AI-generated food photography)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a photorealistic AI image of a dish using Pollinations.ai.
 * Free, no API key required. Returns base64 data URL or null on failure.
 *
 * Uses a highly-specific food photography prompt that names the exact dish,
 * its cuisine style, plating, and photographic technique — this produces
 * dramatically better results than generic "food photo" prompts.
 */
async function generateWithPollinations(dishName, category, isVeg) {
  const clean = cleanDishName(dishName);
  const vegLabel = isVeg ? 'vegetarian' : 'non-vegetarian with meat/seafood visible';
  const categoryLabel = (category || 'main-course').replace(/-/g, ' ');

  // Map category to plating/vessel style for realism
  const platingMap = {
    'starters': 'served on a white ceramic plate as an appetizer portion',
    'main-course': 'served in a traditional Indian brass bowl or ceramic plate, generous portion',
    'desserts': 'served in a small decorative bowl or plate, garnished beautifully',
    'drinks': 'served in a tall glass or traditional Indian tumbler, condensation visible',
    'sides': 'served in a small steel katori or ceramic bowl as a side dish',
  };
  const plating = platingMap[category] || platingMap['main-course'];

  // Build a very specific prompt — dish name is repeated for emphasis
  const prompt = [
    `A stunning overhead food photograph of ${clean}.`,
    `This is authentic Indian ${categoryLabel} cuisine, ${vegLabel}.`,
    `The ${clean} is ${plating}.`,
    `Shot from 45-degree angle on a dark wooden table with warm directional lighting.`,
    `Professional restaurant food photography, shallow depth of field, vibrant natural colors.`,
    `The food looks freshly prepared, steaming hot, garnished with fresh herbs and spices.`,
    `Ultra realistic, 4K quality, food magazine editorial style.`,
  ].join(' ');

  const seed = nameHash(dishName);
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&model=flux&nologo=true&seed=${seed}`;

  try {
    console.log(`[ImageGen] Pollinations.ai generating for "${clean}"...`);

    // Retry up to 3 times with exponential backoff (Pollinations rate-limits aggressively)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const base64 = await downloadImageAsBase64(url, 45000);
        if (base64 && base64.length > 10000) {
          console.log(`[ImageGen] ✓ Pollinations.ai image for "${dishName}" (${Math.round(base64.length / 1024)}KB) [attempt ${attempt + 1}]`);
          return base64;
        }
        console.warn(`[ImageGen] Pollinations.ai returned tiny image for "${dishName}" (${base64 ? base64.length : 0} bytes)`);
        return null;
      } catch (err) {
        if ((err.message.includes('429') || err.message.includes('timed out')) && attempt < 2) {
          const delay = (attempt + 1) * 3000; // 3s, 6s backoff
          console.log(`[ImageGen] Pollinations.ai ${err.message.includes('429') ? 'rate-limited' : 'timed out'} for "${dishName}", retrying in ${delay / 1000}s...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    return null;
  } catch (err) {
    console.warn(`[ImageGen] Pollinations.ai failed for "${dishName}": ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// TIER 4 — UNSPLASH CDN (curated keyword pool, always works)
// ═══════════════════════════════════════════════════════════════

const FOOD_PHOTOS = {
  starters: [
    'photo-1601050690597-df0568f70950',  // samosas/fried snacks
    'photo-1576402187878-974f70c890a5',  // South Indian breakfast plate
    'photo-1511690656952-34342bb7c2f2',  // bruschetta/toast snack
    'photo-1544025162-d76538b2a681',      // spring rolls / fried rolls
    'photo-1613514785940-daed07799d9b',  // pakoras / fritters
    'photo-1593253553b898-79022fc87321', // fried bites
    'photo-1512058564366-18510be2db19',  // fried appetiser plate
  ],
  'main-course': [
    'photo-1603894584373-5ac82b2ae398',  // rice dish
    'photo-1563379091339-03b21ab4a4f8',  // biryani
    'photo-1585937421612-70a008356fbe',  // curry / gravy
    'photo-1574484284002-952d92456975',  // noodles / pasta
    'photo-1455619452474-d2be8b1e70cd',  // curry bowl with rice
    'photo-1547592166-23ac45744acd',      // soup / lentil
    'photo-1504674900247-0877df9cc836',  // mixed platter
    'photo-1565557623262-b51c2513a641',  // Indian thali
    'photo-1600891964092-4316c288032e',  // chef plated main course
  ],
  desserts: [
    'photo-1567206563064-6f60f40a2b57',  // Indian sweets / gulab jamun
    'photo-1551024709-8f23befc548e',      // assorted sweets plate
    'photo-1605197788044-76e09a96c9ae',  // ice cream
    'photo-1488477181228-c259e0694c97',  // cake slice
    'photo-1578985545062-69928b1d9587',  // layered dessert
  ],
  drinks: [
    'photo-1544145945-f90425340c7e',      // cocktail / juice glass
    'photo-1587049352846-4a222e784d38',  // masala chai / spiced tea
    'photo-1534353436294-0dbd4bdac845',  // lassi / milkshake
    'photo-1625865083418-4da40e37e55b',  // fresh juice
    'photo-1498429089284-41f8cf3ffd39',  // beverages assortment
  ],
  sides: [
    'photo-1546456073-ea246a7bd25f',      // raita / yoghurt side
    'photo-1598103442097-8b74394b95c2',  // chutney
    'photo-1618160702438-9b02ab6515c9',  // pickle / condiment
    'photo-1540189549336-e6e99c3679fe',  // salad
  ],
  specials: [
    'photo-1565299624946-b28f40a0ae38',  // gourmet plating
    'photo-1600891964092-4316c288032e',  // chef special
    'photo-1559847844-5315695dadae',      // fine dining plate
    'photo-1414235077428-338989a2e8c0',  // restaurant plating
    'photo-1476224203421-9ac39bcb3327',  // premium dish
  ],
};

/**
 * Compound keyword → photo pool.
 * Checked BEFORE single-keyword scan so dish variants (e.g. "Masala Dosa" vs
 * "Plain Dosa") get distinct images instead of all collapsing to the same
 * generic "dosa" photo pool.
 *
 * Format: [string[], string[]]  →  [keywordsAny, photoIds]
 * ANY keyword in the first array matching the dish name triggers this entry.
 * Ordered most-specific → least-specific (first match wins).
 */
const COMPOUND_KEYWORD_PHOTOS = [
  // ── Dosa variants ──────────────────────────────────────────────────────
  [['masala dosa', 'masala dosai'],
   ['photo-1585937421612-70a008356fbe', 'photo-1511690656952-34342bb7c2f2']],
  [['paper dosa', 'paper roast', 'paper dosai'],
   ['photo-1511690656952-34342bb7c2f2', 'photo-1565557623262-b51c2513a641']],
  [['ghee roast', 'ghee dosa', 'ghee dosai'],
   ['photo-1600891964092-4316c288032e', 'photo-1511690656952-34342bb7c2f2']],
  [['rava dosa', 'rava dosai'],
   ['photo-1565557623262-b51c2513a641', 'photo-1512058564366-18510be2db19']],
  [['set dosa'],
   ['photo-1576402187878-974f70c890a5', 'photo-1512058564366-18510be2db19']],
  [['plain dosa', 'sada dosa', 'plain dosai'],
   ['photo-1576402187878-974f70c890a5', 'photo-1512058564366-18510be2db19']],   // S2, S7 — distinct from ghee podi idli

  // ── Idli variants ──────────────────────────────────────────────────────
  [['podi idli', 'ghee podi idli', 'ghee podi'],
   ['photo-1600891964092-4316c288032e', 'photo-1576402187878-974f70c890a5', 'photo-1574484284002-952d92456975']],
  [['mini idli', 'mini idly', 'button idli'],
   ['photo-1547592166-23ac45744acd', 'photo-1565299624946-b28f40a0ae38', 'photo-1585937421612-70a008356fbe']],
  [['rava idli', 'rava idly'],
   ['photo-1565557623262-b51c2513a641', 'photo-1547592166-23ac45744acd']],
  [['sambar idli', 'sambar idly'],
   ['photo-1547592166-23ac45744acd', 'photo-1576402187878-974f70c890a5', 'photo-1559847844-5315695dadae']],

  // ── Vadai / Vada variants ───────────────────────────────────────────────
  [['curd vadai', 'curd vada', 'thayir vadai', 'dahi vada'],
   ['photo-1546456073-ea246a7bd25f', 'photo-1598103442097-8b74394b95c2']],   // raita+chutney pool — distinct
  [['sambar vadai', 'sambar vada'],
   ['photo-1455619452474-d2be8b1e70cd', 'photo-1547592166-23ac45744acd', 'photo-1585937421612-70a008356fbe']],   // curry bowl — distinct from curd vadai
  [['masala vadai', 'masala vada', 'paruppu vadai', 'masai vadai', 'masai vada'],
   ['photo-1613514785940-daed07799d9b', 'photo-1593253553b898-79022fc87321']],
  [['eerai vadai', 'erai vadai', 'keerai vadai'],
   ['photo-1593253553b898-79022fc87321', 'photo-1613514785940-daed07799d9b', 'photo-1601050690597-df0568f70950']],
  [['medu vada', 'medu vadai', 'ulundu vadai'],
   ['photo-1601050690597-df0568f70950', 'photo-1544025162-d76538b2a681']],

  // ── Uthappam variants ──────────────────────────────────────────────────
  [['onion uthappam', 'onion uttapam', 'vengaya uthappam'],
   ['photo-1565557623262-b51c2513a641', 'photo-1512058564366-18510be2db19']],
  [['podi uthappam', 'podi uttapam'],
   ['photo-1511690656952-34342bb7c2f2', 'photo-1565557623262-b51c2513a641']],

  // ── Pongal variants ────────────────────────────────────────────────────
  [['millet pongal', 'miliat pongal', 'miliet pongal', 'ragi pongal', 'multi grain pongal'],
   ['photo-1547592166-23ac45744acd', 'photo-1603894584373-5ac82b2ae398', 'photo-1414235077428-338989a2e8c0']],   // lentil/porridge pool — index 2 selected by hash
  [['ven pongal', 'khara pongal', 'savoury pongal'],
   ['photo-1547592166-23ac45744acd', 'photo-1603894584373-5ac82b2ae398']],

  // ── Biryani / Rice variants ────────────────────────────────────────────
  [['breakfast veg biryani', 'breakfast biriyani'],
   ['photo-1585937421612-70a008356fbe', 'photo-1504674900247-0877df9cc836', 'photo-1563379091339-03b21ab4a4f8']],
  [['veg biryani', 'veg biriyani', 'vegetable biryani', 'vegetable biriyani'],
   ['photo-1603894584373-5ac82b2ae398', 'photo-1563379091339-03b21ab4a4f8']],
  [['chicken biryani', 'chicken biriyani'],
   ['photo-1563379091339-03b21ab4a4f8', 'photo-1504674900247-0877df9cc836']],
  [['mutton biryani', 'mutton biriyani', 'lamb biryani'],
   ['photo-1563379091339-03b21ab4a4f8', 'photo-1585937421612-70a008356fbe']],

  // ── Poratta / Parotta variants ─────────────────────────────────────────
  [['wheat poratta', 'wheat porota', 'wheat parotta', 'wheat poratha'],
   ['photo-1504674900247-0877df9cc836', 'photo-1511690656952-34342bb7c2f2']],

  // ── Coffee / Tea ───────────────────────────────────────────────────────
  [['filter coffee', 'south indian coffee', 'degree coffee'],
   ['photo-1534353436294-0dbd4bdac845', 'photo-1544145945-f90425340c7e']],
  [['masala chai', 'masala tea', 'ginger tea', 'cutting chai'],
   ['photo-1587049352846-4a222e784d38']],

  // ── Paneer variants ────────────────────────────────────────────────────
  [['paneer butter masala', 'butter paneer'],
   ['photo-1585937421612-70a008356fbe', 'photo-1600891964092-4316c288032e']],
  [['palak paneer', 'saag paneer', 'spinach paneer'],
   ['photo-1455619452474-d2be8b1e70cd', 'photo-1585937421612-70a008356fbe']],
  [['paneer tikka masala'],
   ['photo-1585937421612-70a008356fbe', 'photo-1565557623262-b51c2513a641']],
  [['paneer tikka'],
   ['photo-1600891964092-4316c288032e', 'photo-1585937421612-70a008356fbe']],

  // ── Sweets / Desserts ──────────────────────────────────────────────────
  [['gulab jamun', 'gulab jaman'],
   ['photo-1567206563064-6f60f40a2b57', 'photo-1551024709-8f23befc548e']],
  [['rava kesari', 'kesari bath', 'kesari bhath'],
   ['photo-1567206563064-6f60f40a2b57', 'photo-1551024709-8f23befc548e']],
  [['ice cream', 'icecream'],
   ['photo-1605197788044-76e09a96c9ae']],

  // ── Sundal ─────────────────────────────────────────────────────────────
  [['navadhaniya sundal', 'navedhaniya sundal', 'navadhanya sundal', 'nine grain sundal'],
   ['photo-1540189549336-e6e99c3679fe', 'photo-1546456073-ea246a7bd25f']],

  // ── Pakoda / Bajji variants ────────────────────────────────────────────
  [['onion pakoda', 'onion pakora', 'onion pakroda', 'vengaya bajji', 'onion bajji'],
   ['photo-1601050690597-df0568f70950', 'photo-1512058564366-18510be2db19']],

  // ── Upma variants ─────────────────────────────────────────────────────
  [['rava upma', 'semolina upma', 'sooji upma'],
   ['photo-1603894584373-5ac82b2ae398', 'photo-1547592166-23ac45744acd']],

  // ── Idiyappam variants ────────────────────────────────────────────────
  [['idiyappam', 'iddiyappam', 'idiyappa', 'string hoppers'],
   ['photo-1565557623262-b51c2513a641', 'photo-1544025162-d76538b2a681', 'photo-1576402187878-974f70c890a5']],
];

// Keyword → specific Unsplash photo IDs (more relevant than category pool).
// Each dish keyword now has a DISTINCT pool — no single photo ID dominates
// many unrelated keywords.
const KEYWORD_PHOTOS = {
  // Rice / Biryani
  biryani:   ['photo-1563379091339-03b21ab4a4f8', 'photo-1603894584373-5ac82b2ae398'],
  biriyani:  ['photo-1563379091339-03b21ab4a4f8', 'photo-1603894584373-5ac82b2ae398'],
  rice:      ['photo-1603894584373-5ac82b2ae398', 'photo-1563379091339-03b21ab4a4f8'],
  pulao:     ['photo-1603894584373-5ac82b2ae398', 'photo-1565557623262-b51c2513a641'],
  // South Indian breakfast — each keyword group uses a DISTINCT pool
  uthappam:  ['photo-1511690656952-34342bb7c2f2', 'photo-1565557623262-b51c2513a641'],
  uttapam:   ['photo-1511690656952-34342bb7c2f2', 'photo-1565557623262-b51c2513a641'],
  idli:      ['photo-1576402187878-974f70c890a5', 'photo-1547592166-23ac45744acd'],
  idly:      ['photo-1576402187878-974f70c890a5', 'photo-1547592166-23ac45744acd'],
  pongal:    ['photo-1603894584373-5ac82b2ae398', 'photo-1547592166-23ac45744acd', 'photo-1563379091339-03b21ab4a4f8'],
  upma:      ['photo-1603894584373-5ac82b2ae398', 'photo-1547592166-23ac45744acd'],
  uppuma:    ['photo-1603894584373-5ac82b2ae398', 'photo-1547592166-23ac45744acd'],
  appam:     ['photo-1511690656952-34342bb7c2f2', 'photo-1576402187878-974f70c890a5'],
  dosa:      ['photo-1576402187878-974f70c890a5', 'photo-1512058564366-18510be2db19'],
  dosai:     ['photo-1512058564366-18510be2db19', 'photo-1576402187878-974f70c890a5'],
  // Fried snacks
  vadai:     ['photo-1601050690597-df0568f70950', 'photo-1544025162-d76538b2a681'],
  vada:      ['photo-1601050690597-df0568f70950', 'photo-1544025162-d76538b2a681'],
  pakoda:    ['photo-1613514785940-daed07799d9b', 'photo-1601050690597-df0568f70950'],
  pakora:    ['photo-1613514785940-daed07799d9b', 'photo-1593253553b898-79022fc87321'],
  pakroda:   ['photo-1613514785940-daed07799d9b', 'photo-1512058564366-18510be2db19'],
  bonda:     ['photo-1601050690597-df0568f70950', 'photo-1593253553b898-79022fc87321'],
  samosa:    ['photo-1601050690597-df0568f70950', 'photo-1544025162-d76538b2a681'],
  bajji:     ['photo-1613514785940-daed07799d9b', 'photo-1601050690597-df0568f70950'],
  // Breads
  paratha:   ['photo-1511690656952-34342bb7c2f2', 'photo-1565557623262-b51c2513a641'],
  parotta:   ['photo-1511690656952-34342bb7c2f2', 'photo-1565557623262-b51c2513a641'],
  porotta:   ['photo-1511690656952-34342bb7c2f2', 'photo-1565557623262-b51c2513a641'],
  poratta:   ['photo-1511690656952-34342bb7c2f2', 'photo-1565557623262-b51c2513a641'],
  chapati:   ['photo-1511690656952-34342bb7c2f2', 'photo-1565557623262-b51c2513a641'],
  chapathi:  ['photo-1565557623262-b51c2513a641', 'photo-1504674900247-0877df9cc836'],
  chappati:  ['photo-1565557623262-b51c2513a641', 'photo-1504674900247-0877df9cc836'],
  chappathi: ['photo-1565557623262-b51c2513a641', 'photo-1504674900247-0877df9cc836'],
  roti:      ['photo-1565557623262-b51c2513a641', 'photo-1504674900247-0877df9cc836'],
  naan:      ['photo-1511690656952-34342bb7c2f2', 'photo-1565557623262-b51c2513a641'],
  poori:     ['photo-1601050690597-df0568f70950', 'photo-1511690656952-34342bb7c2f2'],
  puri:      ['photo-1601050690597-df0568f70950', 'photo-1511690656952-34342bb7c2f2'],
  // Drinks — before generic "masala" so "Masala Chai" → tea photo
  chai:      ['photo-1587049352846-4a222e784d38'],
  tea:       ['photo-1587049352846-4a222e784d38'],
  coffee:    ['photo-1534353436294-0dbd4bdac845', 'photo-1544145945-f90425340c7e'],
  lassi:     ['photo-1544145945-f90425340c7e', 'photo-1534353436294-0dbd4bdac845'],
  juice:     ['photo-1625865083418-4da40e37e55b', 'photo-1544145945-f90425340c7e'],
  // Curries / Gravies
  paneer:    ['photo-1585937421612-70a008356fbe', 'photo-1565557623262-b51c2513a641'],
  tikka:     ['photo-1585937421612-70a008356fbe', 'photo-1600891964092-4316c288032e'],
  masala:    ['photo-1585937421612-70a008356fbe', 'photo-1455619452474-d2be8b1e70cd'],
  butter:    ['photo-1585937421612-70a008356fbe', 'photo-1600891964092-4316c288032e'],
  curry:     ['photo-1585937421612-70a008356fbe', 'photo-1455619452474-d2be8b1e70cd'],
  chicken:   ['photo-1585937421612-70a008356fbe', 'photo-1504674900247-0877df9cc836'],
  korma:     ['photo-1585937421612-70a008356fbe', 'photo-1455619452474-d2be8b1e70cd'],
  // Soups / Lentils
  dal:       ['photo-1547592166-23ac45744acd', 'photo-1455619452474-d2be8b1e70cd'],
  sambar:    ['photo-1547592166-23ac45744acd', 'photo-1455619452474-d2be8b1e70cd'],
  rasam:     ['photo-1547592166-23ac45744acd', 'photo-1585937421612-70a008356fbe'],
  soup:      ['photo-1547592166-23ac45744acd', 'photo-1574484284002-952d92456975'],
  kichadi:   ['photo-1547592166-23ac45744acd', 'photo-1603894584373-5ac82b2ae398'],
  khichdi:   ['photo-1547592166-23ac45744acd', 'photo-1603894584373-5ac82b2ae398'],
  // Sweets / Desserts
  halwa:     ['photo-1567206563064-6f60f40a2b57', 'photo-1551024709-8f23befc548e'],
  gulab:     ['photo-1567206563064-6f60f40a2b57', 'photo-1551024709-8f23befc548e'],
  kheer:     ['photo-1551024709-8f23befc548e', 'photo-1567206563064-6f60f40a2b57'],
  kesari:    ['photo-1567206563064-6f60f40a2b57', 'photo-1551024709-8f23befc548e'],
  payasam:   ['photo-1551024709-8f23befc548e', 'photo-1578985545062-69928b1d9587'],
  ladoo:     ['photo-1551024709-8f23befc548e', 'photo-1567206563064-6f60f40a2b57'],
  ice:       ['photo-1605197788044-76e09a96c9ae', 'photo-1578985545062-69928b1d9587'],
  // Sides
  raita:     ['photo-1546456073-ea246a7bd25f', 'photo-1540189549336-e6e99c3679fe'],
  chutney:   ['photo-1598103442097-8b74394b95c2', 'photo-1546456073-ea246a7bd25f'],
  pickle:    ['photo-1618160702438-9b02ab6515c9', 'photo-1598103442097-8b74394b95c2'],
  salad:     ['photo-1540189549336-e6e99c3679fe', 'photo-1546456073-ea246a7bd25f'],
  sundal:    ['photo-1540189549336-e6e99c3679fe', 'photo-1546456073-ea246a7bd25f'],
};

/**
 * Generate a direct image URL for a dish (used by preview endpoints).
 * Returns a Pollinations.ai URL for AI-generated preview.
 */
function generateDishImageUrl(dishName, category, _template, isVeg, opts = {}) {
  const { width = 768, height = 768 } = opts;
  const clean = cleanDishName(dishName);
  const vegLabel = isVeg ? 'vegetarian' : 'non-vegetarian';
  const categoryLabel = (category || 'main-course').replace(/-/g, ' ');

  const prompt = [
    `A stunning overhead food photograph of ${clean}.`,
    `Authentic Indian ${categoryLabel} cuisine, ${vegLabel}.`,
    `Professional restaurant food photography, warm lighting, vibrant colors.`,
    `Ultra realistic, 4K quality, food magazine style.`,
  ].join(' ');
  const seed = nameHash(dishName);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`;
}

/**
 * Unsplash CDN fallback URL — used as Tier 4 in generateAndDownloadDishImage.
 * Priority: compound multi-word keywords → single keywords → category pool.
 */
function getUnsplashFallbackUrl(dishName, category, opts = {}) {
  const { width = 512, height = 512 } = opts;
  const nameLower = dishName.toLowerCase();

  for (const [keywords, photos] of COMPOUND_KEYWORD_PHOTOS) {
    if (keywords.some(kw => nameLower.includes(kw))) {
      const photoId = photos[nameHash(dishName) % photos.length];
      return `https://images.unsplash.com/${photoId}?w=${width}&h=${height}&fit=crop&auto=format`;
    }
  }

  for (const [keyword, photos] of Object.entries(KEYWORD_PHOTOS)) {
    if (nameLower.includes(keyword)) {
      const photoId = photos[nameHash(dishName) % photos.length];
      return `https://images.unsplash.com/${photoId}?w=${width}&h=${height}&fit=crop&auto=format`;
    }
  }

  const pool = FOOD_PHOTOS[category] || FOOD_PHOTOS['main-course'];
  const photoId = pool[nameHash(dishName) % pool.length];
  return `https://images.unsplash.com/${photoId}?w=${width}&h=${height}&fit=crop&auto=format`;
}

// ═══════════════════════════════════════════════════════════════
// SHARED UTILITIES
// ═══════════════════════════════════════════════════════════════

function fetchJson(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
    const parsedUrl = new URL(url);
    const proto = parsedUrl.protocol === 'https:' ? https : http;
    const req = proto.request(
      { hostname: parsedUrl.hostname, path: parsedUrl.pathname + parsedUrl.search, method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } },
      (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          clearTimeout(timer);
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
          catch { reject(new Error('Invalid JSON response')); }
        });
        res.on('error', err => { clearTimeout(timer); reject(err); });
      }
    );
    req.on('error', err => { clearTimeout(timer); reject(err); });
    req.end();
  });
}

function downloadImageAsBase64(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Image download timed out')), timeoutMs);

    const doRequest = (requestUrl, redirects = 0) => {
      if (redirects > 10) { clearTimeout(timer); return reject(new Error('Too many redirects')); }
      const parsedUrl = new URL(requestUrl);
      const proto = parsedUrl.protocol === 'https:' ? https : http;
      const req = proto.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : `${parsedUrl.protocol}//${parsedUrl.hostname}${res.headers.location}`;
            return doRequest(loc, redirects + 1);
          }
          if (res.statusCode !== 200) {
            clearTimeout(timer);
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} from ${parsedUrl.hostname}`));
          }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => {
            clearTimeout(timer);
            const buf = Buffer.concat(chunks);
            const ct = res.headers['content-type'] || 'image/jpeg';
            resolve(`data:${ct};base64,${buf.toString('base64')}`);
          });
          res.on('error', err => { clearTimeout(timer); reject(err); });
        }
      );
      req.on('error', err => { clearTimeout(timer); reject(err); });
      req.end();
    };

    doRequest(url);
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

/**
 * Generate and download the most accurate available image for a dish.
 *
 * Tier 1 — Pollinations.ai (AI-generated, most dish-accurate)
 * Tier 2 — Wikipedia Pageimages (real photo from Wikipedia article)
 * Tier 3 — TheMealDB (globally common dishes via name search)
 * Tier 4 — Unsplash CDN (always works, keyword-matched, deterministic)
 */
async function generateAndDownloadDishImage(dishName, category, template, isVeg) {
  // Tier 1 — Pollinations.ai (AI-generated — most accurate for specific dishes)
  try {
    const aiImage = await generateWithPollinations(dishName, category, isVeg);
    if (aiImage) {
      return aiImage;
    }
  } catch (err) {
    console.warn(`[ImageGen] Pollinations.ai tier failed for "${dishName}": ${err.message}`);
  }

  // Tier 2 — Wikipedia
  try {
    const wikiUrl = await searchWikipedia(dishName);
    if (wikiUrl) {
      const base64 = await downloadImageAsBase64(wikiUrl, 20000);
      console.log(`[ImageGen] ✓ Wikipedia image for "${dishName}" (${Math.round(base64.length / 1024)}KB)`);
      return base64;
    }
  } catch (err) {
    console.warn(`[ImageGen] Wikipedia tier failed for "${dishName}": ${err.message}`);
  }

  // Tier 3 — TheMealDB
  try {
    const mealUrl = await searchMealDB(dishName);
    if (mealUrl) {
      const base64 = await downloadImageAsBase64(mealUrl, 15000);
      console.log(`[ImageGen] ✓ TheMealDB image for "${dishName}" (${Math.round(base64.length / 1024)}KB)`);
      return base64;
    }
  } catch (err) {
    console.warn(`[ImageGen] TheMealDB tier failed for "${dishName}": ${err.message}`);
  }

  // Tier 4 — Unsplash CDN (always succeeds)
  const unsplashUrl = getUnsplashFallbackUrl(dishName, category);
  console.log(`[ImageGen] Unsplash fallback for "${dishName}": ${unsplashUrl}`);
  const base64 = await downloadImageAsBase64(unsplashUrl, 15000);
  console.log(`[ImageGen] ✓ Unsplash image for "${dishName}" (${Math.round(base64.length / 1024)}KB)`);
  return base64;
}

// ─── Batch helpers ────────────────────────────────────────────
function generateImageUrlsForItems(items, template) {
  return items.map(item => ({
    ...item,
    imageUrl: generateDishImageUrl(item.name, item.category, template, item.isVeg),
  }));
}

async function generateImagesForItems(items, template, concurrency = 1, onProgress) {
  const results = [];
  let completed = 0;

  // Sequential processing with delay to avoid Pollinations.ai rate limits
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        try {
          const base64 = await generateAndDownloadDishImage(item.name, item.category, template, item.isVeg);
          return { _id: item._id, name: item.name, image: base64 };
        } catch (err) {
          console.error(`[ImageGen] ✗ All tiers failed for "${item.name}": ${err.message}`);
          return { _id: item._id, name: item.name, image: null };
        }
      })
    );

    for (const result of batchResults) {
      results.push(result.status === 'fulfilled' ? result.value : { _id: null, name: 'unknown', image: null });
      completed++;
      if (onProgress) onProgress(completed, items.length);
    }

    // Small delay between batches to be respectful of rate limits
    if (i + concurrency < items.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  return results;
}

module.exports = {
  generateDishImageUrl,
  generateAndDownloadDishImage,
  downloadImageAsBase64,
  generateImageUrlsForItems,
  generateImagesForItems,
};

