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
      logout: function () {
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
      list: function (page) { return request('GET', '/api/v1/admin/orders?page=' + (page || 0)); },
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
  };
})();
