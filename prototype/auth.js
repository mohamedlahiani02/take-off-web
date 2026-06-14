// Take Off Club — Shared Auth + Wallet + Account Drawer
// Plain script, no module syntax. Idempotent.
(function () {
  if (window.takeOffAuth) return;

  // ── State helpers ─────────────────────────────────────────────────────────

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function storageSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function getUsers() { return storageGet('takeOffUsers') || {}; }
  function saveUsers(u) { storageSet('takeOffUsers', u); }
  function getCurrentUser() { return storageGet('takeOffCurrentUser') || null; }
  function saveCurrentUser(u) { storageSet('takeOffCurrentUser', u); }

  // ── Pub/sub ───────────────────────────────────────────────────────────────

  var _subscribers = [];
  function notify() {
    _subscribers.forEach(function (fn) { try { fn(auth.user); } catch (e) {} });
  }

  // ── Pending auth callback ─────────────────────────────────────────────────

  var _pendingCallback = null;

  // ── Core auth object ──────────────────────────────────────────────────────

  var auth = {
    user: getCurrentUser(),

    subscribe: function (fn) {
      _subscribers.push(fn);
      return function () { _subscribers = _subscribers.filter(function (s) { return s !== fn; }); };
    },

    login: function (email, password) {
      if (!email || !password) return { ok: false, error: 'Email and password required.' };
      var users = getUsers();
      if (!users[email]) {
        // auto-create on first login (mock)
        var namePart = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        users[email] = { email: email, name: namePart, password: password, tracks: ['padel', 'pilates'], wallet: 0, createdAt: Date.now(), bookings: [], padelLevel: 1, points: 100, packs: [], orders: [], padelLevelSelfDeclared: null, matches: [] };
        saveUsers(users);
      }
      auth.user = users[email];
      saveCurrentUser(auth.user);
      notify();
      return { ok: true };
    },

    register: function (opts) {
      var email = (opts.email || '').trim().toLowerCase();
      var name = (opts.name || '').trim();
      var password = opts.password || '';
      var tracks = opts.tracks || ['padel'];
      if (!email || !name || !password) return { ok: false, error: 'All fields required.' };
      var users = getUsers();
      if (users[email]) return { ok: false, error: 'Account already exists. Sign in instead.' };
      users[email] = { email: email, name: name, password: password, tracks: tracks, wallet: 0, createdAt: Date.now(), bookings: [], padelLevel: 1, points: 100, packs: [], orders: [], padelLevelSelfDeclared: null, matches: [] };
      saveUsers(users);
      auth.user = users[email];
      saveCurrentUser(auth.user);
      notify();
      return { ok: true };
    },

    logout: function () {
      auth.user = null;
      saveCurrentUser(null);
      notify();
    },

    topup: function (amount) {
      if (!auth.user) return;
      var n = parseFloat(amount);
      if (isNaN(n) || n <= 0) return;
      auth.user.wallet = (auth.user.wallet || 0) + n;
      var users = getUsers();
      if (users[auth.user.email]) users[auth.user.email].wallet = auth.user.wallet;
      saveUsers(users);
      saveCurrentUser(auth.user);
      notify();
    },

    recordBooking: function (item) {
      if (!auth.user) return;
      var booking = Object.assign({}, item, { recordedAt: Date.now() });
      if (!auth.user.bookings) auth.user.bookings = [];
      auth.user.bookings.push(booking);
      var users = getUsers();
      if (users[auth.user.email]) users[auth.user.email].bookings = auth.user.bookings;
      saveUsers(users);
      saveCurrentUser(auth.user);
    },

    setLevel: function (n) {
      if (!auth.user) return;
      var clamped = Math.max(0, Math.min(7, Math.round(n)));
      auth.user.padelLevel = clamped;
      var users = getUsers();
      if (users[auth.user.email]) users[auth.user.email].padelLevel = clamped;
      saveUsers(users);
      saveCurrentUser(auth.user);
      notify();
    },

    logMatch: function (opts) {
      if (!auth.user) return;
      if (!auth.user.matches) auth.user.matches = [];
      var myLevel = auth.user.padelLevel !== undefined ? auth.user.padelLevel : 1;
      var opponentLevel = opts.opponentLevel !== undefined ? parseFloat(opts.opponentLevel) : myLevel;
      var result = opts.result === 'W' ? 'W' : 'L';
      var base = result === 'W' ? 20 : -15;
      var diff = opponentLevel - myLevel;
      var delta = Math.round(base * (1 + 0.15 * diff));
      delta = Math.max(-40, Math.min(40, delta));
      var currentPoints = auth.user.points !== undefined ? auth.user.points : 100;
      var newPoints = Math.max(0, currentPoints + delta);
      var newLevel = Math.min(7, Math.floor(newPoints / 150) + 1);
      var match = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        date: new Date().toISOString().slice(0, 10),
        partner: opts.partner || '',
        opponents: (opts.opponents || '').split('&').map(function (s) { return s.trim(); }),
        result: result,
        score: opts.score || '',
        opponentLevel: opponentLevel,
        delta: delta,
      };
      auth.user.matches.push(match);
      auth.user.points = newPoints;
      auth.user.padelLevel = newLevel;
      var users = getUsers();
      if (users[auth.user.email]) {
        users[auth.user.email].matches = auth.user.matches;
        users[auth.user.email].points = newPoints;
        users[auth.user.email].padelLevel = newLevel;
      }
      saveUsers(users);
      saveCurrentUser(auth.user);
      notify();
    },

    purchasePack: function (opts) {
      if (!auth.user) return;
      if (!auth.user.packs) auth.user.packs = [];
      var now = new Date();
      var months = opts.months || 3;
      var exp = new Date(now);
      exp.setMonth(exp.getMonth() + months);
      var pack = {
        id: opts.id || ('pack_' + Date.now()),
        name: opts.name || 'Pack',
        total: opts.total || 10,
        remaining: opts.total || 10,
        purchasedAt: now.toISOString(),
        expiresAt: exp.toISOString(),
      };
      auth.user.packs.push(pack);
      var users = getUsers();
      if (users[auth.user.email]) users[auth.user.email].packs = auth.user.packs;
      saveUsers(users);
      saveCurrentUser(auth.user);
      notify();
    },

    consumePack: function (n) {
      if (!auth.user || !auth.user.packs) return false;
      var now = new Date();
      var toSpend = n || 1;
      var packs = auth.user.packs;
      // find oldest non-expired pack with remaining
      for (var i = 0; i < packs.length; i++) {
        var p = packs[i];
        if (p.remaining > 0 && new Date(p.expiresAt) > now) {
          var canSpend = Math.min(toSpend, p.remaining);
          p.remaining -= canSpend;
          toSpend -= canSpend;
          if (toSpend <= 0) break;
        }
      }
      var users = getUsers();
      if (users[auth.user.email]) users[auth.user.email].packs = auth.user.packs;
      saveUsers(users);
      saveCurrentUser(auth.user);
      notify();
      return toSpend <= 0;
    },

    recordOrder: function (item) {
      if (!auth.user) return;
      if (!auth.user.orders) auth.user.orders = [];
      auth.user.orders.push(Object.assign({}, item, { recordedAt: Date.now() }));
      var users = getUsers();
      if (users[auth.user.email]) users[auth.user.email].orders = auth.user.orders;
      saveUsers(users);
      saveCurrentUser(auth.user);
      notify();
    },

    submitLevelSurvey: function (answers) {
      if (!auth.user) return;
      var level = Math.max(1, Math.min(5, answers.level || 1));
      var pts = (level - 1) * 150 + 100;
      auth.user.padelLevelSelfDeclared = level;
      auth.user.points = pts;
      auth.user.padelLevel = Math.min(7, Math.floor(pts / 150) + 1);
      var users = getUsers();
      if (users[auth.user.email]) {
        users[auth.user.email].padelLevelSelfDeclared = level;
        users[auth.user.email].points = pts;
        users[auth.user.email].padelLevel = auth.user.padelLevel;
      }
      saveUsers(users);
      saveCurrentUser(auth.user);
      notify();
    },

    requireAuth: function (callback) {
      if (auth.user) { callback(); return; }
      _pendingCallback = callback;
      auth.openLogin();
    },

    openLogin: function () { showModal('login'); },
    openAccount: function (tab) { showDrawer(tab); },
  };

  window.takeOffAuth = auth;

  // ── CSS ───────────────────────────────────────────────────────────────────

  var style = document.createElement('style');
  style.textContent = [
    '.tk-auth-overlay{position:fixed;inset:0;z-index:1000;background:rgba(7,15,36,.55);display:flex;align-items:center;justify-content:center;padding:20px;}',
    '.tk-auth-card{background:#0c2350;color:#f4f5ee;border-radius:20px;padding:40px;width:100%;max-width:440px;position:relative;box-shadow:0 32px 80px rgba(0,0,0,.5);}',
    '.tk-auth-close{position:absolute;top:16px;right:20px;cursor:pointer;font-size:22px;color:rgba(244,245,238,.5);background:none;border:none;line-height:1;}',
    '.tk-auth-title{font-family:Anton,sans-serif;font-size:32px;letter-spacing:.02em;text-transform:uppercase;color:#fff;margin:16px 0 8px;}',
    '.tk-auth-sub{font-size:13px;color:rgba(244,245,238,.6);margin:0 0 26px;}',
    '.tk-auth-label{display:block;font-family:"Space Mono",monospace;font-size:11px;letter-spacing:.18em;color:rgba(244,245,238,.6);margin-bottom:7px;}',
    '.tk-auth-input{width:100%;padding:12px 16px;border-radius:11px;border:1px solid rgba(196,239,63,.25);background:rgba(255,255,255,.06);color:#f4f5ee;font-size:15px;font-family:"Space Grotesk",sans-serif;outline:none;margin-bottom:18px;box-sizing:border-box;}',
    '.tk-auth-input:focus{border-color:#c4ef3f;}',
    '.tk-auth-btn{width:100%;padding:15px;border-radius:13px;background:#c4ef3f;color:#0a1733;font-weight:700;font-size:15px;font-family:"Space Grotesk",sans-serif;border:none;cursor:pointer;letter-spacing:.04em;}',
    '.tk-auth-btn:active{opacity:.88;}',
    '.tk-auth-switch{text-align:center;margin-top:20px;font-size:13px;color:rgba(244,245,238,.55);}',
    '.tk-auth-switch a{color:#c4ef3f;cursor:pointer;text-decoration:underline;}',
    '.tk-auth-error{background:rgba(220,60,60,.18);border:1px solid rgba(220,60,60,.4);color:#f4a0a0;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:16px;}',
    '.tk-auth-checks{display:flex;gap:18px;margin-bottom:20px;}',
    '.tk-auth-check{display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer;}',
    '.tk-auth-check input{accent-color:#c4ef3f;width:16px;height:16px;}',
    // Drawer
    '.tk-drawer-overlay{position:fixed;inset:0;z-index:1000;background:rgba(7,15,36,.45);}',
    '.tk-drawer{position:fixed;top:0;right:0;bottom:0;width:min(380px,92vw);background:#0c1c3f;border-left:1px solid rgba(196,239,63,.18);z-index:1001;display:flex;flex-direction:column;box-shadow:-24px 0 60px rgba(0,0,0,.45);overflow:hidden;}',
    '.tk-drawer-head{padding:28px 24px 20px;border-bottom:1px solid rgba(244,245,238,.1);}',
    '.tk-drawer-close{float:right;cursor:pointer;font-size:24px;color:rgba(244,245,238,.5);background:none;border:none;}',
    '.tk-drawer-avatar{width:52px;height:52px;border-radius:50%;background:#c4ef3f;color:#0a1733;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;margin-bottom:12px;}',
    '.tk-drawer-name{font-weight:700;font-size:19px;color:#fff;margin:0;}',
    '.tk-drawer-email{font-family:"Space Mono",monospace;font-size:11px;color:rgba(244,245,238,.5);letter-spacing:.1em;margin-top:4px;}',
    '.tk-drawer-wallet{display:flex;align-items:center;justify-content:space-between;margin-top:18px;padding:13px 16px;border-radius:13px;background:rgba(196,239,63,.1);border:1px solid rgba(196,239,63,.2);}',
    '.tk-drawer-wallet-val{font-family:Anton,sans-serif;font-size:26px;color:#c4ef3f;}',
    '.tk-drawer-topup{padding:8px 16px;border-radius:999px;background:#c4ef3f;color:#0a1733;font-weight:700;font-size:13px;cursor:pointer;border:none;}',
    '.tk-drawer-tabs{display:flex;border-bottom:1px solid rgba(244,245,238,.1);}',
    '.tk-drawer-tab{flex:1;padding:14px;text-align:center;cursor:pointer;font-family:"Space Mono",monospace;font-size:11px;letter-spacing:.14em;color:rgba(244,245,238,.5);border:none;background:none;}',
    '.tk-drawer-tab.active{color:#c4ef3f;border-bottom:2px solid #c4ef3f;}',
    '.tk-drawer-body{flex:1;overflow-y:auto;padding:20px 24px;}',
    '.tk-drawer-booking{padding:12px 14px;border-radius:11px;background:rgba(244,245,238,.05);margin-bottom:10px;}',
    '.tk-drawer-booking-name{font-weight:600;font-size:14px;color:#fff;}',
    '.tk-drawer-booking-meta{font-family:"Space Mono",monospace;font-size:10px;color:rgba(244,245,238,.5);margin-top:3px;letter-spacing:.08em;}',
    '.tk-drawer-booking-price{font-family:Anton,sans-serif;font-size:18px;color:#c4ef3f;}',
    '.tk-drawer-logout{margin:16px 24px;padding:14px;border-radius:13px;text-align:center;font-weight:700;cursor:pointer;background:rgba(244,245,238,.06);color:rgba(244,245,238,.65);border:1px solid rgba(244,245,238,.1);font-family:"Space Grotesk",sans-serif;font-size:14px;}',
    '.tk-drawer-logout:hover{background:rgba(244,245,238,.1);}',
    '.tk-drawer-empty{color:rgba(244,245,238,.4);font-size:14px;line-height:1.6;text-align:center;margin-top:30px;}',
    // Level + match
    '.tk-auth-level-pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px;}',
    '.tk-auth-level-pill{transition:all .15s ease;}',
    '.tk-auth-level-pill:hover{opacity:.85;}',
    '.tk-auth-match-row{transition:background .15s ease;}',
    '.tk-auth-match-form input.tk-auth-input{margin-bottom:0;}',
  ].join('');
  document.head.appendChild(style);

  // ── Modal ─────────────────────────────────────────────────────────────────

  var modalRoot = null;
  var modalMode = 'login'; // 'login' | 'register'

  function buildSigSVG() {
    return '<svg width="100" height="34" viewBox="0 0 200 70" style="overflow:visible;display:block;margin:0 auto 4px;">' +
      '<path d="M8,46 C26,46 30,40 44,42 C30,40 34,8 52,8 C70,8 66,44 50,46 C66,48 70,42 86,42 C70,40 74,8 92,8 C110,8 106,44 90,46 C106,48 110,42 126,42 C110,40 114,8 132,8 C150,8 146,44 130,46 C150,48 168,48 192,44" fill="none" stroke="#c4ef3f" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></path>' +
      '</svg>';
  }

  function modalHTML(mode) {
    var isReg = mode === 'register';
    return '<div class="tk-auth-overlay" id="tk-modal-overlay">' +
      '<div class="tk-auth-card">' +
        '<button class="tk-auth-close" id="tk-modal-close">×</button>' +
        buildSigSVG() +
        '<div style="text-align:center;font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.22em;color:rgba(244,245,238,.5);margin-bottom:6px;">TAKE OFF CLUB</div>' +
        '<div class="tk-auth-title" style="text-align:center;">' + (isReg ? 'Create account' : 'Sign in') + '</div>' +
        '<p class="tk-auth-sub" style="text-align:center;">' + (isReg ? 'Join the club — padel, pilates, and more.' : 'Welcome back. Sign in to manage your bookings.') + '</p>' +
        '<div id="tk-modal-error" style="display:none;" class="tk-auth-error"></div>' +
        (isReg ? '<label class="tk-auth-label">YOUR NAME</label><input class="tk-auth-input" id="tk-f-name" type="text" placeholder="Full name">' : '') +
        '<label class="tk-auth-label">EMAIL</label><input class="tk-auth-input" id="tk-f-email" type="email" placeholder="your@email.com">' +
        '<label class="tk-auth-label">PASSWORD</label><input class="tk-auth-input" id="tk-f-pass" type="password" placeholder="••••••••">' +
        (isReg ? '<label class="tk-auth-label">I\'M INTO</label><div class="tk-auth-checks"><label class="tk-auth-check"><input type="checkbox" id="tk-tr-pad" checked> Padel</label><label class="tk-auth-check"><input type="checkbox" id="tk-tr-pil"> Pilates</label></div>' : '') +
        '<button class="tk-auth-btn" id="tk-modal-submit">' + (isReg ? 'Create account' : 'Sign in') + '</button>' +
        '<div class="tk-auth-switch">' + (isReg ? 'Already have an account? <a id="tk-modal-swap">Sign in</a>' : 'New here? <a id="tk-modal-swap">Create account</a>') + '</div>' +
      '</div>' +
    '</div>';
  }

  function showModal(mode) {
    modalMode = mode || 'login';
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      document.body.appendChild(modalRoot);
    }
    modalRoot.innerHTML = modalHTML(modalMode);

    document.getElementById('tk-modal-close').addEventListener('click', closeModal);
    document.getElementById('tk-modal-overlay').addEventListener('click', function (e) {
      if (e.target === document.getElementById('tk-modal-overlay')) closeModal();
    });
    document.getElementById('tk-modal-swap').addEventListener('click', function () {
      showModal(modalMode === 'login' ? 'register' : 'login');
    });
    document.getElementById('tk-modal-submit').addEventListener('click', handleSubmit);
    // Enter key
    modalRoot.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
    });
  }

  function handleSubmit() {
    var errEl = document.getElementById('tk-modal-error');
    errEl.style.display = 'none';
    var email = (document.getElementById('tk-f-email') || {}).value || '';
    var pass = (document.getElementById('tk-f-pass') || {}).value || '';
    var result;
    if (modalMode === 'register') {
      var name = (document.getElementById('tk-f-name') || {}).value || '';
      var tracks = [];
      if (document.getElementById('tk-tr-pad') && document.getElementById('tk-tr-pad').checked) tracks.push('padel');
      if (document.getElementById('tk-tr-pil') && document.getElementById('tk-tr-pil').checked) tracks.push('pilates');
      result = auth.register({ email: email, name: name, password: pass, tracks: tracks });
    } else {
      result = auth.login(email, pass);
    }
    if (!result.ok) {
      errEl.textContent = result.error;
      errEl.style.display = 'block';
      return;
    }
    closeModal();
    if (_pendingCallback) {
      var cb = _pendingCallback;
      _pendingCallback = null;
      setTimeout(cb, 50);
    }
  }

  function closeModal() {
    if (modalRoot) modalRoot.innerHTML = '';
  }

  // ── Account Drawer ────────────────────────────────────────────────────────

  var drawerRoot = null;
  var drawerTab = 'bookings';

  function showDrawer(tab) {
    if (!auth.user) { showModal('login'); return; }
    drawerTab = (['bookings', 'packs', 'matches', 'orders', 'profile'].indexOf(tab) >= 0) ? tab : 'bookings';
    if (!drawerRoot) {
      drawerRoot = document.createElement('div');
      document.body.appendChild(drawerRoot);
    }
    renderDrawer();
  }

  function renderDrawer() {
    if (!auth.user || !drawerRoot) return;
    var u = auth.user;
    var initial = (u.name || u.email || '?')[0].toUpperCase();
    var bookings = u.bookings || [];
    var matches = u.matches || [];
    var packs = u.packs || [];
    var orders = u.orders || [];
    var level = u.padelLevel !== undefined ? u.padelLevel : 1;
    var points = u.points !== undefined ? u.points : 100;

    // Compute rank from baseline leaderboard points
    var baselinePts = [142, 128, 121, 110, 102, 96, 88, 81, 74, 70];
    var rank = '—';
    for (var ri = 0; ri < baselinePts.length; ri++) {
      if (points > baselinePts[ri]) { rank = String(ri + 1); break; }
    }
    if (rank === '—' && points > 0) rank = '11+';

    var bookingsHTML = bookings.length
      ? bookings.slice().reverse().map(function (b) {
          var date = b.recordedAt ? new Date(b.recordedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
          return '<div class="tk-drawer-booking"><div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
            '<div><div class="tk-drawer-booking-name">' + (b.name || '') + '</div>' +
            '<div class="tk-drawer-booking-meta">' + (b.sub || '') + (date ? ' · ' + date : '') + '</div></div>' +
            '<div class="tk-drawer-booking-price">' + (b.price || '') + '</div>' +
            '</div></div>';
        }).join('')
      : '<div class="tk-drawer-empty">No bookings yet.<br>Book a court or a class to see them here.</div>';

    // Packs tab
    var packsHTML = packs.length
      ? packs.map(function (pk) {
          var pct = pk.total > 0 ? Math.round((pk.remaining / pk.total) * 100) : 0;
          var exp = pk.expiresAt ? new Date(pk.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
          return '<div style="padding:14px;border-radius:13px;background:rgba(196,239,63,.07);border:1px solid rgba(196,239,63,.18);margin-bottom:10px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">' +
              '<div style="font-weight:600;font-size:14px;color:#fff;">' + (pk.name || 'Pack') + '</div>' +
              '<span style="padding:4px 10px;border-radius:999px;background:rgba(196,239,63,.15);color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.1em;">USE NEXT BOOKING</span>' +
            '</div>' +
            '<div style="height:5px;border-radius:999px;background:rgba(244,245,238,.1);margin-bottom:8px;">' +
              '<div style="height:5px;border-radius:999px;background:#c4ef3f;width:' + pct + '%;transition:width .4s;"></div>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.55);">' +
              '<span>' + pk.remaining + ' / ' + pk.total + ' matches remaining</span>' +
              '<span>Expires ' + exp + '</span>' +
            '</div>' +
          '</div>';
        }).join('')
      : '<div class="tk-drawer-empty">No packs purchased yet.<br>Visit the Plans section to get a match pack.</div>';

    // Profile tab
    var levelPillsHTML = [0,1,2,3,4,5,6,7].map(function (n) {
      var active = n === level;
      return '<button class="tk-auth-level-pill' + (active ? ' active' : '') + '" data-lvl="' + n + '" style="padding:6px 13px;border-radius:999px;border:1px solid ' + (active ? '#c4ef3f' : 'rgba(196,239,63,.35)') + ';background:' + (active ? '#c4ef3f' : 'transparent') + ';color:' + (active ? '#0a1733' : 'rgba(244,245,238,.75)') + ';font-family:\'Space Mono\',monospace;font-size:11px;cursor:pointer;font-weight:' + (active ? '700' : '400') + ';">' + n + '</button>';
    }).join('');

    var profileHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">' +
        '<div style="background:rgba(196,239,63,.08);border:1px solid rgba(196,239,63,.2);border-radius:13px;padding:14px;text-align:center;">' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.16em;color:rgba(244,245,238,.5);margin-bottom:6px;">LEVEL</div>' +
          '<div style="font-family:Anton,sans-serif;font-size:28px;color:#c4ef3f;line-height:1;">' + level + '</div>' +
        '</div>' +
        '<div style="background:rgba(196,239,63,.08);border:1px solid rgba(196,239,63,.2);border-radius:13px;padding:14px;text-align:center;">' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.16em;color:rgba(244,245,238,.5);margin-bottom:6px;">POINTS</div>' +
          '<div style="font-family:Anton,sans-serif;font-size:28px;color:#c4ef3f;line-height:1;">' + points + '</div>' +
        '</div>' +
        '<div style="background:rgba(196,239,63,.08);border:1px solid rgba(196,239,63,.2);border-radius:13px;padding:14px;text-align:center;">' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.16em;color:rgba(244,245,238,.5);margin-bottom:6px;">RANK</div>' +
          '<div style="font-family:Anton,sans-serif;font-size:28px;color:#c4ef3f;line-height:1;">' + rank + '</div>' +
        '</div>' +
      '</div>' +
      (!u.padelLevelSelfDeclared ? '<div style="margin-bottom:16px;"><a id="tk-survey-link" style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.14em;color:#c4ef3f;cursor:pointer;text-decoration:underline;">Take the level survey →</a></div>' : '') +
      '<div style="margin-bottom:18px;">' +
      '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);margin-bottom:8px;">PADEL LEVEL</div>' +
      '<div class="tk-auth-level-pills" style="display:flex;gap:6px;flex-wrap:wrap;">' + levelPillsHTML + '</div>' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);margin-bottom:6px;">TRACKS</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + (u.tracks || []).map(function (t) {
        return '<span style="padding:5px 12px;border-radius:999px;background:rgba(196,239,63,.15);color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.14em;">' + t.toUpperCase() + '</span>';
      }).join('') + '</div></div>' +
      '<div><div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.5);margin-bottom:6px;">EMAIL</div>' +
      '<div style="font-size:14px;color:#f4f5ee;">' + u.email + '</div></div>';

    // Matches tab
    var matchesListHTML = matches.length
      ? matches.slice().reverse().map(function (m) {
          var isW = m.result === 'W';
          var deltaStr = m.delta !== undefined ? (m.delta >= 0 ? '+' + m.delta : '' + m.delta) : '';
          return '<div class="tk-auth-match-row" style="padding:11px 13px;border-radius:11px;background:rgba(244,245,238,.05);margin-bottom:8px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
              '<div style="min-width:0;">' +
                '<div style="font-weight:600;font-size:13px;color:#fff;">' + (m.partner ? 'w/ ' + m.partner : 'Solo') + '</div>' +
                '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.5);margin-top:2px;letter-spacing:.06em;">' + m.date + (m.opponents && m.opponents.join('') ? ' · vs ' + m.opponents.join(' & ') : '') + '</div>' +
                (m.score ? '<div style="font-family:\'Space Mono\',monospace;font-size:11px;color:rgba(244,245,238,.7);margin-top:3px;">' + m.score + '</div>' : '') +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
                (deltaStr ? '<span style="padding:3px 8px;border-radius:999px;font-family:\'Space Mono\',monospace;font-size:10px;background:' + (isW ? 'rgba(196,239,63,.15)' : 'rgba(220,90,40,.18)') + ';color:' + (isW ? '#c4ef3f' : '#f4a060') + ';">' + deltaStr + '</span>' : '') +
                '<span style="padding:5px 12px;border-radius:999px;font-family:\'Space Mono\',monospace;font-size:11px;font-weight:700;background:' + (isW ? 'rgba(196,239,63,.2)' : 'rgba(220,60,60,.18)') + ';color:' + (isW ? '#c4ef3f' : '#f4a0a0') + ';">' + m.result + '</span>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('')
      : '<div class="tk-drawer-empty">No matches logged yet.</div>';

    var matchFormHTML = '<div class="tk-auth-match-form" id="tk-match-form" style="background:rgba(196,239,63,.07);border:1px solid rgba(196,239,63,.2);border-radius:14px;padding:16px;margin-bottom:16px;">' +
      '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:#c4ef3f;margin-bottom:12px;">LOG A MATCH</div>' +
      '<label class="tk-auth-label">PARTNER NAME</label><input class="tk-auth-input" id="tk-m-partner" type="text" placeholder="Partner name" style="margin-bottom:12px;">' +
      '<label class="tk-auth-label">OPPONENTS</label><input class="tk-auth-input" id="tk-m-opponents" type="text" placeholder="Name &amp; Name" style="margin-bottom:12px;">' +
      '<label class="tk-auth-label">RESULT</label>' +
      '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
        '<button id="tk-m-win" style="flex:1;padding:9px;border-radius:999px;border:1px solid rgba(196,239,63,.4);background:rgba(196,239,63,.15);color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:12px;cursor:pointer;font-weight:700;">W</button>' +
        '<button id="tk-m-loss" style="flex:1;padding:9px;border-radius:999px;border:1px solid rgba(244,245,238,.15);background:transparent;color:rgba(244,245,238,.5);font-family:\'Space Mono\',monospace;font-size:12px;cursor:pointer;">L</button>' +
      '</div>' +
      '<label class="tk-auth-label">SCORE</label><input class="tk-auth-input" id="tk-m-score" type="text" placeholder="6-4 3-6 10-7" style="margin-bottom:12px;">' +
      '<label class="tk-auth-label">OPPONENT AVG LEVEL (1-7)</label><input class="tk-auth-input" id="tk-m-oplvl" type="number" min="1" max="7" placeholder="' + level + '" style="margin-bottom:14px;">' +
      '<button id="tk-m-save" class="tk-auth-btn" style="padding:12px;">Save match</button>' +
    '</div>';

    var matchesTabHTML = matchFormHTML + matchesListHTML;

    // Orders tab
    var ordersHTML = orders.length
      ? orders.slice().reverse().map(function (o) {
          var date = o.ts ? new Date(o.ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (o.recordedAt ? new Date(o.recordedAt).toLocaleDateString('en-GB') : '');
          return '<div style="padding:12px 14px;border-radius:11px;background:rgba(244,245,238,.05);margin-bottom:10px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
              '<div><div style="font-weight:600;font-size:13px;color:#fff;">' + (o.id || 'Order') + '</div>' +
              '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.5);margin-top:2px;">' + date + ' · ' + ((o.items && o.items.length) || 0) + ' item(s)</div></div>' +
              '<div style="font-family:Anton,sans-serif;font-size:18px;color:#c4ef3f;">' + (o.total || 0) + ' DT</div>' +
            '</div>' +
          '</div>';
        }).join('')
      : '<div class="tk-drawer-empty">No orders yet. Complete a checkout to see orders here.</div>';

    var bodyHTML;
    if (drawerTab === 'bookings') bodyHTML = bookingsHTML;
    else if (drawerTab === 'packs') bodyHTML = packsHTML;
    else if (drawerTab === 'matches') bodyHTML = matchesTabHTML;
    else if (drawerTab === 'orders') bodyHTML = ordersHTML;
    else bodyHTML = profileHTML;

    drawerRoot.innerHTML = '<div class="tk-drawer-overlay" id="tk-drawer-overlay"></div>' +
      '<div class="tk-drawer">' +
        '<div class="tk-drawer-head">' +
          '<button class="tk-drawer-close" id="tk-drawer-close">×</button>' +
          '<div class="tk-drawer-avatar">' + initial + '</div>' +
          '<div class="tk-drawer-name">' + (u.name || u.email) + '</div>' +
          '<div class="tk-drawer-email">' + u.email + '</div>' +
          '<div class="tk-drawer-wallet">' +
            '<div><div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.16em;color:rgba(244,245,238,.55);margin-bottom:3px;">WALLET</div>' +
            '<div class="tk-drawer-wallet-val">◆ ' + (u.wallet || 0) + ' DT</div></div>' +
            '<button class="tk-drawer-topup" id="tk-topup-btn">+ Top up</button>' +
          '</div>' +
        '</div>' +
        '<div class="tk-drawer-tabs" style="overflow-x:auto;flex-wrap:nowrap;">' +
          '<button class="tk-drawer-tab' + (drawerTab === 'bookings' ? ' active' : '') + '" id="tk-tab-bookings">BOOKINGS</button>' +
          '<button class="tk-drawer-tab' + (drawerTab === 'packs' ? ' active' : '') + '" id="tk-tab-packs">PACKS</button>' +
          '<button class="tk-drawer-tab' + (drawerTab === 'matches' ? ' active' : '') + '" id="tk-tab-matches">MATCHES</button>' +
          '<button class="tk-drawer-tab' + (drawerTab === 'orders' ? ' active' : '') + '" id="tk-tab-orders">ORDERS</button>' +
          '<button class="tk-drawer-tab' + (drawerTab === 'profile' ? ' active' : '') + '" id="tk-tab-profile">PROFILE</button>' +
        '</div>' +
        '<div class="tk-drawer-body" id="tk-drawer-body">' + bodyHTML + '</div>' +
        '<button class="tk-drawer-logout" id="tk-drawer-logout">Log out</button>' +
      '</div>';

    document.getElementById('tk-drawer-overlay').addEventListener('click', closeDrawer);
    document.getElementById('tk-drawer-close').addEventListener('click', closeDrawer);
    document.getElementById('tk-tab-bookings').addEventListener('click', function () { drawerTab = 'bookings'; renderDrawer(); });
    document.getElementById('tk-tab-packs').addEventListener('click', function () { drawerTab = 'packs'; renderDrawer(); });
    document.getElementById('tk-tab-matches').addEventListener('click', function () { drawerTab = 'matches'; renderDrawer(); });
    document.getElementById('tk-tab-orders').addEventListener('click', function () { drawerTab = 'orders'; renderDrawer(); });
    document.getElementById('tk-tab-profile').addEventListener('click', function () { drawerTab = 'profile'; renderDrawer(); });
    document.getElementById('tk-topup-btn').addEventListener('click', function () {
      var amt = prompt('Top up wallet — enter amount in DT:');
      if (amt) { auth.topup(parseFloat(amt)); renderDrawer(); }
    });
    document.getElementById('tk-drawer-logout').addEventListener('click', function () {
      auth.logout();
      closeDrawer();
    });

    // Survey link
    var surveyLink = document.getElementById('tk-survey-link');
    if (surveyLink) {
      surveyLink.addEventListener('click', function () {
        var lvl = prompt('Rate your padel level (1=beginner, 5=advanced):');
        if (lvl) { auth.submitLevelSurvey({ level: parseInt(lvl, 10) }); renderDrawer(); }
      });
    }

    // Level pills
    var pills = drawerRoot.querySelectorAll('.tk-auth-level-pill');
    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var n = parseInt(pill.getAttribute('data-lvl'), 10);
        auth.setLevel(n);
        renderDrawer();
      });
    });

    // Match form wiring
    if (drawerTab === 'matches') {
      var _matchResult = 'W';
      var winBtn = document.getElementById('tk-m-win');
      var lossBtn = document.getElementById('tk-m-loss');
      function _setResultUI(r) {
        _matchResult = r;
        if (r === 'W') {
          winBtn.style.background = 'rgba(196,239,63,.15)'; winBtn.style.color = '#c4ef3f'; winBtn.style.border = '1px solid rgba(196,239,63,.4)'; winBtn.style.fontWeight = '700';
          lossBtn.style.background = 'transparent'; lossBtn.style.color = 'rgba(244,245,238,.5)'; lossBtn.style.border = '1px solid rgba(244,245,238,.15)'; lossBtn.style.fontWeight = '400';
        } else {
          lossBtn.style.background = 'rgba(220,60,60,.15)'; lossBtn.style.color = '#f4a0a0'; lossBtn.style.border = '1px solid rgba(220,60,60,.4)'; lossBtn.style.fontWeight = '700';
          winBtn.style.background = 'transparent'; winBtn.style.color = 'rgba(244,245,238,.5)'; winBtn.style.border = '1px solid rgba(244,245,238,.15)'; winBtn.style.fontWeight = '400';
        }
      }
      winBtn.addEventListener('click', function () { _setResultUI('W'); });
      lossBtn.addEventListener('click', function () { _setResultUI('L'); });
      document.getElementById('tk-m-save').addEventListener('click', function () {
        var partner = (document.getElementById('tk-m-partner').value || '').trim();
        var opponents = (document.getElementById('tk-m-opponents').value || '').trim();
        var score = (document.getElementById('tk-m-score').value || '').trim();
        var oplvlEl = document.getElementById('tk-m-oplvl');
        var opponentLevel = oplvlEl && oplvlEl.value ? parseFloat(oplvlEl.value) : undefined;
        auth.logMatch({ partner: partner, opponents: opponents, result: _matchResult, score: score, opponentLevel: opponentLevel });
        renderDrawer();
      });
    }
  }

  function closeDrawer() {
    if (drawerRoot) drawerRoot.innerHTML = '';
  }

  // ── Init on DOM ready ─────────────────────────────────────────────────────

  function onReady(fn) {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fn); }
    else { fn(); }
  }

  onReady(function () {
    // nothing to inject globally — pages wire their own nav badges via auth.subscribe
  });

})();
