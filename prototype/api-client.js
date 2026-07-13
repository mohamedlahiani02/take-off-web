// Take Off Club — API Client
// Browser IIFE. Exposes window.takeOffApi.
// If window.TAKEOFF_API_URL is empty, all calls are no-ops (offline mode).
(function () {
  if (window.takeOffApi) return;

  var _baseUrl = (window.TAKEOFF_API_URL || '').replace(/\/$/, '');
  var _accessToken = localStorage.getItem('takeoff_access') || null;
  var _refreshToken = localStorage.getItem('takeoff_refresh') || null;
  var _refreshing = null; // in-flight refresh promise

  function storeTokens(tokens) {
    _accessToken = tokens.accessToken || null;
    _refreshToken = tokens.refreshToken || null;
    if (_accessToken) localStorage.setItem('takeoff_access', _accessToken);
    else localStorage.removeItem('takeoff_access');
    if (_refreshToken) localStorage.setItem('takeoff_refresh', _refreshToken);
    else localStorage.removeItem('takeoff_refresh');
  }

  function clearTokens() {
    _accessToken = null;
    _refreshToken = null;
    localStorage.removeItem('takeoff_access');
    localStorage.removeItem('takeoff_refresh');
  }

  function offline() {
    return !_baseUrl;
  }

  async function doRefresh() {
    if (!_refreshToken) throw new Error('no_refresh');
    var res = await fetch(_baseUrl + '/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: _refreshToken }),
    });
    if (!res.ok) { clearTokens(); throw new Error('refresh_failed'); }
    var data = await res.json();
    storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken || _refreshToken });
    return data.accessToken;
  }

  async function request(method, path, body, skipAuth) {
    if (offline()) return null;

    var headers = { 'Content-Type': 'application/json' };
    if (!skipAuth && _accessToken) headers['Authorization'] = 'Bearer ' + _accessToken;

    var res = await fetch(_baseUrl + path, {
      method: method,
      headers: headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // auto-refresh on 401
    if (res.status === 401 && !skipAuth && _refreshToken) {
      try {
        if (!_refreshing) _refreshing = doRefresh().finally(function () { _refreshing = null; });
        var newToken = await _refreshing;
        headers['Authorization'] = 'Bearer ' + newToken;
        res = await fetch(_baseUrl + path, {
          method: method,
          headers: headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch (e) {
        clearTokens();
        if (window.takeOffAuth) window.takeOffAuth.logout();
        throw { status: 401, code: 'takeoff.auth.unauthorized', message: 'Session expired' };
      }
    }

    if (!res.ok) {
      var err = {};
      try { err = await res.json(); } catch (_) {}
      throw { status: res.status, code: err.code || 'takeoff.error', message: err.title || err.message || 'Request failed' };
    }

    if (res.status === 204) return null;
    return res.json();
  }

  var api = {
    isOnline: function () { return !offline(); },

    storeTokens: storeTokens,
    clearTokens: clearTokens,
    getToken: function () { return _accessToken; },

    auth: {
      register: function (dto) {
        return request('POST', '/api/v1/auth/register', dto, true).then(function (data) {
          if (data) storeTokens(data.tokens);
          return data;
        });
      },
      login: function (dto) {
        return request('POST', '/api/v1/auth/login', dto, true).then(function (data) {
          if (data) storeTokens(data.tokens);
          return data;
        });
      },
      logout: function () {
        return request('POST', '/api/v1/auth/logout').finally(clearTokens);
      },
      me: function () {
        return request('GET', '/api/v1/auth/me');
      },
      updateMe: function (dto) {
        return request('PATCH', '/api/v1/auth/me', dto);
      },
      forgotPassword: function (email) { return request('POST', '/api/v1/auth/forgot-password', { email: email }, true); },
      resetPassword: function (token, newPassword) { return request('POST', '/api/v1/auth/reset-password', { token: token, newPassword: newPassword }, true); },
      sendOtp: function (phone) { return request('POST', '/api/v1/auth/send-otp', { phone: phone }, true); },
      verifyOtp: function (phone, code, name) {
        var body = { phone: phone, code: code };
        if (name) body.name = name;
        return request('POST', '/api/v1/auth/verify-otp', body, true).then(function (data) {
          if (data) storeTokens(data.tokens);
          return data;
        });
      },
    },

    payments: {
      initiate: function (refType, refId, amountDt, returnUrl) {
        return request('POST', '/api/v1/payments/initiate', { refType: refType, refId: refId, amountDt: amountDt, returnUrl: returnUrl });
      },
      status: function (intentId) {
        return request('GET', '/api/v1/payments/' + intentId + '/status');
      },
    },

    orders: {
      place: function (payload) {
        return request('POST', '/api/v1/orders', payload);
      },
      list: function (page) {
        return request('GET', '/api/v1/orders?page=' + (page || 0));
      },
      get: function (id) {
        return request('GET', '/api/v1/orders/' + id);
      },
      cancel: function (id) {
        return request('POST', '/api/v1/orders/' + id + '/cancel');
      },
    },

    wallet: {
      topup: function (amountDt) {
        return request('POST', '/api/v1/wallet/topup', { amountDt: amountDt });
      },
      transactions: function () {
        return request('GET', '/api/v1/wallet/transactions');
      },
    },

    courts: {
      list: function () {
        return request('GET', '/api/v1/courts', undefined, true);
      },
      slots: function (courtId, date) {
        return request('GET', '/api/v1/courts/' + courtId + '/slots?date=' + encodeURIComponent(date), undefined, true);
      },
      book: function (courtId, startsAt, mode, paymentMethod) {
        return request('POST', '/api/v1/courts/' + courtId + '/bookings', {
          startsAt: startsAt,
          mode: mode || 'FULL',
          paymentMethod: paymentMethod || 'PAY_AT_CLUB',
        });
      },
      myBookings: function () {
        return request('GET', '/api/v1/courts/bookings/mine');
      },
      cancelBooking: function (bookingId) {
        return request('DELETE', '/api/v1/courts/bookings/' + bookingId);
      },
    },

    products: {
      list: function (params) {
        var qs = Object.keys(params || {}).filter(function (k) { return params[k] !== undefined && params[k] !== null; })
          .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
        return request('GET', '/api/v1/products' + (qs ? '?' + qs : ''));
      },
      get: function (id) {
        return request('GET', '/api/v1/products/' + id);
      },
    },

    coaches: {
      list: function (activity, preview) {
        var qs = 'activity=' + encodeURIComponent((activity || 'PADEL').toUpperCase());
        if (preview) qs += '&preview=true';
        return request('GET', '/api/v1/coaches?' + qs, undefined, true);
      },
    },

    coaching: {
      inquiry: function (dto) {
        return request('POST', '/api/v1/coaching/inquiry', dto);
      },
    },

    content: {
      page: function (page) {
        return request('GET', '/api/v1/content/' + encodeURIComponent(page), undefined, true);
      },
    },

    classes: {
      // from/to: ISO-8601 strings e.g. '2026-07-01T00:00:00Z'
      schedule: function (from, to) {
        return request('GET', '/api/v1/classes/schedule?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to), undefined, true);
      },
      bookSession: function (sessionId) {
        return request('POST', '/api/v1/classes/bookings', { sessionId: sessionId });
      },
      cancelBooking: function (bookingId) {
        return request('DELETE', '/api/v1/classes/bookings/' + bookingId);
      },
      myBookings: function () {
        return request('GET', '/api/v1/classes/bookings/mine');
      },
      availablePacks: function () {
        return request('GET', '/api/v1/classes/packs', undefined, true);
      },
      purchasePack: function (packTypeId) {
        return request('POST', '/api/v1/classes/packs/purchase', { packTypeId: packTypeId });
      },
      myPacks: function () {
        return request('GET', '/api/v1/classes/packs/mine');
      },
    },

    tournaments: {
      list: function() { return request('GET', '/api/v1/tournaments', undefined, true); },
    },
  };

  window.takeOffApi = api;
})();
