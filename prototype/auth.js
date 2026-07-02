// Take Off Club — Auth + Account Drawer (v2)
// All business data from Spring Boot API. localStorage = session cache only.
// Idempotent IIFE.
(function () {
  if (window.takeOffAuth) return;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function storageGet(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function storageSet(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function storageDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

  var api = function () { return window.takeOffApi || null; };

  // Normalize a Tunisian phone to canonical +216XXXXXXXX (accepts spaces, 00216/216, bare 8 digits)
  function normalizePhone(input) {
    var d = String(input || '').trim().replace(/[\s-]/g, '').replace(/^\+/, '');
    if (d.indexOf('00216') === 0) d = d.slice(5);
    else if (d.indexOf('216') === 0) d = d.slice(3);
    return (/^[0-9]{8}$/.test(d)) ? '+216' + d : String(input || '').trim();
  }

  // ── Pub/sub ───────────────────────────────────────────────────────────────

  var _subs = [];
  function notify() { _subs.forEach(function (fn) { try { fn(auth.user); } catch (e) {} }); }

  var _pendingCb = null;

  // ── Core auth object ──────────────────────────────────────────────────────

  var auth = {
    user: storageGet('takeoff_user') || null,

    subscribe: function (fn) {
      _subs.push(fn);
      return function () { _subs = _subs.filter(function (s) { return s !== fn; }); };
    },

    login: async function (phone, password) {
      var id = (phone || '').trim();
      var client = api();
      if (client && client.isOnline()) {
        try {
          var data = await client.auth.login({ phone: id, password: password });
          auth.user = data.user;
          storageSet('takeoff_user', data.user);
          notify();
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e.message || 'Invalid credentials.' };
        }
      }
      // offline — cannot authenticate without network
      return { ok: false, error: 'No network connection — please try again when online.' };
    },

    register: async function (opts) {
      var email = (opts.email || '').trim().toLowerCase();
      var name = (opts.name || '').trim();
      var phone = normalizePhone(opts.phone || '');
      var password = opts.password || '';
      var tracks = opts.tracks || ['padel'];
      if (!email || !name || !password) return { ok: false, error: 'All fields required.' };
      if (!/^\+216[0-9]{8}$/.test(phone)) return { ok: false, error: 'Enter a valid phone (+216 followed by 8 digits).' };
      var client = api();
      if (client && client.isOnline()) {
        try {
          var data = await client.auth.register({ email: email, name: name, phone: phone, password: password, tracks: tracks });
          auth.user = data.user;
          storageSet('takeoff_user', data.user);
          notify();
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e.message || 'Registration failed.' };
        }
      }
      // offline — cannot register without network
      return { ok: false, error: 'No network connection — please try again when online.' };
    },

    logout: async function () {
      var client = api();
      if (client && client.isOnline()) { try { await client.auth.logout(); } catch (e) {} }
      auth.user = null;
      storageDel('takeoff_user');
      notify();
    },

    topup: async function (amount) {
      if (!auth.user) return;
      var n = parseFloat(amount);
      if (isNaN(n) || n <= 0) return;
      var client = api();
      if (client && client.isOnline()) {
        try {
          var res = await client.wallet.topup(n);
          if (res && res.newBalanceDt !== undefined) auth.user.walletDt = res.newBalanceDt;
          storageSet('takeoff_user', auth.user);
          notify();
          return;
        } catch (e) {}
      }
      // offline fallback
      auth.user.walletDt = (auth.user.walletDt || 0) + n;
      storageSet('takeoff_user', auth.user);
      notify();
    },

    // Bookings are still local (courts/bookings backend module is TODO)
    recordBooking: function (item) {
      if (!auth.user) return;
      if (!auth.user.bookings) auth.user.bookings = [];
      auth.user.bookings.push(Object.assign({}, item, { recordedAt: new Date().toISOString() }));
      storageSet('takeoff_user', auth.user);
    },

    // Packs are still local (packs backend module is TODO)
    purchasePack: function (opts) {
      if (!auth.user) return;
      if (!auth.user.packs) auth.user.packs = [];
      var now = new Date();
      var exp = new Date(now);
      exp.setMonth(exp.getMonth() + (opts.months || 3));
      auth.user.packs.push({ id: 'pack_' + Date.now(), name: opts.name || 'Pack', total: opts.total || 10, remaining: opts.total || 10, purchasedAt: now.toISOString(), expiresAt: exp.toISOString() });
      storageSet('takeoff_user', auth.user);
      notify();
    },

    consumePack: function (n) {
      if (!auth.user || !auth.user.packs) return false;
      var now = new Date(); var left = n || 1;
      for (var i = 0; i < auth.user.packs.length; i++) {
        var p = auth.user.packs[i];
        if (p.remaining > 0 && new Date(p.expiresAt) > now) {
          var spend = Math.min(left, p.remaining);
          p.remaining -= spend; left -= spend;
          if (left <= 0) break;
        }
      }
      storageSet('takeoff_user', auth.user);
      notify();
      return left <= 0;
    },

    refreshWallet: async function () {
      var client = api();
      if (!client || !client.isOnline() || !auth.user) return;
      try {
        var user = await client.auth.me();
        if (user) { auth.user = user; storageSet('takeoff_user', user); notify(); }
      } catch (e) {}
    },

    requireAuth: function (cb) {
      if (auth.user) { cb(); return; }
      _pendingCb = cb;
      auth.openLogin();
    },

    openLogin: function () { showModal('login'); },
    openAccount: function (tab) { showDrawer(tab); },
  };

  window.takeOffAuth = auth;

  // ── CSS ───────────────────────────────────────────────────────────────────

  var css = document.createElement('style');
  css.textContent = [
    // modal
    '.tk-ov{position:fixed;inset:0;z-index:1000;background:rgba(7,15,36,.55);display:flex;align-items:center;justify-content:center;padding:20px;}',
    '.tk-card{background:#0c2350;color:#f4f5ee;border-radius:20px;padding:40px;width:100%;max-width:440px;position:relative;box-shadow:0 32px 80px rgba(0,0,0,.5);}',
    '.tk-close{position:absolute;top:16px;right:20px;cursor:pointer;font-size:22px;color:rgba(244,245,238,.5);background:none;border:none;line-height:1;}',
    '.tk-title{font-family:Anton,sans-serif;font-size:32px;letter-spacing:.02em;text-transform:uppercase;color:#fff;margin:16px 0 8px;}',
    '.tk-sub{font-size:13px;color:rgba(244,245,238,.6);margin:0 0 26px;}',
    '.tk-lbl{display:block;font-family:"Space Mono",monospace;font-size:11px;letter-spacing:.18em;color:rgba(244,245,238,.6);margin-bottom:7px;}',
    '.tk-inp{width:100%;padding:12px 16px;border-radius:11px;border:1px solid rgba(196,239,63,.25);background:rgba(255,255,255,.06);color:#f4f5ee;font-size:15px;font-family:"Space Grotesk",sans-serif;outline:none;margin-bottom:18px;box-sizing:border-box;}',
    '.tk-inp:focus{border-color:#c4ef3f;}',
    '.tk-btn{width:100%;padding:15px;border-radius:13px;background:#c4ef3f;color:#0a1733;font-weight:700;font-size:15px;font-family:"Space Grotesk",sans-serif;border:none;cursor:pointer;letter-spacing:.04em;}',
    '.tk-btn:disabled{opacity:.5;cursor:default;}',
    '.tk-switch{text-align:center;margin-top:20px;font-size:13px;color:rgba(244,245,238,.55);}',
    '.tk-switch a{color:#c4ef3f;cursor:pointer;text-decoration:underline;}',
    '.tk-err{background:rgba(220,60,60,.18);border:1px solid rgba(220,60,60,.4);color:#f4a0a0;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:16px;}',
    '.tk-checks{display:flex;gap:18px;margin-bottom:20px;}',
    '.tk-check{display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer;}',
    '.tk-check input{accent-color:#c4ef3f;width:16px;height:16px;}',
    // drawer
    '.tk-dr-ov{position:fixed;inset:0;z-index:1000;background:rgba(7,15,36,.45);}',
    '.tk-dr{position:fixed;top:0;right:0;bottom:0;width:min(400px,94vw);background:#0c1c3f;border-left:1px solid rgba(196,239,63,.18);z-index:1001;display:flex;flex-direction:column;box-shadow:-24px 0 60px rgba(0,0,0,.45);overflow:hidden;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);}',
    '.tk-dr.open{transform:translateX(0);}',
    '.tk-dr-head{padding:28px 24px 20px;border-bottom:1px solid rgba(244,245,238,.1);flex-shrink:0;}',
    '.tk-dr-close{float:right;cursor:pointer;font-size:24px;color:rgba(244,245,238,.5);background:none;border:none;}',
    '.tk-avatar{width:52px;height:52px;border-radius:50%;background:#c4ef3f;color:#0a1733;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;margin-bottom:12px;}',
    '.tk-uname{font-weight:700;font-size:19px;color:#fff;margin:0;}',
    '.tk-uemail{font-family:"Space Mono",monospace;font-size:11px;color:rgba(244,245,238,.5);letter-spacing:.1em;margin-top:4px;}',
    '.tk-wallet{display:flex;align-items:center;justify-content:space-between;margin-top:18px;padding:13px 16px;border-radius:13px;background:rgba(196,239,63,.1);border:1px solid rgba(196,239,63,.2);}',
    '.tk-wallet-val{font-family:Anton,sans-serif;font-size:26px;color:#c4ef3f;}',
    '.tk-topup-btn{padding:8px 16px;border-radius:999px;background:#c4ef3f;color:#0a1733;font-weight:700;font-size:13px;cursor:pointer;border:none;}',
    '.tk-tabs{display:flex;border-bottom:1px solid rgba(244,245,238,.1);flex-shrink:0;overflow-x:auto;}',
    '.tk-tab{flex:1;min-width:60px;padding:14px 8px;text-align:center;cursor:pointer;font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.12em;color:rgba(244,245,238,.5);border:none;background:none;white-space:nowrap;}',
    '.tk-tab.active{color:#c4ef3f;border-bottom:2px solid #c4ef3f;}',
    '.tk-body{flex:1;overflow-y:auto;padding:20px 24px;}',
    '.tk-card-row{padding:12px 14px;border-radius:11px;background:rgba(244,245,238,.05);margin-bottom:10px;}',
    '.tk-logout{margin:16px 24px;padding:14px;border-radius:13px;text-align:center;font-weight:700;cursor:pointer;background:rgba(244,245,238,.06);color:rgba(244,245,238,.65);border:1px solid rgba(244,245,238,.1);font-family:"Space Grotesk",sans-serif;font-size:14px;flex-shrink:0;}',
    '.tk-logout:hover{background:rgba(244,245,238,.1);}',
    '.tk-empty{color:rgba(244,245,238,.4);font-size:14px;line-height:1.6;text-align:center;margin-top:30px;}',
    '.tk-stat-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;}',
    '.tk-stat{background:rgba(196,239,63,.08);border:1px solid rgba(196,239,63,.2);border-radius:13px;padding:14px;text-align:center;}',
    '.tk-stat-lbl{font-family:"Space Mono",monospace;font-size:9px;letter-spacing:.16em;color:rgba(244,245,238,.5);margin-bottom:6px;}',
    '.tk-stat-val{font-family:Anton,sans-serif;font-size:28px;color:#c4ef3f;line-height:1;}',
    // top-up overlay
    '.tk-topup-ov{position:fixed;inset:0;z-index:1200;background:rgba(7,15,36,.7);display:flex;align-items:center;justify-content:center;padding:20px;}',
    '.tk-topup-card{background:#0c2350;border-radius:18px;padding:32px;width:100%;max-width:380px;}',
    '.tk-topup-pills{display:flex;gap:10px;margin:16px 0;flex-wrap:wrap;}',
    '.tk-topup-pill{padding:10px 20px;border-radius:999px;border:1px solid rgba(196,239,63,.4);background:transparent;color:#c4ef3f;font-family:"Space Mono",monospace;font-size:13px;cursor:pointer;}',
    '.tk-topup-pill.sel{background:#c4ef3f;color:#0a1733;font-weight:700;}',
    // toast
    '.tk-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#c4ef3f;color:#0a1733;font-weight:700;font-family:"Space Grotesk",sans-serif;font-size:14px;padding:12px 24px;border-radius:999px;z-index:2000;box-shadow:0 8px 30px rgba(0,0,0,.3);transition:opacity .3s;}',
    '.tk-pill{padding:3px 9px;border-radius:999px;font-family:"Space Mono",monospace;font-size:10px;}',
  ].join('');
  document.head.appendChild(css);

  // ── Toast ─────────────────────────────────────────────────────────────────

  function toast(msg, duration) {
    var el = document.createElement('div');
    el.className = 'tk-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); }, duration || 2500);
  }

  // ── SVG signature ─────────────────────────────────────────────────────────

  function sigSVG() {
    return '<svg width="100" height="34" viewBox="0 0 200 70" style="overflow:visible;display:block;margin:0 auto 4px;">' +
      '<path d="M8,46 C26,46 30,40 44,42 C30,40 34,8 52,8 C70,8 66,44 50,46 C66,48 70,42 86,42 C70,40 74,8 92,8 C110,8 106,44 90,46 C106,48 110,42 126,42 C110,40 114,8 132,8 C150,8 146,44 130,46 C150,48 168,48 192,44" fill="none" stroke="#c4ef3f" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></path>' +
      '</svg>';
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  var modalRoot = null, modalMode = 'login';

  function modalHTML(mode) {
    var isReg = mode === 'register';
    return '<div class="tk-ov" id="tk-modal-ov">' +
      '<div class="tk-card">' +
        '<button class="tk-close" id="tk-modal-x">×</button>' +
        sigSVG() +
        '<div style="text-align:center;font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.22em;color:rgba(244,245,238,.5);margin-bottom:6px;">TAKE OFF CLUB</div>' +
        '<div class="tk-title" style="text-align:center;">' + (isReg ? 'Create account' : 'Sign in') + '</div>' +
        '<p class="tk-sub" style="text-align:center;">' + (isReg ? 'Join the club — padel, pilates, and more.' : 'Welcome back.') + '</p>' +
        '<div id="tk-modal-err" style="display:none;" class="tk-err"></div>' +
        (isReg ? '<label class="tk-lbl">YOUR NAME</label><input class="tk-inp" id="tk-f-name" type="text" placeholder="Full name">' : '') +
        (isReg
          ? '<label class="tk-lbl">EMAIL</label><input class="tk-inp" id="tk-f-email" type="email" placeholder="your@email.com">' +
            '<label class="tk-lbl">PHONE</label><input class="tk-inp" id="tk-f-phone" type="tel" inputmode="numeric" placeholder="+216 XX XXX XXX">'
          : '<label class="tk-lbl">PHONE</label><input class="tk-inp" id="tk-f-email" type="tel" inputmode="numeric" placeholder="+216 XX XXX XXX">') +
        '<label class="tk-lbl">PASSWORD</label><input class="tk-inp" id="tk-f-pass" type="password" placeholder="••••••••">' +
        (isReg ? '<label class="tk-lbl">I\'M INTO</label><div class="tk-checks"><label class="tk-check"><input type="checkbox" id="tk-tr-pad" checked> Padel</label><label class="tk-check"><input type="checkbox" id="tk-tr-pil"> Pilates</label></div>' : '') +
        '<button class="tk-btn" id="tk-modal-sub">' + (isReg ? 'Create account' : 'Sign in') + '</button>' +
        '<div class="tk-switch">' + (isReg ? 'Already have an account? <a id="tk-modal-swap">Sign in</a>' : 'No account? <a id="tk-modal-swap">Create one</a>') + '</div>' +
      '</div>' +
    '</div>';
  }

  function showModal(mode) {
    modalMode = mode || 'login';
    if (!modalRoot) { modalRoot = document.createElement('div'); document.body.appendChild(modalRoot); }
    modalRoot.innerHTML = modalHTML(modalMode);
    document.getElementById('tk-modal-x').onclick = closeModal;
    document.getElementById('tk-modal-ov').onclick = function (e) { if (e.target.id === 'tk-modal-ov') closeModal(); };
    document.getElementById('tk-modal-swap').onclick = function () { showModal(modalMode === 'login' ? 'register' : 'login'); };
    document.getElementById('tk-modal-sub').onclick = handleSubmit;
    modalRoot.querySelectorAll('input').forEach(function (inp) { inp.onkeydown = function (e) { if (e.key === 'Enter') handleSubmit(); }; });
    document.addEventListener('keydown', onEscModal);
  }

  function onEscModal(e) { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onEscModal); } }

  function closeModal() { if (modalRoot) modalRoot.innerHTML = ''; }

  async function handleSubmit() {
    var errEl = document.getElementById('tk-modal-err');
    errEl.style.display = 'none';
    var sub = document.getElementById('tk-modal-sub');
    sub.disabled = true; sub.textContent = '...';
    var email = (document.getElementById('tk-f-email') || {}).value || '';
    var pass = (document.getElementById('tk-f-pass') || {}).value || '';
    var result;
    if (modalMode === 'register') {
      var name = (document.getElementById('tk-f-name') || {}).value || '';
      var phone = (document.getElementById('tk-f-phone') || {}).value || '';
      var tracks = [];
      if (document.getElementById('tk-tr-pad') && document.getElementById('tk-tr-pad').checked) tracks.push('padel');
      if (document.getElementById('tk-tr-pil') && document.getElementById('tk-tr-pil').checked) tracks.push('pilates');
      result = await auth.register({ email: email, name: name, phone: phone, password: pass, tracks: tracks });
    } else {
      result = await auth.login(email, pass);
    }
    sub.disabled = false; sub.textContent = modalMode === 'register' ? 'Create account' : 'Sign in';
    if (!result.ok) { errEl.textContent = result.error; errEl.style.display = 'block'; return; }
    closeModal();
    if (_pendingCb) { var cb = _pendingCb; _pendingCb = null; setTimeout(cb, 50); }
  }

  // ── Account Drawer ────────────────────────────────────────────────────────

  var drawerRoot = null, drawerTab = 'bookings';
  var _drData = { orders: null, courtBookings: null, classBookings: null, packs: null };

  function showDrawer(tab) {
    if (!auth.user) { showModal('login'); return; }
    drawerTab = (['bookings', 'packs', 'orders', 'profile'].indexOf(tab) >= 0) ? tab : 'bookings';
    _drData.orders = null;
    _drData.courtBookings = null;
    _drData.classBookings = null;
    if (!drawerRoot) { drawerRoot = document.createElement('div'); document.body.appendChild(drawerRoot); }
    renderDrawer();
    document.addEventListener('keydown', onEscDrawer);
    // pre-fetch data for current tab
    fetchTabData(drawerTab);
    // refresh wallet balance from server — update display in-place without rebuilding drawer
    (function () {
      var client = api();
      if (!client || !client.isOnline()) return;
      client.auth.me().then(function (user) {
        if (!user) return;
        auth.user = user;
        storageSet('takeoff_user', user);
        notify();
        var walletEl = drawerRoot && drawerRoot.querySelector('.tk-wallet-val');
        if (walletEl) walletEl.textContent = '◆ ' + (user.walletDt !== undefined ? user.walletDt : 0) + ' DT';
      }).catch(function () {});
    })();
  }

  function onEscDrawer(e) { if (e.key === 'Escape') { closeDrawer(); document.removeEventListener('keydown', onEscDrawer); } }

  async function fetchTabData(tab) {
    var client = api();
    if (!client || !client.isOnline()) return;
    if (tab === 'orders' && !_drData.orders) {
      try { var or = await client.orders.list(); _drData.orders = or && or.content ? or.content : (or || []); renderBody(); } catch (e) {}
    }
    if (tab === 'bookings' && !_drData.courtBookings && !_drData.classBookings) {
      try {
        var cb = await client.courts.myBookings();
        _drData.courtBookings = cb || [];
      } catch (e) { _drData.courtBookings = []; }
      try {
        var cls = await client.classes.myBookings();
        _drData.classBookings = cls || [];
      } catch (e) { _drData.classBookings = []; }
      renderBody();
    }
    if (tab === 'packs' && !_drData.packs) {
      try { var pk = await client.classes.myPacks(); _drData.packs = pk || []; renderBody(); } catch (e) { _drData.packs = []; renderBody(); }
    }
  }

  function renderDrawer() {
    if (!auth.user || !drawerRoot) return;
    var u = auth.user;
    var initial = (u.name || u.email || '?')[0].toUpperCase();
    var walletDt = u.walletDt !== undefined ? u.walletDt : (u.wallet || 0);

    drawerRoot.innerHTML =
      '<div class="tk-dr-ov" id="tk-dr-ov"></div>' +
      '<div class="tk-dr" id="tk-dr">' +
        '<div class="tk-dr-head">' +
          '<button class="tk-dr-close" id="tk-dr-x">×</button>' +
          '<div class="tk-avatar">' + initial + '</div>' +
          '<div class="tk-uname" id="tk-uname-disp">' + esc(u.name || u.email) + '</div>' +
          '<div class="tk-uemail">' + esc(u.email) + '</div>' +
          '<div class="tk-wallet">' +
            '<div><div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.16em;color:rgba(244,245,238,.55);margin-bottom:3px;">WALLET</div>' +
            '<div class="tk-wallet-val">◆ ' + walletDt + ' DT</div></div>' +
            '<button class="tk-topup-btn" id="tk-topup-btn">+ Top up</button>' +
          '</div>' +
        '</div>' +
        '<div class="tk-tabs">' +
          ['bookings','packs','orders','profile'].map(function (t) {
            return '<button class="tk-tab' + (drawerTab === t ? ' active' : '') + '" data-tab="' + t + '">' + t.toUpperCase() + '</button>';
          }).join('') +
        '</div>' +
        '<div class="tk-body" id="tk-dr-body">' + bodyHTML() + '</div>' +
        '<button class="tk-logout" id="tk-logout">Log out</button>' +
      '</div>';

    // wire up
    setTimeout(function () {
      var dr = document.getElementById('tk-dr');
      if (dr) dr.classList.add('open');
    }, 10);

    document.getElementById('tk-dr-ov').onclick = closeDrawer;
    document.getElementById('tk-dr-x').onclick = closeDrawer;
    document.getElementById('tk-logout').onclick = function () { auth.logout(); closeDrawer(); };
    document.getElementById('tk-topup-btn').onclick = showTopupModal;
    document.querySelectorAll('.tk-tab').forEach(function (btn) {
      btn.onclick = function () {
        drawerTab = btn.getAttribute('data-tab');
        document.querySelectorAll('.tk-tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === drawerTab); });
        fetchTabData(drawerTab);
        renderBody();
      };
    });

    wireBodyEvents();
  }

  function renderBody() {
    var bodyEl = document.getElementById('tk-dr-body');
    if (!bodyEl) return;
    bodyEl.innerHTML = bodyHTML();
    wireBodyEvents();
  }

  function bodyHTML() {
    if (drawerTab === 'bookings') return bookingsHTML();
    if (drawerTab === 'packs') return packsHTML();
    if (drawerTab === 'orders') return ordersHTML();
    return profileHTML();
  }

  // ── Tab: Bookings ────────────────────────────────────────────────────────

  function bookingsHTML() {
    var statusColors = { CONFIRMED: '#c4ef3f', PENDING: '#f5c518', CANCELLED: '#f4a0a0', COMPLETED: 'rgba(244,245,238,.4)', PAST: 'rgba(244,245,238,.4)' };

    var courts = _drData.courtBookings;
    var classes = _drData.classBookings;

    if (courts === null || classes === null) {
      return '<div class="tk-empty" style="text-align:center;margin-top:30px;"><div style="margin-bottom:10px;">⏳</div>Loading bookings…</div>';
    }

    var allBookings = [];

    (courts || []).forEach(function (b) {
      allBookings.push({
        name: b.courtName || 'Court',
        sub: (b.date || '') + (b.startTime ? ' · ' + b.startTime + (b.endTime ? '–' + b.endTime : '') : ''),
        status: b.status || 'CONFIRMED',
        price: b.totalDt ? b.totalDt + ' DT' : '',
        type: 'court',
        sortKey: b.date || '',
      });
    });

    (classes || []).forEach(function (b) {
      allBookings.push({
        name: b.sessionName || b.className || 'Class',
        sub: (b.instructorName ? b.instructorName + ' · ' : '') + (b.date || '') + (b.startTime ? ' · ' + b.startTime : ''),
        status: b.status || 'CONFIRMED',
        price: '',
        type: 'class',
        sortKey: b.date || '',
      });
    });

    // If the API returned no class bookings, include locally-recorded ones
    // (bookings made from the schedule before sessions are seeded in the DB)
    if ((classes || []).length === 0) {
      var localBookings = (auth.user && auth.user.bookings) || [];
      localBookings.forEach(function (b) {
        allBookings.push({
          name: b.name || 'Class',
          sub: b.sub || '',
          status: 'PENDING',
          price: b.price || '',
          type: 'class',
          sortKey: b.recordedAt || '',
        });
      });
    }

    if (!allBookings.length) {
      return '<div class="tk-empty">No bookings yet.<br>Book a court or class to see them here.</div>';
    }

    allBookings.sort(function (a, b) { return b.sortKey > a.sortKey ? 1 : -1; });

    return allBookings.map(function (b) {
      var statusColor = statusColors[b.status] || 'rgba(244,245,238,.5)';
      var typeTag = b.type === 'court' ? 'COURT' : 'CLASS';
      return '<div class="tk-card-row">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
          '<div><div style="font-weight:600;font-size:14px;color:#fff;">' + esc(b.name) + '</div>' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.5);margin-top:3px;">' + esc(b.sub) + '</div></div>' +
          '<div style="display:flex;align-items:center;gap:8px;flex-direction:column;align-items:flex-end;">' +
            '<span style="padding:3px 9px;border-radius:999px;font-family:\'Space Mono\',monospace;font-size:9px;background:rgba(196,239,63,.1);color:' + statusColor + ';">' + esc(b.status) + '</span>' +
            '<span style="font-family:\'Space Mono\',monospace;font-size:9px;color:rgba(244,245,238,.35);">' + typeTag + '</span>' +
            (b.price ? '<div style="font-family:Anton,sans-serif;font-size:16px;color:#c4ef3f;">' + esc(b.price) + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ── Tab: Packs ───────────────────────────────────────────────────────────

  function packsHTML() {
    var apiPacks = _drData.packs;

    if (apiPacks === null) {
      var localPacks = (auth.user && auth.user.packs) || [];
      if (!localPacks.length) return '<div class="tk-empty" style="text-align:center;margin-top:30px;"><div style="margin-bottom:10px;">⏳</div>Loading packs…</div>';
      apiPacks = localPacks.map(function (p) { return { packTypeName: p.name, remaining: p.remaining, total: p.total, expiresAt: p.expiresAt }; });
    }

    var now = new Date();
    var active = (apiPacks || []).filter(function (p) { return (p.remaining === undefined || p.remaining > 0) && (!p.expiresAt || new Date(p.expiresAt) > now); });
    var expired = (apiPacks || []).filter(function (p) { return p.remaining === 0 || (p.expiresAt && new Date(p.expiresAt) <= now); });

    if (!active.length && !expired.length) {
      return '<div class="tk-empty">No packs purchased yet.</div>' +
        '<div style="margin-top:16px;text-align:center;"><a href="/padel#plans" style="color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:.12em;">Get a match pack →</a></div>';
    }

    var html = active.map(function (pk) {
      var total = pk.total || 10;
      var rem = pk.remaining !== undefined ? pk.remaining : total;
      var pct = total > 0 ? Math.round((rem / total) * 100) : 0;
      var exp = pk.expiresAt ? new Date(pk.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      return '<div style="padding:14px;border-radius:13px;background:rgba(196,239,63,.07);border:1px solid rgba(196,239,63,.18);margin-bottom:10px;">' +
        '<div style="font-weight:600;font-size:14px;color:#fff;margin-bottom:10px;">' + esc(pk.packTypeName || pk.name || 'Pack') + '</div>' +
        '<div style="height:5px;border-radius:999px;background:rgba(244,245,238,.1);margin-bottom:8px;">' +
          '<div style="height:5px;border-radius:999px;background:#c4ef3f;width:' + pct + '%;transition:width .4s;"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.55);">' +
          '<span>' + rem + ' / ' + total + ' sessions remaining</span>' + (exp ? '<span>Expires ' + exp + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    if (expired.length) {
      html += '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.14em;color:rgba(244,245,238,.35);margin:16px 0 8px;">EXPIRED</div>';
      html += expired.map(function (pk) {
        return '<div style="padding:10px 14px;border-radius:11px;background:rgba(244,245,238,.03);border:1px solid rgba(244,245,238,.08);margin-bottom:8px;opacity:.6;">' +
          '<div style="font-size:13px;color:rgba(244,245,238,.55);">' + esc(pk.packTypeName || pk.name || 'Pack') + ' — 0 remaining</div>' +
        '</div>';
      }).join('');
    }

    html += '<div style="margin-top:16px;text-align:center;"><a href="/padel#plans" style="color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:.12em;">Get more packs →</a></div>';
    return html;
  }

  // ── Tab: Orders ──────────────────────────────────────────────────────────

  function ordersHTML() {
    var items = _drData.orders || [];
    if (!items.length) return '<div class="tk-empty">No orders yet.</div>';
    var statusColors = { PENDING: '#f5c518', CONFIRMED: '#4fa3f7', PREPARING: '#f4a060', SHIPPED: '#4dc2b7', PICKUP_READY: '#c4ef3f', DELIVERED: '#4dce7a', PICKED_UP: '#4dce7a', CANCELLED: '#f4a0a0' };
    return items.map(function (o) {
      var date = o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      var statusColor = statusColors[o.status] || 'rgba(244,245,238,.5)';
      var itemsHTML = (o.items || []).map(function (it) {
        return '<div style="display:flex;justify-content:space-between;font-size:12px;color:rgba(244,245,238,.65);padding:3px 0;">' +
          '<span>' + esc(it.productName || it.name || '') + (it.size ? ' (' + esc(it.size) + ')' : '') + ' ×' + (it.qty || 1) + '</span>' +
          '<span>' + ((it.unitPriceDt || 0) * (it.qty || 1)) + ' DT</span>' +
        '</div>';
      }).join('');
      return '<div class="tk-card-row" style="margin-bottom:12px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">' +
          '<div><div style="font-weight:600;font-size:13px;color:#fff;">' + esc(o.orderRef || o.id || 'Order') + '</div>' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.5);margin-top:2px;">' + date + '</div></div>' +
          '<span class="tk-pill" style="background:rgba(255,255,255,.07);color:' + statusColor + ';">' + (o.status || 'PENDING') + '</span>' +
        '</div>' +
        (itemsHTML ? '<div style="border-top:1px solid rgba(244,245,238,.07);padding-top:8px;">' + itemsHTML + '</div>' : '') +
        '<div style="text-align:right;font-family:Anton,sans-serif;font-size:18px;color:#c4ef3f;margin-top:6px;">' + (o.totalDt || o.total || 0) + ' DT</div>' +
      '</div>';
    }).join('');
  }

  // ── Tab: Profile ─────────────────────────────────────────────────────────

  function profileField(label, id, value, type, placeholder, inputExtra) {
    return '<div style="margin-bottom:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
        '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);">' + label + '</div>' +
        '<button id="tk-edit-' + id + '" style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.1em;color:#c4ef3f;background:none;border:none;cursor:pointer;">EDIT</button>' +
      '</div>' +
      '<div id="tk-' + id + '-view" style="font-size:14px;color:#f4f5ee;">' + esc(value || '—') + '</div>' +
      '<div id="tk-' + id + '-edit" style="display:none;margin-top:6px;">' +
        '<input class="tk-inp" id="tk-' + id + '-inp" type="' + type + '" value="' + esc(value || '') + '" placeholder="' + placeholder + '" ' + (inputExtra || '') + ' style="margin-bottom:8px;">' +
        '<button id="tk-' + id + '-save" class="tk-btn" style="padding:10px;">Save</button>' +
      '</div>' +
    '</div>';
  }

  function profileHTML() {
    var u = auth.user || {};
    var memberSince = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
    var allTracks = ['padel', 'pilates'];
    var activeTracks = u.tracks || [];
    var addr = storageGet('takeoff_address') || {};

    // Quick activity strip from already-fetched tab data
    var courtCount = (_drData.courtBookings || []).length;
    var classCount = (_drData.classBookings || []).length;
    var orderCount = (_drData.orders || []).length;
    var hasActivity = courtCount || classCount || orderCount;

    var activityBar = hasActivity
      ? '<div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">' +
          (courtCount ? '<span style="padding:5px 11px;border-radius:999px;background:rgba(196,239,63,.08);border:1px solid rgba(196,239,63,.2);font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.6);">' + courtCount + ' court booking' + (courtCount !== 1 ? 's' : '') + '</span>' : '') +
          (classCount ? '<span style="padding:5px 11px;border-radius:999px;background:rgba(196,239,63,.08);border:1px solid rgba(196,239,63,.2);font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.6);">' + classCount + ' class booking' + (classCount !== 1 ? 's' : '') + '</span>' : '') +
          (orderCount ? '<span style="padding:5px 11px;border-radius:999px;background:rgba(196,239,63,.08);border:1px solid rgba(196,239,63,.2);font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.6);">' + orderCount + ' order' + (orderCount !== 1 ? 's' : '') + '</span>' : '') +
        '</div>'
      : '';

    var tracksHTML = '<div style="margin-bottom:16px;">' +
      '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);margin-bottom:8px;">INTERESTS</div>' +
      '<div style="display:flex;gap:8px;">' +
        allTracks.map(function (t) {
          var on = activeTracks.indexOf(t) >= 0;
          return '<button id="tk-track-' + t + '" data-track="' + t + '" style="padding:7px 16px;border-radius:999px;font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.1em;cursor:pointer;border:1px solid ' + (on ? '#c4ef3f' : 'rgba(244,245,238,.2)') + ';background:' + (on ? 'rgba(196,239,63,.18)' : 'transparent') + ';color:' + (on ? '#c4ef3f' : 'rgba(244,245,238,.4)') + ';">' + t.toUpperCase() + '</button>';
        }).join('') +
      '</div>' +
    '</div>';

    var addrVal = addr.line1 ? addr.line1 + (addr.city ? ', ' + addr.city : '') : '';
    var addrHTML = '<div style="margin-bottom:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
        '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);">DEFAULT DELIVERY ADDRESS</div>' +
        '<button id="tk-edit-addr" style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.1em;color:#c4ef3f;background:none;border:none;cursor:pointer;">EDIT</button>' +
      '</div>' +
      '<div id="tk-addr-view" style="font-size:13px;color:' + (addrVal ? '#f4f5ee' : 'rgba(244,245,238,.35)') + ';">' + (addrVal ? esc(addrVal) : 'Not set — auto-fills checkout') + '</div>' +
      '<div id="tk-addr-edit" style="display:none;margin-top:8px;">' +
        '<input class="tk-inp" id="tk-addr-line1" type="text" value="' + esc(addr.line1 || '') + '" placeholder="Street address" style="margin-bottom:8px;">' +
        '<input class="tk-inp" id="tk-addr-city" type="text" value="' + esc(addr.city || '') + '" placeholder="City (e.g. Tunis)" style="margin-bottom:8px;">' +
        '<input class="tk-inp" id="tk-addr-notes" type="text" value="' + esc(addr.notes || '') + '" placeholder="Notes (floor, building, etc.)" style="margin-bottom:8px;">' +
        '<button id="tk-addr-save" class="tk-btn" style="padding:10px;">Save address</button>' +
      '</div>' +
    '</div>';

    var pwHTML = '<div style="margin-bottom:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
        '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);">CHANGE PASSWORD</div>' +
        '<button id="tk-edit-pw" style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.1em;color:#c4ef3f;background:none;border:none;cursor:pointer;">CHANGE</button>' +
      '</div>' +
      '<div id="tk-pw-edit" style="display:none;margin-top:6px;">' +
        '<input class="tk-inp" id="tk-pw-cur" type="password" placeholder="Current password" style="margin-bottom:8px;">' +
        '<input class="tk-inp" id="tk-pw-new" type="password" placeholder="New password (min 8 chars)" style="margin-bottom:8px;">' +
        '<input class="tk-inp" id="tk-pw-confirm" type="password" placeholder="Confirm new password" style="margin-bottom:8px;">' +
        '<button id="tk-pw-save" class="tk-btn" style="padding:10px;">Update password</button>' +
      '</div>' +
    '</div>';

    return activityBar +
      '<div style="margin-bottom:16px;">' +
        '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);margin-bottom:4px;">EMAIL</div>' +
        '<div style="font-size:13px;color:rgba(244,245,238,.65);">' + esc(u.email || '') + '</div>' +
      '</div>' +
      profileField('NAME', 'name', u.name, 'text', 'Full name', '') +
      profileField('PHONE', 'phone', u.phone, 'tel', '+216 XX XXX XXX', 'inputmode="numeric"') +
      tracksHTML +
      addrHTML +
      pwHTML +
      (memberSince ? '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.3);margin-top:8px;">Member since ' + memberSince + '</div>' : '');
  }

  // ── Wire body event listeners ─────────────────────────────────────────────

  function inlineEdit(id) {
    var viewEl = document.getElementById('tk-' + id + '-view');
    var editEl = document.getElementById('tk-' + id + '-edit');
    if (viewEl) viewEl.style.display = 'none';
    if (editEl) editEl.style.display = 'block';
  }

  function wireBodyEvents() {
    // Profile: edit name
    var editNameBtn = document.getElementById('tk-edit-name');
    if (editNameBtn) editNameBtn.onclick = function () { inlineEdit('name'); };
    var saveNameBtn = document.getElementById('tk-name-save');
    if (saveNameBtn) saveNameBtn.onclick = async function () {
      var newName = (document.getElementById('tk-name-inp').value || '').trim();
      if (!newName) return;
      var client = api();
      if (client && client.isOnline()) {
        try { await client.auth.updateMe({ name: newName }); } catch (e) { toast(e.message || 'Update failed.', 2500); return; }
      }
      auth.user.name = newName;
      storageSet('takeoff_user', auth.user);
      document.getElementById('tk-uname-disp').textContent = newName;
      document.getElementById('tk-name-view').textContent = newName;
      document.getElementById('tk-name-view').style.display = 'block';
      document.getElementById('tk-name-edit').style.display = 'none';
    };

    // Profile: edit phone
    var editPhoneBtn = document.getElementById('tk-edit-phone');
    if (editPhoneBtn) editPhoneBtn.onclick = function () { inlineEdit('phone'); };
    var savePhoneBtn = document.getElementById('tk-phone-save');
    if (savePhoneBtn) savePhoneBtn.onclick = async function () {
      var raw = (document.getElementById('tk-phone-inp').value || '').trim();
      var newPhone = normalizePhone(raw);
      if (!/^\+216[0-9]{8}$/.test(newPhone)) { toast('Enter a valid Tunisian phone (+216 followed by 8 digits).', 2500); return; }
      var client = api();
      if (client && client.isOnline()) { try { await client.auth.updateMe({ phone: newPhone }); } catch (e) { toast(e.message || 'Update failed.', 2500); return; } }
      auth.user.phone = newPhone;
      storageSet('takeoff_user', auth.user);
      document.getElementById('tk-phone-view').textContent = newPhone;
      document.getElementById('tk-phone-view').style.display = 'block';
      document.getElementById('tk-phone-edit').style.display = 'none';
    };

    // Profile: track toggles
    ['padel', 'pilates'].forEach(function (t) {
      var btn = document.getElementById('tk-track-' + t);
      if (!btn) return;
      btn.onclick = async function () {
        var tracks = (auth.user && auth.user.tracks) ? auth.user.tracks.slice() : [];
        var idx = tracks.indexOf(t);
        if (idx >= 0) tracks.splice(idx, 1); else tracks.push(t);
        var client = api();
        if (client && client.isOnline()) {
          try { await client.auth.updateMe({ tracks: tracks }); } catch (e) { toast(e.message || 'Update failed.', 2500); return; }
        }
        auth.user.tracks = tracks;
        storageSet('takeoff_user', auth.user);
        var on = tracks.indexOf(t) >= 0;
        btn.style.border = '1px solid ' + (on ? '#c4ef3f' : 'rgba(244,245,238,.2)');
        btn.style.background = on ? 'rgba(196,239,63,.18)' : 'transparent';
        btn.style.color = on ? '#c4ef3f' : 'rgba(244,245,238,.4)';
      };
    });

    // Profile: delivery address
    var editAddrBtn = document.getElementById('tk-edit-addr');
    if (editAddrBtn) editAddrBtn.onclick = function () { inlineEdit('addr'); };
    var saveAddrBtn = document.getElementById('tk-addr-save');
    if (saveAddrBtn) saveAddrBtn.onclick = function () {
      var line1 = (document.getElementById('tk-addr-line1').value || '').trim();
      var city = (document.getElementById('tk-addr-city').value || '').trim();
      var notes = (document.getElementById('tk-addr-notes').value || '').trim();
      storageSet('takeoff_address', { line1: line1, city: city, notes: notes });
      var display = line1 ? (line1 + (city ? ', ' + city : '')) : 'Not set — auto-fills checkout';
      var viewEl = document.getElementById('tk-addr-view');
      if (viewEl) { viewEl.textContent = display; viewEl.style.color = line1 ? '#f4f5ee' : 'rgba(244,245,238,.35)'; viewEl.style.display = 'block'; }
      document.getElementById('tk-addr-edit').style.display = 'none';
      toast('Address saved.', 2000);
    };

    // Profile: change password
    var editPwBtn = document.getElementById('tk-edit-pw');
    if (editPwBtn) editPwBtn.onclick = function () {
      var el = document.getElementById('tk-pw-edit');
      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    };
    var savePwBtn = document.getElementById('tk-pw-save');
    if (savePwBtn) savePwBtn.onclick = async function () {
      var cur = (document.getElementById('tk-pw-cur').value || '');
      var nw = (document.getElementById('tk-pw-new').value || '');
      var conf = (document.getElementById('tk-pw-confirm').value || '');
      if (!cur || !nw) { toast('Fill in both passwords.', 2500); return; }
      if (nw.length < 8) { toast('New password must be at least 8 characters.', 2500); return; }
      if (nw !== conf) { toast('Passwords do not match.', 2500); return; }
      var client = api();
      if (!client || !client.isOnline()) { toast('No connection — try when online.', 2500); return; }
      try {
        await client.auth.updateMe({ currentPassword: cur, newPassword: nw });
        document.getElementById('tk-pw-cur').value = '';
        document.getElementById('tk-pw-new').value = '';
        document.getElementById('tk-pw-confirm').value = '';
        document.getElementById('tk-pw-edit').style.display = 'none';
        toast('Password updated.', 2500);
      } catch (e) { toast(e.message || 'Update failed.', 2500); }
    };
  }

  // ── Close drawer ──────────────────────────────────────────────────────────

  function closeDrawer() {
    document.removeEventListener('keydown', onEscDrawer);
    var dr = document.getElementById('tk-dr');
    if (dr) {
      dr.classList.remove('open');
      setTimeout(function () { if (drawerRoot) drawerRoot.innerHTML = ''; }, 300);
    } else if (drawerRoot) {
      drawerRoot.innerHTML = '';
    }
  }

  // ── Top-up modal ──────────────────────────────────────────────────────────

  function showTopupModal() {
    var amounts = [20, 50, 100, 200];
    var selected = 50;
    var root = document.createElement('div');
    root.className = 'tk-topup-ov';
    root.innerHTML =
      '<div class="tk-topup-card">' +
        '<button id="tk-tu-x" style="float:right;background:none;border:none;color:rgba(244,245,238,.5);font-size:22px;cursor:pointer;">×</button>' +
        '<div style="font-family:Anton,sans-serif;font-size:24px;color:#fff;margin-bottom:4px;">Top up wallet</div>' +
        '<div style="font-size:13px;color:rgba(244,245,238,.55);margin-bottom:16px;">Choose an amount in DT</div>' +
        '<div class="tk-topup-pills">' +
          amounts.map(function (a) {
            return '<button class="tk-topup-pill' + (a === selected ? ' sel' : '') + '" data-amt="' + a + '">' + a + ' DT</button>';
          }).join('') +
        '</div>' +
        '<label class="tk-lbl">CUSTOM AMOUNT</label>' +
        '<input class="tk-inp" id="tk-tu-custom" type="number" min="1" placeholder="Enter amount..." style="margin-bottom:16px;">' +
        '<button class="tk-btn" id="tk-tu-confirm">Add to wallet</button>' +
      '</div>';
    document.body.appendChild(root);

    root.querySelectorAll('.tk-topup-pill').forEach(function (btn) {
      btn.onclick = function () {
        selected = parseFloat(btn.getAttribute('data-amt'));
        document.getElementById('tk-tu-custom').value = '';
        root.querySelectorAll('.tk-topup-pill').forEach(function (b) { b.classList.toggle('sel', b === btn); });
      };
    });

    document.getElementById('tk-tu-x').onclick = function () { root.remove(); };
    document.getElementById('tk-tu-confirm').onclick = async function () {
      var custom = parseFloat(document.getElementById('tk-tu-custom').value);
      var amount = !isNaN(custom) && custom > 0 ? custom : selected;
      await auth.topup(amount);
      root.remove();
      // update wallet display in drawer
      var walletEl = drawerRoot && drawerRoot.querySelector('.tk-wallet-val');
      if (walletEl) walletEl.textContent = '◆ ' + (auth.user.walletDt || 0) + ' DT';
      toast('+' + amount + ' DT added to your wallet');
    };
  }

  // ── XSS-safe escape ───────────────────────────────────────────────────────

  function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Init: restore session ─────────────────────────────────────────────────

  (function restoreSession() {
    var client = api();
    if (!client || !client.isOnline()) return; // offline mode, user already restored from localStorage above
    var token = client.getToken();
    if (!token) return; // no stored token
    // verify token is still valid
    client.auth.me().then(function (user) {
      auth.user = user;
      storageSet('takeoff_user', user);
      notify();
    }).catch(function () {
      client.clearTokens();
      auth.user = null;
      storageDel('takeoff_user');
    });
  })();

})();
