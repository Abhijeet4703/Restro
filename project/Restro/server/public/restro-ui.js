/* ================================================================
   restro-ui.js — Universal customer UI for all Restro templates
   Injected by server.js into every template preview.
   Reads window.__MENU_DATA__ and window.__RESTRO_CFG__.
   ================================================================ */
(function () {
  'use strict';

  var d = window.__MENU_DATA__;
  var cfg = window.__RESTRO_CFG__ || {};
  if (!d) { console.error('[Restro] __MENU_DATA__ not found'); return; }

  var r = d.restaurant;
  var tableNum = d.tableNumber || 0;
  var apiBase = cfg.apiBase || (window.location.origin + '/api');
  var serverOrigin = cfg.serverOrigin || window.location.origin;

  /* ── STATE ── */
  var currentOrders = [];
  var socket = null;
  var waiterCallCooldown = false;
  var activePanelName = '';

  /* ── HELPERS ── */
  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function showToast(msg) {
    var t = document.getElementById('restro-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'restro-toast';
      t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(0,0,0,0.85);color:#fff;padding:10px 20px;border-radius:24px;font:600 13px/1 system-ui,sans-serif;z-index:999999;opacity:0;transition:all 0.3s;pointer-events:none;white-space:nowrap;max-width:90vw;text-align:center;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(10px)';
    }, 2800);
  }
  window.showToast = showToast;

  /* ── SOCKET.IO ── */
  if (tableNum > 0 && typeof io !== 'undefined') {
    try {
      socket = io(serverOrigin, { transports: ['websocket', 'polling'] });
      socket.on('connect', function () {
        socket.emit('join:table', { restaurantId: r._id, tableNumber: tableNum });
      });
      socket.on('order:status-update', function (data) {
        updateOrderInTracker(data);
        showToast(data.message || ('Order ' + data.status));
      });
      socket.on('order:eta-update', function (data) { updateETAInTracker(data); });
    } catch (e) { console.warn('[Restro] Socket init failed:', e); }
  }

  /* ── BRANDING ── */
  onReady(function () {
    if (r.logo) {
      var el = document.createElement('img');
      el.id = 'branding-logo';
      el.src = r.logo;
      el.alt = 'Logo';
      el.style.cssText = 'position:fixed;top:12px;right:12px;width:56px;height:56px;border-radius:50%;object-fit:cover;z-index:9999;border:2px solid rgba(255,255,255,0.8);box-shadow:0 2px 8px rgba(0,0,0,0.2);';
      document.body.appendChild(el);
    }
    if (tableNum > 0) {
      var badge = document.createElement('div');
      badge.id = 'table-badge';
      badge.innerHTML = '\uD83C\uDF7D\uFE0F Table ' + tableNum;
      badge.style.cssText = 'position:fixed;top:12px;left:12px;z-index:9999;background:rgba(0,0,0,0.75);color:#fff;padding:6px 14px;border-radius:20px;font:600 13px/1 system-ui,sans-serif;backdrop-filter:blur(6px);';
      document.body.appendChild(badge);
    }
  });

  /* ── QR SCAN REGISTRATION ── */
  if (tableNum > 0) {
    fetch(apiBase + '/restaurant/slug/' + r.slug + '/table/' + tableNum + '/scan', { method: 'GET' })
      .then(function (resp) { return resp.json().then(function (b) { return { ok: resp.ok, body: b }; }); })
      .then(function (res) {
        if (res.ok && res.body.status === 'disabled') {
          onReady(function () {
            var msg = document.createElement('div');
            msg.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);';
            msg.innerHTML = '<div style="background:#fff;border-radius:16px;padding:32px;text-align:center;max-width:300px;"><p style="font-size:20px;font-weight:700;margin:0 0 8px">Table Unavailable</p><p style="color:#666;margin:0;font-size:14px">This table is not currently available. Please ask staff for assistance.</p></div>';
            document.body.appendChild(msg);
          });
        }
      })
      .catch(function () {});
  }

  /* ── RESTAURANT CLOSED OVERLAY ── */
  if (!r.isOpen) {
    onReady(function () {
      var closed = document.createElement('div');
      closed.style.cssText = 'position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);';
      closed.innerHTML = '<div style="background:#fff;border-radius:16px;padding:36px;text-align:center;max-width:320px;box-shadow:0 20px 60px rgba(0,0,0,0.3);"><div style="font-size:48px;margin-bottom:12px">\uD83D\uDD5B</div><p style="font-size:20px;font-weight:700;margin:0 0 8px;color:#1a1a1a">We\u2019re Closed</p><p style="color:#666;margin:0;font-size:14px;line-height:1.5">' + r.name + ' is currently closed. Please check back during operating hours.</p></div>';
      document.body.appendChild(closed);
    });
  }

  /* ── NAME → ID MAP (compatibility) ── */
  var nameToId = {};
  (d.items || []).forEach(function (it) { nameToId[it.name] = it._id; });

  /* ══════════════════════════════════════════════════════════
     CART MANAGEMENT
     ══════════════════════════════════════════════════════════ */
  window.cart = window.cart || [];

  window.addToCart = function (itemId, name, price) {
    var existing = window.cart.find(function (c) { return c.id === itemId; });
    if (existing) { existing.qty++; }
    else { window.cart.push({ id: itemId, name: name, price: Number(price), qty: 1 }); }
    window.updateCartUI();
    _updateItemCounter(itemId);
  };

  window.removeFromCart = function (itemId) {
    var idx = window.cart.findIndex(function (c) { return c.id === itemId; });
    if (idx === -1) return;
    if (window.cart[idx].qty > 1) { window.cart[idx].qty--; }
    else { window.cart.splice(idx, 1); }
    window.updateCartUI();
    _updateItemCounter(itemId);
  };

  function _getCartQty(itemId) {
    var item = window.cart.find(function (c) { return c.id === itemId; });
    return item ? item.qty : 0;
  }

  function _updateItemCounter(itemId) {
    var card = document.querySelector('.ri-card[data-id="' + itemId + '"]');
    if (!card) return;
    var qty = _getCartQty(itemId);
    var ctrl = card.querySelector('.ri-add-ctrl');
    if (!ctrl) return;
    if (qty === 0) {
      ctrl.innerHTML = '<button class="ri-add-btn" onclick="addToCart(\'' + itemId + '\',this.closest(\'.ri-card\').dataset.name,+this.closest(\'.ri-card\').dataset.price)">+ Add</button>';
    } else {
      ctrl.innerHTML = '<div class="ri-qty-row"><button class="ri-qty-btn" onclick="removeFromCart(\'' + itemId + '\')">&#8722;</button><span class="ri-qty-val">' + qty + '</span><button class="ri-qty-btn" onclick="addToCart(\'' + itemId + '\',this.closest(\'.ri-card\').dataset.name,+this.closest(\'.ri-card\').dataset.price)">+</button></div>';
    }
  }

  window.updateCartUI = function () {
    var total = window.cart.reduce(function (s, c) { return s + c.price * c.qty; }, 0);
    var count = window.cart.reduce(function (s, c) { return s + c.qty; }, 0);
    var bar = document.getElementById('restro-cart-bar');
    if (bar) {
      if (count > 0) {
        bar.classList.add('visible');
        var countEl = bar.querySelector('.rcb-count');
        var totalEl = bar.querySelector('.rcb-total');
        if (countEl) countEl.textContent = count + (count === 1 ? ' item' : ' items');
        if (totalEl) totalEl.textContent = '\u20B9' + total;
      } else {
        bar.classList.remove('visible');
      }
    }
  };

  /* ══════════════════════════════════════════════════════════
     ORDER SUBMISSION
     ══════════════════════════════════════════════════════════ */
  window._doSubmitOrder = function (paymentMode, customerName, customerPhone, orderNote) {
    var cartItems = window.cart.slice();
    var orderItems = cartItems.map(function (c) {
      return { menuItemId: c.id || nameToId[c.name] || '', quantity: c.qty, notes: orderNote || '' };
    }).filter(function (o) { return o.menuItemId; });

    if (orderItems.length === 0) {
      showToast('Could not match cart items — please try again');
      return;
    }

    var confirmBtn = document.getElementById('restro-confirm-order-btn');
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Placing...'; }

    fetch(apiBase + '/orders/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: r._id,
        tableNumber: tableNum,
        items: orderItems,
        paymentMode: paymentMode,
        customerName: customerName || '',
        customerPhone: customerPhone || ''
      })
    })
      .then(function (resp) { return resp.json().then(function (b) { return { ok: resp.ok, body: b }; }); })
      .then(function (res) {
        var modalEl = document.getElementById('restro-order-modal');
        if (modalEl) modalEl.remove();
        if (res.ok) {
          var orderNum = (res.body.order && res.body.order.orderNumber) || '';
          showToast('\u2705 Order placed! #' + orderNum);
          currentOrders.push({
            orderId: res.body.order._id,
            orderNumber: orderNum,
            status: 'pending',
            items: cartItems.map(function (c) { return c.name + ' \xD7' + c.qty; }),
            rawItems: cartItems.map(function (c) { return { id: c.id, name: c.name, price: c.price, qty: c.qty }; }),
            totalAmount: res.body.order.totalAmount,
            estimatedTime: res.body.order.estimatedTime,
            placedAt: new Date()
          });
          updateTrackerUI();
          window.cart.length = 0;
          window.updateCartUI();
          // Reset all item add-buttons
          document.querySelectorAll('.ri-card').forEach(function (card) {
            var ctrl = card.querySelector('.ri-add-ctrl');
            if (!ctrl) return;
            var id = card.dataset.id;
            ctrl.innerHTML = '<button class="ri-add-btn" onclick="addToCart(\'' + id + '\',this.closest(\'.ri-card\').dataset.name,+this.closest(\'.ri-card\').dataset.price)">+ Add</button>';
          });
          setTimeout(function () { showPanel('tracker'); }, 1200);
        } else {
          showToast(res.body.message || 'Failed to place order');
          if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Place Order \u2192'; }
        }
      })
      .catch(function () {
        showToast('Network error \u2014 please try again');
        var btn2 = document.getElementById('restro-confirm-order-btn');
        if (btn2) { btn2.disabled = false; btn2.textContent = 'Place Order \u2192'; }
      });
  };

  /* ── ORDER MODAL ── */
  window.placeOrder = function () {
    var cartItems = window.cart;
    if (!cartItems || cartItems.length === 0) { showToast('Your cart is empty'); return; }
    if (!tableNum) { showToast('No table assigned \u2014 scan a QR code at the restaurant'); return; }

    var subtotal = cartItems.reduce(function (s, c) { return s + c.price * c.qty; }, 0);
    var gst = Math.round(subtotal * 0.05);
    var grand = subtotal + gst;

    var existing = document.getElementById('restro-order-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'restro-order-modal';
    modal.innerHTML = [
      '<div class="rom-backdrop" onclick="document.getElementById(\'restro-order-modal\').remove()"></div>',
      '<div class="rom-sheet">',
      '  <div class="rom-handle"></div>',
      '  <div class="rom-head">',
      '    <span class="rom-title">Confirm Order</span>',
      '    <button class="rom-close" onclick="document.getElementById(\'restro-order-modal\').remove()">&#x2715;</button>',
      '  </div>',
      '  <div class="rom-body">',
      '    <div class="rom-summary-card">',
      '      <div class="rom-items-count">' + cartItems.length + ' item(s) &bull; +5% GST</div>',
      '      <div><div class="rom-grand">\u20B9' + grand + '</div><div class="rom-gst-note">incl. GST</div></div>',
      '    </div>',
      '    <div class="rom-label">Payment Method</div>',
      '    <div class="rom-pay-row">',
      '      <label><input type="radio" name="rom-pay" value="pay-later" checked> Pay at Table</label>',
      '      <label><input type="radio" name="rom-pay" value="pay-now"> Pay via UPI</label>',
      '    </div>',
      '    <div class="rom-label" style="margin-top:14px">Your Name <span style="color:#ef4444">*</span></div>',
      '    <div class="rom-input-wrap">',
      '      <span class="rom-input-icon">\uD83D\uDC64</span>',
      '      <input class="rom-input" id="rom-name" type="text" placeholder="e.g. Rahul" maxlength="40" autocomplete="name">',
      '    </div>',
      '    <div class="rom-label" style="margin-top:14px">Mobile Number <span style="color:#ef4444">*</span></div>',
      '    <div class="rom-input-wrap">',
      '      <span class="rom-input-icon">\uD83D\uDCF1</span>',
      '      <input class="rom-input" id="rom-phone" type="tel" inputmode="numeric" pattern="[6-9][0-9]{9}" placeholder="10-digit number" maxlength="10" autocomplete="tel">',
      '    </div>',
      '    <div id="rom-field-error" style="display:none;font-size:12px;color:#ef4444;margin:4px 0;font-weight:600"></div>',
      '    <div class="rom-label" style="margin-top:14px">Note <span style="color:#9ca3af;font-size:11px;text-transform:none;font-weight:400">(optional)</span></div>',
      '    <textarea class="rom-textarea" id="rom-note" placeholder="Any special requests..." rows="2"></textarea>',
      '    <button class="rom-confirm-btn" id="restro-confirm-order-btn" onclick="window._romConfirm()">Place Order \u2192</button>',
      '  </div>',
      '</div>',
    ].join('');
    document.body.appendChild(modal);
    setTimeout(function () {
      var s = modal.querySelector('.rom-sheet');
      if (s) s.style.transform = 'translateY(0)';
    }, 10);
  };

  window._romConfirm = function () {
    var payRadio = document.querySelector('#restro-order-modal input[name="rom-pay"]:checked');
    var payMode = payRadio ? payRadio.value : 'pay-later';
    var name = ((document.getElementById('rom-name') || {}).value || '').trim();
    var phone = ((document.getElementById('rom-phone') || {}).value || '').trim();
    var note = (document.getElementById('rom-note') || {}).value || '';
    var errEl = document.getElementById('rom-field-error');
    if (!name) {
      if (errEl) { errEl.textContent = 'Please enter your name'; errEl.style.display = 'block'; }
      var nameEl = document.getElementById('rom-name');
      if (nameEl) nameEl.focus();
      return;
    }
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      if (errEl) { errEl.textContent = 'Please enter a valid 10-digit mobile number'; errEl.style.display = 'block'; }
      var phoneEl = document.getElementById('rom-phone');
      if (phoneEl) phoneEl.focus();
      return;
    }
    if (errEl) errEl.style.display = 'none';
    window._doSubmitOrder(payMode, name, phone, note);
  };

  /* ── LOAD SESSION ORDERS ON PAGE LOAD ── */
  if (tableNum > 0) {
    fetch(apiBase + '/orders/session/' + r._id + '/' + tableNum)
      .then(function (resp) { return resp.json(); })
      .then(function (data) {
        if (data.session && Array.isArray(data.session.orders)) {
          data.session.orders.forEach(function (o) {
            if (['completed', 'cancelled', 'rejected'].indexOf(o.orderStatus || o.status) === -1) {
              currentOrders.push({
                orderId: o._id,
                orderNumber: o.orderNumber,
                status: o.orderStatus || o.status || 'pending',
                items: (o.items || []).map(function (i) { return (i.name || 'Item') + ' \xD7' + (i.quantity || 1); }),
                totalAmount: o.totalAmount || 0,
                estimatedTime: o.estimatedTime || 0,
                placedAt: o.createdAt || new Date()
              });
            }
          });
          if (currentOrders.length > 0) updateTrackerUI();
        }
      })
      .catch(function () {});
  }

  /* ── ORDER READY BANNER ── */
  function showOrderReadyBanner(orderNumber) {
    var existing = document.getElementById('restro-ready-banner');
    if (existing) existing.remove();
    var banner = document.createElement('div');
    banner.id = 'restro-ready-banner';
    banner.innerHTML = '<div class="rrb-inner"><div class="rrb-ring"></div><div class="rrb-icon">\uD83C\uDF7D\uFE0F</div><div class="rrb-title">Your Order is Ready!</div><div class="rrb-sub">' + (orderNumber ? 'Order #' + orderNumber.split('-').pop() : 'Your order') + ' is at the counter</div><button class="rrb-btn" onclick="document.getElementById(\'restro-ready-banner\').remove()">Got it! \uD83D\uDC4D</button></div>';
    document.body.appendChild(banner);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]);
    setTimeout(function () {
      var b = document.getElementById('restro-ready-banner');
      if (b) { b.style.opacity = '0'; setTimeout(function () { b.remove(); }, 400); }
    }, 12000);
  }

  function updateOrderInTracker(data) {
    for (var i = 0; i < currentOrders.length; i++) {
      if (currentOrders[i].orderId === data.orderId) {
        currentOrders[i].status = data.status;
        if (data.status === 'ready') showOrderReadyBanner(currentOrders[i].orderNumber);
        break;
      }
    }
    updateTrackerUI();
  }

  function updateETAInTracker(data) {
    for (var i = 0; i < currentOrders.length; i++) {
      if (currentOrders[i].orderId === data.orderId) {
        currentOrders[i].estimatedTime = data.estimatedTime;
        break;
      }
    }
    updateTrackerUI();
  }

  /* ── AUTO-REFRESH FOR EDIT WINDOW TIMER ── */
  setInterval(function () {
    var hasEditable = currentOrders.some(function (o) {
      return ['pending', 'approved'].indexOf(o.status) !== -1 &&
        o.placedAt && (Date.now() - new Date(o.placedAt).getTime() < 62000);
    });
    if (hasEditable) {
      var timerEl = document.getElementById('oedit-timer');
      if (timerEl) {
        var order = currentOrders.find(function (o) { return o.orderId === window._editOrderId; });
        if (order && order.placedAt) {
          var s = Math.ceil((60000 - (Date.now() - new Date(order.placedAt).getTime())) / 1000);
          if (s <= 0) {
            var modal = document.getElementById('restro-edit-modal');
            if (modal) modal.remove();
            showToast('Edit window closed \u2014 cooking starting soon');
          } else {
            timerEl.textContent = s + 's left';
          }
        }
      }
      if (activePanelName === 'tracker') updateTrackerUI();
    }
  }, 2000);

  /* ══════════════════════════════════════════════════════════
     UNIVERSAL MENU BROWSER
     Replaces template <main> with a consistent live-data menu
     ══════════════════════════════════════════════════════════ */
  var CAT_DISPLAY = {
    'starters': 'Starters', 'starter': 'Starters',
    'main-course': 'Main Course', 'main course': 'Main Course', 'mains': 'Mains',
    'desserts': 'Desserts', 'dessert': 'Desserts',
    'beverages': 'Beverages', 'drinks': 'Drinks',
    'breads': 'Breads', 'bread': 'Breads',
    'soups': 'Soups', 'soup': 'Soups',
    'salads': 'Salads', 'salad': 'Salads',
    'snacks': 'Snacks', 'snack': 'Snacks',
    'non-veg': 'Non-Veg', 'nonveg': 'Non-Veg',
    'veg': 'Veg Specials',
    'biryani': 'Biryani', 'pizza': 'Pizza', 'burgers': 'Burgers',
    'pasta': 'Pasta', 'noodles': 'Noodles', 'rice': 'Rice',
    'dal': 'Dal & Curries', 'curries': 'Curries', 'curry': 'Curry',
    'breakfast': 'Breakfast', 'lunch': 'Lunch', 'dinner': 'Dinner',
    'specials': 'Chef\u2019s Specials', 'special': 'Chef\u2019s Specials',
  };

  function catLabel(cat) {
    return CAT_DISPLAY[cat.toLowerCase()] || (cat.charAt(0).toUpperCase() + cat.slice(1));
  }

  function renderUniversalMenu() {
    var grouped = d.grouped || {};
    var cats = Object.keys(grouped).filter(function (c) { return grouped[c] && grouped[c].length > 0; });

    /* ── Menu CSS ── */
    var mStyle = document.createElement('style');
    mStyle.textContent = [
      /* Don't nuke template CSS — just layer menu on top */
      'main,#main,.main,[role="main"]{position:relative!important;z-index:1!important}',
      'body{margin:0!important;padding-bottom:150px!important}',
      /* Wrapper */
      '#ri-wrap{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:600px;margin:0 auto;background:rgba(245,245,245,0.97);min-height:100vh;padding-bottom:20px}',
      /* Restaurant header */
      '#ri-header{padding:18px 16px 14px;background:linear-gradient(160deg,#111 0%,#1c1c1c 100%);color:#fff;text-align:center;border-bottom:1px solid rgba(255,255,255,.06)}',
      '#ri-header h1{font-size:20px;font-weight:800;margin:0 0 3px;letter-spacing:-.3px;line-height:1.25}',
      '#ri-header .ri-tagline{font-size:12px;color:rgba(255,255,255,.6);margin:0 0 10px;line-height:1.4}',
      '#ri-header .ri-open-pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;background:rgba(22,163,74,.2);color:#4ade80;border:1px solid rgba(74,222,128,.3);border-radius:20px;padding:3px 12px}',
      '#ri-header .ri-open-pill::before{content:"";width:6px;height:6px;border-radius:50%;background:#4ade80;animation:blink-dot 1.5s infinite}',
      '@keyframes blink-dot{0%,100%{opacity:1}50%{opacity:.4}}',
      /* Category tabs */
      '#ri-tabs-wrap{position:sticky;top:0;z-index:200;background:#fff;border-bottom:2px solid #f3f4f6;box-shadow:0 2px 8px rgba(0,0,0,.07)}',
      '#ri-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 14px;scrollbar-width:none;-ms-overflow-style:none}',
      '#ri-tabs::-webkit-scrollbar{display:none}',
      '.ri-tab{flex-shrink:0;padding:7px 18px;border-radius:20px;border:1.5px solid #e5e7eb;background:#fff;font:600 13px/1 system-ui,sans-serif;color:#6b7280;cursor:pointer;transition:all .18s;white-space:nowrap;-webkit-tap-highlight-color:transparent}',
      '.ri-tab:active{transform:scale(.95)}',
      '.ri-tab.active{background:#111;color:#fff;border-color:#111}',
      /* Category section */
      '.ri-section{background:#fff;margin-bottom:8px}',
      '.ri-section-title{font-size:13px;font-weight:800;color:#111;margin:0;padding:14px 16px 10px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:8px}',
      '.ri-cat-count{font-size:11px;font-weight:500;color:#9ca3af;margin-left:auto}',
      /* Item list — single column, horizontal cards */
      '.ri-list{display:flex;flex-direction:column}',
      /* Horizontal item card (Zomato/Swiggy style) */
      '.ri-card{display:flex;align-items:flex-start;padding:16px;gap:14px;border-bottom:1px solid #f3f4f6;background:#fff}',
      '.ri-card:last-child{border-bottom:none}',
      /* Left: text content */
      '.ri-card-left{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}',
      /* Veg / non-veg square dot */
      '.ri-type-dot{width:14px;height:14px;border-radius:3px;border:2px solid;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-bottom:3px}',
      '.ri-type-dot.veg{border-color:#16a34a}',
      '.ri-type-dot.veg::after{content:"";width:6px;height:6px;border-radius:50%;background:#16a34a;display:block}',
      '.ri-type-dot.nonveg{border-color:#dc2626}',
      '.ri-type-dot.nonveg::after{content:"";width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:7px solid #dc2626;display:block}',
      '.ri-name{font-size:14px;font-weight:700;color:#111;line-height:1.35;word-break:break-word}',
      '.ri-desc{font-size:12px;color:#9ca3af;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.ri-foot{display:flex;align-items:center;justify-content:space-between;margin-top:8px;gap:8px}',
      '.ri-price{font-size:14px;font-weight:800;color:#111;white-space:nowrap}',
      /* Right: image */
      '.ri-img-wrap{position:relative;width:88px;height:88px;border-radius:10px;overflow:hidden;background:#f3f4f6;flex-shrink:0}',
      '.ri-img{width:100%;height:100%;object-fit:cover;display:block}',
      /* Add button — outlined green */
      '.ri-add-btn{padding:7px 18px;background:#fff;color:#16a34a;border:1.5px solid #16a34a;border-radius:6px;font:700 13px/1 system-ui,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all .15s;white-space:nowrap}',
      '.ri-add-btn:active{background:#f0fdf4;transform:scale(.95)}',
      /* Qty stepper */
      '.ri-qty-row{display:inline-flex;align-items:center;border:1.5px solid #16a34a;border-radius:6px;overflow:hidden}',
      '.ri-qty-btn{width:32px;height:30px;background:#16a34a;color:#fff;border:none;font-size:18px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;flex-shrink:0;line-height:1}',
      '.ri-qty-btn:active{opacity:.75}',
      '.ri-qty-val{font-size:13px;font-weight:700;color:#16a34a;min-width:26px;text-align:center;background:#fff;padding:0 2px}',
      /* Empty state */
      '#ri-empty{text-align:center;padding:64px 20px;color:#9ca3af;background:#fff;margin:8px 0}',
      '#ri-empty .ri-empty-icon{font-size:52px;margin-bottom:12px;line-height:1}',
      '#ri-empty h3{font-size:17px;font-weight:700;color:#374151;margin:0 0 8px}',
      '#ri-empty p{font-size:13px;margin:0;line-height:1.5}',
      /* Cart bar */
      '#restro-cart-bar{position:fixed;bottom:72px;left:calc(12px + max(0px,(100vw - 600px)/2));right:calc(12px + max(0px,(100vw - 600px)/2));max-width:576px;margin:0 auto;z-index:99985;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border-radius:16px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 24px rgba(22,163,74,.4);transform:translateY(130%);transition:transform .35s cubic-bezier(.32,.72,0,1);cursor:pointer;font-family:system-ui,sans-serif}',
      '#restro-cart-bar.visible{transform:translateY(0)}',
      '.rcb-left{display:flex;flex-direction:column;gap:2px}',
      '.rcb-count{font-size:11px;font-weight:600;opacity:.8}',
      '.rcb-label{font-size:15px;font-weight:800}',
      '.rcb-total{font-size:20px;font-weight:800}',
    ].join('');
    document.head.appendChild(mStyle);

    /* ── Find container ── */
    var main = document.querySelector('main') ||
      document.querySelector('#app') ||
      document.querySelector('.menu-container') ||
      document.querySelector('.content') ||
      document.body;

    if (cats.length === 0) {
      /* No items — show empty state */
      var wrap = document.createElement('div');
      wrap.id = 'ri-wrap';
      wrap.innerHTML = '<div id="ri-header"><h1>' + r.name + '</h1>' +
        (r.description ? '<p class="ri-tagline">' + r.description + '</p>' : '') +
        '</div>' +
        '<div id="ri-empty"><div class="ri-empty-icon">\uD83C\uDF7D\uFE0F</div><h3>Menu Coming Soon</h3><p>The restaurant is still setting up their menu. Please check back later.</p></div>';
      if (main === document.body) {
        main.insertBefore(wrap, main.firstChild);
      } else {
        main.innerHTML = '';
        main.appendChild(wrap);
      }
    } else {
      /* Build full menu */
      var tabsHtml = '<div id="ri-tabs-wrap"><div id="ri-tabs">' +
        cats.map(function (cat, i) {
          return '<button class="ri-tab' + (i === 0 ? ' active' : '') + '" data-cat="' + cat + '" onclick="scrollToSection(\'' + cat + '\')">' + catLabel(cat) + '</button>';
        }).join('') + '</div></div>';

      var sectionsHtml = cats.map(function (cat) {
        var items = grouped[cat];
        var cardsHtml = items.map(function (item) {
          var safeName = (item.name || '').replace(/'/g, '\\\'').replace(/"/g, '&quot;');
          var imgSrc = item.image ||
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=70';
          return '<div class="ri-card" data-id="' + item._id + '" data-name="' + safeName + '" data-price="' + item.price + '">' +
            '<div class="ri-card-left">' +
            '<div class="ri-type-dot ' + (item.isVeg ? 'veg' : 'nonveg') + '"></div>' +
            '<div class="ri-name">' + item.name + '</div>' +
            (item.description ? '<div class="ri-desc">' + item.description + '</div>' : '') +
            '<div class="ri-foot">' +
            '<span class="ri-price">\u20B9' + item.price + '</span>' +
            '<div class="ri-add-ctrl"><button class="ri-add-btn" onclick="addToCart(\'' + item._id + '\',this.closest(\'.ri-card\').dataset.name,+this.closest(\'.ri-card\').dataset.price)">+ Add</button></div>' +
            '</div>' +
            '</div>' +
            '<div class="ri-img-wrap">' +
            '<img class="ri-img" src="' + imgSrc + '" alt="' + safeName + '" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=70\'">' +
            '</div>' +
            '</div>';
        }).join('');
        return '<div class="ri-section" id="ri-sec-' + cat + '">' +
          '<div class="ri-section-title">' + catLabel(cat) + '<span class="ri-cat-count">' + items.length + ' items</span></div>' +
          '<div class="ri-list">' + cardsHtml + '</div>' +
          '</div>';
      }).join('');

      var fullHtml = '<div id="ri-wrap">' +
        '<div id="ri-header"><h1>' + r.name + '</h1>' +
        (r.description ? '<p class="ri-tagline">' + r.description + '</p>' : '') +
        (r.isOpen ? '<span class="ri-open-pill">Open Now</span>' : '') +
        '</div>' +
        tabsHtml +
        sectionsHtml +
        '</div>';

      if (main === document.body) {
        var wrap2 = document.createElement('div');
        wrap2.innerHTML = fullHtml;
        main.insertBefore(wrap2.firstChild, main.firstChild);
      } else {
        main.innerHTML = fullHtml;
      }

      /* Scroll-spy using IntersectionObserver */
      if (window.IntersectionObserver) {
        setTimeout(function () {
          var sections = document.querySelectorAll('.ri-section');
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                var cat = entry.target.id.replace('ri-sec-', '');
                document.querySelectorAll('.ri-tab').forEach(function (tab) {
                  var isActive = tab.dataset.cat === cat;
                  tab.classList.toggle('active', isActive);
                  if (isActive) {
                    tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }
                });
              }
            });
          }, { threshold: 0.3, rootMargin: '-50px 0px -55% 0px' });
          sections.forEach(function (s) { io.observe(s); });
        }, 300);
      }
    }

    /* ── Cart bar ── */
    var cartBar = document.createElement('div');
    cartBar.id = 'restro-cart-bar';
    cartBar.setAttribute('role', 'button');
    cartBar.onclick = function () { window.placeOrder(); };
    cartBar.innerHTML = '<div class="rcb-left"><span class="rcb-count">0 items</span><span class="rcb-label">View Cart &amp; Order</span></div><span class="rcb-total">\u20B90</span>';
    document.body.appendChild(cartBar);
  }

  window.scrollToSection = function (cat) {
    var sec = document.getElementById('ri-sec-' + cat);
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('.ri-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.cat === cat);
    });
  };

  /* ══════════════════════════════════════════════════════════
     BOTTOM BAR + PANELS (dine-in only: tableNum > 0)
     ══════════════════════════════════════════════════════════ */
  onReady(function () {
    /* Always render menu browser */
    renderUniversalMenu();

    /* Bottom bar only for actual table scans */
    if (!tableNum) return;

    /* ── CSS ── */
    var style = document.createElement('style');
    style.textContent = [
      /* Bottom bar */
      '#restro-bar{position:fixed;bottom:0;left:0;right:0;z-index:99990;padding:0 0 env(safe-area-inset-bottom,0px);background:transparent}',
      /* Panel overlay */
      '.restro-panel-overlay{position:fixed;inset:0;z-index:99991;background:rgba(0,0,0,0.5);opacity:0;pointer-events:none;transition:opacity 0.3s}',
      '.restro-panel-overlay.open{opacity:1;pointer-events:auto}',
      /* Panel sheet */
      '.restro-panel{position:fixed;bottom:0;left:0;right:0;z-index:99992;background:#fff;border-radius:24px 24px 0 0;max-height:82vh;overflow-y:auto;transform:translateY(100%);transition:transform 0.4s cubic-bezier(0.32,0.72,0,1)}',
      '.restro-panel.open{transform:translateY(0)}',
      '.panel-handle{width:36px;height:4px;background:#ddd;border-radius:2px;margin:10px auto}',
      '.panel-header{display:flex;align-items:center;justify-content:space-between;padding:4px 20px 14px;border-bottom:1px solid #f0f0f0}',
      '.panel-header h3{margin:0;font-size:18px;font-weight:700;color:#1a1a1a}',
      '.panel-close{width:32px;height:32px;border:none;background:#f5f5f5;border-radius:50%;cursor:pointer;font-size:15px;color:#666;display:flex;align-items:center;justify-content:center}',
      '.restro-panel .panel-body{padding:16px 20px 20px}',
      /* Tracker */
      '.tracker-order{background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:12px}',
      '.tracker-order .order-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}',
      '.tracker-order .order-num{font-size:13px;font-weight:700;color:#1a1a1a}',
      '.tracker-order .order-status{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px}',
      '.tracker-order .order-items{font-size:12px;color:#6b7280;margin-bottom:10px;line-height:1.5}',
      '.tracker-order .order-eta{font-size:12px;color:#16a34a;font-weight:600}',
      '.tracker-steps{display:flex;align-items:center;gap:0;margin:12px 0 4px;padding:0 4px}',
      '.tracker-step{flex:1;display:flex;flex-direction:column;align-items:center;position:relative}',
      '.tracker-step .step-dot{width:22px;height:22px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:10px;position:relative;z-index:2;transition:all 0.3s}',
      '.tracker-step.done .step-dot{background:#16a34a;color:#fff}',
      '.tracker-step.current .step-dot{background:#f59e0b;color:#fff;box-shadow:0 0 0 4px rgba(245,158,11,0.2);animation:pulse-dot 2s infinite}',
      '.tracker-step .step-label{font-size:8px;color:#9ca3af;margin-top:4px;font-weight:600;text-transform:uppercase}',
      '.tracker-step.done .step-label,.tracker-step.current .step-label{color:#374151}',
      '.tracker-line{flex:1;height:2px;background:#e5e7eb;margin:0 -4px;position:relative;top:-10px}',
      '.tracker-line.done{background:#16a34a}',
      '@keyframes pulse-dot{0%,100%{box-shadow:0 0 0 4px rgba(245,158,11,0.2)}50%{box-shadow:0 0 0 8px rgba(245,158,11,0.1)}}',
      /* Waiter */
      '.waiter-btn-big{width:100%;padding:20px;border:2px dashed #d1d5db;border-radius:16px;background:#fafafa;cursor:pointer;text-align:center;transition:all 0.2s;font-family:inherit}',
      '.waiter-btn-big:active{transform:scale(0.97);border-color:#f59e0b;background:#fffbeb}',
      '.waiter-btn-big.sent{border-color:#16a34a;background:#f0fdf4}',
      /* UPI */
      '.upi-section{text-align:center;padding:12px 0}',
      /* Feedback */
      '.fb-stars{display:flex;justify-content:center;gap:8px;margin:20px 0}',
      '.fb-star{font-size:36px;cursor:pointer;transition:transform 0.15s;-webkit-tap-highlight-color:transparent;background:none;border:none;padding:4px}',
      '.fb-star:active{transform:scale(1.3)}',
      '.fb-star.lit{transform:scale(1.1)}',
      '.fb-comment{width:100%;padding:12px;border:1.5px solid #e5e7eb;border-radius:12px;font-size:14px;resize:none;min-height:80px;font-family:inherit;outline:none;transition:border-color 0.2s;box-sizing:border-box}',
      '.fb-comment:focus{border-color:#16a34a}',
      '.fb-submit{width:100%;padding:14px;background:#16a34a;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:12px;font-family:inherit}',
      '.fb-submit:disabled{background:#d1d5db;cursor:not-allowed}',
      '.fb-submit:active:not(:disabled){transform:scale(0.98)}',
      '.fb-thanks{text-align:center;padding:24px 0}',
      '.fb-thanks .thanks-icon{font-size:48px;margin-bottom:12px}',
      '.fb-thanks h4{font-size:18px;font-weight:700;margin:0 0 8px;color:#1a1a1a}',
      '.fb-thanks p{font-size:13px;color:#6b7280;margin:0}',
      /* Empty state */
      '.tracker-empty{text-align:center;padding:24px 0;color:#9ca3af}',
      '.tracker-empty .te-icon{font-size:36px;margin-bottom:8px}',
      '.tracker-empty p{font-size:13px;margin:0}',
      /* Cancel/edit button */
      '.order-edit-btn{margin-top:10px;width:100%;padding:8px;background:#fff;border:1.5px solid #f59e0b;color:#d97706;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px}',
      '.order-edit-btn:active{background:#fffbeb}',
      '.order-edit-btn .edit-timer{font-size:10px;background:#fef3c7;color:#92400e;border-radius:8px;padding:1px 6px;font-weight:700}',
      /* Edit modal */
      '.oedit-overlay{position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;justify-content:center}',
      '.oedit-sheet{background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;padding:0 0 env(safe-area-inset-bottom,16px);font-family:system-ui,-apple-system,sans-serif}',
      '.oedit-handle{width:36px;height:4px;background:#ddd;border-radius:2px;margin:10px auto}',
      '.oedit-header{display:flex;align-items:center;justify-content:space-between;padding:4px 20px 12px;border-bottom:1px solid #f0f0f0}',
      '.oedit-header h3{margin:0;font-size:16px;font-weight:700}',
      '.oedit-timer-badge{font-size:12px;font-weight:700;color:#d97706;background:#fef3c7;border-radius:20px;padding:3px 10px}',
      '.oedit-body{padding:16px 20px}',
      '.oedit-item{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f9fafb}',
      '.oedit-item-name{font-size:14px;font-weight:600;color:#1a1a1a;flex:1}',
      '.oedit-item-price{font-size:12px;color:#6b7280;margin-right:12px}',
      '.oedit-qty{display:flex;align-items:center;gap:8px}',
      '.oedit-qty-btn{width:28px;height:28px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;color:#374151}',
      '.oedit-qty-btn:active{background:#f3f4f6}',
      '.oedit-qty span{font-size:15px;font-weight:700;min-width:20px;text-align:center}',
      '.oedit-save{margin:16px 20px 0;width:calc(100% - 40px);padding:14px;background:#16a34a;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit}',
      '.oedit-save:active{background:#15803d}',
      '.oedit-save:disabled{background:#d1d5db;cursor:not-allowed}',
      /* Ready badge */
      '.order-ready-badge{margin-top:8px;font-size:12px;font-weight:700;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 10px;text-align:center}',
      /* Ready banner */
      '#restro-ready-banner{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);transition:opacity 0.4s}',
      '.rrb-inner{background:#fff;border-radius:24px;padding:40px 32px;text-align:center;max-width:320px;width:90%;box-shadow:0 24px 80px rgba(0,0,0,0.3);position:relative;overflow:hidden}',
      '.rrb-ring{position:absolute;inset:-20px;border-radius:50%;border:3px solid rgba(22,163,74,0.15);animation:rrb-pulse 2s infinite}',
      '.rrb-icon{font-size:64px;margin-bottom:12px;animation:rrb-bounce 0.6s cubic-bezier(0.34,1.56,0.64,1)}',
      '.rrb-title{font-size:24px;font-weight:800;color:#1a1a1a;margin-bottom:6px}',
      '.rrb-sub{font-size:14px;color:#6b7280;margin-bottom:24px}',
      '.rrb-btn{padding:14px 32px;background:#16a34a;color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;width:100%}',
      '.rrb-btn:active{transform:scale(0.97)}',
      '@keyframes rrb-pulse{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.05);opacity:0.6}}',
      '@keyframes rrb-bounce{0%{transform:scale(0.3)}100%{transform:scale(1)}}',
      /* Order modal */
      '#restro-order-modal{position:fixed;inset:0;z-index:99995;display:flex;align-items:flex-end;font-family:system-ui,-apple-system,sans-serif}',
      '.rom-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.5)}',
      '.rom-sheet{position:relative;width:100%;background:#fff;border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom,16px);transform:translateY(100%);transition:transform 0.35s cubic-bezier(0.32,0.72,0,1);max-height:90vh;overflow-y:auto}',
      '.rom-handle{width:36px;height:4px;background:#ddd;border-radius:2px;margin:10px auto 0}',
      '.rom-head{display:flex;align-items:center;justify-content:space-between;padding:14px 20px 10px;border-bottom:1px solid #f0f0f0}',
      '.rom-title{font-size:16px;font-weight:700;color:#1a1a1a}',
      '.rom-close{width:30px;height:30px;border:none;background:#f5f5f5;border-radius:50%;cursor:pointer;font-size:14px;color:#666;display:flex;align-items:center;justify-content:center}',
      '.rom-body{padding:16px 20px 24px}',
      '.rom-input{width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;outline:none;font-family:inherit;transition:border-color 0.2s;box-sizing:border-box;background:none}',
      '.rom-input:focus{border-color:#16a34a}',
      '.rom-textarea{width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;outline:none;font-family:inherit;resize:none;transition:border-color 0.2s;box-sizing:border-box}',
      '.rom-textarea:focus{border-color:#16a34a}',
      '.rom-confirm-btn{width:100%;margin-top:20px;padding:16px;background:#16a34a;color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit}',
      '.rom-confirm-btn:disabled{background:#d1d5db;cursor:not-allowed}',
      '.rom-confirm-btn:active:not(:disabled){transform:scale(0.98)}',
      /* Body bottom padding */
      'body{padding-bottom:72px !important}',
    ].join('\n');
    document.head.appendChild(style);

    /* ── style2 — premium overrides ── */
    var style2 = document.createElement('style');
    style2.textContent =
      '#restro-bar-inner{display:flex;justify-content:space-around;align-items:center;background:#18181b;border-radius:20px;padding:6px 4px;margin:0 8px 6px;box-shadow:0 4px 24px rgba(0,0,0,.35)}' +
      '#restro-bar .bar-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;color:#a1a1aa;font-family:inherit;font-size:10px;font-weight:600;padding:8px 4px;border-radius:14px;cursor:pointer;transition:all .18s;-webkit-tap-highlight-color:transparent}' +
      '#restro-bar .bar-btn.active,#restro-bar .bar-btn:active{color:#fff;background:rgba(255,255,255,.1)}' +
      '#restro-bar .bar-btn svg{display:block;margin:0 auto 2px}' +
      '.tracker-order.st-pending{border-left:4px solid #f59e0b}' +
      '.tracker-order.st-approved{border-left:4px solid #3b82f6}' +
      '.tracker-order.st-cooking{border-left:4px solid #f97316}' +
      '.tracker-order.st-ready{border-left:4px solid #10b981}' +
      '.tracker-order.st-served{border-left:4px solid #6b7280}' +
      '.tracker-order.st-rejected{border-left:4px solid #ef4444}' +
      '.waiter-call-btn{width:100%;background:none;border:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;font-family:inherit}' +
      '.wcb-inner{width:100%;padding:22px 16px;border:2px dashed #d1d5db;border-radius:18px;background:#fafafa;text-align:center;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:6px}' +
      '.wcb-inner:active{transform:scale(.97);border-color:#f59e0b;background:#fffbeb}' +
      '.wcb-inner.called{border-color:#16a34a;border-style:solid;background:#f0fdf4}' +
      '.wcb-emoji{font-size:40px;display:block}' +
      '.wcb-title{font-size:16px;font-weight:700;color:#1a1a1a}' +
      '.wcb-sub{font-size:12px;color:#6b7280}' +
      '.waiter-tip{margin-top:14px;padding:12px;background:#f9fafb;border-radius:12px;font-size:12px;color:#6b7280;text-align:center;line-height:1.5}' +
      '.upi-no-upi{text-align:center;padding:28px 16px;display:flex;flex-direction:column;align-items:center;gap:12px}' +
      '.ni-icon{font-size:44px}' +
      '.upi-no-upi p{font-size:14px;color:#6b7280;margin:0}' +
      '.ask-bill-btn{padding:12px 28px;background:#1a1a1a;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}' +
      '.upi-wrap{text-align:center;padding:8px 0;display:flex;flex-direction:column;align-items:center;gap:0}' +
      '.upi-amount{font-size:28px;font-weight:800;color:#1a1a1a;margin-bottom:14px}' +
      '.upi-qr-box{display:inline-block;padding:12px;background:#fff;border-radius:14px;border:2px solid #e5e7eb;margin-bottom:14px}' +
      '.upi-id-chip{font-size:14px;font-weight:700;color:#1a1a1a;background:#f3f4f6;padding:8px 18px;border-radius:20px;display:inline-block;margin-bottom:14px;letter-spacing:.3px}' +
      '.upi-open-btn{display:inline-block;padding:13px 32px;background:#5b21b6;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;font-family:inherit}' +
      '.fb-prompt{text-align:center;margin-bottom:4px}' +
      '.fp-sub{font-size:13px;color:#6b7280;margin:0 0 2px}' +
      '.fp-name{font-size:16px;font-weight:700;color:#1a1a1a;margin:0 0 12px}' +
      '.rom-label{font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px}' +
      '.rom-input-wrap{display:flex;align-items:center;gap:8px;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:12px;padding:4px 12px;margin-bottom:0;transition:border-color .2s}' +
      '.rom-input-wrap:focus-within{border-color:#16a34a}' +
      '.rom-input-icon{font-size:16px;flex-shrink:0}' +
      '.rom-input-wrap .rom-input{background:none;border:none;outline:none;padding:10px 0;font-size:15px;font-family:inherit;width:100%;color:#1a1a1a}' +
      '.rom-pay-row{display:flex;gap:12px;margin-bottom:0}' +
      '.rom-pay-row label{flex:1;display:flex;align-items:center;gap:6px;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:12px;font-size:13px;cursor:pointer;font-weight:600;transition:border-color .2s}' +
      '.rom-pay-row label:has(input:checked){border-color:#16a34a;background:#f0fdf4}' +
      '.rom-summary-card{display:flex;justify-content:space-between;align-items:center;background:#f9fafb;border-radius:12px;padding:12px 14px;margin-bottom:2px}' +
      '.rom-items-count{font-size:13px;color:#6b7280}' +
      '.rom-grand{font-size:22px;font-weight:800;color:#1a1a1a}' +
      '.rom-gst-note{font-size:10px;color:#9ca3af;text-align:right}' +
      '#rom-field-error{font-size:12px;color:#ef4444;margin:2px 0 4px;font-weight:600;min-height:16px}';
    document.head.appendChild(style2);

    /* ── Bottom bar HTML ── */
    var bar = document.createElement('div');
    bar.id = 'restro-bar';
    bar.innerHTML = '<div id="restro-bar-inner">' + [
      '<button class="bar-btn" onclick="showPanel(\'tracker\')" id="bar-tracker">',
      '  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>',
      '  Orders',
      '  <span class="bar-badge" id="order-badge" style="display:none;position:absolute;top:2px;right:6px;background:#ef4444;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:8px">0</span>',
      '</button>',
      '<button class="bar-btn" onclick="showPanel(\'waiter\')" id="bar-waiter">',
      '  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
      '  Waiter',
      '</button>',
      '<button class="bar-btn" onclick="showPanel(\'pay\')" id="bar-pay">',
      '  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
      '  Pay',
      '</button>',
      '<button class="bar-btn" onclick="showPanel(\'feedback\')" id="bar-feedback">',
      '  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      '  Rate',
      '</button>',
    ].join('') + '</div>';
    document.body.appendChild(bar);

    /* ── Overlay ── */
    var overlay = document.createElement('div');
    overlay.className = 'restro-panel-overlay';
    overlay.id = 'restro-overlay';
    overlay.onclick = function () { closePanel(); };
    document.body.appendChild(overlay);

    /* ── Panel container ── */
    var panel = document.createElement('div');
    panel.className = 'restro-panel';
    panel.id = 'restro-panel';
    panel.innerHTML = '<div class="panel-handle"></div><div class="panel-header"><h3 id="panel-title"></h3><button class="panel-close" onclick="closePanel()">\u2715</button></div><div class="panel-body" id="panel-body"></div>';
    document.body.appendChild(panel);

    /* ── Touch drag to close ── */
    (function () {
      var startY = 0, currentY = 0, dragging = false;
      panel.addEventListener('touchstart', function (e) {
        if (e.target.closest('.panel-handle,.panel-header')) {
          startY = e.touches[0].clientY; dragging = true;
        }
      }, { passive: true });
      panel.addEventListener('touchmove', function (e) {
        if (!dragging) return;
        currentY = e.touches[0].clientY;
        var diff = currentY - startY;
        if (diff > 0) panel.style.transform = 'translateY(' + diff + 'px)';
      }, { passive: true });
      panel.addEventListener('touchend', function () {
        if (!dragging) return;
        dragging = false;
        if (currentY - startY > 80) closePanel();
        else panel.style.transform = '';
        currentY = 0;
      });
    })();
  }); /* end onReady */

  /* ══════════════════════════════════════════════════════════
     PANEL SHOW / CLOSE
     ══════════════════════════════════════════════════════════ */
  window.showPanel = function (name) {
    activePanelName = name;
    var panel = document.getElementById('restro-panel');
    var overlay = document.getElementById('restro-overlay');
    var title = document.getElementById('panel-title');
    var body = document.getElementById('panel-body');
    if (!panel) return;
    panel.style.transform = '';

    ['tracker', 'waiter', 'pay', 'feedback'].forEach(function (n) {
      var btn = document.getElementById('bar-' + n);
      if (btn) btn.classList.toggle('active', n === name);
    });

    if (name === 'tracker') {
      title.textContent = 'Your Orders';
      updateTrackerUI();
    } else if (name === 'waiter') {
      title.textContent = 'Call Waiter';
      renderWaiterPanel(body);
    } else if (name === 'pay') {
      title.textContent = 'Pay Bill';
      renderPayPanel(body);
    } else if (name === 'feedback') {
      title.textContent = 'Rate Your Experience';
      renderFeedbackPanel(body);
    }

    panel.classList.add('open');
    overlay.classList.add('open');
  };

  window.closePanel = function () {
    var panel = document.getElementById('restro-panel');
    var overlay = document.getElementById('restro-overlay');
    if (panel) { panel.classList.remove('open'); panel.style.transform = ''; }
    if (overlay) overlay.classList.remove('open');
    ['tracker', 'waiter', 'pay', 'feedback'].forEach(function (n) {
      var btn = document.getElementById('bar-' + n);
      if (btn) btn.classList.remove('active');
    });
    activePanelName = '';
  };

  /* ══════════════════════════════════════════════════════════
     ORDER TRACKER
     ══════════════════════════════════════════════════════════ */
  var statusSteps = ['pending', 'approved', 'cooking', 'ready', 'served'];
  var statusLabels = { pending: 'Placed', approved: 'Confirmed', cooking: 'Cooking', ready: 'Ready', served: 'Served' };
  var statusColors = {
    pending: '#f59e0b', approved: '#3b82f6', cooking: '#ef4444',
    preparation: '#ef4444', plating: '#ef4444', ready: '#16a34a',
    served: '#6b7280', completed: '#6b7280', rejected: '#ef4444', cancelled: '#9ca3af'
  };

  function updateTrackerUI() {
    var body = document.getElementById('panel-body');
    var badge = document.getElementById('order-badge');
    var activeCount = currentOrders.filter(function (o) {
      return ['pending', 'approved', 'cooking', 'preparation', 'plating', 'ready'].indexOf(o.status) !== -1;
    }).length;

    if (badge) {
      badge.textContent = activeCount;
      badge.style.display = activeCount > 0 ? 'flex' : 'none';
    }

    if (activePanelName !== 'tracker') return;
    if (!body) return;

    if (currentOrders.length === 0) {
      body.innerHTML = '<div class="tracker-empty"><div class="te-icon">\uD83D\uDCE6</div><p>No orders yet. Browse the menu and place an order!</p></div>';
      return;
    }

    var html = '';
    currentOrders.forEach(function (order) {
      var statusColor = statusColors[order.status] || '#6b7280';
      var normalizedStatus = order.status;
      if (['preparation', 'plating'].indexOf(normalizedStatus) !== -1) normalizedStatus = 'cooking';

      html += '<div class="tracker-order st-' + normalizedStatus + '">';
      html += '<div class="order-head">';
      html += '<span class="order-num">#' + (order.orderNumber || '').split('-').pop() + '</span>';
      html += '<span class="order-status" style="background:' + statusColor + '15;color:' + statusColor + '">' + (statusLabels[normalizedStatus] || order.status) + '</span>';
      html += '</div>';

      /* Progress steps */
      html += '<div class="tracker-steps">';
      var stepIdx = statusSteps.indexOf(normalizedStatus);
      statusSteps.forEach(function (step, i) {
        var cls = i < stepIdx ? 'done' : (i === stepIdx ? 'current' : '');
        var icon = i < stepIdx ? '\u2713' : (i === stepIdx ? '\u25CF' : '\u25CB');
        html += '<div class="tracker-step ' + cls + '">';
        html += '<div class="step-dot">' + icon + '</div>';
        html += '<div class="step-label">' + statusLabels[step] + '</div>';
        html += '</div>';
        if (i < statusSteps.length - 1) {
          html += '<div class="tracker-line' + (i < stepIdx ? ' done' : '') + '"></div>';
        }
      });
      html += '</div>';

      html += '<div class="order-items">' + order.items.join(', ') + '</div>';
      if (order.estimatedTime && ['pending', 'approved', 'cooking'].indexOf(order.status) !== -1) {
        html += '<div class="order-eta">\u23F1 Est. ' + order.estimatedTime + ' min</div>';
      }
      if (order.status === 'rejected') {
        html += '<div style="font-size:12px;color:#ef4444;font-weight:600;margin-top:4px">Order was rejected by restaurant</div>';
      }
      if (order.status === 'ready') {
        html += '<div class="order-ready-badge">\uD83C\uDF7D\uFE0F Ready! Please collect or wait for your waiter.</div>';
      }

      var canEdit = ['pending', 'approved'].indexOf(order.status) !== -1 &&
        order.placedAt && (Date.now() - new Date(order.placedAt).getTime() < 60000);
      if (canEdit) {
        var secsLeft = Math.ceil((60000 - (Date.now() - new Date(order.placedAt).getTime())) / 1000);
        html += '<button class="order-edit-btn" onclick="window.editOrder(\'' + order.orderId + '\')">\u270F\uFE0F Edit Order<span class="edit-timer">' + secsLeft + 's</span></button>';
      }
      html += '</div>';
    });
    body.innerHTML = html;
  }

  /* ── EDIT ORDER (within 1-min window) ── */
  window.editOrder = function (orderId) {
    var order = currentOrders.find(function (o) { return o.orderId === orderId; });
    if (!order) return;
    if (['pending', 'approved'].indexOf(order.status) === -1 ||
      !order.placedAt || Date.now() - new Date(order.placedAt).getTime() >= 60000) {
      showToast('Edit window closed \u2014 cooking may have started');
      updateTrackerUI();
      return;
    }
    var rawItems = order.rawItems || [];
    if (rawItems.length === 0) { showToast('Item details unavailable for editing'); return; }

    var editItems = rawItems.map(function (i) { return { id: i.id, name: i.name, price: i.price, qty: i.qty }; });
    window._editItems = editItems;
    window._editOrderId = orderId;

    function renderEditModal() {
      var ex = document.getElementById('restro-edit-modal');
      if (ex) ex.remove();
      var secsLeft = Math.ceil((60000 - (Date.now() - new Date(order.placedAt).getTime())) / 1000);
      if (secsLeft <= 0) { showToast('Edit window closed'); return; }

      var modal = document.createElement('div');
      modal.id = 'restro-edit-modal';
      modal.className = 'oedit-overlay';

      var itemsHtml = editItems.map(function (item, idx) {
        return '<div class="oedit-item">' +
          '<div class="oedit-item-name">' + item.name + '</div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
          '<span class="oedit-item-price">\u20B9' + item.price.toFixed(0) + '</span>' +
          '<div class="oedit-qty">' +
          '<button class="oedit-qty-btn" onclick="window._editQty(' + idx + ',-1)">-</button>' +
          '<span id="oedit-qty-' + idx + '">' + item.qty + '</span>' +
          '<button class="oedit-qty-btn" onclick="window._editQty(' + idx + ',1)">+</button>' +
          '</div></div></div>';
      }).join('');

      var newTotal = editItems.reduce(function (s, i) { return s + i.price * i.qty; }, 0);

      modal.innerHTML = '<div class="oedit-sheet">' +
        '<div class="oedit-handle"></div>' +
        '<div class="oedit-header"><h3>Edit Order</h3><span class="oedit-timer-badge" id="oedit-timer">' + secsLeft + 's left</span></div>' +
        '<div class="oedit-body">' + itemsHtml + '</div>' +
        '<div style="padding:0 20px;margin-top:8px;font-size:13px;color:#6b7280">Total: <strong style="color:#1a1a1a">\u20B9' + newTotal.toFixed(0) + '</strong></div>' +
        '<button class="oedit-save" id="oedit-save-btn" onclick="window._submitEdit()">Save Changes</button>' +
        '</div>';

      modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
      document.body.appendChild(modal);
    }

    renderEditModal();

    window._editQty = function (idx, delta) {
      var newQty = (window._editItems[idx].qty || 0) + delta;
      if (newQty < 0) newQty = 0;
      window._editItems[idx].qty = newQty;
      var el = document.getElementById('oedit-qty-' + idx);
      if (el) el.textContent = newQty;
      var newTotal = window._editItems.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
      var totalEl = document.querySelector('#restro-edit-modal [style*="Total"]');
      if (totalEl) totalEl.innerHTML = 'Total: <strong style="color:#1a1a1a">\u20B9' + newTotal.toFixed(0) + '</strong>';
    };

    window._submitEdit = function () {
      var items = window._editItems.filter(function (i) { return i.qty > 0; });
      if (items.length === 0) { showToast('Order must have at least one item'); return; }
      var saveBtn = document.getElementById('oedit-save-btn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

      fetch(apiBase + '/orders/' + window._editOrderId + '/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(function (i) { return { menuItemId: i.id, quantity: i.qty }; }) })
      })
        .then(function (resp) { return resp.json().then(function (b) { return { ok: resp.ok, body: b }; }); })
        .then(function (res) {
          var modal = document.getElementById('restro-edit-modal');
          if (modal) modal.remove();
          if (res.ok) {
            for (var i = 0; i < currentOrders.length; i++) {
              if (currentOrders[i].orderId === window._editOrderId) {
                currentOrders[i].items = window._editItems.filter(function (x) { return x.qty > 0; }).map(function (x) { return x.name + ' \xD7' + x.qty; });
                currentOrders[i].rawItems = window._editItems.filter(function (x) { return x.qty > 0; });
                currentOrders[i].totalAmount = res.body.order.totalAmount;
                break;
              }
            }
            showToast('\u2705 Order updated!');
            updateTrackerUI();
          } else {
            showToast(res.body.message || 'Failed to update order');
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; }
          }
        })
        .catch(function () {
          showToast('Network error \u2014 try again');
          var sb = document.getElementById('oedit-save-btn');
          if (sb) { sb.disabled = false; sb.textContent = 'Save Changes'; }
        });
    };
  };

  /* ══════════════════════════════════════════════════════════
     CALL WAITER
     ══════════════════════════════════════════════════════════ */
  function renderWaiterPanel(body) {
    if (waiterCallCooldown) {
      body.innerHTML = '<button class="waiter-call-btn"><div class="wcb-inner called"><span class="wcb-emoji">\u2705</span><div class="wcb-title">Waiter Called!</div><div class="wcb-sub">Someone will be at Table ' + tableNum + ' shortly</div></div></button>' +
        '<div class="waiter-tip">\uD83D\uDCA1 You can request bill splitting, extra items, or special requests</div>';
      return;
    }
    body.innerHTML = '<button class="waiter-call-btn" onclick="callWaiter()"><div class="wcb-inner"><span class="wcb-emoji">\uD83D\uDE4B</span><div class="wcb-title">Call Waiter</div><div class="wcb-sub">Tap to call a staff member to Table ' + tableNum + '</div></div></button>' +
      '<div class="waiter-tip">\uD83D\uDCA1 You can also request extra items, bill splitting, or special requests</div>';
  }

  window.callWaiter = function () {
    if (waiterCallCooldown) return;
    waiterCallCooldown = true;
    if (socket && socket.connected) {
      socket.emit('waiter:call', { restaurantId: r._id, tableNumber: tableNum });
    }
    fetch(apiBase + '/orders/session/' + r._id + '/' + tableNum)
      .then(function (resp) { return resp.json(); })
      .then(function (data) {
        if (data.session && data.session.orders && data.session.orders.length > 0) {
          var lastOrder = data.session.orders[data.session.orders.length - 1];
          if (socket && socket.connected) {
            socket.emit('waiter:call', { restaurantId: r._id, tableNumber: tableNum, orderId: lastOrder._id });
          }
        }
      }).catch(function () {});
    showToast('Waiter called! Someone will be right over');
    renderWaiterPanel(document.getElementById('panel-body'));
    setTimeout(function () {
      waiterCallCooldown = false;
      if (activePanelName === 'waiter') renderWaiterPanel(document.getElementById('panel-body'));
    }, 30000);
  };

  /* ══════════════════════════════════════════════════════════
     UPI PAY
     ══════════════════════════════════════════════════════════ */
  function renderPayPanel(body) {
    var upiId = r.upiId || '';
    var sessionTotal = currentOrders.reduce(function (sum, o) { return sum + (o.totalAmount || 0); }, 0);

    if (!upiId) {
      body.innerHTML = '<div class="upi-no-upi"><span class="ni-icon">\uD83D\uDCB3</span><p>Payment will be settled by your waiter at the table.</p><button class="ask-bill-btn" onclick="callWaiter();closePanel()">\uD83D\uDE4B Ask for Bill</button></div>';
      return;
    }

    var amount = Math.ceil(sessionTotal * 1.05);
    var upiDeepLink = 'upi://pay?pa=' + encodeURIComponent(upiId) + '&pn=' + encodeURIComponent(r.name) + '&am=' + amount + '&cu=INR&tn=' + encodeURIComponent('Table ' + tableNum + ' - ' + r.name);
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(upiDeepLink);

    body.innerHTML = [
      '<div class="upi-wrap">',
      amount > 0 ? '<div class="upi-amount">\u20B9' + amount + '</div>' : '',
      '<div class="upi-qr-box"><img src="' + qrUrl + '" alt="UPI QR" width="160" height="160"></div>',
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:.5px;margin-bottom:6px">Pay to</div>',
      '<div class="upi-id-chip">' + upiId + '</div><br>',
      '<a href="' + upiDeepLink + '" class="upi-open-btn">Open UPI App \u2192</a>',
      '<div style="font-size:11px;color:#9ca3af;margin-top:14px;line-height:1.6">Scan QR or tap to open GPay, PhonePe, Paytm, etc.<br>Show confirmation to your waiter.</div>',
      '</div>',
    ].join('');
  }

  /* ══════════════════════════════════════════════════════════
     FEEDBACK
     ══════════════════════════════════════════════════════════ */
  var feedbackSent = false;
  var feedbackRating = 0;

  function renderFeedbackPanel(body) {
    if (feedbackSent) {
      body.innerHTML = '<div class="fb-thanks"><div class="thanks-icon">\uD83C\uDF89</div><h4>Thank you!</h4><p>Your feedback helps us serve you better</p></div>';
      return;
    }
    body.innerHTML = [
      '<div class="fb-prompt"><p class="fp-sub">How was your experience at</p><p class="fp-name">' + r.name + '</p></div>',
      '<div class="fb-stars" id="fb-stars">',
      [1, 2, 3, 4, 5].map(function (n) {
        return '<button class="fb-star" data-val="' + n + '" onclick="setRating(' + n + ')">\u2606</button>';
      }).join(''),
      '</div>',
      '<textarea class="fb-comment" id="fb-comment" placeholder="Tell us what you loved or what we can improve..."></textarea>',
      '<button class="fb-submit" id="fb-submit" onclick="submitFeedback()" disabled>Submit Feedback</button>',
    ].join('');
  }

  window.setRating = function (val) {
    feedbackRating = val;
    var stars = document.querySelectorAll('#fb-stars .fb-star');
    stars.forEach(function (s, i) {
      var lit = (i < val);
      s.textContent = lit ? '\u2605' : '\u2606';
      s.classList.toggle('lit', lit);
    });
    var btn = document.getElementById('fb-submit');
    if (btn) btn.disabled = false;
  };

  window.submitFeedback = function () {
    if (!feedbackRating) return;
    var btn = document.getElementById('fb-submit');
    var comment = (document.getElementById('fb-comment') || {}).value || '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

    fetch(apiBase + '/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: r._id,
        tableNumber: tableNum,
        rating: feedbackRating,
        comment: comment
      })
    })
      .then(function (resp) { return resp.json().then(function (b) { return { ok: resp.ok, body: b }; }); })
      .then(function () {
        feedbackSent = true;
        renderFeedbackPanel(document.getElementById('panel-body'));
        showToast('Thanks for your feedback!');
      })
      .catch(function () {
        showToast('Failed to send feedback');
        if (btn) { btn.disabled = false; btn.textContent = 'Submit Feedback'; }
      });
  };

  console.log('[Restro] restro-ui.js loaded — menu browser + customer features active');
})();
