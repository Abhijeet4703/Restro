const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fsPromises = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const configureSocket = require('./config/socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests from client, tunnel, and no-origin (same-origin/server-rendered pages)
    const allowed = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      process.env.PUBLIC_SERVER_URL,
    ].filter(Boolean);
    if (!origin || allowed.some(o => origin.startsWith(o)) || origin.endsWith('.trycloudflare.com')) {
      callback(null, true);
    } else {
      callback(null, true); // permissive in dev
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurant', require('./routes/restaurant'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/order'));
app.use('/api/kitchen', require('./routes/kitchen'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/bills', require('./routes/bill'));
app.use('/api/online-orders', require('./routes/onlineOrder'));
app.use('/api/captain', require('./routes/captain'));
app.use('/api/kot', require('./routes/kot'));
app.use('/api/i18n', require('./routes/i18n'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Captain App — Mobile-optimized PWA for waiters/captains
app.get('/captain', (req, res) => {
  res.send(getCaptainAppHtml());
});

// Serve template static assets (CSS, JS)
app.use('/templates-static', express.static(path.join(__dirname, '..', 'templates')));

// Serve public assets (service worker, manifest)
app.use(express.static(path.join(__dirname, 'public')));

// AI image URL builder for dishes without uploaded images
function buildDishImageUrl(dishName, category, description) {
  const platingStyles = {
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

// Template preview route — renders chosen template with the restaurant's live menu data
app.get('/template-preview/:slug', async (req, res) => {
  try {
    const Restaurant = require('./models/Restaurant');
    const MenuItem = require('./models/MenuItem');

    const restaurant = await Restaurant.findOne({ slug: req.params.slug, isActive: true });
    if (!restaurant) return res.status(404).send('<h1 style="font-family:sans-serif">Restaurant not found</h1>');

    const templateName = restaurant.activeTemplate || 'royal-3d';
    const tableNumber = parseInt(req.query.table) || 0;
    const items = await MenuItem.find({ restaurantId: restaurant._id, isAvailable: true }).sort({ category: 1, sortOrder: 1 });

    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    const templatePath = path.join(__dirname, '..', 'templates', templateName, 'index.html');
    let html = await fsPromises.readFile(templatePath, 'utf-8');

    // Fix relative asset paths to absolute
    html = html.replace(/href="style\.css"/g, `href="/templates-static/${templateName}/style.css"`);
    html = html.replace(/src="script\.js"/g, `src="/templates-static/${templateName}/script.js"`);

    // Sanitise item data for safe JSON injection
    const safeItems = items.map(i => ({
      _id: i._id.toString(),
      name: i.name,
      description: i.description || '',
      price: i.price,
      image: i.image || buildDishImageUrl(i.name, i.category, i.description),
      category: i.category,
      isVeg: i.isVeg,
      prepTime: i.prepTime || 15,
      tags: i.tags || [],
    }));
    const safeGrouped = {};
    Object.entries(grouped).forEach(([cat, catItems]) => {
      safeGrouped[cat] = catItems.map(i => ({
        _id: i._id.toString(),
        name: i.name,
        description: i.description || '',
        price: i.price,
        image: i.image || buildDishImageUrl(i.name, i.category, i.description),
        category: i.category,
        isVeg: i.isVeg,
        prepTime: i.prepTime || 15,
        tags: i.tags || [],
      }));
    });

    const menuData = JSON.stringify({
      restaurant: {
        _id: restaurant._id.toString(),
        name: restaurant.name,
        description: restaurant.description || '',
        slug: restaurant.slug,
        template: templateName,
        logo: restaurant.logo || null,
        coverImage: restaurant.coverImage || null,
        upiId: restaurant.upiId || '',
        isOpen: restaurant.isOpen !== false,
      },
      items: safeItems,
      grouped: safeGrouped,
      tableNumber: tableNumber,
    // Safely escape so injected JSON cannot break out of the <script> tag (XSS prevention)
    }).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

    const serverOrigin = process.env.PUBLIC_SERVER_URL || `${req.protocol}://${req.get('host')}`;

    html = html.replace('</body>', `
<script src="${serverOrigin}/socket.io/socket.io.js"></script>
<script>window.__MENU_DATA__ = ${menuData};</script>
<script>window.__RESTRO_CFG__ = { apiBase: "${serverOrigin}/api", serverOrigin: "${serverOrigin}" };</script>
<script src="${serverOrigin}/restro-ui.js" defer></script>
</body>`);
    // Allow iframe embedding from the Next.js admin
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Template preview error:', error);
    res.status(500).send('<h1 style="font-family:sans-serif">Error loading template</h1><p>' + error.message + '</p>');
  }
});

// Onboarding preview — renders a template with menu data passed via postMessage (no DB lookup needed)
app.get('/onboarding-preview', async (req, res) => {
  try {
    const validTemplates = ['neon-glow', 'royal-3d', 'minimal-zen', 'vintage-paper', 'insta-reel'];
    const templateName = validTemplates.includes(req.query.template) ? req.query.template : 'royal-3d';

    const templatePath = path.join(__dirname, '..', 'templates', templateName, 'index.html');
    let html = await fsPromises.readFile(templatePath, 'utf-8');

    // Fix relative asset paths
    html = html.replace(/href="style\.css"/g, `href="/templates-static/${templateName}/style.css"`);
    html = html.replace(/src="script\.js"/g, `src="/templates-static/${templateName}/script.js"`);

    // Inject a listener that waits for menu data from the parent via postMessage
    const listenerScript = `
<script>
  function applyBranding(restaurant) {
    if (restaurant.logo) {
      var existing = document.getElementById('branding-logo');
      if (!existing) {
        var logoEl = document.createElement('img');
        logoEl.id = 'branding-logo';
        logoEl.src = restaurant.logo;
        logoEl.alt = 'Logo';
        logoEl.style.cssText = 'position:fixed;top:12px;right:12px;width:56px;height:56px;border-radius:50%;object-fit:cover;z-index:9999;border:2px solid rgba(255,255,255,0.8);box-shadow:0 2px 8px rgba(0,0,0,0.2);';
        document.body.appendChild(logoEl);
      }
    }
    if (restaurant.coverImage) {
      var existing2 = document.getElementById('branding-cover');
      if (!existing2) {
        var coverEl = document.createElement('div');
        coverEl.id = 'branding-cover';
        coverEl.style.cssText = 'width:100%;height:180px;background-image:url(' + restaurant.coverImage + ');background-size:cover;background-position:center;position:relative;z-index:1;';
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;background:linear-gradient(to bottom,transparent 60%,rgba(0,0,0,0.5));';
        coverEl.appendChild(overlay);
        var firstChild = document.body.firstChild;
        document.body.insertBefore(coverEl, firstChild);
      }
    }
  }
  function tryRender(restaurant, grouped, retries) {
    if (typeof renderFromData === 'function') {
      try { renderFromData(restaurant, grouped); } catch(e) { console.warn('renderFromData error:', e); }
    } else if (retries > 0) {
      setTimeout(function() { tryRender(restaurant, grouped, retries - 1); }, 150);
    }
  }
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'ONBOARDING_PREVIEW_DATA') {
      window.__MENU_DATA__ = event.data.payload;
      tryRender(event.data.payload.restaurant, event.data.payload.grouped, 20);
      applyBranding(event.data.payload.restaurant);
    }
  });
  // Signal parent that the iframe is ready
  window.parent.postMessage({ type: 'PREVIEW_IFRAME_READY' }, '*');
</script>`;
    html = html.replace('</body>', listenerScript + '\n</body>');

    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *; default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Onboarding preview error:', error);
    res.status(500).send('<h1 style="font-family:sans-serif">Error loading template preview</h1>');
  }
});

// Socket.IO
configureSocket(io);

// Captain App HTML generator — mobile-first PWA
function getCaptainAppHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<title>Captain App</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b;overscroll-behavior:none}
.login{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.login h1{font-size:24px;font-weight:800;margin-bottom:4px}.login p{color:#64748b;font-size:13px;margin-bottom:24px}
.login input{width:100%;max-width:320px;padding:12px 16px;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;margin-bottom:12px;outline:none}
.login input:focus{border-color:#10b981}.login button{width:100%;max-width:320px;padding:12px;background:#10b981;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer}
.app{display:none;flex-direction:column;min-height:100vh}
.topbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.topbar h2{font-size:16px;font-weight:700}.topbar .badge{background:#10b981;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px}
.tabs{display:flex;background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:49px;z-index:9}
.tabs button{flex:1;padding:10px 0;font-size:12px;font-weight:600;border:none;border-bottom:2px solid transparent;background:none;color:#94a3b8;cursor:pointer}
.tabs button.active{color:#10b981;border-bottom-color:#10b981}
.content{flex:1;padding:12px;overflow-y:auto;padding-bottom:80px}
.table-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.table-card{background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:14px;text-align:center;cursor:pointer;transition:.2s}
.table-card.occupied{border-color:#f59e0b;background:#fffbeb}.table-card.available{border-color:#10b981;background:#ecfdf5}
.table-card .num{font-size:22px;font-weight:800}.table-card .status{font-size:10px;font-weight:600;margin-top:4px}
.menu-item{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px;display:flex;align-items:center;gap:10px;margin-bottom:8px;cursor:pointer}
.menu-item .info{flex:1}.menu-item .name{font-size:13px;font-weight:600}.menu-item .cat{font-size:10px;color:#94a3b8}
.menu-item .price{font-size:14px;font-weight:700;color:#10b981}.menu-item .add{width:28px;height:28px;border-radius:50%;background:#ecfdf5;border:1px solid #10b981;color:#10b981;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.cart-bar{position:fixed;bottom:0;left:0;right:0;background:#10b981;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:700;cursor:pointer;z-index:20;display:none}
.cart-bar .count{background:rgba(255,255,255,.3);padding:2px 10px;border-radius:99px;font-size:12px}
.cart-panel{position:fixed;bottom:0;left:0;right:0;top:0;background:#fff;z-index:30;display:none;flex-direction:column}
.cart-panel .head{padding:14px 16px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between}
.cart-panel .head h3{font-size:16px;font-weight:700}.cart-panel .close{width:32px;height:32px;border-radius:50%;background:#f1f5f9;border:none;font-size:16px;cursor:pointer}
.cart-panel .items{flex:1;overflow-y:auto;padding:12px}.cart-panel .item{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9}
.cart-panel .item .n{flex:1;font-size:13px;font-weight:500}.cart-panel .item .qty{display:flex;align-items:center;gap:6px}
.cart-panel .item .qty button{width:24px;height:24px;border-radius:50%;border:1px solid #d1d5db;background:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.cart-panel .foot{padding:14px 16px;border-top:1px solid #e2e8f0}
.cart-panel .foot button{width:100%;padding:12px;background:#10b981;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer}
.cat-bar{display:flex;gap:6px;overflow-x:auto;padding:10px 12px;background:#fff;border-bottom:1px solid #f1f5f9;scrollbar-width:none}
.cat-bar::-webkit-scrollbar{display:none}.cat-bar button{padding:6px 14px;border-radius:99px;border:1px solid #e2e8f0;background:#fff;font-size:11px;font-weight:600;white-space:nowrap;cursor:pointer;color:#64748b}
.cat-bar button.active{background:#10b981;color:#fff;border-color:#10b981}
.search-box{padding:8px 12px;background:#fff}.search-box input{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none}
.toast{position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:99;display:none;animation:fadeIn .3s}
@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.table-select{padding:8px 12px;background:#fff;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px}
.table-select span{font-size:12px;color:#64748b}.table-select strong{font-size:14px;color:#10b981}
</style>
</head>
<body>

<div id="loginScreen" class="login">
  <h1>🍽️ Captain App</h1>
  <p>Login to take orders</p>
  <input id="loginEmail" type="email" placeholder="Email">
  <input id="loginPass" type="password" placeholder="Password">
  <button onclick="doLogin()">Login</button>
  <p id="loginError" style="color:#ef4444;font-size:12px;margin-top:8px;display:none"></p>
</div>

<div id="appScreen" class="app">
  <div class="topbar">
    <h2 id="restName">Captain</h2>
    <span class="badge" id="onlineBadge">Online</span>
  </div>
  <div class="tabs">
    <button class="active" onclick="showTab('tables')">🪑 Tables</button>
    <button onclick="showTab('menu')">🍽️ Menu</button>
    <button onclick="showTab('orders')">📋 Orders</button>
  </div>
  <div class="content" id="tabContent"></div>
  <div class="cart-bar" id="cartBar" onclick="openCart()">
    <span>View Cart</span>
    <span class="count" id="cartCount">0 items · ₹0</span>
  </div>
  <div class="toast" id="toast"></div>

  <div class="cart-panel" id="cartPanel">
    <div class="head"><h3>Cart</h3><button class="close" onclick="closeCart()">✕</button></div>
    <div class="table-select"><span>Table:</span><strong id="cartTable">-</strong></div>
    <div class="items" id="cartItems"></div>
    <div class="foot"><button onclick="submitOrder()">Place Order (KOT)</button></div>
  </div>
</div>

<script>
let token='',restId='',restName='',menuItems=[],tables=[],cart=[],selectedTable=0,currentTab='tables';
const API=window.location.origin+'/api';

async function doLogin(){
  const email=document.getElementById('loginEmail').value;
  const pass=document.getElementById('loginPass').value;
  try{
    const r=await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
    const d=await r.json();
    if(!r.ok){document.getElementById('loginError').textContent=d.message||'Login failed';document.getElementById('loginError').style.display='block';return}
    token=d.token;restId=d.user.restaurantId;restName=d.user.restaurantName||'Captain';
    localStorage.setItem('captain_token',token);localStorage.setItem('captain_restId',restId);localStorage.setItem('captain_restName',restName);
    startApp();
  }catch(e){document.getElementById('loginError').textContent='Network error';document.getElementById('loginError').style.display='block'}
}

function startApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('appScreen').style.display='flex';
  document.getElementById('restName').textContent=restName;
  loadTables();loadMenu();
}

async function apiFetch(url,opts={}){
  opts.headers={...(opts.headers||{}),'Authorization':'Bearer '+token,'Content-Type':'application/json'};
  const r=await fetch(API+url,opts);
  if(r.status===401){localStorage.clear();location.reload()}
  return r.json();
}

async function loadTables(){const d=await apiFetch('/captain/tables');tables=d.tables||[];if(currentTab==='tables')renderTables()}
async function loadMenu(){const d=await apiFetch('/captain/menu');menuItems=d.items||[];if(currentTab==='menu')renderMenu()}

function showTab(tab){
  currentTab=tab;
  document.querySelectorAll('.tabs button').forEach((b,i)=>{b.classList.toggle('active',['tables','menu','orders'][i]===tab)});
  if(tab==='tables')renderTables();else if(tab==='menu')renderMenu();else renderOrders();
}

function renderTables(){
  let h='<div class="table-grid">';
  tables.forEach(t=>{
    const cls=t.status==='occupied'?'occupied':'available';
    h+='<div class="table-card '+cls+'" onclick="selectTable('+t.number+')"><div class="num">'+t.number+'</div><div class="status">'+(t.name||'Table '+t.number)+'</div><div style="font-size:10px;color:#94a3b8;margin-top:2px">'+t.seats+' seats · '+t.status+'</div></div>';
  });
  h+='</div>';
  document.getElementById('tabContent').innerHTML=h;
}

function selectTable(n){
  selectedTable=n;
  document.getElementById('cartTable').textContent='Table '+n;
  showToast('Table '+n+' selected');
  showTab('menu');
}

function renderMenu(filter='all',search=''){
  let items=menuItems;
  if(filter!=='all')items=items.filter(i=>i.category===filter);
  if(search)items=items.filter(i=>i.name.toLowerCase().includes(search.toLowerCase()));
  const cats=[...new Set(menuItems.map(i=>i.category))];
  let h='<div class="search-box"><input placeholder="Search dishes..." oninput="renderMenu(currentCatFilter||\\x27all\\x27,this.value)"></div>';
  h+='<div class="cat-bar"><button class="'+(filter==='all'?'active':'')+'" onclick="currentCatFilter=\\x27all\\x27;renderMenu()">All</button>';
  cats.forEach(c=>{h+='<button class="'+(filter===c?'active':'')+'" onclick="currentCatFilter=\\x27'+c+'\\x27;renderMenu(\\x27'+c+'\\x27)">'+c+'</button>'});
  h+='</div>';
  items.forEach(i=>{
    const inCart=cart.find(c=>c.id===i._id);
    h+='<div class="menu-item" onclick="addToCart(\\x27'+i._id+'\\x27,\\x27'+i.name.replace(/'/g,'')+'\\x27,'+i.price+')"><div class="info"><div class="name">'+(i.isVeg?'🟢':'🔴')+' '+i.name+'</div><div class="cat">'+i.category+'</div></div><div class="price">₹'+i.price+'</div><div class="add">'+(inCart?inCart.qty:'+')+'</div></div>';
  });
  document.getElementById('tabContent').innerHTML=h;
}
let currentCatFilter='all';

function addToCart(id,name,price){
  const ex=cart.find(c=>c.id===id);
  if(ex)ex.qty++;else cart.push({id,name,price,qty:1});
  updateCartBar();showToast(name+' added');renderMenu(currentCatFilter);
}

function updateCartBar(){
  const total=cart.reduce((s,c)=>s+c.price*c.qty,0);
  const count=cart.reduce((s,c)=>s+c.qty,0);
  document.getElementById('cartCount').textContent=count+' items · ₹'+total;
  document.getElementById('cartBar').style.display=count>0?'flex':'none';
}

function openCart(){
  let h='';
  cart.forEach((c,i)=>{
    h+='<div class="item"><span class="n">'+c.name+'</span><div class="qty"><button onclick="changeCartQty('+i+',-1)">-</button><span>'+c.qty+'</span><button onclick="changeCartQty('+i+',1)">+</button></div><span style="font-size:13px;font-weight:700;color:#10b981;min-width:50px;text-align:right">₹'+(c.price*c.qty)+'</span></div>';
  });
  document.getElementById('cartItems').innerHTML=h||'<p style="text-align:center;color:#94a3b8;padding:40px 0">Cart is empty</p>';
  document.getElementById('cartPanel').style.display='flex';
}
function closeCart(){document.getElementById('cartPanel').style.display='none'}
function changeCartQty(i,d){cart[i].qty+=d;if(cart[i].qty<=0)cart.splice(i,1);updateCartBar();openCart()}

async function submitOrder(){
  if(!selectedTable){showToast('Select a table first!');return}
  if(cart.length===0){showToast('Cart is empty');return}
  try{
    const d=await apiFetch('/captain/order',{method:'POST',body:JSON.stringify({tableNumber:selectedTable,items:cart.map(c=>({menuItemId:c.id,quantity:c.qty}))})});
    if(d.success){showToast('Order placed: '+d.order.orderNumber);cart=[];updateCartBar();closeCart();showTab('tables');loadTables()}
    else showToast(d.message||'Failed');
  }catch(e){showToast('Network error')}
}

async function renderOrders(){
  if(!selectedTable){document.getElementById('tabContent').innerHTML='<p style="text-align:center;color:#94a3b8;padding:40px 0">Select a table first</p>';return}
  try{
    const d=await apiFetch('/captain/table/'+selectedTable+'/orders');
    const orders=d.orders||[];
    if(orders.length===0){document.getElementById('tabContent').innerHTML='<p style="text-align:center;color:#94a3b8;padding:40px 0">No active orders for Table '+selectedTable+'</p>';return}
    let h='';
    orders.forEach(o=>{
      h+='<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><strong style="font-size:13px">'+o.orderNumber+'</strong><span style="font-size:10px;padding:2px 8px;border-radius:99px;background:#f0fdf4;color:#10b981;font-weight:600">'+o.orderStatus+'</span></div>';
      o.items.forEach(it=>{h+='<div style="font-size:12px;color:#64748b">'+it.name+' x'+it.quantity+'</div>'});
      h+='<div style="text-align:right;font-weight:700;color:#10b981;margin-top:6px">₹'+o.totalAmount+'</div></div>';
    });
    document.getElementById('tabContent').innerHTML=h;
  }catch(e){document.getElementById('tabContent').innerHTML='<p style="color:#ef4444">Error loading orders</p>'}
}

function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',2000)}

// Auto-login from stored token
(function(){
  const t=localStorage.getItem('captain_token');
  if(t){token=t;restId=localStorage.getItem('captain_restId')||'';restName=localStorage.getItem('captain_restName')||'Captain';startApp()}
})();
</script>
</body>
</html>`;
}

// Connect DB and start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO ready`);
  });
});

module.exports = { app, server, io };
