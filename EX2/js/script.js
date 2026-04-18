// ================================================
// NEXUS — Futuristic Interactive Menu JS
// ================================================

// ---------- MENU DATA ----------
const menuData = [
  // COFFEE
  { id: 1,  name: "Espresso",           cat: "coffee",   price: 180, img: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&h=400&fit=crop", desc: "Intense single-shot espresso with a rich golden crema, brewed under high pressure for bold, concentrated flavour." },
  { id: 2,  name: "Cappuccino",         cat: "coffee",   price: 250, img: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&h=400&fit=crop", desc: "Velvety steamed milk layered over a double shot of espresso, crowned with micro-foam art." },
  { id: 3,  name: "Caramel Latte",      cat: "coffee",   price: 320, img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=400&fit=crop", desc: "Smooth espresso blended with steamed milk and house-made caramel syrup, drizzled with golden caramel." },
  { id: 4,  name: "Cold Brew",          cat: "coffee",   price: 280, img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&h=400&fit=crop", desc: "Slow-steeped for 18 hours, served over ice for a smooth, low-acid coffee with deep chocolatey notes." },
  { id: 5,  name: "Mocha Frappé",       cat: "coffee",   price: 350, img: "https://images.unsplash.com/photo-1579888944880-d98341245702?w=600&h=400&fit=crop", desc: "Blended espresso, Belgian dark chocolate, ice, and whipped cream — an indulgent frozen treat." },
  { id: 6,  name: "Affogato",           cat: "coffee",   price: 300, img: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&h=400&fit=crop", desc: "A scoop of rich vanilla gelato drowned in a freshly pulled shot of hot espresso." },

  // SNACKS
  { id: 7,  name: "Truffle Fries",      cat: "snacks",   price: 280, img: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=600&h=400&fit=crop", desc: "Crispy golden fries tossed with truffle oil, parmesan, and fresh herbs." },
  { id: 8,  name: "Bruschetta",         cat: "snacks",   price: 240, img: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&h=400&fit=crop", desc: "Toasted sourdough topped with vine-ripened tomatoes, basil, garlic, and balsamic glaze." },
  { id: 9,  name: "Loaded Nachos",      cat: "snacks",   price: 320, img: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&h=400&fit=crop", desc: "Corn tortilla chips smothered in melted cheddar, jalapeños, sour cream, and fresh salsa." },
  { id: 10, name: "Chicken Wings",      cat: "snacks",   price: 380, img: "https://images.unsplash.com/photo-1608039829572-9b0189c5b390?w=600&h=400&fit=crop", desc: "Crispy fried wings glazed in smoky BBQ or fiery buffalo sauce with blue cheese dip." },
  { id: 11, name: "Spring Rolls",       cat: "snacks",   price: 220, img: "https://images.unsplash.com/photo-1548507200-b4d4a8e8b2c7?w=600&h=400&fit=crop", desc: "Crispy vegetable spring rolls with a tangy sweet chilli dipping sauce." },
  { id: 12, name: "Garlic Bread",       cat: "snacks",   price: 160, img: "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=600&h=400&fit=crop", desc: "Oven-baked baguette loaded with garlic butter, mozzarella, and Italian herbs." },

  // DESSERTS
  { id: 13, name: "Molten Lava Cake",   cat: "desserts", price: 350, img: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&h=400&fit=crop", desc: "Warm chocolate fondant with a molten centre, served with vanilla ice cream." },
  { id: 14, name: "Tiramisu",           cat: "desserts", price: 380, img: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&h=400&fit=crop", desc: "Classic Italian layers of mascarpone cream, espresso-soaked ladyfingers, and cocoa." },
  { id: 15, name: "Crème Brûlée",       cat: "desserts", price: 320, img: "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600&h=400&fit=crop", desc: "Silky vanilla custard beneath a perfectly caramelized sugar crust." },
  { id: 16, name: "NY Cheesecake",      cat: "desserts", price: 340, img: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&h=400&fit=crop", desc: "Dense, creamy New York-style cheesecake with a berry compote topping." },
  { id: 17, name: "Panna Cotta",        cat: "desserts", price: 290, img: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=400&fit=crop", desc: "Silky Italian cream pudding with a delicate mango-passion fruit coulis." },
  { id: 18, name: "Churros",            cat: "desserts", price: 260, img: "https://images.unsplash.com/photo-1624371414361-e670eeb6019a?w=600&h=400&fit=crop", desc: "Cinnamon-sugar dusted churros paired with warm Belgian chocolate dipping sauce." },

  // DRINKS
  { id: 19, name: "Berry Smoothie",     cat: "drinks",   price: 250, img: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&h=400&fit=crop", desc: "Fresh strawberries, blueberries, and banana blended with Greek yoghurt and honey." },
  { id: 20, name: "Mango Mojito",       cat: "drinks",   price: 280, img: "https://images.unsplash.com/photo-1546171753-97d7676e4602?w=600&h=400&fit=crop", desc: "Tropical mango muddled with fresh mint, lime, and soda — refreshing & vibrant." },
  { id: 21, name: "Iced Matcha",        cat: "drinks",   price: 300, img: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&h=400&fit=crop", desc: "Premium ceremonial-grade matcha whisked with oat milk over ice." },
  { id: 22, name: "Watermelon Cooler",  cat: "drinks",   price: 200, img: "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&h=400&fit=crop", desc: "Fresh watermelon juice with a splash of lime, mint sprig, and crushed ice." },
  { id: 23, name: "Peach Iced Tea",     cat: "drinks",   price: 220, img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=400&fit=crop", desc: "House-brewed black tea infused with ripe peach, served chilled with a lemon slice." },
  { id: 24, name: "Hot Chocolate",      cat: "drinks",   price: 260, img: "https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=600&h=400&fit=crop", desc: "Rich Belgian chocolate melted into steamed milk, topped with whipped cream and cocoa." },
];

// ---------- DOM REFS ----------
const landing      = document.getElementById('landing');
const enterBtn     = document.getElementById('enterBtn');
const app          = document.getElementById('app');
const categoryNav  = document.getElementById('categoryNav');
const menuGrid     = document.getElementById('menuGrid');
const noResults    = document.getElementById('noResults');
const recoStrip    = document.getElementById('recoStrip');
const searchInput  = document.getElementById('searchInput');
const searchResults= document.getElementById('searchResults');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose   = document.getElementById('modalClose');
const cartToggle   = document.getElementById('cartToggle');
const cartOverlay  = document.getElementById('cartOverlay');
const cartClose    = document.getElementById('cartClose');
const cartItems    = document.getElementById('cartItems');
const cartCount    = document.getElementById('cartCount');
const cartTotal    = document.getElementById('cartTotal');
const checkoutBtn  = document.getElementById('checkoutBtn');
const canvas       = document.getElementById('particleCanvas');
const ctx          = canvas.getContext('2d');

// ---------- STATE ----------
let currentCat = 'all';
let cart = [];

// ========== PARTICLES ==========
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticles() {
  particles = [];
  const count = Math.floor((canvas.width * canvas.height) / 12000);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      o: Math.random() * 0.5 + 0.1,
    });
  }
}

function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    p.x += p.dx;
    p.y += p.dy;
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 212, 255, ${p.o})`;
    ctx.fill();
  }
  requestAnimationFrame(drawParticles);
}

window.addEventListener('resize', () => { resizeCanvas(); createParticles(); });
resizeCanvas();
createParticles();
drawParticles();

// ========== LANDING → APP ==========
enterBtn.addEventListener('click', () => {
  landing.classList.add('hidden');
  setTimeout(() => {
    landing.style.display = 'none';
    app.classList.add('visible');
  }, 800);
});

// ========== RENDER MENU CARDS ==========
function renderMenu(items) {
  menuGrid.innerHTML = '';
  noResults.classList.toggle('visible', items.length === 0);

  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${item.img}" alt="${item.name}" loading="lazy">
        <span class="card-cat-badge">${item.cat}</span>
      </div>
      <div class="card-body">
        <div class="card-name">${item.name}</div>
        <div class="card-desc">${item.desc}</div>
        <div class="card-footer">
          <span class="card-price">₹${item.price}</span>
          <button class="card-add-btn" data-id="${item.id}" title="Add to cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>`;

    // Open modal on card click (but not on add button)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-add-btn')) return;
      openModal(item);
    });

    menuGrid.appendChild(card);
  });

  // Add-to-cart buttons
  menuGrid.querySelectorAll('.card-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(Number(btn.dataset.id));
    });
  });
}

// ========== RECOMMENDATIONS ==========
function renderRecommendations() {
  const shuffled = [...menuData].sort(() => 0.5 - Math.random()).slice(0, 8);
  recoStrip.innerHTML = '';
  shuffled.forEach(item => {
    const card = document.createElement('div');
    card.className = 'reco-card';
    card.innerHTML = `
      <img src="${item.img}" alt="${item.name}" loading="lazy">
      <div class="reco-info">
        <div class="reco-name">${item.name}</div>
        <div class="reco-price">₹${item.price}</div>
      </div>`;
    card.addEventListener('click', () => openModal(item));
    recoStrip.appendChild(card);
  });
}

// ========== CATEGORY FILTER ==========
categoryNav.addEventListener('click', (e) => {
  const pill = e.target.closest('.cat-pill');
  if (!pill) return;

  categoryNav.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');

  currentCat = pill.dataset.cat;
  const filtered = currentCat === 'all' ? menuData : menuData.filter(i => i.cat === currentCat);
  renderMenu(filtered);
});

// ========== SEARCH ==========
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();

  if (!q) {
    searchResults.classList.remove('open');
    searchResults.innerHTML = '';
    const filtered = currentCat === 'all' ? menuData : menuData.filter(i => i.cat === currentCat);
    renderMenu(filtered);
    return;
  }

  const matches = menuData.filter(i =>
    i.name.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q)
  );

  // Show dropdown
  searchResults.innerHTML = '';
  if (matches.length) {
    matches.forEach(item => {
      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.innerHTML = `
        <img src="${item.img}" alt="${item.name}">
        <span class="sr-name">${item.name}</span>
        <span class="sr-price">₹${item.price}</span>`;
      div.addEventListener('click', () => {
        openModal(item);
        searchResults.classList.remove('open');
        searchInput.value = '';
      });
      searchResults.appendChild(div);
    });
    searchResults.classList.add('open');
  } else {
    searchResults.classList.remove('open');
  }

  // Also update grid
  renderMenu(matches);
});

// Close search when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) {
    searchResults.classList.remove('open');
  }
});

// ========== MODAL ==========
function openModal(item) {
  document.getElementById('modalImg').src = item.img;
  document.getElementById('modalCat').textContent = item.cat;
  document.getElementById('modalName').textContent = item.name;
  document.getElementById('modalDesc').textContent = item.desc;
  document.getElementById('modalPrice').textContent = `₹${item.price}`;

  // Dynamic background colour tint
  const visual = document.getElementById('modalVisual');
  const colours = {
    coffee: 'linear-gradient(to bottom, rgba(139,69,19,0.4), transparent)',
    snacks: 'linear-gradient(to bottom, rgba(255,152,0,0.3), transparent)',
    desserts: 'linear-gradient(to bottom, rgba(233,30,99,0.3), transparent)',
    drinks: 'linear-gradient(to bottom, rgba(0,212,255,0.3), transparent)',
  };
  visual.style.background = colours[item.cat] || '';

  const addBtn = document.getElementById('modalAdd');
  addBtn.onclick = () => {
    addToCart(item.id);
    modalOverlay.classList.remove('open');
  };

  modalOverlay.classList.add('open');
}

modalClose.addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('open');
});

// ========== CART ==========
function addToCart(id) {
  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, qty: 1 });
  }
  updateCart();

  // Bump animation
  cartCount.classList.remove('bump');
  void cartCount.offsetWidth;
  cartCount.classList.add('bump');
}

function updateCart() {
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  cartCount.textContent = totalItems;

  let totalPrice = 0;
  cartItems.innerHTML = '';

  if (cart.length === 0) {
    cartItems.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
  } else {
    cart.forEach(c => {
      const item = menuData.find(m => m.id === c.id);
      totalPrice += item.price * c.qty;
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <img src="${item.img}" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₹${item.price * c.qty}</div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" data-id="${c.id}" data-action="dec">−</button>
          <span class="qty-num">${c.qty}</span>
          <button class="qty-btn" data-id="${c.id}" data-action="inc">+</button>
        </div>`;
      cartItems.appendChild(div);
    });
  }

  cartTotal.textContent = `₹${totalPrice}`;

  // Qty buttons
  cartItems.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      const entry = cart.find(c => c.id === id);
      if (action === 'inc') entry.qty++;
      if (action === 'dec') {
        entry.qty--;
        if (entry.qty <= 0) cart = cart.filter(c => c.id !== id);
      }
      updateCart();
    });
  });
}

cartToggle.addEventListener('click', () => cartOverlay.classList.add('open'));
cartClose.addEventListener('click', () => cartOverlay.classList.remove('open'));
cartOverlay.addEventListener('click', (e) => {
  if (e.target === cartOverlay) cartOverlay.classList.remove('open');
});

checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) return;
  alert('Order placed successfully! 🎉');
  cart = [];
  updateCart();
  cartOverlay.classList.remove('open');
});

// ========== INIT ==========
renderMenu(menuData);
renderRecommendations();
updateCart();
