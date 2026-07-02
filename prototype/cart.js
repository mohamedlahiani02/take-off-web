// Take Off Club — Shared Cart + Checkout
// v4: 3 payment options (PAY_AT_CLUB, CARD, WALLET), timbre fiscal, discount code
(function () {
  if (window.takeOffCart) return;

  function storageGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; } }
  function storageSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  var _sub = [];
  function notify() { _sub.forEach(function(fn){ try{fn();}catch(e){} }); }

  // Items shape: { name, sub, _raw, kind, size, cat, qty }
  var _items = (storageGet('takeOffCart') || []).map(function(it){ return Object.assign({qty:1}, it); });
  function persist() { storageSet('takeOffCart', _items); }

  // Checkout persistent state
  var _step = 1;
  var _orderId = null;
  var _d = { name:'', email:'', phone:'', delivery:'pickup', address:'', city:'Tunis', notes:'', pay:'pay_at_club' };

  // Snapshots captured before cart.clear() so the success screen can show the real totals
  var _confirmedTotal = 0;
  var _confirmedItems = [];
  var _confirmedTimbre = 0;
  var _confirmedShipping = 0;

  // True when every item in the cart is a court booking or pack (no physical products)
  function hasOnlyBookings() {
    return _items.length > 0 && _items.every(function(it) {
      return it.kind === 'booking' || it.kind === 'pack';
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  var cart = {
    add: function(item) {
      var key = (item.name||'')+'|'+(item.size||'')+'|'+(item.kind||'');
      var found = false;
      for (var i=0; i<_items.length; i++) {
        if ((_items[i].name||'')+'|'+(_items[i].size||'')+'|'+(_items[i].kind||'') === key) {
          _items[i].qty = (_items[i].qty||1) + (item.qty||1);
          found = true; break;
        }
      }
      if (!found) _items.push(Object.assign({qty:1}, item));
      persist(); notify(); cart.open();
    },
    remove: function(idx) { _items.splice(idx,1); persist(); notify(); renderDrawer(); },
    updateQty: function(idx, delta) {
      if (!_items[idx]) return;
      var q = (_items[idx].qty||1) + delta;
      if (q < 1) { cart.remove(idx); return; }
      _items[idx].qty = Math.min(99, q);
      persist(); notify(); renderDrawer();
    },
    clear: function() { _items=[]; persist(); notify(); },
    open: function() { renderDrawer(); _showEl('tk-cart-overlay'); _animIn('tk-cart-drawer'); },
    close: function() { _animOut('tk-cart-drawer'); _hideEl('tk-cart-overlay'); },
    toggle: function() { var d=document.getElementById('tk-cart-drawer'); d&&d.classList.contains('open')?cart.close():cart.open(); },
    openCheckout: function() {
      if (!_items.length) return;
      try {
        var saved = JSON.parse(sessionStorage.getItem('takeOffCheckout') || 'null');
        if (saved && saved.step && saved.step !== 'success') {
          _step = saved.step;
          _d = Object.assign(_d, saved.d || {});
        } else { _step = 1; }
      } catch(e) { _step = 1; }
      renderCheckout(); _showEl('tk-co-ov');
    },
    getCount: function() { return _items.reduce(function(a,b){return a+(b.qty||1);},0); },
    getSubtotal: function() { return _items.reduce(function(a,b){return a+(b._raw||0)*(b.qty||1);},0); },
    getShipping: function() {
      if (hasOnlyBookings() || _d.delivery==='pickup') return 0;
      var c=(_d.city||'').trim().toLowerCase();
      return (c===''||c==='tunis') ? 9 : 15;
    },
    getTimbre: function() {
      var sub = cart.getSubtotal();
      return (!hasOnlyBookings() && sub >= 10) ? 1 : 0;
    },
    getTotal: function() { return Math.max(0, cart.getSubtotal() + cart.getShipping() + cart.getTimbre()); },
    getItems: function() { return _items.slice(); },
    subscribe: function(fn) { _sub.push(fn); return function(){ _sub=_sub.filter(function(s){return s!==fn;}); }; },
  };
  window.takeOffCart = cart;

  function _showEl(id) { var el=document.getElementById(id); if(el) el.classList.add('open'); }
  function _hideEl(id) { var el=document.getElementById(id); if(el) el.classList.remove('open'); }
  function _animIn(id) { var el=document.getElementById(id); if(el) requestAnimationFrame(function(){ el.classList.add('open'); }); }
  function _animOut(id) { var el=document.getElementById(id); if(el) el.classList.remove('open'); }

  // ── CSS ───────────────────────────────────────────────────────────────────
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '.tk-overlay{position:fixed;inset:0;z-index:150;background:rgba(7,15,36,.6);backdrop-filter:blur(3px);display:none;}',
    '.tk-overlay.open{display:block;}',

    // Drawer
    '.tk-cart-drawer{position:fixed;top:0;right:0;bottom:0;z-index:151;width:min(460px,95vw);background:#0c1c3f;border-left:1px solid rgba(196,239,63,.2);display:flex;flex-direction:column;box-shadow:-20px 0 60px rgba(0,0,0,.5);transform:translateX(100%);transition:transform .35s cubic-bezier(.2,.7,.2,1);}',
    '.tk-cart-drawer.open{transform:translateX(0);}',
    '.tk-ch{display:flex;align-items:center;justify-content:space-between;padding:22px 24px;border-bottom:1px solid rgba(244,245,238,.1);}',
    '.tk-ch-title{font-family:Anton,sans-serif;font-size:24px;color:#fff;text-transform:uppercase;letter-spacing:.02em;}',
    '.tk-ch-x{cursor:pointer;font-size:26px;color:rgba(244,245,238,.55);background:none;border:none;line-height:1;padding:0;}',
    '.tk-body{flex:1;overflow-y:auto;padding:14px 20px;display:flex;flex-direction:column;gap:9px;}',
    '.tk-empty{color:rgba(244,245,238,.5);font-size:14px;line-height:1.7;margin:36px auto;text-align:center;}',
    '.tk-item{display:grid;grid-template-columns:40px 1fr auto;gap:11px;align-items:center;padding:12px;background:rgba(244,245,238,.05);border-radius:12px;border:1px solid rgba(196,239,63,.08);}',
    '.tk-item-dot{width:40px;height:40px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:Anton,sans-serif;font-size:15px;flex-shrink:0;}',
    '.tk-item-name{font-weight:600;font-size:13px;color:#fff;line-height:1.3;margin-bottom:2px;}',
    '.tk-item-meta{font-family:"Space Mono",monospace;font-size:9px;letter-spacing:.1em;color:rgba(244,245,238,.42);}',
    '.tk-item-right{display:flex;flex-direction:column;align-items:flex-end;gap:5px;}',
    '.tk-item-price{font-family:Anton,sans-serif;font-size:16px;color:#c4ef3f;white-space:nowrap;}',
    '.tk-qty{display:flex;align-items:center;border:1px solid rgba(196,239,63,.25);border-radius:7px;overflow:hidden;}',
    '.tk-qty-btn{width:26px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;color:#c4ef3f;font-weight:700;background:none;border:none;padding:0;}',
    '.tk-qty-val{padding:0 8px;font-size:12px;font-weight:600;color:#fff;border-left:1px solid rgba(196,239,63,.15);border-right:1px solid rgba(196,239,63,.15);line-height:24px;min-width:24px;text-align:center;}',
    '.tk-item-rm{cursor:pointer;color:rgba(244,245,238,.35);font-size:15px;background:none;border:none;line-height:1;padding:0;margin-left:4px;}',
    '.tk-item-rm:hover{color:rgba(244,245,238,.7);}',
    '.tk-continue{font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.12em;color:rgba(244,245,238,.45);text-align:center;padding:8px 20px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;}',
    '.tk-foot{padding:16px 20px;border-top:1px solid rgba(244,245,238,.1);}',
    '.tk-totals{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}',
    '.tk-trow{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:rgba(244,245,238,.6);}',
    '.tk-trow.grand{border-top:1px solid rgba(244,245,238,.12);padding-top:9px;margin-top:3px;}',
    '.tk-trow.grand .tl{font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.16em;color:rgba(244,245,238,.55);}',
    '.tk-trow.grand .tv{font-family:Anton,sans-serif;font-size:28px;color:#c4ef3f;}',
    '.tk-co-btn{width:100%;padding:14px;border-radius:12px;text-align:center;font-weight:700;cursor:pointer;background:#c4ef3f;color:#0a1733;font-size:15px;border:none;font-family:"Space Grotesk",sans-serif;}',
    '.tk-co-btn:hover{opacity:.92;}',
    '.tk-co-btn[disabled]{opacity:.38;cursor:not-allowed;}',

    // Checkout overlay
    '.tk-co-ov{position:fixed;inset:0;z-index:400;background:rgba(7,15,36,.8);backdrop-filter:blur(7px);display:none;align-items:center;justify-content:center;padding:16px;}',
    '.tk-co-ov.open{display:flex;}',
    '.tk-co-card{background:#0a1733;border:1px solid rgba(196,239,63,.18);border-radius:22px;width:100%;max-width:620px;max-height:92vh;overflow-y:auto;position:relative;box-shadow:0 40px 100px rgba(0,0,0,.65);}',
    '.tk-co-inner{padding:30px 34px;}',
    '.tk-co-close{position:absolute;top:14px;right:18px;cursor:pointer;font-size:22px;color:rgba(244,245,238,.45);background:none;border:none;line-height:1;z-index:1;}',
    '.tk-stepper{display:flex;gap:7px;margin-bottom:22px;}',
    '.tk-pip{flex:1;height:5px;border-radius:999px;background:rgba(196,239,63,.18);transition:background .3s;}',
    '.tk-pip.done{background:rgba(196,239,63,.5);}',
    '.tk-pip.act{background:#c4ef3f;}',
    '.tk-co-title{font-family:Anton,sans-serif;font-size:24px;color:#fff;text-transform:uppercase;margin:0 0 3px;}',
    '.tk-co-eyebrow{font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.2em;color:rgba(244,245,238,.4);margin:0 0 20px;}',
    '.tk-lbl{display:block;font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.16em;color:rgba(244,245,238,.5);margin:13px 0 5px;}',
    '.tk-inp{width:100%;padding:11px 13px;border-radius:10px;border:1px solid rgba(196,239,63,.22);background:rgba(255,255,255,.05);color:#f4f5ee;font-size:14px;font-family:"Space Grotesk",sans-serif;outline:none;box-sizing:border-box;}',
    '.tk-inp:focus{border-color:#c4ef3f;}',
    '.tk-hint{font-family:"Space Mono",monospace;font-size:9px;letter-spacing:.09em;color:rgba(244,245,238,.35);margin-top:4px;}',
    '.tk-g2{display:grid;grid-template-columns:1fr 1fr;gap:11px;}',
    '.tk-radios{display:flex;flex-direction:column;gap:9px;margin-top:8px;}',
    '.tk-radio{display:flex;align-items:flex-start;gap:11px;padding:13px 14px;border-radius:12px;border:1px solid rgba(196,239,63,.16);cursor:pointer;transition:border-color .18s,background .18s;}',
    '.tk-radio.sel{border-color:#c4ef3f;background:rgba(196,239,63,.06);}',
    '.tk-radio.dis{opacity:.4;cursor:not-allowed;}',
    '.tk-radio input[type=radio]{accent-color:#c4ef3f;width:14px;height:14px;margin-top:3px;flex-shrink:0;cursor:pointer;}',
    '.tk-rl{font-weight:600;font-size:13px;color:#f4f5ee;}',
    '.tk-rs{font-family:"Space Mono",monospace;font-size:10px;color:rgba(244,245,238,.48);margin-top:3px;line-height:1.5;}',
    '.tk-actions{display:flex;gap:10px;margin-top:24px;}',
    '.tk-back-btn{flex:0 0 auto;padding:12px 16px;border-radius:12px;border:1px solid rgba(244,245,238,.18);background:transparent;color:rgba(244,245,238,.65);font-size:14px;font-weight:600;cursor:pointer;font-family:"Space Grotesk",sans-serif;}',
    '.tk-next-btn{flex:1;padding:12px;border-radius:12px;background:#c4ef3f;color:#0a1733;font-size:14px;font-weight:700;border:none;cursor:pointer;font-family:"Space Grotesk",sans-serif;}',
    '.tk-next-btn:hover{opacity:.92;}',
    // Summary box
    '.tk-sbox{background:rgba(255,255,255,.04);border:1px solid rgba(196,239,63,.12);border-radius:12px;padding:13px 15px;margin-bottom:18px;}',
    '.tk-srow{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:rgba(244,245,238,.75);padding:3px 0;}',
    '.tk-srow.muted{color:rgba(244,245,238,.42);font-size:11px;}',
    '.tk-sdiv{border:none;border-top:1px solid rgba(244,245,238,.1);margin:7px 0;}',
    '.tk-stotal{display:flex;justify-content:space-between;align-items:baseline;}',
    '.tk-stl{font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.14em;color:rgba(244,245,238,.45);}',
    '.tk-stv{font-family:Anton,sans-serif;font-size:20px;color:#c4ef3f;}',
    // Auth nudge
    '.tk-nudge{margin-top:14px;padding:11px 13px;border-radius:10px;background:rgba(196,239,63,.06);border:1px solid rgba(196,239,63,.18);font-size:13px;color:rgba(244,245,238,.65);line-height:1.55;}',
    '.tk-nudge a{color:#c4ef3f;cursor:pointer;text-decoration:underline;text-underline-offset:3px;}',
    // Review rows
    '.tk-rrow{display:flex;gap:11px;padding:8px 0;border-bottom:1px solid rgba(244,245,238,.07);}',
    '.tk-rkey{font-family:"Space Mono",monospace;font-size:9px;letter-spacing:.14em;color:rgba(244,245,238,.4);min-width:72px;padding-top:2px;flex-shrink:0;}',
    '.tk-rval{color:#f4f5ee;font-size:13px;line-height:1.55;}',
    // Success
    '.tk-success{text-align:center;padding:10px 0;}',
    '.tk-s-icon{font-size:50px;margin-bottom:12px;}',
    '.tk-s-id{font-family:"Space Mono",monospace;font-size:11px;letter-spacing:.15em;color:rgba(244,245,238,.45);margin:7px 0 18px;}',
  ].join('');
  document.head.appendChild(styleEl);

  // ── Category dot colors ───────────────────────────────────────────────────
  var CAT_COL = {
    rackets:     {bg:'#c4ef3f',fg:'#0a1733'},
    accessories: {bg:'#2b6bf0',fg:'#fff'},
    padelwear:   {bg:'#f0a62b',fg:'#0a1733'},
    pilates:     {bg:'#e85c9b',fg:'#fff'},
    lifestyle:   {bg:'#6a8a16',fg:'#fff'},
    towels:      {bg:'#4ecdc4',fg:'#0a1733'},
    pack:        {bg:'#c4ef3f',fg:'#0a1733'},
    booking:     {bg:'#2b6bf0',fg:'#fff'},
  };
  function dotColor(it) {
    var c = CAT_COL[it.cat] || CAT_COL[it.kind] || {bg:'rgba(196,239,63,.3)',fg:'#c4ef3f'};
    return 'background:'+c.bg+';color:'+c.fg;
  }

  // ── DOM roots ─────────────────────────────────────────────────────────────
  function buildDOM() {
    var ov = document.createElement('div');
    ov.className = 'tk-overlay'; ov.id = 'tk-cart-overlay';
    ov.addEventListener('click', function(){ cart.close(); });
    document.body.appendChild(ov);

    var drw = document.createElement('div');
    drw.className = 'tk-cart-drawer'; drw.id = 'tk-cart-drawer';
    document.body.appendChild(drw);

    var coOv = document.createElement('div');
    coOv.className = 'tk-co-ov'; coOv.id = 'tk-co-ov';
    coOv.addEventListener('click', function(e){ if(e.target===coOv) _hideEl('tk-co-ov'); });
    document.body.appendChild(coOv);

    renderDrawer();
  }

  // ── Drawer ────────────────────────────────────────────────────────────────
  function renderDrawer() {
    var drw = document.getElementById('tk-cart-drawer');
    if (!drw) return;
    var items = _items;
    var hasItems = items.length > 0;
    var subtotal = cart.getSubtotal();
    var shipping = cart.getShipping();
    var timbre = cart.getTimbre();
    var total = cart.getTotal();
    var shipLabel = _d.delivery === 'pickup' ? 'FREE · Pickup' : shipping + ' DT';

    var rows = '';
    if (!hasItems) {
      rows = '<div class="tk-empty">Your cart is empty.<br>Book a court or grab some gear.</div>';
    } else {
      items.forEach(function(it, i) {
        var meta = [it.sub, it.size ? 'Size '+it.size : ''].filter(Boolean).join(' · ');
        var line = (it._raw||0) * (it.qty||1);
        rows +=
          '<div class="tk-item">'+
            '<div class="tk-item-dot" style="'+dotColor(it)+'">'+esc((it.name||'?')[0].toUpperCase())+'</div>'+
            '<div>'+
              '<div class="tk-item-name">'+esc(it.name)+'</div>'+
              (meta?'<div class="tk-item-meta">'+esc(meta)+'</div>':'')+
            '</div>'+
            '<div class="tk-item-right">'+
              '<span class="tk-item-price">'+line+' DT</span>'+
              '<div style="display:flex;align-items:center;gap:5px;">'+
                '<div class="tk-qty">'+
                  '<button class="tk-qty-btn" data-qi="'+i+'" data-qd="-1">−</button>'+
                  '<span class="tk-qty-val">'+(it.qty||1)+'</span>'+
                  '<button class="tk-qty-btn" data-qi="'+i+'" data-qd="1">+</button>'+
                '</div>'+
                '<button class="tk-item-rm" data-rm="'+i+'">×</button>'+
              '</div>'+
            '</div>'+
          '</div>';
      });
    }

    drw.innerHTML =
      '<div class="tk-ch">'+
        '<span class="tk-ch-title">Cart · '+(cart.getCount())+'</span>'+
        '<button class="tk-ch-x" id="tk-x">×</button>'+
      '</div>'+
      '<div class="tk-body">'+rows+'</div>'+
      (hasItems ? '<div class="tk-continue" id="tk-cont">← Continue shopping</div>' : '')+
      '<div class="tk-foot">'+
        (hasItems ?
          '<div class="tk-totals">'+
            '<div class="tk-trow"><span class="tl">Subtotal</span><span class="tv">'+subtotal.toFixed(3)+' DT</span></div>'+
            (timbre > 0 ? '<div class="tk-trow"><span class="tl">Fiscal stamp</span><span class="tv">'+timbre.toFixed(3)+' DT</span></div>' : '')+
            '<div class="tk-trow"><span class="tl">Delivery</span><span class="tv">'+shipLabel+'</span></div>'+
            '<div class="tk-trow grand"><span class="tl">TOTAL</span><span class="tv">'+total.toFixed(3)+' DT</span></div>'+
          '</div>'
        : '')+
        '<button class="tk-co-btn" id="tk-co-open"'+(hasItems?'':' disabled')+'>'+
          (hasItems ? 'Checkout →' : 'Cart is empty')+
        '</button>'+
      '</div>';

    document.getElementById('tk-x').addEventListener('click', function(){ cart.close(); });
    var coBtn = document.getElementById('tk-co-open');
    if (coBtn && hasItems) coBtn.addEventListener('click', function(){ cart.close(); cart.openCheckout(); });
    var cont = document.getElementById('tk-cont');
    if (cont) cont.addEventListener('click', function(){ cart.close(); });
    drw.querySelectorAll('[data-rm]').forEach(function(btn){
      btn.addEventListener('click', function(){ cart.remove(parseInt(btn.getAttribute('data-rm'),10)); });
    });
    drw.querySelectorAll('[data-qi]').forEach(function(btn){
      btn.addEventListener('click', function(){
        cart.updateQty(parseInt(btn.getAttribute('data-qi'),10), parseInt(btn.getAttribute('data-qd'),10));
      });
    });
  }

  // ── Checkout ──────────────────────────────────────────────────────────────

  function sbox(showDelivery) {
    var rows = _items.map(function(it){
      return '<div class="tk-srow">'+
        '<span>'+esc(it.name)+(it.size?' <span style="opacity:.5;font-size:11px;">'+esc(it.size)+'</span>':'')+(it.qty>1?' <span style="opacity:.45">×'+it.qty+'</span>':'')+'</span>'+
        '<span>'+((it._raw||0)*(it.qty||1)).toFixed(3)+' DT</span>'+
      '</div>';
    }).join('');
    var sub = cart.getSubtotal();
    var timbre = cart.getTimbre();
    var ship = cart.getShipping();
    var shipLine = showDelivery
      ? '<div class="tk-srow muted"><span>Delivery</span><span>'+(_d.delivery==='pickup'?'FREE':ship.toFixed(3)+' DT')+'</span></div>'
      : '';
    var timbreLine = timbre > 0 ? '<div class="tk-srow muted"><span>Fiscal stamp</span><span>'+timbre.toFixed(3)+' DT</span></div>' : '';
    return '<div class="tk-sbox">'+rows+'<hr class="tk-sdiv">'+
      '<div class="tk-srow muted"><span>Subtotal</span><span>'+sub.toFixed(3)+' DT</span></div>'+
      timbreLine+shipLine+
      '<div class="tk-stotal"><span class="tk-stl">TOTAL</span><span class="tk-stv">'+cart.getTotal().toFixed(3)+' DT</span></div>'+
    '</div>';
  }

  function radioHTML(val, current, label, sub, disabled) {
    var sel = val===current && !disabled ? ' sel' : '';
    var dis = disabled ? ' dis' : '';
    return '<label class="tk-radio'+sel+dis+'" data-val="'+esc(val)+'">'+
      '<input type="radio" name="tk-pay" value="'+esc(val)+'" '+(val===current?'checked ':'')+( disabled?'disabled':'')+'>'+
      '<div><div class="tk-rl">'+label+'</div><div class="tk-rs">'+sub+'</div></div>'+
    '</label>';
  }

  function renderCheckout() {
    var coOv = document.getElementById('tk-co-ov');
    if (!coOv) return;
    var u = window.takeOffAuth && window.takeOffAuth.user;
    var walletBal = u ? (u.walletDt !== undefined ? u.walletDt : (u.wallet || 0)) : 0;
    var total = cart.getTotal();
    var walletOk = u && walletBal >= total;
    var bookingOnly = hasOnlyBookings();
    // booking-only: 3 steps (1=contact, 3=payment, 4=confirm) — step 2 (delivery) is skipped
    var totalSteps = bookingOnly ? 3 : 4;
    var inner = '';

    // ── Success ──────────────────────────────────────────────────────────────
    if (_step === 'success') {
      total = _confirmedTotal;
      var refId = _orderId || ('TKO-'+Date.now().toString(36).toUpperCase());
      var itemRows = _confirmedItems.map(function(it){
        return '<div class="tk-srow">'+
          '<span>'+esc(it.name)+(it.size?' · '+esc(it.size):'')+(it.qty>1?' × '+it.qty:'')+'</span>'+
          '<span style="color:#c4ef3f;">'+((it._raw||0)*(it.qty||1))+' DT</span>'+
        '</div>';
      }).join('');

      if (bookingOnly) {
        inner = '<div class="tk-success">'+
          '<div class="tk-s-icon">✓</div>'+
          '<div class="tk-co-title" style="color:#c4ef3f;">Booking confirmed</div>'+
          '<div class="tk-s-id">REF '+refId+'</div>'+
          '<div class="tk-sbox" style="text-align:left;margin-bottom:16px;">'+
            itemRows+
            '<hr class="tk-sdiv">'+
            '<div class="tk-stotal"><span class="tk-stl">TOTAL PAID</span><span class="tk-stv">'+total.toFixed(3)+' DT</span></div>'+
          '</div>'+
          '<div style="font-size:13px;color:rgba(244,245,238,.6);line-height:1.65;margin-bottom:18px;">See you on the court. Your slot is reserved — arrive 5 min early.</div>'+
          (!u?'<div class="tk-nudge" style="margin-bottom:18px;">No account yet? <a id="tk-s-login">Create one</a> to manage your bookings.</div>':'')+
          '<button class="tk-next-btn" id="tk-co-done">Done</button>'+
        '</div>';
      } else {
        var delivInfo = _d.delivery==='pickup'
          ? 'Pick up at Take Off Club · Ready in 24–48h'
          : esc(_d.address)+', '+esc(_d.city)+(_d.notes?' ('+esc(_d.notes)+')':'');
        inner = '<div class="tk-success">'+
          '<div class="tk-s-icon">✓</div>'+
          '<div class="tk-co-title" style="color:#c4ef3f;">Order placed</div>'+
          '<div class="tk-s-id">ORDER '+refId+'</div>'+
          '<div class="tk-sbox" style="text-align:left;margin-bottom:16px;">'+
            itemRows+
            '<hr class="tk-sdiv">'+
            (_confirmedTimbre>0?'<div class="tk-srow muted"><span>Fiscal stamp</span><span>'+_confirmedTimbre.toFixed(3)+' DT</span></div>':'')+
            '<div class="tk-srow muted"><span>Delivery</span><span>'+(_d.delivery==='pickup'?'FREE':_confirmedShipping.toFixed(3)+' DT')+'</span></div>'+
            '<div class="tk-stotal"><span class="tk-stl">TOTAL PAID</span><span class="tk-stv">'+total.toFixed(3)+' DT</span></div>'+
          '</div>'+
          '<div style="font-size:13px;color:rgba(244,245,238,.6);line-height:1.65;margin-bottom:18px;">'+delivInfo+
            (_d.delivery!=='pickup'?'<br><span style="opacity:.6">Estimated: 2–4 business days · '+_confirmedShipping.toFixed(3)+' DT delivery</span>':'')+'</div>'+
          (!u?'<div class="tk-nudge" style="margin-bottom:18px;">No account yet? <a id="tk-s-login">Create one</a> to track orders and manage your bookings.</div>':'')+
          '<button class="tk-next-btn" id="tk-co-done">Done</button>'+
        '</div>';
      }

      coOv.innerHTML = '<div class="tk-co-card"><div class="tk-co-inner">'+inner+'</div></div>';
      document.getElementById('tk-co-done').addEventListener('click', function(){ clearCheckoutState(); _hideEl('tk-co-ov'); });
      var sl = document.getElementById('tk-s-login');
      if (sl) sl.addEventListener('click', function(){ _hideEl('tk-co-ov'); if(window.takeOffAuth) window.takeOffAuth.openLogin(); });
      return;
    }

    // ── Step pip helper — maps logical step to visual position ────────────────
    function pip(logicalStep) {
      // booking: 1→1, 3→2, 4→3 | product: 1→1, 2→2, 3→3, 4→4
      var pos = bookingOnly
        ? (logicalStep === 1 ? 1 : logicalStep === 3 ? 2 : 3)
        : logicalStep;
      var h = '<div class="tk-stepper">';
      for (var i=1;i<=totalSteps;i++) h += '<div class="tk-pip '+(i<pos?'done':i===pos?'act':'')+'"></div>';
      return h+'</div>';
    }

    // ── Step 1: Contact ───────────────────────────────────────────────────────
    if (_step === 1) {
      var contactHint = bookingOnly
        ? '<div class="tk-co-eyebrow">01 — YOUR CONTACT DETAILS</div>'
        : '<div class="tk-co-eyebrow">01 — YOUR DETAILS</div>';
      var phoneHint = bookingOnly
        ? '<div class="tk-hint">+216 · 8 digits · for booking updates</div>'
        : '<div class="tk-hint">+216 · 8 digits · used for delivery &amp; updates</div>';
      inner =
        pip(1)+
        '<div class="tk-co-title">Contact</div>'+
        contactHint+
        sbox(false)+
        '<div class="tk-g2">'+
          '<div><label class="tk-lbl">FULL NAME</label><input class="tk-inp" id="tk-name" placeholder="Sami Ben Ahmed" value="'+esc(_d.name||(u?u.name||'':''))+'"></div>'+
          '<div>'+
            '<label class="tk-lbl">PHONE <span style="opacity:.4">(WhatsApp OK)</span></label>'+
            '<input class="tk-inp" id="tk-phone" type="tel" placeholder="+216 XX XXX XXX" value="'+esc(_d.phone||(u?u.phone||'':''))+'">'+
            phoneHint+
          '</div>'+
        '</div>'+
        (!bookingOnly ? '<label class="tk-lbl">EMAIL <span style="opacity:.4">(order confirmation)</span></label><input class="tk-inp" id="tk-email" type="email" placeholder="you@email.com" value="'+esc(_d.email||(u?u.email||'':''))+'">' : '')+
        (!u?'<div class="tk-nudge">Have an account? <a id="tk-s1-in">Sign in</a> to pre-fill your details.</div>':'')+
        '<div class="tk-actions"><button class="tk-next-btn" id="tk-next">Continue →</button></div>';
    }

    // ── Step 2: Delivery (products only) ─────────────────────────────────────
    if (_step === 2) {
      inner =
        pip(2)+
        '<div class="tk-co-title">Delivery</div>'+
        '<div class="tk-co-eyebrow">02 — HOW DO YOU WANT TO RECEIVE IT?</div>'+
        '<div class="tk-radios">'+
          '<label class="tk-radio'+(_d.delivery==='pickup'?' sel':'')+'" data-del="pickup">'+
            '<input type="radio" name="tk-del" value="pickup" '+(_d.delivery==='pickup'?'checked':'')+'>'+
            '<div><div class="tk-rl">Pick up at the club <span style="color:#c4ef3f;font-weight:400;font-size:12px;">FREE</span></div>'+
            '<div class="tk-rs">Take Off Club · Tunis<br>Ready to collect within 24–48h of order confirmation</div></div>'+
          '</label>'+
          '<label class="tk-radio'+(_d.delivery==='deliver'?' sel':'')+'" data-del="deliver">'+
            '<input type="radio" name="tk-del" value="deliver" '+(_d.delivery==='deliver'?'checked':'')+'>'+
            '<div><div class="tk-rl">Deliver to my address <span style="color:rgba(244,245,238,.45);font-weight:400;font-size:12px;">from 9 DT</span></div>'+
            '<div class="tk-rs">Tunis: 9 DT · Other regions: 15 DT · 2–4 business days</div></div>'+
          '</label>'+
        '</div>'+
        '<div id="tk-afields" style="display:'+(_d.delivery==='deliver'?'block':'none')+';">'+
          '<label class="tk-lbl">STREET ADDRESS</label>'+
          '<input class="tk-inp" id="tk-addr" placeholder="12 Rue de Marseille, Apt 3" value="'+esc(_d.address)+'">'+
          '<div class="tk-g2" style="margin-top:0;">'+
            '<div><label class="tk-lbl">CITY / DELEGATION</label><input class="tk-inp" id="tk-city" placeholder="Tunis" value="'+esc(_d.city)+'"></div>'+
            '<div><label class="tk-lbl">LANDMARK / NOTES</label><input class="tk-inp" id="tk-notes" placeholder="Near Monoprix, blue gate..." value="'+esc(_d.notes)+'"></div>'+
          '</div>'+
        '</div>'+
        '<div class="tk-actions"><button class="tk-back-btn" id="tk-back">← Back</button><button class="tk-next-btn" id="tk-next">Continue →</button></div>';
    }

    // ── Step 3: Payment ───────────────────────────────────────────────────────
    if (_step === 3) {
      var walletSubtitle = walletOk
        ? walletBal.toFixed(3)+' DT available — sufficient'
        : (u ? walletBal.toFixed(3)+' DT available — insufficient for this order' : 'Sign in to use your wallet');
      var payOptions = bookingOnly
        ? radioHTML('pay_at_club', _d.pay, 'Pay at the club', 'Settle at reception before or after your session', false)+
          radioHTML('wallet', _d.pay, '◆ Club wallet · <span style="color:'+( walletOk?'#c4ef3f':'rgba(244,245,238,.4)')+'">'+walletBal.toFixed(3)+' DT</span>', walletSubtitle, !walletOk)+
          radioHTML('card', _d.pay, 'Bank card', 'Visa / Mastercard — secure payment', false)
        : radioHTML('pay_at_club', _d.pay, 'Cash on delivery / at pickup', 'Pay when you collect or when the courier arrives', false)+
          radioHTML('wallet', _d.pay, '◆ Club wallet · <span style="color:'+( walletOk?'#c4ef3f':'rgba(244,245,238,.4)')+'">'+walletBal.toFixed(3)+' DT</span>', walletSubtitle, !walletOk)+
          radioHTML('card', _d.pay, 'Bank card', 'Visa / Mastercard — secure payment', false);
      var stepLabel = bookingOnly ? '02 — HOW DO YOU PAY?' : '03 — HOW DO YOU PAY?';
      inner =
        pip(3)+
        '<div class="tk-co-title">Payment</div>'+
        '<div class="tk-co-eyebrow">'+stepLabel+'</div>'+
        sbox(!bookingOnly)+
        '<div class="tk-radios">'+payOptions+'</div>'+
        '<div class="tk-actions"><button class="tk-back-btn" id="tk-back">← Back</button><button class="tk-next-btn" id="tk-next">Review →</button></div>';
    }

    // ── Step 4: Review & confirm ──────────────────────────────────────────────
    if (_step === 4) {
      var payLabels = {
        pay_at_club: bookingOnly ? 'Pay at the club' : 'Cash on delivery / at pickup',
        wallet: 'Club wallet ('+walletBal.toFixed(3)+' DT)',
        card: 'Bank card',
      };
      var itemRows4 = _items.map(function(it){
        return '<div class="tk-srow">'+
          '<span>'+esc(it.name)+(it.size?' · '+esc(it.size):'')+(it.qty>1?' × '+it.qty:'')+'</span>'+
          '<span>'+((it._raw||0)*(it.qty||1)).toFixed(3)+' DT</span>'+
        '</div>';
      }).join('');
      var stepLabel4 = bookingOnly ? '03 — CONFIRM YOUR BOOKING' : '04 — CONFIRM BEFORE PLACING YOUR ORDER';
      var ctaLabel = bookingOnly ? 'Confirm booking' : 'Place order';
      var reviewRows = bookingOnly
        ? '<div class="tk-rrow"><span class="tk-rkey">CONTACT</span><span class="tk-rval">'+esc(_d.name)+' · '+esc(_d.phone)+'</span></div>'+
          '<div class="tk-rrow" style="border:none;"><span class="tk-rkey">PAYMENT</span><span class="tk-rval">'+esc(payLabels[_d.pay]||_d.pay)+'</span></div>'
        : (function(){
            var delivText = _d.delivery==='pickup'
              ? 'Pick up at Take Off Club · <span style="color:#c4ef3f;">FREE</span>'
              : esc(_d.address)+', '+esc(_d.city)+(_d.notes?' ('+esc(_d.notes)+')':'')+'<br><span style="opacity:.55;font-size:12px;">2–4 business days · '+cart.getShipping().toFixed(3)+' DT</span>';
            return '<div class="tk-rrow"><span class="tk-rkey">CONTACT</span><span class="tk-rval">'+esc(_d.name)+' · '+esc(_d.phone)+'<br><span style="opacity:.55;font-size:12px;">'+esc(_d.email)+'</span></span></div>'+
              '<div class="tk-rrow"><span class="tk-rkey">DELIVERY</span><span class="tk-rval">'+delivText+'</span></div>'+
              '<div class="tk-rrow" style="border:none;"><span class="tk-rkey">PAYMENT</span><span class="tk-rval">'+esc(payLabels[_d.pay]||_d.pay)+'</span></div>';
          })();
      inner =
        pip(4)+
        '<div class="tk-co-title">Review</div>'+
        '<div class="tk-co-eyebrow">'+stepLabel4+'</div>'+
        '<div class="tk-sbox">'+
          itemRows4+
          '<hr class="tk-sdiv">'+
          '<div class="tk-srow muted"><span>Subtotal</span><span>'+cart.getSubtotal().toFixed(3)+' DT</span></div>'+
          (cart.getTimbre()>0?'<div class="tk-srow muted"><span>Fiscal stamp</span><span>'+cart.getTimbre().toFixed(3)+' DT</span></div>':'')+
          (!bookingOnly?'<div class="tk-srow muted"><span>Delivery</span><span>'+(_d.delivery==='pickup'?'FREE':cart.getShipping().toFixed(3)+' DT')+'</span></div>':'')+
          '<div class="tk-stotal"><span class="tk-stl">ORDER TOTAL</span><span class="tk-stv">'+cart.getTotal().toFixed(3)+' DT</span></div>'+
        '</div>'+
        reviewRows+
        '<div id="tk-order-err" style="display:none;color:#f4a0a0;font-size:13px;margin:8px 0;text-align:center;"></div>'+
        '<div class="tk-actions"><button class="tk-back-btn" id="tk-back">← Back</button><button class="tk-next-btn" id="tk-next">'+ctaLabel+'</button></div>';
    }

    coOv.innerHTML = '<div class="tk-co-card"><button class="tk-co-close" id="tk-co-x">×</button><div class="tk-co-inner">'+inner+'</div></div>';
    document.getElementById('tk-co-x').addEventListener('click', function(){ clearCheckoutState(); _hideEl('tk-co-ov'); });

    // ── Step wiring ───────────────────────────────────────────────────────────
    if (_step === 1) {
      var s1in = document.getElementById('tk-s1-in');
      if (s1in) s1in.addEventListener('click', function(){ _hideEl('tk-co-ov'); if(window.takeOffAuth) window.takeOffAuth.openLogin(); });
      document.getElementById('tk-next').addEventListener('click', function(){
        var n=val('tk-name'), p=val('tk-phone'), e=val('tk-email');
        if (!n.trim()) { flash('tk-name','Please enter your name'); return; }
        if (!p.trim()) { flash('tk-phone','Please enter your phone number'); return; }
        _d.name=n; _d.phone=p; _d.email=e;
        _step = bookingOnly ? 3 : 2;
        saveCheckoutState();
        renderCheckout();
      });
    }

    if (_step === 2) {
      var afields = document.getElementById('tk-afields');
      function setDel(v) {
        _d.delivery = v;
        if (afields) afields.style.display = v==='deliver'?'block':'none';
        document.querySelectorAll('.tk-radio[data-del]').forEach(function(r){
          r.classList.toggle('sel', r.getAttribute('data-del')===v);
        });
        renderDrawer();
      }
      document.querySelectorAll('.tk-radio[data-del]').forEach(function(r){
        r.addEventListener('click', function(){ setDel(r.getAttribute('data-del')); });
      });
      document.getElementById('tk-back').addEventListener('click', function(){ _step=1; saveCheckoutState(); renderCheckout(); });
      document.getElementById('tk-next').addEventListener('click', function(){
        if (_d.delivery==='deliver') {
          _d.address = val('tk-addr');
          _d.city = val('tk-city') || 'Tunis';
          _d.notes = val('tk-notes');
          if (!_d.address.trim()) { flash('tk-addr','Please enter your address'); return; }
        }
        _step=3; saveCheckoutState(); renderCheckout();
      });
    }

    if (_step === 3) {
      function setPay(v) {
        _d.pay = v;
        document.querySelectorAll('.tk-radio[data-val]').forEach(function(r){
          r.classList.toggle('sel', r.getAttribute('data-val')===v && !r.classList.contains('dis'));
        });
      }
      document.querySelectorAll('.tk-radio[data-val]').forEach(function(r){
        r.addEventListener('click', function(){
          var inp = r.querySelector('input[type=radio]');
          if (inp && !inp.disabled) setPay(r.getAttribute('data-val'));
        });
      });
      document.getElementById('tk-back').addEventListener('click', function(){
        _step = bookingOnly ? 1 : 2;
        saveCheckoutState();
        renderCheckout();
      });
      document.getElementById('tk-next').addEventListener('click', function(){
        _step=4; saveCheckoutState(); renderCheckout();
      });
    }

    if (_step === 4) {
      document.getElementById('tk-back').addEventListener('click', function(){ _step=3; saveCheckoutState(); renderCheckout(); });
      document.getElementById('tk-next').addEventListener('click', async function(){
        var btn = document.getElementById('tk-next');
        if (btn) { btn.disabled = true; btn.textContent = '...'; }
        var its = cart.getItems();

        for (var _packIt of its) {
          if (_packIt.kind === 'pack') {
            var _packClient = window.takeOffApi;
            if (_packIt.packTypeId && _packClient && _packClient.isOnline() && _packClient.classes && _packClient.classes.purchasePack) {
              try { await _packClient.classes.purchasePack(_packIt.packTypeId); } catch(e) { /* ignore — fall through */ }
            } else if (_packIt._packMeta && window.takeOffAuth && window.takeOffAuth.purchasePack) {
              window.takeOffAuth.purchasePack(_packIt._packMeta);
            }
          }
        }

        var payMethodMap = { pay_at_club: 'COD', wallet: 'WALLET', card: 'CARD' };
        var client = window.takeOffApi;
        // Physical product orders always go through orders.place() so staff have a record to ship.
        // Booking-only + COD (pay_at_club) skips the API — user pays at the studio.
        // Booking-only + wallet/card always calls orders.place() for payment processing.
        if (client && client.isOnline() && (!bookingOnly || _d.pay !== 'pay_at_club')) {
          try {
            var payload = {
              // Booking-only carts are services — no delivery, always pickup.
              deliveryMethod: bookingOnly ? 'PICKUP' : (_d.delivery === 'pickup' ? 'PICKUP' : 'DELIVER'),
              deliveryAddress: (!bookingOnly && _d.delivery === 'deliver') ? { addr: _d.address, city: _d.city, notes: _d.notes || '' } : null,
              paymentMethod: payMethodMap[_d.pay] || 'COD',
              deliveryFeeDt: cart.getShipping(),
              discountCode: null,
              contact: { name: _d.name, email: _d.email || '', phone: _d.phone },
              // Booking-only: send all items (sessions + packs) as service line items.
              // Mixed carts: send only physical product items.
              items: (bookingOnly ? its : its.filter(function(it){ return it.kind !== 'pack' && it.kind !== 'booking'; })).map(function(it){
                return {
                  productId: it.productId || null,
                  productName: it.name || it.n,
                  qty: it.qty || 1,
                  size: it.size || null,
                  unitPriceDt: it._raw || 0,
                };
              }),
            };
            var order = await client.orders.place(payload);
            _orderId = order && order.orderRef ? order.orderRef : ('TKO-' + Date.now().toString(36).toUpperCase());
            // Sync fresh wallet balance after payment
            if (_d.pay === 'wallet' && window.takeOffAuth && window.takeOffAuth.refreshWallet) {
              window.takeOffAuth.refreshWallet();
            }
            // Redirect to Konnect for card payments
            if (_d.pay === 'card' && client.payments && client.isOnline()) {
              try {
                var intent = await client.payments.initiate('order', (order.id || _orderId).toString(), cart.getTotal(), window.location.origin + '/payment/return.html');
                if (intent && intent.paymentUrl && intent.paymentUrl.indexOf('stub=true') === -1) {
                  clearCheckoutState();
                  window.location.href = intent.paymentUrl;
                  return;
                }
              } catch(e) { /* fall through — show success in stub/offline mode */ }
            }
          } catch (e) {
            if (btn) { btn.disabled = false; btn.textContent = ctaLabel; }
            var errEl = document.getElementById('tk-order-err');
            if (errEl) { errEl.textContent = 'Couldn\'t place order — please try again.'; errEl.style.display = 'block'; }
            return;
          }
        } else {
          _orderId = 'TKO-' + Date.now().toString(36).toUpperCase();
        }

        _confirmedTotal = cart.getTotal();
        _confirmedItems = _items.slice();
        _confirmedTimbre = cart.getTimbre();
        _confirmedShipping = cart.getShipping();
        cart.clear();
        _step = 'success'; clearCheckoutState(); renderCheckout();
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function saveCheckoutState() {
    try { sessionStorage.setItem('takeOffCheckout', JSON.stringify({ step: _step, d: _d })); } catch(e) {}
  }
  function clearCheckoutState() {
    try { sessionStorage.removeItem('takeOffCheckout'); } catch(e) {}
  }
  function val(id) { var el=document.getElementById(id); return el?el.value:''; }
  function flash(id, msg) {
    var el=document.getElementById(id);
    if (!el) { alert(msg); return; }
    el.style.borderColor='#ff6b6b';
    el.placeholder=msg;
    el.focus();
    setTimeout(function(){ el.style.borderColor=''; },2000);
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  document.addEventListener('keydown', function(e){
    if (e.key!=='Escape') return;
    var co=document.getElementById('tk-co-ov');
    if (co&&co.classList.contains('open')){ _hideEl('tk-co-ov'); return; }
    _animOut('tk-cart-drawer'); _hideEl('tk-cart-overlay');
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', buildDOM);
  else buildDOM();

})();
