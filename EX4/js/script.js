/* ============================================================
   BREW & BLOOM — Coffee Menu Script
   ============================================================ */

'use strict';

// ─── DATA ───────────────────────────────────────────────────
const menuItems = [
  // ── HOT ESPRESSO ──
  {
    id: 1, cat: 'espresso', name: 'Classic Espresso',
    desc: 'A short, intense shot of our single-origin Guatemalan beans — bold dark chocolate notes with a lingering caramel finish and a thick, golden crema.',
    price: '$3.50', cal: '5 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=700&h=500&fit=crop',
    chips: ['Single Origin', 'Guatemala', '28ml Shot', 'Hot']
  },
  {
    id: 2, cat: 'espresso', name: 'Double Ristretto',
    desc: 'Two concentrated ristretto shots extracted with less water for a sweeter, more intense punch. Complex tropical fruit and bittersweet cocoa layers.',
    price: '$4.50', cal: '10 kcal',
    popular: false,
    img: 'https://images.unsplash.com/photo-1521302080334-4bebac2763a6?w=700&h=500&fit=crop',
    chips: ['Double Shot', 'Ristretto', 'Intense', 'Hot']
  },
  {
    id: 3, cat: 'espresso', name: 'Cortado',
    desc: 'Equal parts espresso and warm silky microfoam — the perfect balance where bold coffee meets creamy milk. Smooth, rich, and dangerously drinkable.',
    price: '$4.80', cal: '60 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=700&h=500&fit=crop',
    chips: ['1:1 Ratio', 'Microfoam', 'Spanish Style', 'Hot']
  },
  {
    id: 4, cat: 'espresso', name: 'Macchiato',
    desc: 'A shot of espresso "stained" with just a dollop of dense, velvety foam. Preserves every note of the espresso while adding a whisper of creaminess.',
    price: '$4.20', cal: '15 kcal',
    popular: false,
    img: 'https://images.unsplash.com/photo-1579992357154-faf4bde95b3d?w=700&h=500&fit=crop',
    chips: ['Espresso', 'Foam Dot', 'Intense', 'Hot']
  },

  // ── HOT COFFEE ──
  {
    id: 5, cat: 'hot', name: 'Signature Cappuccino',
    desc: 'Our pride — rich double espresso, steamed whole milk, and a thick pillow of microfoam crowned with house-blend cocoa dust. Art in a cup.',
    price: '$5.50', cal: '120 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1534687941688-651ccaafbff8?w=700&h=500&fit=crop',
    chips: ['Double Shot', 'Whole Milk', 'Cocoa Dust', 'Latte Art']
  },
  {
    id: 6, cat: 'hot', name: 'Flat White',
    desc: 'Velvety ristretto shots swirled through steamed micro-foam milk. Stronger and silkier than a latte — the coffee lover\'s everyday companion.',
    price: '$5.20', cal: '100 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1611564494260-6f21b80af7ea?w=700&h=500&fit=crop',
    chips: ['Ristretto', 'Microfoam', 'Australian Style', 'Hot']
  },
  {
    id: 7, cat: 'hot', name: 'Honey Lavender Latte',
    desc: 'Double espresso, house lavender syrup, raw wildflower honey, and oat milk steamed to perfection. Floral, sweet, and utterly irresistible.',
    price: '$6.80', cal: '195 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=700&h=500&fit=crop',
    chips: ['Oat Milk', 'Lavender Syrup', 'Wildflower Honey', 'Hot']
  },
  {
    id: 8, cat: 'hot', name: 'Caramel Hazelnut Latte',
    desc: 'Silky espresso blended with toasted hazelnut and salted caramel syrups, velvety steamed milk, and a drizzle of amber caramel on top.',
    price: '$6.50', cal: '220 kcal',
    popular: false,
    img: 'https://images.unsplash.com/photo-1562777717-dc6984f65a63?w=700&h=500&fit=crop',
    chips: ['Hazelnut Syrup', 'Salted Caramel', 'Steamed Milk', 'Hot']
  },
  {
    id: 9, cat: 'hot', name: 'Cinnamon Dolce',
    desc: 'Espresso with warm cinnamon-dolce syrup, steamed milk, and a generous dusting of cinnamon sugar. Smells like a bakery, tastes like a dream.',
    price: '$6.20', cal: '180 kcal',
    popular: false,
    img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&h=500&fit=crop',
    chips: ['Cinnamon Dolce', 'Sweet', 'Spiced', 'Hot']
  },
  {
    id: 10, cat: 'hot', name: 'Mocha Royale',
    desc: 'Espresso meets 70% dark Belgian chocolate sauce, steamed milk, and a mountain of house-whipped cream with chocolate shavings. Decadent.',
    price: '$7.00', cal: '290 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=700&h=500&fit=crop',
    chips: ['Belgian Chocolate', 'Whipped Cream', 'Indulgent', 'Hot']
  },

  // ── COLD & ICED ──
  {
    id: 11, cat: 'cold', name: 'Cold Brew',
    desc: 'Steeped 18 hours in cold filtered water, our cold brew delivers a smooth, zero-bitterness coffee experience with rich caramel and dark fruit notes.',
    price: '$5.50', cal: '10 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=700&h=500&fit=crop',
    chips: ['18-hr Steep', 'Cold Filtered', 'No Bitterness', 'Iced']
  },
  {
    id: 12, cat: 'cold', name: 'Iced Vanilla Latte',
    desc: 'Double espresso poured over ice with Madagascar vanilla bean syrup and fresh whole milk. Simple, beautiful, endlessly refreshing.',
    price: '$5.80', cal: '160 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=700&h=500&fit=crop',
    chips: ['Madagascar Vanilla', 'Double Espresso', 'Whole Milk', 'Iced']
  },
  {
    id: 13, cat: 'cold', name: 'Dalgona Cloud Latte',
    desc: 'Whipped instant coffee foam — silky, airy, and golden — floated atop a tall glass of iced milk. Instagram-famous and impossibly delicious.',
    price: '$6.50', cal: '145 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=700&h=500&fit=crop',
    chips: ['Whipped Coffee', 'Iced Milk', 'Korean Style', 'Iced']
  },
  {
    id: 14, cat: 'cold', name: 'Salted Caramel Cold Brew',
    desc: 'Our 18-hr cold brew sweetened with house salted caramel sauce and topped with a swirl of sea-salt cream cold foam. Salty-sweet perfection.',
    price: '$7.00', cal: '200 kcal',
    popular: false,
    img: 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=700&h=500&fit=crop',
    chips: ['Cold Brew', 'Salted Caramel', 'Cold Foam', 'Iced']
  },
  {
    id: 15, cat: 'cold', name: 'Matcha Espresso Fusion',
    desc: 'Ceremonial-grade Japanese matcha shaken with coconut milk poured over a shot of espresso. Earthy, creamy, and surprisingly addictive.',
    price: '$7.50', cal: '175 kcal',
    popular: false,
    img: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=700&h=500&fit=crop',
    chips: ['Ceremonial Matcha', 'Coconut Milk', 'Espresso', 'Iced']
  },
  {
    id: 16, cat: 'cold', name: 'Strawberry Rose Latte',
    desc: 'House strawberry compote, a hint of rose water, espresso, and oat milk over crushed ice. Blush pink, fruity, and absolutely stunning.',
    price: '$7.20', cal: '190 kcal',
    popular: false,
    img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&h=500&fit=crop',
    chips: ['Strawberry Compote', 'Rose Water', 'Oat Milk', 'Iced']
  },

  // ── SPECIALS ──
  {
    id: 17, cat: 'specials', name: 'Black Sesame Latte',
    desc: 'Toasted black sesame paste, espresso, and steamed milk — a nutty, earthy, visually dramatic latte that\'s unlike anything you\'ve tasted.',
    price: '$7.80', cal: '210 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=700&h=500&fit=crop',
    chips: ['Black Sesame', 'House Espresso', 'Steamed Milk', 'Seasonal']
  },
  {
    id: 18, cat: 'specials', name: 'Turmeric Golden Latte',
    desc: 'Espresso, turmeric, ginger, black pepper, cinnamon, and steamed oat milk. Anti-inflammatory and stunningly golden — powerful and beautiful.',
    price: '$7.50', cal: '165 kcal',
    popular: false,
    img: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=700&h=500&fit=crop',
    chips: ['Turmeric', 'Ginger', 'Oat Milk', 'Wellness']
  },
  {
    id: 19, cat: 'specials', name: 'Tiramisu Latte',
    desc: 'Espresso layered with mascarpone-infused steamed milk, Kahlúa syrup, and dusted with Italian cocoa. Every sip is a dessert.',
    price: '$8.00', cal: '270 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1604881991720-f91add269bed?w=700&h=500&fit=crop',
    chips: ['Mascarpone Foam', 'Kahlúa Syrup', 'Cocoa Dust', 'Special']
  },
  {
    id: 20, cat: 'specials', name: 'Charcoal Black Latte',
    desc: 'Activated charcoal, coconut milk, and espresso create a jet-black, smoky-sweet latte that\'s as dramatic as it is delicious. Unforgettable.',
    price: '$7.80', cal: '150 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=700&h=500&fit=crop',
    chips: ['Activated Charcoal', 'Coconut Milk', 'Espresso', 'Dramatic']
  },

  // ── PASTRIES & BITES ──
  {
    id: 21, cat: 'bites', name: 'Butter Croissant',
    desc: 'Freshly baked daily — 72-hour laminated dough with French AOP butter, shatteringly crisp outside, pillowy honeycomb layers inside. A morning masterpiece.',
    price: '$4.50', cal: '340 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=700&h=500&fit=crop',
    chips: ['House-Baked', 'French Butter', '72-hr Dough', 'Vegetarian']
  },
  {
    id: 22, cat: 'bites', name: 'Chocolate Lava Muffin',
    desc: 'Warm dark chocolate muffin with a molten Valrhona centre, dusted with powdered sugar. Best paired with our Flat White. Prepare to be amazed.',
    price: '$5.50', cal: '420 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=700&h=500&fit=crop',
    chips: ['Valrhona Chocolate', 'Molten Centre', 'Warm', 'Vegetarian']
  },
  {
    id: 23, cat: 'bites', name: 'Avocado Toast',
    desc: 'Sourdough tartine, smashed Hass avocado, cherry tomatoes, everything-bagel seasoning, and a drizzle of chili-lime oil. Fresh, vibrant, craveable.',
    price: '$9.50', cal: '380 kcal',
    popular: false,
    img: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&h=500&fit=crop',
    chips: ['Sourdough', 'Hass Avocado', 'Chili-Lime', 'Vegan']
  },
  {
    id: 24, cat: 'bites', name: 'Cinnamon Roll',
    desc: 'Pillowy soft rolls swirled with brown butter and Vietnamese cinnamon, crowned with vanilla cream cheese frosting. Warm, gooey, purely euphoric.',
    price: '$6.00', cal: '490 kcal',
    popular: true,
    img: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=700&h=500&fit=crop',
    chips: ['Brown Butter', 'Vietnamese Cinnamon', 'Cream Cheese Frosting', 'House-Baked']
  }
];

// ─── FEATURED HERO IMAGES (cycle on splash & hero) ──────────
const heroImages = [
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&h=700&fit=crop',
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1400&h=700&fit=crop',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1400&h=700&fit=crop',
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1400&h=700&fit=crop',
];

// ─── ELEMENT REFS ────────────────────────────────────────────
const splash        = document.getElementById('splash');
const enterBtn      = document.getElementById('enterBtn');
const app           = document.getElementById('app');
const menuGrid      = document.getElementById('menuGrid');
const emptyState    = document.getElementById('emptyState');

const menuToggle    = document.getElementById('menuToggle');
const drawer        = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerClose   = document.getElementById('drawerClose');
const drawerLinks   = document.querySelectorAll('.drawer-link');

const searchToggle  = document.getElementById('searchToggle');
const searchBar     = document.getElementById('searchBar');
const searchInput   = document.getElementById('searchInput');
const searchClose   = document.getElementById('searchClose');

const catPills      = document.querySelectorAll('.cat-pill');

const modalOverlay  = document.getElementById('modalOverlay');
const modalClose    = document.getElementById('modalClose');
const modalImg      = document.getElementById('modalImg');
const modalTag      = document.getElementById('modalTag');
const modalName     = document.getElementById('modalName');
const modalDesc     = document.getElementById('modalDesc');
const modalMeta     = document.getElementById('modalMeta');
const modalPrice    = document.getElementById('modalPrice');
const modalCal      = document.getElementById('modalCal');
const modalOrderBtn = document.getElementById('modalOrderBtn');

// Hero banner cycling
const heroBg        = document.getElementById('heroBg');

// ─── STATE ──────────────────────────────────────────────────
let currentCat    = 'all';
let currentSearch = '';
let heroIdx       = 0;

// ─── HELPERS ────────────────────────────────────────────────
const catLabel = {
  espresso: 'Espresso', hot: 'Hot Coffee',
  cold: 'Iced & Cold', specials: 'Chef\'s Specials',
  bites: 'Pastries & Bites', uploaded: 'Uploaded Menu'
};
const catIcon = {
  espresso: '☕', hot: '🔥', cold: '🧊', specials: '✨', bites: '🥐', uploaded: '📷'
};

function filteredItems() {
  return menuItems.filter(item => {
    const matchCat    = currentCat === 'all' || item.cat === currentCat;
    const q           = currentSearch.toLowerCase();
    const matchSearch = !q ||
      item.name.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      (catLabel[item.cat] || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
}

// ─── RENDER CARDS ───────────────────────────────────────────
function renderCards() {
  const items = filteredItems();
  menuGrid.innerHTML = '';

  if (items.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  items.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'drink-card';
    card.style.animationDelay = `${idx * 0.05}s`;
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${item.img}" alt="${item.name}" loading="lazy">
        <div class="card-img-overlay"></div>
        <span class="card-badge badge-${item.cat}">${catIcon[item.cat]} ${catLabel[item.cat]}</span>
        ${item.popular ? '<span class="card-popular-badge">🔥 Popular</span>' : ''}
        <div class="card-quick-price">${item.price}</div>
      </div>
      <div class="card-body">
        <h3 class="card-name">${item.name}</h3>
        <p class="card-desc">${item.desc}</p>
        <div class="card-footer">
          <div class="card-footer-left">
            <span class="card-price">${item.price}</span>
            <span class="card-cal">${item.cal}</span>
          </div>
          <button class="card-add-btn" aria-label="View ${item.name}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openModal(item));
    menuGrid.appendChild(card);
  });
}

// ─── CATEGORY FILTER ────────────────────────────────────────
function setCategory(cat) {
  currentCat = cat;
  catPills.forEach(p => p.classList.toggle('active', p.dataset.cat === cat));
  drawerLinks.forEach(l => l.classList.toggle('active', l.dataset.cat === cat));
  renderCards();
}

catPills.forEach(pill => {
  pill.addEventListener('click', () => setCategory(pill.dataset.cat));
});

drawerLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    setCategory(link.dataset.cat);
    closeDrawer();
  });
});

// ─── SEARCH ─────────────────────────────────────────────────
searchToggle.addEventListener('click', () => {
  searchBar.classList.toggle('open');
  if (searchBar.classList.contains('open')) searchInput.focus();
});

searchClose.addEventListener('click', () => {
  searchBar.classList.remove('open');
  searchInput.value = '';
  currentSearch = '';
  renderCards();
});

searchInput.addEventListener('input', () => {
  currentSearch = searchInput.value;
  renderCards();
});

// ─── DRAWER ─────────────────────────────────────────────────
function openDrawer() {
  drawer.classList.add('open');
  drawerOverlay.classList.add('open');
  menuToggle.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  drawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
  menuToggle.classList.remove('open');
  document.body.style.overflow = '';
}

menuToggle.addEventListener('click', () => {
  drawer.classList.contains('open') ? closeDrawer() : openDrawer();
});
drawerClose.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

// ─── HERO IMAGE CYCLING ─────────────────────────────────────
function cycleHero() {
  heroIdx = (heroIdx + 1) % heroImages.length;
  heroBg.style.backgroundImage = `url('${heroImages[heroIdx]}')`;
}
setInterval(cycleHero, 4500);

// ─── MODAL ──────────────────────────────────────────────────
function openModal(item) {
  modalImg.src             = item.img;
  modalImg.alt             = item.name;
  modalTag.textContent     = `${catIcon[item.cat]} ${catLabel[item.cat]}`;
  modalTag.className       = `modal-tag modal-tag-${item.cat}`;
  modalName.textContent    = item.name;
  modalDesc.textContent    = item.desc;
  modalPrice.textContent   = item.price;
  modalCal.textContent     = item.cal;
  modalOrderBtn.textContent = `Order ${item.name} — ${item.price}`;

  modalMeta.innerHTML = item.chips
    .map(c => `<span class="meta-chip">${c}</span>`)
    .join('');

  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

modalOrderBtn.addEventListener('click', e => {
  e.stopPropagation();
  modalOrderBtn.textContent = '✓ Added to Order!';
  modalOrderBtn.classList.add('ordered');
  setTimeout(() => {
    modalOrderBtn.textContent = `Order ${modalName.textContent} — ${modalPrice.textContent}`;
    modalOrderBtn.classList.remove('ordered');
  }, 2000);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeDrawer(); }
});

// ─── SPLASH → APP ───────────────────────────────────────────
renderCards();

enterBtn.addEventListener('click', () => {
  splash.classList.add('fade-out');
  setTimeout(() => { splash.style.display = 'none'; }, 750);
});
