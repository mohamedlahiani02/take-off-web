// Take Off Admin — API Client
// Stores admin JWT in sessionStorage. Redirects to #login on 401.
(function () {
  if (window.adminApi) return;

  var _baseUrl = (window.TAKEOFF_API_URL || '').replace(/\/$/, '');
  var TOKEN_KEY = 'takeoff_admin_token';

  function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
  function storeToken(t) { if (t) sessionStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { sessionStorage.removeItem(TOKEN_KEY); }
  function offline() { return !_baseUrl; }

  async function request(method, path, body) {
    if (offline()) throw { status: 0, message: 'No API URL configured' };
    var token = getToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var res = await fetch(_baseUrl + path, {
      method: method,
      headers: headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent('admin:unauthorized'));
      throw { status: 401, message: 'Session expired' };
    }

    if (!res.ok) {
      var err = {};
      try { err = await res.json(); } catch (_) {}
      throw { status: res.status, code: err.code || 'error', message: err.title || err.message || 'Request failed' };
    }

    if (res.status === 204) return null;
    return res.json();
  }

  window.adminApi = {
    isOnline: function () { return !offline(); },
    getToken: getToken,
    storeToken: storeToken,
    clearToken: clearToken,
    isLoggedIn: function () { return !!getToken(); },

    auth: {
      login: function (email, password) {
        return request('POST', '/api/v1/admin/auth/login', { email: email, password: password })
          .then(function (data) {
            if (data && data.token) storeToken(data.token);
            return data;
          });
      },
      logout: async function () {
        try { await request('POST', '/api/v1/admin/auth/logout'); } catch(e) {}
        clearToken();
        window.dispatchEvent(new CustomEvent('admin:logout'));
      },
    },

    coaches: {
      list: function () { return request('GET', '/api/v1/admin/coaches'); },
      create: function (dto) { return request('POST', '/api/v1/admin/coaches', dto); },
      update: function (id, dto) { return request('PUT', '/api/v1/admin/coaches/' + id, dto); },
      delete: function (id) { return request('DELETE', '/api/v1/admin/coaches/' + id); },
      reorder: function (ids) { return request('PUT', '/api/v1/admin/coaches/reorder', ids); },
    },

    orders: {
      list: function (status, page) {
        var qs = 'page=' + (page || 0) + '&size=50';
        if (status) qs += '&status=' + encodeURIComponent(status);
        return request('GET', '/api/v1/admin/orders?' + qs);
      },
      get: function (id) { return request('GET', '/api/v1/admin/orders/' + id); },
      updateStatus: function (id, action) {
        return request('PATCH', '/api/v1/admin/orders/' + id + '/status', { action: action });
      },
    },

    inquiries: {
      list: function (page) { return request('GET', '/api/v1/admin/coaching?page=' + (page || 0)); },
    },

    // ── Epic B: users ──
    users: {
      search: function (q) { return request('GET', '/api/v1/admin/users/search?q=' + encodeURIComponent(q || '')); },
      list: function (status, page) {
        var qs = 'page=' + (page || 0) + '&size=50';
        if (status) qs += '&status=' + encodeURIComponent(status);
        return request('GET', '/api/v1/admin/users?' + qs);
      },
      get: function (id) { return request('GET', '/api/v1/admin/users/' + id); },
      createGhost: function (dto) { return request('POST', '/api/v1/admin/users', dto); },
      update: function (id, dto) { return request('PATCH', '/api/v1/admin/users/' + id, dto); },
      credit: function (id, dto) { return request('POST', '/api/v1/admin/users/' + id + '/wallet/credit', dto); },
      debit: function (id, dto) { return request('POST', '/api/v1/admin/users/' + id + '/wallet/debit', dto); },
      block: function (id) { return request('POST', '/api/v1/admin/users/' + id + '/block'); },
      unblock: function (id) { return request('POST', '/api/v1/admin/users/' + id + '/unblock'); },
      remove: function (id) { return request('DELETE', '/api/v1/admin/users/' + id); },
      addWalletCredit: function (userId, amountDt) {
        return request('POST', '/api/v1/admin/wallet/topup/' + userId, { amountDt: amountDt });
      },
    },

    // ── Epic C: courts ──
    courts: {
      calendar: function (fromIso, toIso) {
        return request('GET', '/api/v1/admin/courts/calendar?from=' + encodeURIComponent(fromIso) + '&to=' + encodeURIComponent(toIso));
      },
      book: function (dto) { return request('POST', '/api/v1/admin/courts/bookings', dto); },
      cancel: function (id, dto) { return request('POST', '/api/v1/admin/courts/bookings/' + id + '/cancel', dto); },
      reschedule: function (id, dto) { return request('POST', '/api/v1/admin/courts/bookings/' + id + '/reschedule', dto); },
      block: function (dto) { return request('POST', '/api/v1/admin/courts/blocks', dto); },
      unblock: function (id) { return request('DELETE', '/api/v1/admin/courts/blocks/' + id); },
    },

    // ── Epic D: tournaments ──
    tournaments: {
      list: function () { return request('GET', '/api/v1/admin/tournaments'); },
      detail: function (id) { return request('GET', '/api/v1/admin/tournaments/' + id); },
      create: function (dto) { return request('POST', '/api/v1/admin/tournaments', dto); },
      update: function (id, dto) { return request('PUT', '/api/v1/admin/tournaments/' + id, dto); },
      remove: function (id) { return request('DELETE', '/api/v1/admin/tournaments/' + id); },
      setStatus: function (id, status) { return request('POST', '/api/v1/admin/tournaments/' + id + '/status', { status: status }); },
      duplicate: function (id) { return request('POST', '/api/v1/admin/tournaments/' + id + '/duplicate'); },
      addField: function (id, dto) { return request('POST', '/api/v1/admin/tournaments/' + id + '/fields', dto); },
      deleteField: function (fieldId) { return request('DELETE', '/api/v1/admin/tournaments/fields/' + fieldId); },
      registrations: function (id) { return request('GET', '/api/v1/admin/tournaments/' + id + '/registrations'); },
      manualRegister: function (id, dto) { return request('POST', '/api/v1/admin/tournaments/' + id + '/registrations', dto); },
      regStatus: function (regId, dto) { return request('POST', '/api/v1/admin/tournaments/registrations/' + regId + '/status', dto); },
    },

    // ── Epic E: classes ──
    classes: {
      listTypes: function () { return request('GET', '/api/v1/admin/classes/types'); },
      createType: function (dto) { return request('POST', '/api/v1/admin/classes/types', dto); },
      updateType: function (id, dto) { return request('PUT', '/api/v1/admin/classes/types/' + id, dto); },
      sessions: function (fromIso, toIso) { return request('GET', '/api/v1/admin/classes/sessions?from=' + encodeURIComponent(fromIso) + '&to=' + encodeURIComponent(toIso)); },
      sessionDetail: function (id) { return request('GET', '/api/v1/admin/classes/sessions/' + id); },
      createSession: function (dto) { return request('POST', '/api/v1/admin/classes/sessions', dto); },
      updateSession: function (id, dto) { return request('PUT', '/api/v1/admin/classes/sessions/' + id, dto); },
      cancelSession: function (id) { return request('POST', '/api/v1/admin/classes/sessions/' + id + '/cancel'); },
      addStudent: function (id, dto) { return request('POST', '/api/v1/admin/classes/sessions/' + id + '/students', dto); },
      removeStudent: function (bookingId) { return request('DELETE', '/api/v1/admin/classes/bookings/' + bookingId); },
      promote: function (bookingId) { return request('POST', '/api/v1/admin/classes/bookings/' + bookingId + '/promote'); },
      attendance: function (bookingId, status) { return request('POST', '/api/v1/admin/classes/bookings/' + bookingId + '/attendance', { status: status }); },
    },

    // ── Epic F: packs ──
    packs: {
      listTypes: function () { return request('GET', '/api/v1/admin/packs/types'); },
      createType: function (dto) { return request('POST', '/api/v1/admin/packs/types', dto); },
      updateType: function (id, dto) { return request('PUT', '/api/v1/admin/packs/types/' + id, dto); },
      activeUserPacks: function () { return request('GET', '/api/v1/admin/packs/user-packs'); },
      userPacks: function (userId) { return request('GET', '/api/v1/admin/packs/user-packs/by-user/' + userId); },
      assign: function (dto) { return request('POST', '/api/v1/admin/packs/assign', dto); },
      extend: function (id, dto) { return request('POST', '/api/v1/admin/packs/user-packs/' + id + '/extend', dto); },
      adjust: function (id, dto) { return request('POST', '/api/v1/admin/packs/user-packs/' + id + '/credits', dto); },
      freeze: function (id) { return request('POST', '/api/v1/admin/packs/user-packs/' + id + '/freeze'); },
      cancel: function (id) { return request('POST', '/api/v1/admin/packs/user-packs/' + id + '/cancel'); },
    },

    // ── Epic G: products ──
    products: {
      list: function () { return request('GET', '/api/v1/admin/products'); },
      create: function (dto) { return request('POST', '/api/v1/admin/products', dto); },
      update: function (id, dto) { return request('PUT', '/api/v1/admin/products/' + id, dto); },
      remove: function (id) { return request('DELETE', '/api/v1/admin/products/' + id); },
      adjustStock: function (id, delta, variantId) {
        var body = { delta: delta };
        if (variantId) body.variantId = variantId;
        return request('PATCH', '/api/v1/admin/products/' + id + '/stock', body);
      },
    },

    // ── Epic H3: inquiry pipeline ──
    inquiryPipeline: {
      status: function (id, status) { return request('POST', '/api/v1/admin/coaching/' + id + '/status', { status: status }); },
      assign: function (id, coachId) { return request('POST', '/api/v1/admin/coaching/' + id + '/assign', { coachId: coachId }); },
      note: function (id, note) { return request('POST', '/api/v1/admin/coaching/' + id + '/note', { note: note }); },
      close: function (id, outcome) { return request('POST', '/api/v1/admin/coaching/' + id + '/close', { outcome: outcome }); },
    },

    // ── Image upload (Cloudinary via backend) ──
    media: {
      upload: async function (file, folder) {
        if (offline()) throw { status: 0, message: 'No API URL configured' };
        var token = getToken();
        var fd = new FormData();
        fd.append('file', file);
        if (folder) fd.append('folder', folder);
        var res = await fetch(_baseUrl + '/api/v1/admin/media/upload', {
          method: 'POST',
          headers: token ? { 'Authorization': 'Bearer ' + token } : {},
          body: fd,
        });
        if (res.status === 401) { clearToken(); window.dispatchEvent(new CustomEvent('admin:unauthorized')); throw { status: 401, message: 'Session expired' }; }
        if (!res.ok) { var e = {}; try { e = await res.json(); } catch (_) {} throw { status: res.status, message: e.title || e.message || 'Upload failed' }; }
        return res.json();
      },
      list: function () { return request('GET', '/api/v1/admin/content/media'); },
      remove: function (id) { return request('DELETE', '/api/v1/admin/content/media/' + id); },
    },

    // ── Admin accounts (staff) — SUPER_ADMIN only ──
    admins: {
      list: function () { return request('GET', '/api/v1/admin/accounts'); },
      create: function (dto) { return request('POST', '/api/v1/admin/accounts', dto); },
      toggleActive: function (id, active) { return request('PATCH', '/api/v1/admin/accounts/' + id + '/active', { active: active }); },
    },

    // ── ERP: Dashboard & Reports ──
    dashboard: {
      stats: function () { return request('GET', '/api/v1/admin/dashboard'); },
      revenue: function (days) { return request('GET', '/api/v1/admin/reports/revenue?days=' + (days || 14)); },
    },

    // ── ERP: Expenses ──
    expenses: {
      list: function (page) { return request('GET', '/api/v1/admin/expenses?page=' + (page || 0) + '&size=50'); },
      create: function (dto) { return request('POST', '/api/v1/admin/expenses', dto); },
      update: function (id, dto) { return request('PATCH', '/api/v1/admin/expenses/' + id, dto); },
      delete: function (id) { return request('DELETE', '/api/v1/admin/expenses/' + id); },
    },

    // ── Epic I: content / CMS ──
    content: {
      page: function (page) { return request('GET', '/api/v1/admin/content/' + page); },
      saveSection: function (dto) { return request('POST', '/api/v1/admin/content/section', dto); },
      settings: function () { return request('GET', '/api/v1/admin/content/settings'); },
      saveSetting: function (dto) { return request('POST', '/api/v1/admin/content/settings', dto); },
      media: function () { return request('GET', '/api/v1/admin/content/media'); },
      addMedia: function (dto) { return request('POST', '/api/v1/admin/content/media', dto); },
      deleteMedia: function (id) { return request('DELETE', '/api/v1/admin/content/media/' + id); },
    },
  };
})();
