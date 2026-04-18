/* ============================================================
   AROMA CAFE — Interactive Menu JS
   ============================================================ */

const menuSections = [
  {
    label: "SPECIALTY",
    items: [
      {
        name:     "CHOCO BOBA",
        category: "SPECIALTY",
        tag:      "BEST SELLER",
        oldPrice: "$7.00",
        newPrice: "$5.00",
        hot:      false,
        hero:  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=800&fit=crop",
        thumb: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop"
      },
      {
        name:     "MATCHA LATTE",
        category: "SPECIALTY",
        tag:      "TRENDING",
        oldPrice: null,
        newPrice: "$6.50",
        hot:      true,
        hero:  "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&h=800&fit=crop",
        thumb: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=200&h=200&fit=crop"
      }
    ]
  },
  {
    label: "HOT DRINKS",
    items: [
      {
        name:     "CARAMEL MACCHIATO",
        category: "ESPRESSO",
        tag:      "POPULAR",
        oldPrice: null,
        newPrice: "$6.00",
        hot:      true,
        hero:  "https://images.unsplash.com/photo-1561047029-3000c68339ca?w=600&h=800&fit=crop",
        thumb: "https://images.unsplash.com/photo-1561047029-3000c68339ca?w=200&h=200&fit=crop"
      },
      {
        name:     "CLASSIC CAFE LATTE",
        category: "LATTE",
        tag:      "SIGNATURE",
        oldPrice: null,
        newPrice: "$7.00",
        hot:      true,
        hero:  "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=800&fit=crop",
        thumb: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&h=200&fit=crop"
      },
      {
        name:     "MOCHA BLISS",
        category: "MOCHA",
        tag:      "CHEF PICK",
        oldPrice: null,
        newPrice: "$8.00",
        hot:      true,
        hero:  "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&h=800&fit=crop",
        thumb: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=200&h=200&fit=crop"
      }
    ]
  },
  {
    label: "COLD DRINKS",
    items: [
      {
        name:     "VANILLA COLD BREW",
        category: "COLD BREW",
        tag:      "NEW",
        oldPrice: "$8.00",
        newPrice: "$6.00",
        hot:      false,
        hero:  "https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=600&h=800&fit=crop",
        thumb: "https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=200&h=200&fit=crop"
      }
    ]
  }
];

/* Flat array for index-based operations */
const menuData = menuSections.flatMap(s => s.items);

let activeIndex = 0;

/* ===== DOM refs ===== */
const featuredImg      = document.getElementById("featuredImg");
const featuredName     = document.getElementById("featuredName");
const featuredCategory = document.getElementById("featuredCategory");
const heroTag          = document.querySelector(".hero-tag");
const oldPriceEl       = document.getElementById("oldPrice");
const newPriceEl       = document.getElementById("newPrice");
const menuList         = document.getElementById("menuList");
const dotsEl           = document.getElementById("dots");
const steamWrap        = document.getElementById("steamWrap");
const heroWrap         = document.getElementById("heroWrap");
const leftPanel        = document.getElementById("leftPanel");

/* ============================================================
   BUILD MENU LIST — sectioned
   ============================================================ */
function buildMenuList() {
  menuList.innerHTML = "";
  if (dotsEl) dotsEl.innerHTML = "";

  let globalIdx = 0;
  let delay     = 0.05;

  menuSections.forEach(section => {
    const header = document.createElement("div");
    header.className = "section-header";
    header.style.animationDelay = delay + "s";
    header.innerHTML =
      '<span class="sh-label">' + section.label + "</span>" +
      '<span class="sh-line"></span>';
    menuList.appendChild(header);
    delay += 0.07;

    section.items.forEach(item => {
      const idx = globalIdx;
      const el  = document.createElement("div");
      el.className = "menu-item" + (idx === activeIndex ? " active" : "");
      el.style.animationDelay = delay + "s";

      el.innerHTML =
        '<div class="mi-num">' + String(idx + 1).padStart(2, "0") + "</div>" +
        '<div class="mi-thumb"><img src="' + item.thumb + '" alt="' + item.name + '" loading="lazy"></div>' +
        '<div class="mi-body">' +
          '<div class="mi-name">' + item.name + "</div>" +
          '<div class="mi-cat">'  + item.category + "</div>" +
        "</div>" +
        '<div class="mi-price">' + item.newPrice + "</div>";

      el.addEventListener("click", () => selectItem(idx));
      menuList.appendChild(el);
      globalIdx++;
      delay += 0.08;
    });
  });
}

/* ============================================================
   SELECT ITEM
   ============================================================ */
function selectItem(index) {
  activeIndex = index;
  const item  = menuData[index];

  /* Animate hero out */
  featuredImg.classList.add("switching");
  featuredName.classList.add("switching");

  setTimeout(() => {
    /* Update image */
    featuredImg.src = item.hero;
    featuredImg.alt = item.name;

    /* Update name — split at first space for two-line display */
    featuredName.innerHTML = item.name.replace(" ", "<br>");

    /* Update meta */
    featuredCategory.textContent = item.category;
    if (heroTag) heroTag.textContent = item.tag || "";

    /* Update price */
    if (item.oldPrice) {
      oldPriceEl.textContent  = item.oldPrice;
      oldPriceEl.style.display = "";
    } else {
      oldPriceEl.style.display = "none";
    }
    newPriceEl.textContent = item.newPrice;

    /* Steam toggle */
    if (item.hot) {
      steamWrap.classList.add("visible");
    } else {
      steamWrap.classList.remove("visible");
    }

    /* Animate back in */
    featuredImg.classList.remove("switching");
    featuredName.classList.remove("switching");
  }, 380);

  buildMenuList();

  /* Scroll active item into view */
  setTimeout(() => {
    const active = menuList.querySelector(".menu-item.active");
    if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, 50);
}

/* ============================================================
   3D PARALLAX — mouse move over left panel
   ============================================================ */
leftPanel.addEventListener("mousemove", (e) => {
  const rect = leftPanel.getBoundingClientRect();
  const dx = (e.clientX - rect.left  - rect.width  / 2) / (rect.width  / 2); /* -1 to 1 */
  const dy = (e.clientY - rect.top   - rect.height / 2) / (rect.height / 2); /* -1 to 1 */
  heroWrap.style.transform =
    "perspective(900px) rotateY(" + (dx * 6) + "deg) rotateX(" + (-dy * 4) + "deg)";
});

leftPanel.addEventListener("mouseleave", () => {
  heroWrap.style.transform = "";
});

/* ============================================================
   FLOATING PARTICLES
   ============================================================ */
function spawnParticles() {
  const container = document.getElementById("particles");
  for (let i = 0; i < 18; i++) {
    const p    = document.createElement("div");
    p.className = "particle";
    const size = 3 + Math.random() * 9;
    p.style.cssText =
      "width:"              + size + "px;" +
      "height:"             + size + "px;" +
      "left:"               + (Math.random() * 100) + "%;" +
      "animation-duration:" + (10 + Math.random() * 16) + "s;" +
      "animation-delay:"    + (Math.random() * 16) + "s;";
    container.appendChild(p);
  }
}

/* ============================================================
   INIT
   ============================================================ */
buildMenuList();
spawnParticles();

/* ============================================================
   UPLOAD & EXTRACT ENGINE
   ============================================================ */

const uploadImgPool = [
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1572286258217-215cf8f0c2c8?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1561882468-9110d70d166b?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1485808191679-5f86510bd9d7?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1521302080334-4bebac2763a6?w=600&h=800&fit=crop',
];

const thumbPool = uploadImgPool.map(u => u.replace('600&h=800', '200&h=200'));

/* ─── DOM refs ─── */
const ulpOverlay      = document.getElementById('ulpOverlay');
const ulpClose        = document.getElementById('ulpClose');
const ulpZone         = document.getElementById('ulpZone');
const ulpFileInput    = document.getElementById('ulpFileInput');
const ulpZoneIdle     = document.getElementById('ulpZoneIdle');
const ulpChooseBtn    = document.getElementById('ulpChooseBtn');
const ulpPreview      = document.getElementById('ulpPreview');
const ulpReselect     = document.getElementById('ulpReselect');
const ulpApiKey       = document.getElementById('ulpApiKey');
const ulpEyeBtn       = document.getElementById('ulpEyeBtn');
const ulpExtractBtn   = document.getElementById('ulpExtractBtn');
const ulpProgress     = document.getElementById('ulpProgress');
const ulpProgressFill = document.getElementById('ulpProgressFill');
const ulpProgressLabel= document.getElementById('ulpProgressLabel');
const ulpResult       = document.getElementById('ulpResult');
const ulpResultCount  = document.getElementById('ulpResultCount');
const ulpViewBtn      = document.getElementById('ulpViewBtn');
const ulpError        = document.getElementById('ulpError');
const ulpErrorMsg     = document.getElementById('ulpErrorMsg');
const ulpRetryBtn     = document.getElementById('ulpRetryBtn');
const uploadTrigger   = document.getElementById('uploadTrigger');

let currentImageFile   = null;
let currentImageBase64 = null;
let currentImageMime   = 'image/jpeg';

/* ─── Modal open / close ─── */
function openUploadModal() {
  ulpOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeUploadModal() {
  ulpOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}
function resetState() {
  ulpProgress.classList.add('hidden');
  ulpResult.classList.add('hidden');
  ulpError.classList.add('hidden');
  ulpProgressFill.style.width = '0%';
  ulpProgressLabel.textContent = 'Initializing…';
}
function showIdleZone() {
  ulpZoneIdle.classList.remove('hidden');
  ulpPreview.classList.add('hidden');
  ulpReselect.classList.add('hidden');
  ulpExtractBtn.disabled = true;
  currentImageFile = null;
  currentImageBase64 = null;
  resetState();
}

uploadTrigger.addEventListener('click', openUploadModal);
ulpClose.addEventListener('click', closeUploadModal);
ulpOverlay.addEventListener('click', e => { if (e.target === ulpOverlay) closeUploadModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !ulpOverlay.classList.contains('hidden')) closeUploadModal();
});

/* ─── File selection ─── */
ulpChooseBtn.addEventListener('click', () => ulpFileInput.click());
ulpReselect.addEventListener('click', showIdleZone);
ulpFileInput.addEventListener('change', () => {
  if (ulpFileInput.files[0]) handleFile(ulpFileInput.files[0]);
});

ulpZone.addEventListener('dragover', e => { e.preventDefault(); ulpZone.classList.add('drag-over'); });
ulpZone.addEventListener('dragleave', () => ulpZone.classList.remove('drag-over'));
ulpZone.addEventListener('drop', e => {
  e.preventDefault();
  ulpZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
  currentImageFile = file;
  currentImageMime = file.type || 'image/jpeg';
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    currentImageBase64 = dataUrl.split(',')[1];
    ulpPreview.src = dataUrl;
    ulpPreview.classList.remove('hidden');
    ulpZoneIdle.classList.add('hidden');
    ulpReselect.classList.remove('hidden');
    ulpExtractBtn.disabled = false;
    resetState();
  };
  reader.readAsDataURL(file);
}

/* ─── Show/hide API key ─── */
ulpEyeBtn.addEventListener('click', () => {
  ulpApiKey.type = ulpApiKey.type === 'password' ? 'text' : 'password';
});

/* ─── Progress helper ─── */
function setProgress(pct, label) {
  ulpProgressFill.style.width = pct + '%';
  ulpProgressLabel.textContent = label;
}

/* ─── Extract button ─── */
ulpExtractBtn.addEventListener('click', async () => {
  if (!currentImageFile) return;
  const apiKey = ulpApiKey.value.trim();

  ulpExtractBtn.disabled = true;
  ulpProgress.classList.remove('hidden');
  ulpResult.classList.add('hidden');
  ulpError.classList.add('hidden');

  try {
    let parsed;
    if (apiKey) {
      parsed = await extractWithOpenAI(currentImageBase64, currentImageMime, apiKey);
    } else {
      parsed = await extractWithTesseract(currentImageFile);
    }
    if (!parsed.items || parsed.items.length === 0) {
      throw new Error('No menu items found. Try a clearer photo.');
    }
    addExtractedItems(parsed);
    ulpResultCount.textContent = parsed.items.length;
    ulpProgress.classList.add('hidden');
    ulpResult.classList.remove('hidden');
  } catch (err) {
    ulpProgress.classList.add('hidden');
    ulpError.classList.remove('hidden');
    ulpErrorMsg.textContent = err.message || 'Extraction failed.';
  }
  ulpExtractBtn.disabled = false;
});

ulpViewBtn.addEventListener('click', () => {
  closeUploadModal();
  /* Scroll to the uploaded section */
  setTimeout(() => {
    const uploaded = menuList.querySelector('.section-header:last-of-type');
    if (uploaded) uploaded.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, 200);
});

ulpRetryBtn.addEventListener('click', () => {
  ulpError.classList.add('hidden');
  ulpExtractBtn.disabled = !currentImageFile;
});

/* ─── OpenAI GPT-4 Vision ─── */
async function extractWithOpenAI(base64, mimeType, apiKey) {
  setProgress(12, 'Connecting to AI…');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'You are a professional menu scanner. Extract ALL menu items visible in this image.\n'
              + 'Return ONLY valid JSON — no markdown, no code fences — in this format:\n'
              + '{"items":[{"name":"ITEM NAME","category":"CATEGORY","price":"$X.XX","tag":"TAG","hot":true}]}\n\n'
              + 'Rules:\n'
              + '- name: UPPERCASE, exactly as shown\n'
              + '- category: short uppercase label (e.g. ESPRESSO, LATTE, COLD BREW, SPECIALTY, MOCHA, TEA)\n'
              + '- price: use "$X.XX" format. If not visible write "Market Price"\n'
              + '- tag: one of BEST SELLER, POPULAR, TRENDING, NEW, SIGNATURE, CHEF PICK — pick the best fit\n'
              + '- hot: true if it is a hot drink, false otherwise\n'
              + '- Extract EVERY single item. Do not skip any.'
          },
          {
            type: 'image_url',
            image_url: { url: 'data:' + mimeType + ';base64,' + base64, detail: 'high' }
          }
        ]
      }]
    })
  });

  setProgress(75, 'Processing AI response…');

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'OpenAI API error ' + response.status);
  }

  const data = await response.json();
  setProgress(92, 'Parsing items…');

  const raw = (data.choices[0].message.content || '').trim();
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned an unreadable response.');
    parsed = JSON.parse(match[0]);
  }
  setProgress(100, 'Done!');
  return parsed;
}

/* ─── Tesseract.js OCR (free) ─── */
async function extractWithTesseract(imageFile) {
  setProgress(5, 'Loading OCR engine…');
  await loadTesseractScript();
  setProgress(12, 'Preprocessing image…');

  /* Preprocess: convert to high-contrast grayscale for better OCR */
  const processedBlob = await preprocessImage(imageFile);

  setProgress(18, 'Reading image…');

  const worker = await Tesseract.createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text')
        setProgress(18 + Math.round(m.progress * 62), 'Recognizing text…');
    }
  });

  const { data: { text } } = await worker.recognize(processedBlob);
  await worker.terminate();

  setProgress(88, 'Parsing menu structure…');
  const parsed = parseMenuText(text);
  setProgress(100, 'Done!');
  return parsed;
}

function loadTesseractScript() {
  if (window.Tesseract) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload  = resolve;
    s.onerror = () => reject(new Error('Could not load OCR engine.'));
    document.head.appendChild(s);
  });
}

/* ─── Image preprocessing for better OCR ─── */
function preprocessImage(imageFile) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      /* Scale up small images for better OCR accuracy */
      const scale = Math.max(1, 2000 / Math.max(img.width, img.height));
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      /* Convert to grayscale, boost contrast, and invert if mostly dark */
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      let totalBrightness = 0;

      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
        totalBrightness += gray;
        d[i] = d[i+1] = d[i+2] = gray;
      }

      /* If image is dark (avg brightness < 128), invert it */
      const avgBrightness = totalBrightness / (d.length / 4);
      if (avgBrightness < 128) {
        for (let i = 0; i < d.length; i += 4) {
          d[i] = 255 - d[i];
          d[i+1] = 255 - d[i+1];
          d[i+2] = 255 - d[i+2];
        }
      }

      /* Increase contrast */
      const contrast = 1.6;
      const mid = 128;
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.max(0, Math.min(255, mid + (d[i]   - mid) * contrast));
        d[i+1] = Math.max(0, Math.min(255, mid + (d[i+1] - mid) * contrast));
        d[i+2] = Math.max(0, Math.min(255, mid + (d[i+2] - mid) * contrast));
      }

      /* Simple threshold to black/white for cleaner OCR */
      const threshold = 140;
      for (let i = 0; i < d.length; i += 4) {
        const v = d[i] > threshold ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = v;
      }

      ctx.putImageData(imgData, 0, 0);
      canvas.toBlob(blob => resolve(blob), 'image/png');
    };
    img.src = URL.createObjectURL(imageFile);
  });
}

/* ─── Text parser (raw OCR → items) ─── */
function parseMenuText(rawText) {
  /* Clean up common OCR artifacts */
  let cleaned = rawText
    .replace(/[|\\{}[\]<>~`]/g, ' ')   /* Remove stray symbols */
    .replace(/[—–]+/g, ' ')            /* Dashes to spaces */
    .replace(/[:;]+/g, ' ')            /* Colons/semicolons */
    .replace(/\s{2,}/g, ' ');          /* Collapse whitespace */

  const lines = cleaned.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2);

  /* Strict price regex: $X.XX or X.XX pattern */
  const priceRx = /\$\s*(\d{1,3}(?:\.\d{2}))/;
  const loosePriceRx = /(\d{1,2}\.\d{2})/;
  const items = [];
  const seenNames = new Set();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    /* Skip lines that are obviously not menu items */
    if (/^(menu|page|our |the |welcome|please|artisan|beverages?|specialty|hot drinks?|cold drinks?|prices?|order)/i.test(line)) continue;

    /* Count alphabetic characters — skip if less than 60% alpha */
    const alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount / line.length < 0.5) continue;
    if (alphaCount < 4) continue;

    /* Look for a price on the same line or next 1-2 lines */
    let price = null;
    let consumeLines = 0;

    for (let off = 0; off <= 2 && i + off < lines.length; off++) {
      const candidate = lines[i + off];
      let m = candidate.match(priceRx);
      if (!m) m = candidate.match(loosePriceRx);
      if (m) {
        const val = parseFloat(m[1]);
        /* Realistic menu price range: $1 - $50 */
        if (val >= 1 && val <= 50) {
          price = '$' + val.toFixed(2);
          consumeLines = off;
          break;
        }
      }
    }

    if (!price) continue;

    /* Extract the item name: take text before the price on the line */
    let name = line;
    const priceIdx = name.search(/\$?\s*\d{1,2}\.\d{2}/);
    if (priceIdx > 2) name = name.substring(0, priceIdx);

    /* Clean up the name */
    name = name
      .replace(/^\d+[\.\)\s]+/, '')     /* Remove leading numbers like "01." */
      .replace(/[^a-zA-Z\s'-]/g, ' ')  /* Keep only letters, spaces, hyphens, apostrophes */
      .replace(/\s{2,}/g, ' ')
      .trim()
      .toUpperCase();

    /* Validate: must have at least 2 alpha characters and look like a real name */
    if (name.length < 3) continue;
    const words = name.split(/\s+/).filter(w => w.length >= 2);
    if (words.length < 1) continue;

    /* Skip duplicates */
    if (seenNames.has(name)) continue;
    seenNames.add(name);

    items.push({
      name:     name,
      category: guessCat(name),
      price:    price,
      tag:      'UPLOADED',
      hot:      guessHot(name)
    });

    i += consumeLines;
  }

  if (items.length === 0) {
    throw new Error(
      'Could not extract menu items — the OCR had trouble reading this image. '
      + 'For best results, use AI extraction with an OpenAI API key, '
      + 'or try a clearer, well-lit photo of a printed menu.'
    );
  }
  return { items };
}

function guessCat(name) {
  const n = name.toLowerCase();
  if (/espresso|ristretto|macchiato|cortado|americano/.test(n)) return 'ESPRESSO';
  if (/latte|cappuccino|flat white/.test(n))                    return 'LATTE';
  if (/mocha/.test(n))                                          return 'MOCHA';
  if (/cold brew|iced|frappe|frapp|smoothie/.test(n))           return 'COLD BREW';
  if (/tea|chai|matcha/.test(n))                                return 'TEA';
  if (/boba|bubble/.test(n))                                    return 'SPECIALTY';
  return 'BEVERAGE';
}

function guessHot(name) {
  const n = name.toLowerCase();
  if (/iced|cold|frozen|frappe|frapp|smoothie/.test(n)) return false;
  if (/latte|cappuccino|espresso|macchiato|mocha|americano|tea|chai/.test(n)) return true;
  return false;
}

/* ─── Add extracted items to menu ─── */
function addExtractedItems(parsed) {
  /* Use the uploaded photo itself as hero & thumb */
  const uploadedDataUrl = ulpPreview.src || '';

  /* Build a new section and push it into menuSections */
  const existing = menuSections.find(s => s.label === 'UPLOADED');
  const newItems = (parsed.items || []).map((item, idx) => ({
    name:     item.name || 'UNKNOWN ITEM',
    category: item.category || 'BEVERAGE',
    tag:      item.tag || 'UPLOADED',
    oldPrice: null,
    newPrice: item.price || 'Market Price',
    hot:      item.hot === true,
    hero:     uploadedDataUrl,
    thumb:    uploadedDataUrl
  }));

  if (existing) {
    existing.items = newItems;
  } else {
    menuSections.push({ label: 'UPLOADED', items: newItems });
  }

  /* Rebuild flat array */
  menuData.length = 0;
  menuSections.flatMap(s => s.items).forEach(item => menuData.push(item));

  /* Select first uploaded item */
  const firstUploadedIdx = menuData.length - newItems.length;
  selectItem(firstUploadedIdx);
}
