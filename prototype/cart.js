// Take Off Club — Shared Cart + Checkout
// Plain script, no module syntax. Idempotent.
(function () {
  if (window.takeOffCart) return;

  // ── State helpers ─────────────────────────────────────────────────────────
  function storageGet(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function storageSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  // ── Pub/sub ───────────────────────────────────────────────────────────────
  var _subscribers = [];
  function notify() { _subscribers.forEach(function (fn) { try { fn(cart.getItems()); } catch (e) {} }); }

  // ── State ─────────────────────────────────────────────────────────────────
  var _items = storageGet('takeOffCart') || [];
  function persist() { storageSet('takeOffCart', _items); }

  // ── Public API ────────────────────────────────────────────────────────────
  var cart = {
    add: function (item) {
      _items.push(item);
      persist();
      notify();
      cart.open();
    },
    remove: function (idx) {
      _items.splice(idx, 1);
      persist();
      notify();
      renderDrawer();
    },
    clear: function () {
      _items = [];
      persist();
      notify();
    },
    open: function () { renderDrawer(); showDrawer(true); },
    close: function () { hideDrawer(); },
    toggle: function () { var d = document.getElementById('tk-cart-drawer'); if (d && d.style.transform === 'translateX(0px)') { cart.close(); } else { cart.open(); } },
    openCheckout: function () { renderCheckout(); showCheckout(); },
    getCount: function () { return _items.length; },
    getTotal: function () { return _items.reduce(function (a, b) { return a + (b._raw || 0); }, 0); },
    getItems: function () { return _items.slice(); },
    subscribe: function (fn) {
      _subscribers.push(fn);
      return function () { _subscribers = _subscribers.filter(function (s) { return s !== fn; }); };
    },
  };

  window.takeOffCart = cart;

  // ── CSS ───────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    // Drawer
    '.tk-cart-overlay{position:fixed;inset:0;z-index:150;background:rgba(7,15,36,.6);backdrop-filter:blur(3px);display:none;}',
    '.tk-cart-overlay.open{display:block;}',
    '.tk-cart-drawer{position:fixed;top:0;right:0;bottom:0;z-index:151;width:min(420px,92vw);background:#0c1c3f;border-left:1px solid rgba(196,239,63,.2);display:flex;flex-direction:column;box-shadow:-20px 0 60px rgba(0,0,0,.5);transform:translateX(100%);transition:transform .35s cubic-bezier(.2,.7,.2,1);}',
    '.tk-cart-drawer.open{transform:translateX(0);}',
    '.tk-cart-head{display:flex;align-items:center;justify-content:space-between;padding:24px;border-bottom:1px solid rgba(244,245,238,.1);}',
    '.tk-cart-title{font-family:Anton,sans-serif;font-size:26px;color:#fff;letter-spacing:.02em;text-transform:uppercase;}',
    '.tk-cart-x{cursor:pointer;font-size:26px;color:rgba(244,245,238,.6);background:none;border:none;line-height:1;padding:0;}',
    '.tk-cart-body{flex:1;overflow-y:auto;padding:18px 24px;display:flex;flex-direction:column;gap:12px;}',
    '.tk-cart-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;background:rgba(244,245,238,.05);border-radius:13px;}',
    '.tk-cart-item-name{font-weight:600;font-size:14px;color:#fff;}',
    '.tk-cart-item-sub{font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.1em;color:rgba(244,245,238,.55);margin-top:3px;}',
    '.tk-cart-item-price{font-family:Anton,sans-serif;font-size:20px;color:#c4ef3f;}',
    '.tk-cart-item-rm{cursor:pointer;color:rgba(244,245,238,.5);font-size:18px;background:none;border:none;line-height:1;padding:0;}',
    '.tk-cart-empty{color:rgba(244,245,238,.5);font-size:14px;line-height:1.6;margin-top:30px;text-align:center;}',
    '.tk-cart-foot{padding:22px 24px;border-top:1px solid rgba(244,245,238,.1);}',
    '.tk-cart-total-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px;}',
    '.tk-cart-total-label{font-family:"Space Mono",monospace;font-size:12px;letter-spacing:.16em;color:rgba(244,245,238,.65);}',
    '.tk-cart-total-val{font-family:Anton,sans-serif;font-size:34px;color:#c4ef3f;}',
    '.tk-cart-checkout-btn{width:100%;padding:16px;border-radius:13px;text-align:center;font-weight:700;cursor:pointer;background:#c4ef3f;color:#0a1733;font-family:"Space Grotesk",sans-serif;font-size:15px;border:none;}',
    '.tk-cart-checkout-btn:hover{opacity:.92;}',
    // Checkout modal
    '.tk-co-overlay{position:fixed;inset:0;z-index:400;background:rgba(7,15,36,.75);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:20px;}',
    '.tk-co-overlay.open{display:flex;}',
    '.tk-co-card{background:#0a1733;border:1px solid rgba(196,239,63,.18);border-radius:22px;padding:36px;width:100%;max-width:560px;position:relative;max-height:90vh;overflow-y:auto;box-shadow:0 40px 100px rgba(0,0,0,.6);}',
    '.tk-co-close{position:absolute;top:16px;right:20px;cursor:pointer;font-size:22px;color:rgba(244,245,238,.5);background:none;border:none;line-height:1;}',
    '.tk-co-stepper{display:flex;gap:10px;justify-content:center;margin-bottom:28px;}',
    '.tk-co-step{width:32px;height:6px;border-radius:999px;background:rgba(196,239,63,.25);transition:background .3s;}',
    '.tk-co-step.active{background:#c4ef3f;}',
    '.tk-co-step.done{background:rgba(196,239,63,.6);}',
    '.tk-co-title{font-family:Anton,sans-serif;font-size:28px;color:#fff;letter-spacing:.02em;text-transform:uppercase;margin:0 0 6px;}',
    '.tk-co-sub{font-family:"Space Mono",monospace;font-size:11px;letter-spacing:.18em;color:rgba(244,245,238,.5);margin:0 0 24px;}',
    '.tk-co-label{display:block;font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.55);margin-bottom:6px;margin-top:14px;}',
    '.tk-co-input{width:100%;padding:12px 14px;border-radius:11px;border:1px solid rgba(196,239,63,.25);background:rgba(255,255,255,.05);color:#f4f5ee;font-size:15px;font-family:"Space Grotesk",sans-serif;outline:none;box-sizing:border-box;}',
    '.tk-co-input:focus{border-color:#c4ef3f;}',
    '.tk-co-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}',
    '.tk-co-radios{display:flex;flex-direction:column;gap:10px;margin-top:10px;}',
    '.tk-co-radio{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:13px;border:1px solid rgba(196,239,63,.2);cursor:pointer;transition:border-color .2s;}',
    '.tk-co-radio.selected{border-color:#c4ef3f;background:rgba(196,239,63,.07);}',
    '.tk-co-radio input{accent-color:#c4ef3f;width:16px;height:16px;cursor:pointer;}',
    '.tk-co-radio-label{font-weight:600;font-size:14px;color:#f4f5ee;}',
    '.tk-co-radio-sub{font-family:"Space Mono",monospace;font-size:11px;color:rgba(244,245,238,.5);margin-top:2px;}',
    '.tk-co-card-fields{margin-top:14px;display:flex;flex-direction:column;gap:0;}',
    '.tk-co-actions{display:flex;gap:12px;margin-top:28px;}',
    '.tk-co-back{flex:0 0 auto;padding:14px 20px;border-radius:13px;border:1px solid rgba(244,245,238,.2);background:transparent;color:rgba(244,245,238,.7);font-family:"Space Grotesk",sans-serif;font-size:14px;font-weight:600;cursor:pointer;}',
    '.tk-co-next{flex:1;padding:14px;border-radius:13px;background:#c4ef3f;color:#0a1733;font-family:"Space Grotesk",sans-serif;font-size:15px;font-weight:700;border:none;cursor:pointer;}',
    '.tk-co-next:hover{opacity:.92;}',
    '.tk-co-success{text-align:center;padding:20px 0;}',
    '.tk-co-check{font-size:56px;margin-bottom:16px;}',
    '.tk-co-order-id{font-family:"Space Mono",monospace;font-size:12px;letter-spacing:.16em;color:rgba(244,245,238,.5);margin-bottom:20px;}',
  ].join('');
  document.head.appendChild(style);

  // ── DOM Roots ─────────────────────────────────────────────────────────────
  var drawerOverlay = null, drawerEl = null, checkoutOverlay = null;

  function buildDOM() {
    // Cart overlay (backdrop)
    drawerOverlay = document.createElement('div');
    drawerOverlay.className = 'tk-cart-overlay';
    drawerOverlay.id = 'tk-cart-overlay';
    drawerOverlay.addEventListener('click', function () { cart.close(); });
    document.body.appendChild(drawerOverlay);

    // Cart drawer
    drawerEl = document.createElement('div');
    drawerEl.className = 'tk-cart-drawer';
    drawerEl.id = 'tk-cart-drawer';
    document.body.appendChild(drawerEl);

    // Checkout overlay
    checkoutOverlay = document.createElement('div');
    checkoutOverlay.className = 'tk-co-overlay';
    checkoutOverlay.id = 'tk-co-overlay';
    checkoutOverlay.addEventListener('click', function (e) { if (e.target === checkoutOverlay) hideCheckout(); });
    document.body.appendChild(checkoutOverlay);

    renderDrawer();
  }

  function showDrawer(animate) {
    if (!drawerEl) return;
    drawerOverlay.classList.add('open');
    // force reflow then animate
    requestAnimationFrame(function () { drawerEl.classList.add('open'); });
  }
  function hideDrawer() {
    if (!drawerEl) return;
    drawerEl.classList.remove('open');
    drawerOverlay.classList.remove('open');
  }

  function renderDrawer() {
    if (!drawerEl) return;
    var items = _items;
    var total = cart.getTotal();
    var itemsHTML = items.length
      ? items.map(function (it, i) {
          return '<div class="tk-cart-item">' +
            '<div><div class="tk-cart-item-name">' + escHtml(it.name) + '</div>' +
            '<div class="tk-cart-item-sub">' + escHtml(it.sub || '') + '</div></div>' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
            '<span class="tk-cart-item-price">' + escHtml(it.price || '') + '</span>' +
            '<button class="tk-cart-item-rm" data-rm="' + i + '">×</button>' +
            '</div></div>';
        }).join('')
      : '<div class="tk-cart-empty">Your cart is empty.<br>Book a court or grab some gear.</div>';

    drawerEl.innerHTML = '<div class="tk-cart-head">' +
      '<span class="tk-cart-title">Your cart</span>' +
      '<button class="tk-cart-x" id="tk-cart-close">×</button>' +
      '</div>' +
      '<div class="tk-cart-body">' + itemsHTML + '</div>' +
      '<div class="tk-cart-foot">' +
      '<div class="tk-cart-total-row">' +
      '<span class="tk-cart-total-label">TOTAL</span>' +
      '<span class="tk-cart-total-val">' + total + ' DT</span>' +
      '</div>' +
      '<button class="tk-cart-checkout-btn" id="tk-cart-co-btn">Checkout</button>' +
      '</div>';

    document.getElementById('tk-cart-close').addEventListener('click', function () { cart.close(); });
    document.getElementById('tk-cart-co-btn').addEventListener('click', function () { cart.close(); cart.openCheckout(); });
    drawerEl.querySelectorAll('[data-rm]').forEach(function (btn) {
      btn.addEventListener('click', function () { cart.remove(parseInt(btn.getAttribute('data-rm'), 10)); });
    });
  }

  // ── Checkout ──────────────────────────────────────────────────────────────
  var _coStep = 1; // 1, 2, 3
  var _coData = { email: '', name: '', phone: '', address: '', city: '', postal: '', notes: '', payMethod: 'card', cardNum: '', cardExp: '', cardCvc: '' };

  function showCheckout() {
    if (!checkoutOverlay) return;
    _coStep = 1;
    renderCheckout();
    checkoutOverlay.classList.add('open');
  }
  function hideCheckout() {
    if (!checkoutOverlay) return;
    checkoutOverlay.classList.remove('open');
  }

  function stepperHTML(step) {
    return '<div class="tk-co-stepper">' +
      [1,2,3].map(function (n) {
        var cls = n === step ? 'active' : (n < step ? 'done' : '');
        return '<div class="tk-co-step ' + cls + '"></div>';
      }).join('') + '</div>';
  }

  function renderCheckout() {
    if (!checkoutOverlay) return;
    var u = window.takeOffAuth && window.takeOffAuth.user;
    var total = cart.getTotal();
    var walletBal = u ? (u.wallet || 0) : 0;
    var walletOk = u && walletBal >= total;
    var html = '';

    if (_coStep === 'success') {
      var orderId = 'TKO-' + Date.now().toString(36).toUpperCase();
      html = '<div class="tk-co-card"><button class="tk-co-close" id="tk-co-close">×</button>' +
        '<div class="tk-co-success">' +
        '<div class="tk-co-check">✅</div>' +
        '<div class="tk-co-title">Order confirmed!</div>' +
        '<div class="tk-co-order-id">ORDER ' + orderId + '</div>' +
        '<p style="color:rgba(244,245,238,.7);font-size:14px;line-height:1.6;margin-bottom:24px;">' +
        (u ? 'Saved to your account. Check your orders in the profile drawer.' : 'We\'ll contact you to confirm.') +
        '</p>' +
        '<button class="tk-co-next" id="tk-co-done" style="max-width:220px;margin:0 auto;display:block;">Done</button>' +
        '</div></div>';
      checkoutOverlay.innerHTML = html;
      document.getElementById('tk-co-close').addEventListener('click', hideCheckout);
      document.getElementById('tk-co-done').addEventListener('click', hideCheckout);
      return;
    }

    if (_coStep === 1) {
      html = '<div class="tk-co-card"><button class="tk-co-close" id="tk-co-close">×</button>' +
        stepperHTML(1) +
        '<div class="tk-co-title">Contact</div>' +
        '<div class="tk-co-sub">01 — VÉRIFICATION DES COORDONNÉES</div>' +
        '<div class="tk-co-grid2">' +
        '<div><label class="tk-co-label">FULL NAME</label><input class="tk-co-input" id="tk-co-name" type="text" placeholder="Your name" value="' + escAttr(_coData.name || (u ? u.name || '' : '')) + '"></div>' +
        '<div><label class="tk-co-label">EMAIL</label><input class="tk-co-input" id="tk-co-email" type="email" placeholder="your@email.com" value="' + escAttr(_coData.email || (u ? u.email || '' : '')) + '"></div>' +
        '</div>' +
        '<label class="tk-co-label">PHONE</label><input class="tk-co-input" id="tk-co-phone" type="tel" placeholder="+216 XX XXX XXX" value="' + escAttr(_coData.phone) + '">' +
        '<div class="tk-co-actions">' +
        '<button class="tk-co-next" id="tk-co-next">Continue →</button>' +
        '</div></div>';
    } else if (_coStep === 2) {
      html = '<div class="tk-co-card"><button class="tk-co-close" id="tk-co-close">×</button>' +
        stepperHTML(2) +
        '<div class="tk-co-title">Delivery</div>' +
        '<div class="tk-co-sub">02 — ADRESSE DE LIVRAISON</div>' +
        '<label class="tk-co-label">ADDRESS</label><input class="tk-co-input" id="tk-co-addr" type="text" placeholder="Street address" value="' + escAttr(_coData.address) + '">' +
        '<div class="tk-co-grid2" style="margin-top:0;">' +
        '<div><label class="tk-co-label">CITY</label><input class="tk-co-input" id="tk-co-city" type="text" placeholder="Tunis" value="' + escAttr(_coData.city) + '"></div>' +
        '<div><label class="tk-co-label">POSTAL CODE</label><input class="tk-co-input" id="tk-co-postal" type="text" placeholder="1001" value="' + escAttr(_coData.postal) + '"></div>' +
        '</div>' +
        '<label class="tk-co-label">NOTES</label><input class="tk-co-input" id="tk-co-notes" type="text" placeholder="Instructions, floor, landmark..." value="' + escAttr(_coData.notes) + '">' +
        '<div class="tk-co-actions">' +
        '<button class="tk-co-back" id="tk-co-back">← Back</button>' +
        '<button class="tk-co-next" id="tk-co-next">Continue →</button>' +
        '</div></div>';
    } else if (_coStep === 3) {
      var walletDisabledAttr = walletOk ? '' : 'disabled';
      var walletDisabledStyle = walletOk ? '' : 'opacity:.45;cursor:not-allowed;';
      html = '<div class="tk-co-card"><button class="tk-co-close" id="tk-co-close">×</button>' +
        stepperHTML(3) +
        '<div class="tk-co-title">Payment</div>' +
        '<div class="tk-co-sub">03 — RÉGLEMENT</div>' +
        '<p style="font-family:\'Space Mono\',monospace;font-size:11px;color:rgba(244,245,238,.55);margin:0 0 14px;">Total: <strong style="color:#c4ef3f;font-size:16px;">' + total + ' DT</strong></p>' +
        '<div class="tk-co-radios">' +
        '<label class="tk-co-radio' + (_coData.payMethod === 'card' ? ' selected' : '') + '" id="tk-pay-card-lbl" style="' + '' + '">' +
        '<input type="radio" name="tk-pay" value="card" ' + (_coData.payMethod === 'card' ? 'checked' : '') + ' id="tk-pay-card">' +
        '<div><div class="tk-co-radio-label">💳 Card (mock)</div><div class="tk-co-radio-sub">Visa / Mastercard / D17</div></div>' +
        '</label>' +
        '<label class="tk-co-radio' + (_coData.payMethod === 'wallet' ? ' selected' : '') + '" id="tk-pay-wallet-lbl" style="' + walletDisabledStyle + '">' +
        '<input type="radio" name="tk-pay" value="wallet" ' + (_coData.payMethod === 'wallet' ? 'checked' : '') + ' ' + walletDisabledAttr + ' id="tk-pay-wallet">' +
        '<div><div class="tk-co-radio-label">◆ Pay with wallet</div><div class="tk-co-radio-sub">' + walletBal + ' DT available' + (walletOk ? '' : ' — insufficient') + '</div></div>' +
        '</label>' +
        '</div>' +
        '<div class="tk-co-card-fields" id="tk-card-fields" style="display:' + (_coData.payMethod === 'card' ? 'flex' : 'none') + ';">' +
        '<label class="tk-co-label">CARD NUMBER</label><input class="tk-co-input" id="tk-co-cardnum" type="text" placeholder="4242 4242 4242 4242" maxlength="19" value="' + escAttr(_coData.cardNum) + '">' +
        '<div class="tk-co-grid2"><div><label class="tk-co-label">EXPIRY</label><input class="tk-co-input" id="tk-co-cardexp" type="text" placeholder="MM/YY" maxlength="5" value="' + escAttr(_coData.cardExp) + '"></div>' +
        '<div><label class="tk-co-label">CVC</label><input class="tk-co-input" id="tk-co-cardcvc" type="text" placeholder="•••" maxlength="4" value="' + escAttr(_coData.cardCvc) + '"></div></div>' +
        '</div>' +
        '<div class="tk-co-actions">' +
        '<button class="tk-co-back" id="tk-co-back">← Back</button>' +
        '<button class="tk-co-next" id="tk-co-next">Place Order</button>' +
        '</div></div>';
    }

    checkoutOverlay.innerHTML = html;

    // Wire events
    document.getElementById('tk-co-close').addEventListener('click', hideCheckout);

    if (_coStep === 1) {
      document.getElementById('tk-co-next').addEventListener('click', function () {
        _coData.name = document.getElementById('tk-co-name').value;
        _coData.email = document.getElementById('tk-co-email').value;
        _coData.phone = document.getElementById('tk-co-phone').value;
        _coStep = 2; renderCheckout();
      });
    } else if (_coStep === 2) {
      document.getElementById('tk-co-back').addEventListener('click', function () { _coStep = 1; renderCheckout(); });
      document.getElementById('tk-co-next').addEventListener('click', function () {
        _coData.address = document.getElementById('tk-co-addr').value;
        _coData.city = document.getElementById('tk-co-city').value;
        _coData.postal = document.getElementById('tk-co-postal').value;
        _coData.notes = document.getElementById('tk-co-notes').value;
        _coStep = 3; renderCheckout();
      });
    } else if (_coStep === 3) {
      // Radio toggle
      ['tk-pay-card', 'tk-pay-wallet'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', function () {
          _coData.payMethod = el.value;
          var cf = document.getElementById('tk-card-fields');
          if (cf) cf.style.display = _coData.payMethod === 'card' ? 'flex' : 'none';
          // update selected class
          ['tk-pay-card-lbl', 'tk-pay-wallet-lbl'].forEach(function (lid) {
            var lel = document.getElementById(lid);
            if (lel) lel.classList.remove('selected');
          });
          var lbl = document.getElementById(id + '-lbl');
          if (lbl) lbl.classList.add('selected');
        });
      });
      document.getElementById('tk-co-back').addEventListener('click', function () { _coStep = 2; renderCheckout(); });
      document.getElementById('tk-co-next').addEventListener('click', function () {
        if (_coStep !== 3) return;
        var cn = document.getElementById('tk-co-cardnum');
        if (cn) _coData.cardNum = cn.value;
        var ce = document.getElementById('tk-co-cardexp');
        if (ce) _coData.cardExp = ce.value;
        var cc = document.getElementById('tk-co-cardcvc');
        if (cc) _coData.cardCvc = cc.value;
        // Handle packs in cart
        var items = cart.getItems();
        if (window.takeOffAuth && window.takeOffAuth.user) {
          items.forEach(function (it) {
            if (it.kind === 'pack' && it._packMeta && window.takeOffAuth.purchasePack) {
              window.takeOffAuth.purchasePack(it._packMeta);
            }
          });
          var orderId = 'TKO-' + Date.now().toString(36).toUpperCase();
          window.takeOffAuth.recordOrder({ items: items, total: cart.getTotal(), ts: new Date().toISOString(), id: orderId });
        }
        cart.clear();
        _coStep = 'success'; renderCheckout();
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s) { return String(s || '').replace(/"/g,'&quot;'); }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (checkoutOverlay && checkoutOverlay.classList.contains('open')) { hideCheckout(); return; }
      hideDrawer();
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  function onReady(fn) {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fn); }
    else { fn(); }
  }
  onReady(buildDOM);

})();
