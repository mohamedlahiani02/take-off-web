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
      // offline: do not fabricate balance; caller must retry when online
    },

    // Bookings are still local (courts/bookings backend module is TODO)
    recordBooking: function (item) {
      if (!auth.user) return;
      if (!auth.user.bookings) auth.user.bookings = [];
      auth.user.bookings.push(Object.assign({}, item, { recordedAt: new Date().toISOString() }));
      storageSet('takeoff_user', auth.user);
    },

    // Packs are still local (packs backend module is TODO)
    // purchasePack() used to mint a pack in local state with no server call,
    // which showed members credits that were never sold. Packs are issued by
    // POST /classes/packs/purchase or not at all.

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

    openLogin: function () { showModal(); },
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

  // ── Modal (OTP phone auth) ────────────────────────────────────────────────

  var modalRoot = null;
  var _otpPhone = '', _otpIsNew = false, _otpGhostClaim = false, _otpTimer = null;

  function modalHTML() {
    return '<div class="tk-ov" id="tk-modal-ov">' +
      '<div class="tk-card">' +
        '<button class="tk-close" id="tk-modal-x">×</button>' +
        sigSVG() +
        '<div style="text-align:center;font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.22em;color:rgba(244,245,238,.5);margin-bottom:6px;">TAKE OFF CLUB</div>' +
        // Step 1 — phone
        '<div id="tk-otp-s1">' +
          '<div class="tk-title" style="text-align:center;">Welcome</div>' +
          '<p class="tk-sub" style="text-align:center;opacity:.6;font-size:13px;margin-bottom:16px;">Enter your phone to sign in or create an account</p>' +
          '<div id="tk-otp-e1" class="tk-err" style="display:none;color:#e74c3c;font-size:13px;margin-bottom:8px;"></div>' +
          '<label class="tk-lbl">PHONE NUMBER</label>' +
          '<input class="tk-inp" id="tk-otp-phone" type="tel" inputmode="numeric" placeholder="+216 XX XXX XXX" autocomplete="tel">' +
          '<button class="tk-btn" id="tk-otp-send">Continue →</button>' +
        '</div>' +
        // Step 2 — code
        '<div id="tk-otp-s2" style="display:none;">' +
          '<div class="tk-title" style="text-align:center;">Enter the code</div>' +
          '<p class="tk-sub" style="text-align:center;opacity:.6;font-size:13px;margin-bottom:16px;">Sent to <span id="tk-otp-ph-lbl" style="color:#c4ef3f;"></span></p>' +
          '<div id="tk-otp-e2" class="tk-err" style="display:none;color:#e74c3c;font-size:13px;margin-bottom:8px;"></div>' +
          '<input class="tk-inp" id="tk-otp-code" type="tel" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code" style="font-size:2rem;letter-spacing:.5em;text-align:center;font-weight:700;">' +
          '<div id="tk-otp-claim-note" style="display:none;background:rgba(196,239,63,.08);border:1px solid rgba(196,239,63,.2);border-radius:10px;padding:10px 12px;font-size:12px;color:#c4ef3f;margin-bottom:10px;text-align:center;">We found your club account — confirm your name to activate it. Your bookings and balance are already here.</div>' +
          '<div id="tk-otp-name-row" style="display:none;">' +
            '<label class="tk-lbl">YOUR NAME</label>' +
            '<input class="tk-inp" id="tk-otp-name" type="text" placeholder="Full name" autocomplete="name">' +
          '</div>' +
          '<button class="tk-btn" id="tk-otp-verify">Confirm</button>' +
          '<div style="text-align:center;margin-top:10px;font-size:12px;opacity:.6;" id="tk-otp-resend-row">' +
            '<span id="tk-otp-timer"></span>' +
            '<a href="#" id="tk-otp-resend" style="display:none;">Resend code</a>' +
          '</div>' +
          '<div style="text-align:center;margin-top:12px;"><a href="#" id="tk-otp-back" style="font-size:12px;opacity:.5;">← Change number</a></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function startOtpTimer() {
    var s = 60;
    document.getElementById('tk-otp-timer').textContent = 'Resend in ' + s + 's';
    var resendEl = document.getElementById('tk-otp-resend');
    if (resendEl) resendEl.style.display = 'none';
    if (_otpTimer) clearInterval(_otpTimer);
    _otpTimer = setInterval(function () {
      s--;
      var timerEl = document.getElementById('tk-otp-timer');
      var resEl = document.getElementById('tk-otp-resend');
      if (s <= 0) {
        clearInterval(_otpTimer);
        if (timerEl) timerEl.textContent = '';
        if (resEl) resEl.style.display = 'inline';
      } else {
        if (timerEl) timerEl.textContent = 'Resend in ' + s + 's';
      }
    }, 1000);
  }

  async function doSendOtp(phone) {
    var client = api();
    if (!client || !client.isOnline()) {
      return { ok: false, error: 'No network connection.' };
    }
    try {
      var res = await client.auth.sendOtp(phone);
      return { ok: true, isNewUser: res.isNewUser, isGhostClaim: res.isGhostClaim, suggestedName: res.suggestedName };
    } catch (e) {
      return { ok: false, error: e.message || 'Could not send code.' };
    }
  }

  function showModal() {
    if (!modalRoot) { modalRoot = document.createElement('div'); document.body.appendChild(modalRoot); }
    modalRoot.innerHTML = modalHTML();

    document.getElementById('tk-modal-x').onclick = closeModal;
    document.getElementById('tk-modal-ov').onclick = function (e) { if (e.target.id === 'tk-modal-ov') closeModal(); };
    document.addEventListener('keydown', onEscModal);

    // Step 1 — Send OTP
    document.getElementById('tk-otp-send').onclick = async function () {
      var raw = (document.getElementById('tk-otp-phone') || {}).value || '';
      var phone = normalizePhone(raw.trim());
      var errEl = document.getElementById('tk-otp-e1');
      errEl.style.display = 'none';
      if (!/^\+216[0-9]{8}$/.test(phone)) {
        errEl.textContent = 'Enter a valid Tunisian number (+216 followed by 8 digits)';
        errEl.style.display = 'block';
        return;
      }
      this.disabled = true; this.textContent = '...';
      var result = await doSendOtp(phone);
      if (!result.ok) {
        errEl.textContent = result.error;
        errEl.style.display = 'block';
        this.disabled = false; this.textContent = 'Continue →';
        return;
      }
      _otpPhone = phone;
      _otpIsNew = !!result.isNewUser;
      _otpGhostClaim = !!result.isGhostClaim;
      document.getElementById('tk-otp-ph-lbl').textContent = phone;
      // New signups AND club-account claims both let the user set their name (US-3.2).
      var nameRow = document.getElementById('tk-otp-name-row');
      if (nameRow) nameRow.style.display = (_otpIsNew || _otpGhostClaim) ? 'block' : 'none';
      var nameInp = document.getElementById('tk-otp-name');
      if (nameInp && _otpGhostClaim && result.suggestedName) nameInp.value = result.suggestedName;
      var claimNote = document.getElementById('tk-otp-claim-note');
      if (claimNote) claimNote.style.display = _otpGhostClaim ? 'block' : 'none';
      document.getElementById('tk-otp-s1').style.display = 'none';
      document.getElementById('tk-otp-s2').style.display = 'block';
      var codeEl = document.getElementById('tk-otp-code');
      if (codeEl) { codeEl.value = ''; codeEl.focus(); }
      startOtpTimer();
      this.disabled = false; this.textContent = 'Continue →';
    };

    // Step 2 — Verify OTP
    document.getElementById('tk-otp-verify').onclick = async function () {
      var code = ((document.getElementById('tk-otp-code') || {}).value || '').trim();
      var name = (_otpIsNew || _otpGhostClaim) ? (((document.getElementById('tk-otp-name') || {}).value || '').trim()) : undefined;
      var errEl = document.getElementById('tk-otp-e2');
      errEl.style.display = 'none';
      if (!code || code.length < 4) { errEl.textContent = 'Enter the code sent to your phone'; errEl.style.display = 'block'; return; }
      if (_otpIsNew && !name) { errEl.textContent = 'Please enter your name'; errEl.style.display = 'block'; return; }
      this.disabled = true; this.textContent = '...';
      var client = api();
      try {
        var res = await client.auth.verifyOtp(_otpPhone, code, name);
        auth.user = res.user;
        storageSet('takeoff_user', res.user);
        notify();
        closeModal();
        if (res.claimed) { try { toast('Compte du club activé. Vos réservations et votre solde sont là.', 3000); } catch (_) {} }
        if (_pendingCb) { var cb = _pendingCb; _pendingCb = null; setTimeout(cb, 50); }
      } catch (e) {
        errEl.textContent = e.message || 'Invalid code, please try again';
        errEl.style.display = 'block';
      }
      this.disabled = false; this.textContent = 'Confirm';
    };

    // Auto-submit when 6 digits entered
    var codeInput = document.getElementById('tk-otp-code');
    if (codeInput) {
      codeInput.addEventListener('input', function () {
        if (this.value.length === 6) document.getElementById('tk-otp-verify').click();
      });
      codeInput.onkeydown = function (e) { if (e.key === 'Enter') document.getElementById('tk-otp-verify').click(); };
    }

    // Phone input enter key
    var phoneInput = document.getElementById('tk-otp-phone');
    if (phoneInput) {
      phoneInput.onkeydown = function (e) { if (e.key === 'Enter') document.getElementById('tk-otp-send').click(); };
    }

    // Resend
    var resendEl = document.getElementById('tk-otp-resend');
    if (resendEl) {
      resendEl.onclick = async function (e) {
        e.preventDefault();
        this.style.display = 'none';
        var result = await doSendOtp(_otpPhone);
        if (!result.ok) {
          var errEl = document.getElementById('tk-otp-e2');
          errEl.textContent = result.error; errEl.style.display = 'block';
        } else {
          startOtpTimer();
        }
      };
    }

    // Back link
    var backEl = document.getElementById('tk-otp-back');
    if (backEl) {
      backEl.onclick = function (e) {
        e.preventDefault();
        if (_otpTimer) clearInterval(_otpTimer);
        document.getElementById('tk-otp-s2').style.display = 'none';
        document.getElementById('tk-otp-s1').style.display = 'block';
        var phoneEl = document.getElementById('tk-otp-phone');
        if (phoneEl) phoneEl.focus();
      };
    }
  }

  function onEscModal(e) { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onEscModal); } }

  function closeModal() {
    if (_otpTimer) clearInterval(_otpTimer);
    if (modalRoot) modalRoot.innerHTML = '';
  }

  // ── Account Drawer ────────────────────────────────────────────────────────

  var drawerRoot = null, drawerTab = 'padel';
  var _drData = { orders: null, courtBookings: null, classBookings: null, packs: null };

  function showDrawer(tab) {
    if (!auth.user) { showModal('login'); return; }
    // Legacy names map onto the split tabs (US-4.1: padel and pilates are separate worlds).
    if (tab === 'bookings') tab = 'padel';
    if (tab === 'packs') tab = 'pilates';
    drawerTab = (['padel', 'pilates', 'orders', 'profile'].indexOf(tab) >= 0) ? tab : 'padel';
    _drData.orders = null;
    _drData.courtBookings = null;
    _drData.classBookings = null;
    _drData.packs = null;
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
    if (tab === 'padel' && !_drData.courtBookings) {
      try {
        var cb = await client.courts.myBookings();
        _drData.courtBookings = cb || [];
      } catch (e) { _drData.courtBookings = []; }
      renderBody();
    }
    if (tab === 'pilates' && (!_drData.classBookings || !_drData.packs)) {
      try {
        var cls = await client.classes.myBookings();
        _drData.classBookings = cls || [];
      } catch (e) { _drData.classBookings = []; }
      try { var pk = await client.classes.myPacks(); _drData.packs = pk || []; } catch (e) { _drData.packs = []; }
      renderBody();
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
          ['padel','pilates','orders','profile'].map(function (t) {
            return '<button class="tk-tab' + (drawerTab === t ? ' active' : '') + '" data-tab="' + t + '">' + esc(t).toUpperCase() + '</button>';
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
    if (drawerTab === 'padel') return padelHTML();
    if (drawerTab === 'pilates') return pilatesHTML();
    if (drawerTab === 'orders') return ordersHTML();
    return profileHTML();
  }

  // ── Tab: Padel (US-4.2) ──────────────────────────────────────────────────

  var STATUS_COLORS = { CONFIRMED: '#c4ef3f', PENDING: '#f5c518', BOOKED: '#c4ef3f', CANCELLED: '#f4a0a0', COMPLETED: 'rgba(244,245,238,.4)', ATTENDED: '#4dce7a', ABSENT: '#f4a0a0', NO_SHOW: '#f4a0a0', WAITLIST: '#f5c518' };

  function fmtWhen(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }) +
      ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function sectionLabel(txt) {
    return '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.14em;color:rgba(244,245,238,.35);margin:14px 0 8px;">' + txt + '</div>';
  }

  function padelHTML() {
    var courts = _drData.courtBookings;
    if (courts === null) {
      return '<div class="tk-empty" style="text-align:center;margin-top:30px;"><div style="margin-bottom:10px;">⏳</div>Chargement…</div>';
    }
    if (!(courts || []).length) {
      return '<div class="tk-empty">Aucun match pour l\'instant.</div>' +
        '<div style="margin-top:16px;text-align:center;"><a href="/padel/reserve" style="color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:.12em;">Réserver un terrain →</a></div>';
    }

    var now = new Date();
    // Balance due for padel (US-4.4): my pending tranches on matches already played.
    var due = 0;
    (courts || []).forEach(function (b) {
      if (b.status !== 'CANCELLED' && b.mySharePaymentStatus === 'PENDING' && new Date(b.startsAt) < now) {
        due += Number(b.myShareDt || b.priceDt || 0);
      }
    });

    var upcoming = (courts || []).filter(function (b) { return b.status === 'CONFIRMED' && new Date(b.startsAt) >= now; });
    var history = (courts || []).filter(function (b) { return !(b.status === 'CONFIRMED' && new Date(b.startsAt) >= now); });

    function courtRow(b, withCancel) {
      var statusColor = STATUS_COLORS[b.status] || 'rgba(244,245,238,.5)';
      var share = b.myShareDt !== undefined && b.myShareDt !== null ? Number(b.myShareDt) : Number(b.priceDt || 0);
      var shareState = b.mySharePaymentStatus === 'PAID' ? '✓ payé'
        : (b.mySharePaymentStatus === 'COVERED' ? 'offert' : 'à régler au club');
      var canCancel = withCancel && (new Date(b.startsAt).getTime() - now.getTime()) > 24 * 3600 * 1000;
      return '<div class="tk-card-row">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
          '<div><div style="font-weight:600;font-size:14px;color:#fff;">' + esc(b.courtName || 'Court') +
            (b.mode === 'SHARE' ? ' <span style="font-family:\'Space Mono\',monospace;font-size:9px;color:rgba(244,245,238,.4);">PARTAGÉ</span>' : '') +
            (b.isOrganizer === false ? ' <span style="font-family:\'Space Mono\',monospace;font-size:9px;color:rgba(244,245,238,.4);">INVITÉ</span>' : '') + '</div>' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.5);margin-top:3px;">' + fmtWhen(b.startsAt) + '</div>' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:' + (b.mySharePaymentStatus === 'PAID' ? '#4dce7a' : '#f5c518') + ';margin-top:2px;">Ma part : ' + share.toFixed(0) + ' DT — ' + shareState + '</div></div>' +
          '<div style="display:flex;gap:6px;flex-direction:column;align-items:flex-end;">' +
            '<span style="padding:3px 9px;border-radius:999px;font-family:\'Space Mono\',monospace;font-size:9px;background:rgba(196,239,63,.1);color:' + statusColor + ';">' + esc(b.status) + '</span>' +
            (canCancel ? '<button class="tk-cancel-court" data-id="' + b.bookingId + '" style="background:none;border:1px solid rgba(244,160,160,.35);color:#f4a0a0;border-radius:999px;padding:3px 10px;font-family:\'Space Mono\',monospace;font-size:9px;cursor:pointer;">Annuler</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }

    var html = '';
    if (due > 0) {
      html += '<div style="padding:10px 14px;border-radius:11px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);margin-bottom:8px;font-size:12px;color:#f4a0a0;">' +
        'Solde à régler au club : <b>' + due.toFixed(0) + ' DT</b></div>';
    }
    if (upcoming.length) html += sectionLabel('À VENIR') + upcoming.map(function (b) { return courtRow(b, true); }).join('');
    if (history.length) html += sectionLabel('HISTORIQUE DES MATCHS') + history.map(function (b) { return courtRow(b, false); }).join('');
    html += '<div style="margin-top:16px;text-align:center;"><a href="/padel/reserve" style="color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:.12em;">Réserver un terrain →</a></div>';
    return html;
  }

  // ── Tab: Pilates (US-4.3) ────────────────────────────────────────────────

  function pilatesHTML() {
    var classes = _drData.classBookings;
    if (classes === null) {
      return '<div class="tk-empty" style="text-align:center;margin-top:30px;"><div style="margin-bottom:10px;">⏳</div>Chargement…</div>';
    }

    var html = '';

    // Pack credits first — the thing a pilates member checks most.
    var packs = _drData.packs || [];
    var nowD = new Date();
    var activePacks = packs.filter(function (p) { return (p.remaining === undefined || p.remaining > 0) && (!p.expiresAt || new Date(p.expiresAt) > nowD); });
    if (activePacks.length) {
      html += sectionLabel('MON PACK') + activePacks.map(function (pk) {
        var total = pk.total || 10;
        var rem = pk.remaining !== undefined ? pk.remaining : total;
        var pct = total > 0 ? Math.round((rem / total) * 100) : 0;
        var exp = pk.expiresAt ? new Date(pk.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        return '<div style="padding:14px;border-radius:13px;background:rgba(196,239,63,.07);border:1px solid rgba(196,239,63,.18);margin-bottom:10px;">' +
          '<div style="font-weight:600;font-size:14px;color:#fff;margin-bottom:10px;">' + esc(pk.packTypeName || pk.name || 'Pack') + '</div>' +
          '<div style="height:5px;border-radius:999px;background:rgba(244,245,238,.1);margin-bottom:8px;">' +
            '<div style="height:5px;border-radius:999px;background:#c4ef3f;width:' + pct + '%;transition:width .4s;"></div>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.55);">' +
            '<span>' + rem + ' / ' + total + ' séances restantes</span>' + (exp ? '<span>Expire ' + exp + '</span>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    }

    var now = new Date();
    function whenOf(b) { return b.session && b.session.startsAt ? new Date(b.session.startsAt) : new Date(b.createdAt || 0); }
    var upcoming = (classes || []).filter(function (b) { return (b.status === 'BOOKED' || b.status === 'WAITLIST') && whenOf(b) >= now; });
    var history = (classes || []).filter(function (b) { return !((b.status === 'BOOKED' || b.status === 'WAITLIST') && whenOf(b) >= now); });

    function classRow(b, withCancel) {
      var s = b.session || {};
      var statusColor = STATUS_COLORS[b.status] || 'rgba(244,245,238,.5)';
      var canCancel = withCancel && (whenOf(b).getTime() - now.getTime()) > 24 * 3600 * 1000;
      return '<div class="tk-card-row">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
          '<div><div style="font-weight:600;font-size:14px;color:#fff;">' + esc(s.className || 'Séance') + '</div>' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.5);margin-top:3px;">' + fmtWhen(s.startsAt) + (s.durationMin ? ' · ' + s.durationMin + ' min' : '') + '</div>' +
          (b.paidWith ? '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.4);margin-top:2px;">' + esc(b.paidWith === 'PACK' ? 'Pack' : (b.paidWith === 'SINGLE' ? (Number(b.priceDt || 0).toFixed(0) + ' DT') : b.paidWith)) + '</div>' : '') + '</div>' +
          '<div style="display:flex;gap:6px;flex-direction:column;align-items:flex-end;">' +
            '<span style="padding:3px 9px;border-radius:999px;font-family:\'Space Mono\',monospace;font-size:9px;background:rgba(196,239,63,.1);color:' + statusColor + ';">' + esc(b.status) + '</span>' +
            (canCancel ? '<button class="tk-cancel-class" data-id="' + b.bookingId + '" style="background:none;border:1px solid rgba(244,160,160,.35);color:#f4a0a0;border-radius:999px;padding:3px 10px;font-family:\'Space Mono\',monospace;font-size:9px;cursor:pointer;">Annuler</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }

    if (upcoming.length) html += sectionLabel('À VENIR') + upcoming.map(function (b) { return classRow(b, true); }).join('');
    if (history.length) html += sectionLabel('HISTORIQUE DES SÉANCES') + history.map(function (b) { return classRow(b, false); }).join('');

    if (!html) {
      return '<div class="tk-empty">Aucune séance pour l\'instant.</div>' +
        '<div style="margin-top:16px;text-align:center;"><a href="/pilates/classes" style="color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:.12em;">Voir le planning →</a></div>';
    }
    html += '<div style="margin-top:16px;text-align:center;"><a href="/pilates/classes" style="color:#c4ef3f;font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:.12em;">Voir le planning →</a></div>';
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

  function profileSectionHeader(title) {
    return '<div style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.18em;color:rgba(244,245,238,.45);padding-bottom:8px;border-bottom:1px solid rgba(196,239,63,.1);margin-bottom:14px;">' + title + '</div>';
  }

  function addrCardHTML(key, a, fallbackName, fallbackPhone) {
    var hasAddr = !!(a && a.line1);
    var cardBody = hasAddr
      ? '<div style="font-size:13px;color:#f4f5ee;font-weight:600;margin-bottom:1px;">' + esc(a.name || fallbackName || '') + '</div>' +
        (a.job ? '<div style="font-size:12px;color:rgba(244,245,238,.45);margin-bottom:5px;">' + esc(a.job) + '</div>' : '') +
        '<div style="font-size:13px;color:rgba(244,245,238,.75);line-height:1.7;">' +
          esc(a.line1) + '<br>' +
          (a.line2 ? esc(a.line2) + '<br>' : '') +
          esc(a.city || '') + (a.postal ? ', ' + esc(a.postal) : '') + '<br>' +
          'Tunisia' +
        '</div>' +
        (a.phone ? '<div style="font-size:12px;color:rgba(244,245,238,.45);margin-top:5px;">T: ' + esc(a.phone) + '</div>' : '')
      : '<div style="font-size:13px;color:rgba(244,245,238,.3);font-style:italic;line-height:1.6;">No address saved yet.<br>Click Edit to add one.</div>';

    return '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(196,239,63,.1);border-radius:12px;padding:14px 16px;margin-bottom:10px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
        '<div style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.12em;color:rgba(196,239,63,.55);">' + (key === 'billing' ? 'BILLING ADDRESS' : 'DELIVERY ADDRESS') + '</div>' +
        '<button id="tk-addr-' + key + '-btn" style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.1em;color:#c4ef3f;background:none;border:none;cursor:pointer;padding:0;">EDIT</button>' +
      '</div>' +
      '<div id="tk-addr-' + key + '-view">' + cardBody + '</div>' +
      '<div id="tk-addr-' + key + '-edit" style="display:none;border-top:1px solid rgba(244,245,238,.06);margin-top:12px;padding-top:12px;">' +
        '<div class="tk-addr-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
          '<input class="tk-inp" id="tk-' + key + '-name" type="text" value="' + esc((a && a.name) || fallbackName || '') + '" placeholder="Full name">' +
          '<input class="tk-inp" id="tk-' + key + '-job" type="text" value="' + esc((a && a.job) || '') + '" placeholder="Job / role (optional)">' +
        '</div>' +
        '<input class="tk-inp" id="tk-' + key + '-line1" type="text" value="' + esc((a && a.line1) || '') + '" placeholder="Street address" style="margin-bottom:8px;">' +
        '<input class="tk-inp" id="tk-' + key + '-line2" type="text" value="' + esc((a && a.line2) || '') + '" placeholder="Landmark / floor / building" style="margin-bottom:8px;">' +
        '<div class="tk-addr-grid-2" style="display:grid;grid-template-columns:1fr 90px;gap:8px;margin-bottom:8px;">' +
          '<input class="tk-inp" id="tk-' + key + '-city" type="text" value="' + esc((a && a.city) || '') + '" placeholder="City">' +
          '<input class="tk-inp" id="tk-' + key + '-postal" type="text" value="' + esc((a && a.postal) || '') + '" placeholder="ZIP">' +
        '</div>' +
        '<input class="tk-inp" id="tk-' + key + '-phone" type="tel" value="' + esc((a && a.phone) || fallbackPhone || '') + '" placeholder="Phone" style="margin-bottom:10px;">' +
        '<div style="display:flex;gap:8px;">' +
          '<button id="tk-addr-' + key + '-save" class="tk-btn" style="padding:10px;flex:1;">Save</button>' +
          '<button id="tk-addr-' + key + '-cancel" style="flex:0 0 auto;padding:10px 14px;background:transparent;border:1px solid rgba(244,245,238,.15);color:rgba(244,245,238,.55);border-radius:8px;cursor:pointer;font-size:13px;">Cancel</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function profileHTML() {
    var u = auth.user || {};
    var memberSince = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
    var allTracks = ['padel', 'pilates'];
    var activeTracks = u.tracks || [];
    var addresses = storageGet('takeoff_addresses') || {};
    var billing = addresses.billing || null;
    var delivery = addresses.delivery || null;

    var tracksRow = allTracks.map(function (t) {
      var on = activeTracks.indexOf(t) >= 0;
      return '<button id="tk-track-' + t + '" data-track="' + t + '" style="padding:7px 16px;border-radius:999px;font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.1em;cursor:pointer;border:1px solid ' + (on ? '#c4ef3f' : 'rgba(244,245,238,.2)') + ';background:' + (on ? 'rgba(196,239,63,.18)' : 'transparent') + ';color:' + (on ? '#c4ef3f' : 'rgba(244,245,238,.4)') + ';">' + esc(t).toUpperCase() + '</button>';
    }).join('');

    return (
      // ── Account Information ───────────────────────────────────────────────
      '<div style="margin-bottom:24px;">' +
        profileSectionHeader('ACCOUNT INFORMATION') +
        '<div style="margin-bottom:10px;">' +
          '<div style="font-size:15px;font-weight:600;color:#f4f5ee;">' + esc(u.name || '') + '</div>' +
          '<div style="font-size:13px;color:rgba(244,245,238,.5);margin-top:2px;">' + esc(u.email || '') + '</div>' +
          (u.phone ? '<div style="font-size:13px;color:rgba(244,245,238,.45);margin-top:2px;">' + esc(u.phone) + '</div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
          '<button id="tk-edit-name" style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.1em;padding:7px 14px;border-radius:8px;border:1px solid rgba(196,239,63,.3);background:transparent;color:#c4ef3f;cursor:pointer;">EDIT</button>' +
          '<button id="tk-edit-pw" style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.1em;padding:7px 14px;border-radius:8px;border:1px solid rgba(244,245,238,.15);background:transparent;color:rgba(244,245,238,.55);cursor:pointer;">CHANGE PASSWORD</button>' +
        '</div>' +
        // contact edit form
        '<div id="tk-name-edit" style="display:none;border-top:1px solid rgba(244,245,238,.06);padding-top:12px;margin-bottom:4px;">' +
          '<input class="tk-inp" id="tk-name-inp" type="text" value="' + esc(u.name || '') + '" placeholder="Full name" style="margin-bottom:8px;">' +
          '<input class="tk-inp" id="tk-phone-inp" type="tel" value="' + esc(u.phone || '') + '" placeholder="+216 XX XXX XXX" style="margin-bottom:10px;">' +
          '<div style="display:flex;gap:8px;">' +
            '<button id="tk-name-save" class="tk-btn" style="padding:10px;flex:1;">Save</button>' +
            '<button id="tk-name-cancel" style="flex:0 0 auto;padding:10px 14px;background:transparent;border:1px solid rgba(244,245,238,.15);color:rgba(244,245,238,.55);border-radius:8px;cursor:pointer;font-size:13px;">Cancel</button>' +
          '</div>' +
        '</div>' +
        // password change form
        '<div id="tk-pw-edit" style="display:none;border-top:1px solid rgba(244,245,238,.06);padding-top:12px;">' +
          '<input class="tk-inp" id="tk-pw-cur" type="password" placeholder="Current password" style="margin-bottom:8px;">' +
          '<input class="tk-inp" id="tk-pw-new" type="password" placeholder="New password (min 8 chars)" style="margin-bottom:8px;">' +
          '<input class="tk-inp" id="tk-pw-confirm" type="password" placeholder="Confirm new password" style="margin-bottom:10px;">' +
          '<div style="display:flex;gap:8px;">' +
            '<button id="tk-pw-save" class="tk-btn" style="padding:10px;flex:1;">Update password</button>' +
            '<button id="tk-pw-cancel" style="flex:0 0 auto;padding:10px 14px;background:transparent;border:1px solid rgba(244,245,238,.15);color:rgba(244,245,238,.55);border-radius:8px;cursor:pointer;font-size:13px;">Cancel</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // ── Address Book ──────────────────────────────────────────────────────
      '<div style="margin-bottom:24px;">' +
        profileSectionHeader('ADDRESS BOOK') +
        addrCardHTML('billing', billing, u.name, u.phone) +
        addrCardHTML('delivery', delivery, u.name, u.phone) +
      '</div>' +

      // ── Interests ─────────────────────────────────────────────────────────
      '<div style="margin-bottom:24px;">' +
        profileSectionHeader('INTERESTS') +
        '<div style="display:flex;gap:8px;">' + tracksRow + '</div>' +
      '</div>' +

      (memberSince ? '<div style="font-family:\'Space Mono\',monospace;font-size:10px;color:rgba(244,245,238,.25);">Member since ' + memberSince + '</div>' : '')
    );
  }

  // ── Wire body event listeners ─────────────────────────────────────────────

  function inlineEdit(id) {
    var viewEl = document.getElementById('tk-' + id + '-view');
    var editEl = document.getElementById('tk-' + id + '-edit');
    if (viewEl) viewEl.style.display = 'none';
    if (editEl) editEl.style.display = 'block';
  }

  function showProfileForm(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'block';
  }
  function hideProfileForm(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  function wireBodyEvents() {
    // ── Cancel my court booking / my share (US-2.5) ────────────────────────
    document.querySelectorAll('.tk-cancel-court').forEach(function (btn) {
      btn.onclick = async function () {
        if (!confirm('Annuler cette réservation ? Le créneau sera libéré.')) return;
        var client = api();
        if (!client || !client.isOnline()) return;
        try {
          await client.courts.cancelBooking(btn.getAttribute('data-id'));
          toast('Réservation annulée.', 2000);
          _drData.courtBookings = null;
          fetchTabData('padel');
        } catch (e) { toast(e.message || 'Annulation impossible.', 2500); }
      };
    });
    document.querySelectorAll('.tk-cancel-class').forEach(function (btn) {
      btn.onclick = async function () {
        if (!confirm('Annuler cette séance ?')) return;
        var client = api();
        if (!client || !client.isOnline()) return;
        try {
          await client.classes.cancelBooking(btn.getAttribute('data-id'));
          toast('Séance annulée.', 2000);
          _drData.classBookings = null;
          _drData.packs = null;
          fetchTabData('pilates');
        } catch (e) { toast(e.message || 'Annulation impossible.', 2500); }
      };
    });

    // ── Contact info edit ──────────────────────────────────────────────────
    var editNameBtn = document.getElementById('tk-edit-name');
    if (editNameBtn) editNameBtn.onclick = function () {
      hideProfileForm('tk-pw-edit');
      var f = document.getElementById('tk-name-edit');
      if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
    };
    var cancelNameBtn = document.getElementById('tk-name-cancel');
    if (cancelNameBtn) cancelNameBtn.onclick = function () { hideProfileForm('tk-name-edit'); };

    var saveNameBtn = document.getElementById('tk-name-save');
    if (saveNameBtn) saveNameBtn.onclick = async function () {
      var newName = (document.getElementById('tk-name-inp').value || '').trim();
      var rawPhone = (document.getElementById('tk-phone-inp').value || '').trim();
      var newPhone = rawPhone ? normalizePhone(rawPhone) : null;
      if (!newName) { toast('Name cannot be empty.', 2000); return; }
      if (newPhone && !/^\+216[0-9]{8}$/.test(newPhone)) { toast('Enter a valid Tunisian phone (+216 followed by 8 digits).', 2500); return; }
      var payload = { name: newName };
      if (newPhone) payload.phone = newPhone;
      var client = api();
      if (client && client.isOnline()) {
        try {
          await client.auth.updateMe(payload);
          auth.user.name = newName;
          if (newPhone) auth.user.phone = newPhone;
          storageSet('takeoff_user', auth.user);
        } catch (e) { toast(e.message || 'Update failed.', 2500); return; }
      }
      var dispEl = document.getElementById('tk-uname-disp');
      if (dispEl) dispEl.textContent = newName;
      hideProfileForm('tk-name-edit');
      renderBody();
      toast('Profile updated.', 2000);
    };

    // ── Password change ────────────────────────────────────────────────────
    var editPwBtn = document.getElementById('tk-edit-pw');
    if (editPwBtn) editPwBtn.onclick = function () {
      hideProfileForm('tk-name-edit');
      var f = document.getElementById('tk-pw-edit');
      if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
    };
    var cancelPwBtn = document.getElementById('tk-pw-cancel');
    if (cancelPwBtn) cancelPwBtn.onclick = function () { hideProfileForm('tk-pw-edit'); };

    var savePwBtn = document.getElementById('tk-pw-save');
    if (savePwBtn) savePwBtn.onclick = async function () {
      var cur = document.getElementById('tk-pw-cur').value || '';
      var nw = document.getElementById('tk-pw-new').value || '';
      var conf = document.getElementById('tk-pw-confirm').value || '';
      if (!cur || !nw) { toast('Fill in all password fields.', 2500); return; }
      if (nw.length < 8) { toast('New password must be at least 8 characters.', 2500); return; }
      if (nw !== conf) { toast('Passwords do not match.', 2500); return; }
      var client = api();
      if (!client || !client.isOnline()) { toast('No connection — try when online.', 2500); return; }
      try {
        await client.auth.updateMe({ currentPassword: cur, newPassword: nw });
        ['tk-pw-cur','tk-pw-new','tk-pw-confirm'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
        hideProfileForm('tk-pw-edit');
        toast('Password updated.', 2500);
      } catch (e) { toast(e.message || 'Update failed.', 2500); }
    };

    // ── Address cards ──────────────────────────────────────────────────────
    ['billing', 'delivery'].forEach(function (key) {
      var editBtn = document.getElementById('tk-addr-' + key + '-btn');
      if (editBtn) editBtn.onclick = function () {
        var f = document.getElementById('tk-addr-' + key + '-edit');
        if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
      };
      var cancelBtn = document.getElementById('tk-addr-' + key + '-cancel');
      if (cancelBtn) cancelBtn.onclick = function () { hideProfileForm('tk-addr-' + key + '-edit'); };

      var saveBtn = document.getElementById('tk-addr-' + key + '-save');
      if (saveBtn) saveBtn.onclick = function () {
        var g = function(s) { var el=document.getElementById('tk-'+key+'-'+s); return (el?el.value:'').trim(); };
        var addrObj = { name: g('name'), job: g('job'), line1: g('line1'), line2: g('line2'), city: g('city'), postal: g('postal'), phone: g('phone') };
        if (!addrObj.line1) { toast('Please enter a street address.', 2500); return; }
        if (!addrObj.city) { toast('Please enter a city.', 2500); return; }
        var addresses = storageGet('takeoff_addresses') || {};
        addresses[key] = addrObj;
        storageSet('takeoff_addresses', addresses);
        hideProfileForm('tk-addr-' + key + '-edit');
        renderBody();
        toast((key === 'billing' ? 'Billing' : 'Delivery') + ' address saved.', 2000);
      };
    });

    // ── Track toggles ──────────────────────────────────────────────────────
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
