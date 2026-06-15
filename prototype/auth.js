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

    login: async function (identifier, password) {
      var id = (identifier || '').trim();
      var client = api();
      if (client && client.isOnline()) {
        try {
          var data = await client.auth.login({ identifier: id, password: password });
          auth.user = data.user;
          storageSet('takeoff_user', data.user);
          notify();
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e.message || 'Invalid credentials.' };
        }
      }
      // offline fallback (local dev without backend): match by email or phone
      var users = storageGet('takeOffUsers') || {};
      var key = id.toLowerCase();
      var u = users[key] || Object.keys(users).map(function (k) { return users[k]; })
        .filter(function (x) { return x.phone === id || x.email === key; })[0];
      if (!u) return { ok: false, error: 'No account found. Create one first.' };
      if (u.password !== password) return { ok: false, error: 'Wrong password.' };
      auth.user = u;
      storageSet('takeoff_user', auth.user);
      notify();
      return { ok: true };
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
      // offline fallback
      var users = storageGet('takeOffUsers') || {};
      if (users[email]) return { ok: false, error: 'Account already exists. Sign in instead.' };
      var u = { email: email, name: name, phone: phone, password: password, tracks: tracks, walletDt: 0, createdAt: new Date().toISOString(), padelLevel: 1, points: 100 };
      users[email] = u;
      storageSet('takeOffUsers', users);
      auth.user = u;
      storageSet('takeoff_user', u);
      notify();
      return { ok: true };
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

    logMatch: async function (opts) {
      if (!auth.user) return;
      var client = api();
      var myLevel = auth.user.padelLevel || 1;
      var opponentLevel = opts.opponentLevel !== undefined ? parseFloat(opts.opponentLevel) : myLevel;
      var result = opts.result === 'W' ? 'W' : 'L';

      if (client && client.isOnline()) {
        try {
          var res = await client.matches.log({
            partnerName: opts.partner || null,
            opponentNames: opts.opponents ? opts.opponents.split('&').map(function (s) { return s.trim(); }).filter(Boolean) : [],
            result: result,
            score: opts.score || null,
            opponentLevel: opponentLevel,
            playedAt: opts.playedAt || new Date().toISOString().slice(0, 10),
          });
          auth.user.points = res.newPoints;
          auth.user.padelLevel = res.newLevel;
          storageSet('takeoff_user', auth.user);
          notify();
          return res;
        } catch (e) {}
      }
      // offline ELO fallback
      var base = result === 'W' ? 20 : -15;
      var delta = Math.round(base * (1 + 0.15 * (opponentLevel - myLevel)));
      delta = Math.max(-40, Math.min(40, delta));
      var newPoints = Math.max(0, (auth.user.points || 100) + delta);
      auth.user.points = newPoints;
      auth.user.padelLevel = Math.min(7, Math.floor(newPoints / 150) + 1);
      storageSet('takeoff_user', auth.user);
      notify();
      return { delta: delta, newPoints: newPoints, newLevel: auth.user.padelLevel };
    },

    submitLevelSurvey: async function (answers) {
      if (!auth.user) return;
      var level = Math.max(1, Math.min(7, answers.level || 1));
      var client = api();
      if (client && client.isOnline()) {
        try { await client.auth.updateMe({ padelLevelSelfDeclared: level }); } catch (e) {}
      }
      var pts = (level - 1) * 150 + 100;
      auth.user.padelLevelSelfDeclared = level;
      auth.user.points = pts;
      auth.user.padelLevel = Math.min(7, Math.floor(pts / 150) + 1);
      storageSet('takeoff_user', auth.user);
      notify();
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
    // survey overlay
    '.tk-survey-ov{position:fixed;inset:0;z-index:1200;background:rgba(7,15,36,.7);display:flex;align-items:center;justify-content:center;padding:20px;}',
    '.tk-survey-card{background:#0c2350;border-radius:18px;padding:32px;width:100%;max-width:420px;}',
    '.tk-survey-q{font-family:"Space Mono",monospace;font-size:11px;letter-spacing:.14em;color:rgba(196,239,63,.9);margin:0 0 10px;}',
    '.tk-survey-opts{display:flex;flex-direction:column;gap:8px;margin-bottom:20px;}',
    '.tk-survey-opt{padding:10px 16px;border-radius:11px;border:1px solid rgba(196,239,63,.3);background:transparent;color:#f4f5ee;font-size:14px;cursor:pointer;text-align:left;}',
    '.tk-survey-opt.sel{background:rgba(196,239,63,.15);border-color:#c4ef3f;color:#c4ef3f;}',
    // toast
    '.tk-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#c4ef3f;color:#0a1733;font-weight:700;font-family:"Space Grotesk",sans-serif;font-size:14px;padding:12px 24px;border-radius:999px;z-index:2000;box-shadow:0 8px 30px rgba(0,0,0,.3);transition:opacity .3s;}',
    // leaderboard
    '.tk-lb-table{width:100%;border-collapse:collapse;font-size:13px;}',
    '.tk-lb-table th{font-family:"Space Mono",monospace;font-size:9px;letter-spacing:.14em;color:rgba(244,245,238,.45);text-align:left;padding:4px 8px;font-weight:400;}',
    '.tk-lb-table td{padding:8px 8px;border-top:1px solid rgba(244,245,238,.06);}',
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
          : '<label class="tk-lbl">EMAIL OR PHONE</label><input class="tk-inp" id="tk-f-email" type="text" placeholder="your@email.com or +216...">') +
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
  var _drData = { matches: null, orders: null, leaderboard: null }; // fetched API data per session

  function showDrawer(tab) {
    if (!auth.user) { showModal('login'); return; }
    drawerTab = (['bookings', 'packs', 'matches', 'orders', 'profile'].indexOf(tab) >= 0) ? tab : 'bookings';
    if (!drawerRoot) { drawerRoot = document.createElement('div'); document.body.appendChild(drawerRoot); }
    renderDrawer();
    document.addEventListener('keydown', onEscDrawer);
    // pre-fetch data for current tab
    fetchTabData(drawerTab);
  }

  function onEscDrawer(e) { if (e.key === 'Escape') { closeDrawer(); document.removeEventListener('keydown', onEscDrawer); } }

  async function fetchTabData(tab) {
    var client = api();
    if (!client || !client.isOnline()) return;
    if (tab === 'matches' && !_drData.matches) {
      try { var mr = await client.matches.list(); _drData.matches = mr && mr.content ? mr.content : (mr || []); renderBody(); } catch (e) {}
    } else if (tab === 'orders' && !_drData.orders) {
      try { var or = await client.orders.list(); _drData.orders = or && or.content ? or.content : (or || []); renderBody(); } catch (e) {}
    } else if (tab === 'profile' && !_drData.leaderboard) {
      try { _drData.leaderboard = await client.leaderboard.get(); renderBody(); } catch (e) {}
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
          ['bookings','packs','matches','orders','profile'].map(function (t) {
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
    if (drawerTab === 'matches') return matchesHTML();
    if (drawerTab === 'orders') return ordersHTML();
    return profileHTML();
  }

  // ── Tab: Bookings ────────────────────────────────────────────────────────

  function bookingsHTML() {
    var items = (auth.user && auth.user.bookings) || [];
    if (!items.length) return '<div class="tk-empty">No bookings yet.<br>Book a court or class to see them here.</div>';
    return items.slice().sort(function (a, b) { return new Date(b.recordedAt) - new Date(a.recordedAt); }).map(function (b) {
      var now = new Date();
      var slotTime = b.slotTime ? new Date(b.slotTime) : new Date(b.recordedAt);
      var status = b.status || (slotTime > now ? 'UPCOMING' : 'PAST');
      var statusColor = status === 'UPCOMING' ? '#c4ef3f' : 'rgba(244,245,238,.4)';
      var date = new Date(b.recordedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return '<div class="tk-card-row">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
          '<div><div style="font-weight:600;font-size:14px;color:#fff;">' + esc(b.name || '') + '</div>' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.5);margin-top:3px;">' + esc(b.sub || '') + (date ? ' · ' + date : '') + '</div></div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="padding:3px 9px;border-radius:999px;font-family:\'Space Mono\',monospace;font-size:9px;background:rgba(196,239,63,.1);color:' + statusColor + ';">' + status + '</span>' +
            '<div style="font-family:Anton,sans-serif;font-size:18px;color:#c4ef3f;">' + esc(b.price || '') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ── Tab: Packs ───────────────────────────────────────────────────────────

  function packsHTML() {
    var all = (auth.user && auth.user.packs) || [];
    var now = new Date();
    var active = all.filter(function (p) { return p.remaining > 0 && new Date(p.expiresAt) > now; });
    var expired = all.filter(function (p) { return p.remaining <= 0 || new Date(p.expiresAt) <= now; });
    var html = '';
    if (!active.length && !expired.length) {
      return '<div class="tk-empty">No packs purchased yet.</div>' +
        '<div style="margin-top:16px;text-align:center;"><a href="/padel#plans" style="color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:.12em;">Get a match pack →</a></div>';
    }
    html += active.map(function (pk) {
      var pct = pk.total > 0 ? Math.round((pk.remaining / pk.total) * 100) : 0;
      var exp = pk.expiresAt ? new Date(pk.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      return '<div style="padding:14px;border-radius:13px;background:rgba(196,239,63,.07);border:1px solid rgba(196,239,63,.18);margin-bottom:10px;">' +
        '<div style="font-weight:600;font-size:14px;color:#fff;margin-bottom:10px;">' + esc(pk.name || 'Pack') + '</div>' +
        '<div style="height:5px;border-radius:999px;background:rgba(244,245,238,.1);margin-bottom:8px;">' +
          '<div style="height:5px;border-radius:999px;background:#c4ef3f;width:' + pct + '%;transition:width .4s;"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.55);">' +
          '<span>' + pk.remaining + ' / ' + pk.total + ' matches remaining</span><span>Expires ' + exp + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
    if (expired.length) {
      html += '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.14em;color:rgba(244,245,238,.35);margin:16px 0 8px;">EXPIRED</div>';
      html += expired.map(function (pk) {
        return '<div style="padding:10px 14px;border-radius:11px;background:rgba(244,245,238,.03);border:1px solid rgba(244,245,238,.08);margin-bottom:8px;opacity:.6;">' +
          '<div style="font-size:13px;color:rgba(244,245,238,.55);">' + esc(pk.name || 'Pack') + ' — 0 remaining</div>' +
        '</div>';
      }).join('');
    }
    html += '<div style="margin-top:16px;text-align:center;"><a href="/padel#plans" style="color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:.12em;">Get more packs →</a></div>';
    return html;
  }

  // ── Tab: Matches ─────────────────────────────────────────────────────────

  var _matchFormOpen = false, _matchResult = 'W';

  function matchesHTML() {
    var items = _drData.matches || (auth.user && auth.user.matches) || [];
    var u = auth.user || {};
    var myLevel = u.padelLevel || 1;

    // ELO delta hint
    var hintFn = 'function _eloHint(){ var lvl=parseFloat(document.getElementById("tk-m-oplvl").value)||' + myLevel + '; var r=window._matchResultUI||"W"; var b=r==="W"?20:-15; var d=Math.round(b*(1+0.15*(lvl-' + myLevel + '))); d=Math.max(-40,Math.min(40,d)); document.getElementById("tk-m-hint").textContent=(d>=0?"+":"")+d+" pts"; }';

    var histHTML = items.length
      ? items.slice().reverse().map(function (m) {
          var isW = m.result === 'W';
          var d = m.delta !== undefined ? m.delta : 0;
          var dStr = (d >= 0 ? '+' : '') + d;
          var date = m.playedAt || (m.date || '');
          var opps = (m.opponentNames || m.opponents || []);
          if (typeof opps === 'string') opps = opps.split('&').map(function (s) { return s.trim(); });
          return '<div class="tk-card-row">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
              '<div style="min-width:0;">' +
                '<div style="font-weight:600;font-size:13px;color:#fff;">' + (m.partnerName || m.partner ? 'w/ ' + esc(m.partnerName || m.partner) : 'Solo') + '</div>' +
                '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.5);margin-top:2px;">' + esc(date) + (opps.length ? ' · vs ' + opps.map(esc).join(' & ') : '') + '</div>' +
                (m.score ? '<div style="font-family:\'Space Mono\',monospace;font-size:11px;color:rgba(244,245,238,.7);margin-top:3px;">' + esc(m.score) + '</div>' : '') +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
                '<span class="tk-pill" style="background:' + (isW ? 'rgba(196,239,63,.15)' : 'rgba(220,90,40,.18)') + ';color:' + (isW ? '#c4ef3f' : '#f4a060') + ';">' + dStr + '</span>' +
                '<span class="tk-pill" style="font-weight:700;background:' + (isW ? 'rgba(196,239,63,.2)' : 'rgba(220,60,60,.18)') + ';color:' + (isW ? '#c4ef3f' : '#f4a0a0') + ';">' + m.result + '</span>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('')
      : '<div class="tk-empty">No matches logged yet.<br>Log your first match below.</div>';

    var formHTML = _matchFormOpen
      ? '<div id="tk-mform" style="background:rgba(196,239,63,.07);border:1px solid rgba(196,239,63,.2);border-radius:14px;padding:16px;margin-top:16px;">' +
          '<script>' + hintFn + '</script>' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:#c4ef3f;margin-bottom:12px;">LOG A MATCH</div>' +
          '<label class="tk-lbl">PARTNER NAME</label><input class="tk-inp" id="tk-m-partner" type="text" placeholder="Partner name" style="margin-bottom:10px;">' +
          '<label class="tk-lbl">OPPONENTS</label><input class="tk-inp" id="tk-m-opponents" type="text" placeholder="Name &amp; Name" style="margin-bottom:10px;">' +
          '<label class="tk-lbl">DATE</label><input class="tk-inp" id="tk-m-date" type="date" value="' + new Date().toISOString().slice(0,10) + '" style="margin-bottom:10px;">' +
          '<label class="tk-lbl">RESULT</label>' +
          '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
            '<button id="tk-m-win" style="flex:1;padding:9px;border-radius:999px;border:1px solid rgba(196,239,63,.4);background:rgba(196,239,63,.15);color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:12px;cursor:pointer;font-weight:700;">W</button>' +
            '<button id="tk-m-loss" style="flex:1;padding:9px;border-radius:999px;border:1px solid rgba(244,245,238,.15);background:transparent;color:rgba(244,245,238,.5);font-family:\'Space Mono\',monospace;font-size:12px;cursor:pointer;">L</button>' +
          '</div>' +
          '<label class="tk-lbl">SCORE</label><input class="tk-inp" id="tk-m-score" type="text" placeholder="6-4 3-6 10-7" style="margin-bottom:10px;">' +
          '<label class="tk-lbl">OPPONENT AVG LEVEL (1–7) <span id="tk-m-hint" style="color:#c4ef3f;margin-left:8px;"></span></label>' +
          '<input class="tk-inp" id="tk-m-oplvl" type="number" min="1" max="7" step="0.5" placeholder="' + myLevel + '" oninput="_eloHint()" style="margin-bottom:14px;">' +
          '<div style="display:flex;gap:10px;">' +
            '<button id="tk-m-cancel" style="flex:1;padding:12px;border-radius:13px;border:1px solid rgba(244,245,238,.15);background:transparent;color:rgba(244,245,238,.6);cursor:pointer;font-family:\'Space Grotesk\',sans-serif;">Cancel</button>' +
            '<button id="tk-m-save" class="tk-btn" style="flex:2;padding:12px;">Save match</button>' +
          '</div>' +
        '</div>'
      : '<button id="tk-m-add" style="width:100%;margin-top:16px;padding:12px;border-radius:13px;border:1px solid rgba(196,239,63,.3);background:transparent;color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:.14em;cursor:pointer;">+ LOG A MATCH</button>';

    return histHTML + formHTML;
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
          '<span>' + esc(it.productName || it.name || '') + (it.size ? ' (' + it.size + ')' : '') + ' ×' + (it.qty || 1) + '</span>' +
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

  function profileHTML() {
    var u = auth.user || {};
    var level = u.padelLevel || 1;
    var points = u.points || 0;
    var matches = _drData.matches || u.matches || [];
    var lb = _drData.leaderboard || [];

    // rank from leaderboard
    var rank = 'Unranked';
    if (lb.length && u.id) {
      var me = lb.find(function (e) { return e.userId === u.id; });
      if (me) rank = '#' + me.rank;
    }

    var memberSince = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
    var matchCount = matches.length;
    var levelReadOnly = matchCount >= 5;

    var pillsHTML = [1,2,3,4,5,6,7].map(function (n) {
      var active = n === level;
      var disabled = levelReadOnly;
      return '<button class="tk-lvl-pill" data-lvl="' + n + '" ' + (disabled ? 'disabled' : '') + ' style="padding:6px 13px;border-radius:999px;border:1px solid ' + (active ? '#c4ef3f' : 'rgba(196,239,63,.35)') + ';background:' + (active ? '#c4ef3f' : 'transparent') + ';color:' + (active ? '#0a1733' : 'rgba(244,245,238,.75)') + ';font-family:\'Space Mono\',monospace;font-size:11px;cursor:' + (disabled ? 'default' : 'pointer') + ';opacity:' + (disabled ? '.5' : '1') + ';">' + n + '</button>';
    }).join(' ');

    var surveyBtn = !u.padelLevelSelfDeclared
      ? '<div style="margin-bottom:16px;"><a id="tk-survey-link" style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.14em;color:#c4ef3f;cursor:pointer;text-decoration:underline;">Take the level survey →</a></div>'
      : '';

    var lbHTML = lb.length
      ? '<table class="tk-lb-table"><thead><tr><th>#</th><th>Player</th><th>LVL</th><th>PTS</th></tr></thead><tbody>' +
          lb.slice(0, 10).map(function (e) {
            var isMe = u.id && e.userId === u.id;
            return '<tr style="' + (isMe ? 'background:rgba(196,239,63,.08);' : '') + '">' +
              '<td style="font-family:Anton,sans-serif;color:#c4ef3f;">' + e.rank + '</td>' +
              '<td style="font-weight:' + (isMe ? '700' : '400') + ';color:#f4f5ee;">' + esc(e.name) + '</td>' +
              '<td style="font-family:\'Space Mono\',monospace;font-size:11px;color:rgba(244,245,238,.65);">' + e.padelLevel + '</td>' +
              '<td style="font-family:Anton,sans-serif;color:#c4ef3f;">' + e.points + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody></table>'
      : '<div style="font-size:13px;color:rgba(244,245,238,.4);">Leaderboard loading…</div>';

    return '<div class="tk-stat-grid">' +
        '<div class="tk-stat"><div class="tk-stat-lbl">LEVEL</div><div class="tk-stat-val">' + level + '</div></div>' +
        '<div class="tk-stat"><div class="tk-stat-lbl">POINTS</div><div class="tk-stat-val">' + points + '</div></div>' +
        '<div class="tk-stat"><div class="tk-stat-lbl">RANK</div><div class="tk-stat-val" style="font-size:' + (rank.length > 4 ? '18' : '28') + 'px;">' + rank + '</div></div>' +
      '</div>' +
      (levelReadOnly ? '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.4);margin-bottom:12px;">Level computed from your ELO after 5+ matches.</div>' : surveyBtn) +
      '<div style="margin-bottom:18px;">' +
        '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);margin-bottom:8px;">PADEL LEVEL</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' + pillsHTML + '</div>' +
        (levelReadOnly ? '' : '<div style="font-family:\'Space Mono\',monospace;font-size:9px;color:rgba(244,245,238,.35);margin-top:6px;">Auto-locked after 5 matches</div>') +
      '</div>' +
      '<div style="margin-bottom:16px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);">NAME</div>' +
          '<button id="tk-edit-name" style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.1em;color:#c4ef3f;background:none;border:none;cursor:pointer;">EDIT</button>' +
        '</div>' +
        '<div id="tk-name-view" style="font-size:15px;color:#f4f5ee;">' + esc(u.name || '') + '</div>' +
        '<div id="tk-name-edit" style="display:none;">' +
          '<input class="tk-inp" id="tk-name-inp" type="text" value="' + esc(u.name || '') + '" style="margin-bottom:8px;">' +
          '<button id="tk-name-save" class="tk-btn" style="padding:10px;">Save</button>' +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:16px;">' +
        '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);margin-bottom:6px;">TRACKS</div>' +
        '<div>' + (u.tracks || []).map(function (t) {
          return '<span style="padding:5px 12px;border-radius:999px;background:rgba(196,239,63,.15);color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.14em;margin-right:6px;">' + t.toUpperCase() + '</span>';
        }).join('') + '</div>' +
      '</div>' +
      (memberSince ? '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.35);margin-bottom:20px;">Member since ' + memberSince + '</div>' : '') +
      '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);margin-bottom:10px;">LEADERBOARD</div>' +
      lbHTML;
  }

  // ── Wire body event listeners ─────────────────────────────────────────────

  function wireBodyEvents() {
    // Level pills
    document.querySelectorAll('.tk-lvl-pill:not([disabled])').forEach(function (pill) {
      pill.onclick = function () {
        var n = parseInt(pill.getAttribute('data-lvl'), 10);
        auth.submitLevelSurvey({ level: n });
        renderBody();
      };
    });

    // Survey link
    var surveyLink = document.getElementById('tk-survey-link');
    if (surveyLink) surveyLink.onclick = showSurveyModal;

    // Match form toggle
    var addBtn = document.getElementById('tk-m-add');
    if (addBtn) addBtn.onclick = function () { _matchFormOpen = true; renderBody(); };
    var cancelBtn = document.getElementById('tk-m-cancel');
    if (cancelBtn) cancelBtn.onclick = function () { _matchFormOpen = false; renderBody(); };

    // Match result toggle
    var winBtn = document.getElementById('tk-m-win');
    var lossBtn = document.getElementById('tk-m-loss');
    if (winBtn && lossBtn) {
      window._matchResultUI = _matchResult;
      function setResult(r) {
        _matchResult = r; window._matchResultUI = r;
        if (r === 'W') {
          winBtn.style.cssText = 'flex:1;padding:9px;border-radius:999px;border:1px solid rgba(196,239,63,.4);background:rgba(196,239,63,.15);color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:12px;cursor:pointer;font-weight:700;';
          lossBtn.style.cssText = 'flex:1;padding:9px;border-radius:999px;border:1px solid rgba(244,245,238,.15);background:transparent;color:rgba(244,245,238,.5);font-family:\'Space Mono\',monospace;font-size:12px;cursor:pointer;';
        } else {
          lossBtn.style.cssText = 'flex:1;padding:9px;border-radius:999px;border:1px solid rgba(220,60,60,.4);background:rgba(220,60,60,.15);color:#f4a0a0;font-family:\'Space Mono\',monospace;font-size:12px;cursor:pointer;font-weight:700;';
          winBtn.style.cssText = 'flex:1;padding:9px;border-radius:999px;border:1px solid rgba(244,245,238,.15);background:transparent;color:rgba(244,245,238,.5);font-family:\'Space Mono\',monospace;font-size:12px;cursor:pointer;';
        }
      }
      setResult(_matchResult);
      winBtn.onclick = function () { setResult('W'); };
      lossBtn.onclick = function () { setResult('L'); };
    }

    // Match save
    var saveBtn = document.getElementById('tk-m-save');
    if (saveBtn) saveBtn.onclick = async function () {
      saveBtn.disabled = true; saveBtn.textContent = '...';
      var res = await auth.logMatch({
        partner: (document.getElementById('tk-m-partner').value || '').trim(),
        opponents: (document.getElementById('tk-m-opponents').value || '').trim(),
        result: _matchResult,
        score: (document.getElementById('tk-m-score').value || '').trim(),
        opponentLevel: parseFloat(document.getElementById('tk-m-oplvl').value) || undefined,
        playedAt: document.getElementById('tk-m-date').value || undefined,
      });
      _matchFormOpen = false;
      _drData.matches = null; // invalidate cache
      var delta = res && res.delta !== undefined ? res.delta : 0;
      toast('Match logged — ' + (delta >= 0 ? '+' : '') + delta + ' pts');
      renderBody();
    };

    // Profile: edit name
    var editNameBtn = document.getElementById('tk-edit-name');
    if (editNameBtn) {
      editNameBtn.onclick = function () {
        document.getElementById('tk-name-view').style.display = 'none';
        document.getElementById('tk-name-edit').style.display = 'block';
      };
    }
    var saveNameBtn = document.getElementById('tk-name-save');
    if (saveNameBtn) saveNameBtn.onclick = async function () {
      var newName = (document.getElementById('tk-name-inp').value || '').trim();
      if (!newName) return;
      var client = api();
      if (client && client.isOnline()) { try { await client.auth.updateMe({ name: newName }); } catch (e) {} }
      auth.user.name = newName;
      storageSet('takeoff_user', auth.user);
      document.getElementById('tk-uname-disp').textContent = newName;
      document.getElementById('tk-name-view').textContent = newName;
      document.getElementById('tk-name-view').style.display = 'block';
      document.getElementById('tk-name-edit').style.display = 'none';
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

  // ── Level survey modal ────────────────────────────────────────────────────

  function showSurveyModal() {
    var qs = [
      { q: 'HOW LONG HAVE YOU BEEN PLAYING?', opts: ['< 6 months', '6 months – 2 years', '2 – 5 years', '5+ years'], pts: [1, 2, 3, 4] },
      { q: 'COMPETITION EXPERIENCE?', opts: ['None', 'Played club matches', 'Local tournaments', 'Regional / National'], pts: [0, 1, 2, 3] },
      { q: 'PHYSICAL FITNESS?', opts: ['Getting started', 'Recreational', 'Athletic', 'High performance'], pts: [0, 1, 1, 2] },
    ];
    var answers = [0, 0, 0];
    var root = document.createElement('div');
    root.className = 'tk-survey-ov';

    function renderSurvey() {
      root.innerHTML = '<div class="tk-survey-card">' +
        '<button id="tk-sv-x" style="float:right;background:none;border:none;color:rgba(244,245,238,.5);font-size:22px;cursor:pointer;">×</button>' +
        '<div style="font-family:Anton,sans-serif;font-size:24px;color:#fff;margin-bottom:4px;">Level survey</div>' +
        '<div style="font-size:13px;color:rgba(244,245,238,.55);margin-bottom:20px;">Helps us place you on the ladder</div>' +
        qs.map(function (qData, qi) {
          return '<div class="tk-survey-q">' + qData.q + '</div>' +
            '<div class="tk-survey-opts">' +
              qData.opts.map(function (opt, oi) {
                return '<button class="tk-survey-opt' + (answers[qi] === oi ? ' sel' : '') + '" data-qi="' + qi + '" data-oi="' + oi + '">' + opt + '</button>';
              }).join('') +
            '</div>';
        }).join('') +
        '<button class="tk-btn" id="tk-sv-confirm">Set my level</button>' +
      '</div>';

      root.querySelectorAll('.tk-survey-opt').forEach(function (btn) {
        btn.onclick = function () {
          var qi = parseInt(btn.getAttribute('data-qi'), 10);
          var oi = parseInt(btn.getAttribute('data-oi'), 10);
          answers[qi] = oi;
          renderSurvey();
        };
      });

      document.getElementById('tk-sv-x').onclick = function () { root.remove(); };
      document.getElementById('tk-sv-confirm').onclick = async function () {
        var totalPts = qs.reduce(function (s, qData, qi) { return s + qData.pts[answers[qi]]; }, 0);
        var level = Math.min(7, Math.max(1, totalPts));
        await auth.submitLevelSurvey({ level: level });
        root.remove();
        _drData.leaderboard = null;
        renderBody();
        toast('Level set to ' + level);
      };
    }

    renderSurvey();
    document.body.appendChild(root);
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
