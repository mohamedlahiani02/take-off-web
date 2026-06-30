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
    },

    wallet: {
      topup: function (amountDt) {
        return request('POST', '/api/v1/wallet/topup', { amountDt: amountDt });
      },
    },

    coaching: {
      submit: function (payload) {
        return request('POST', '/api/v1/coaching/inquiry', payload, true);
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
  };

  window.takeOffApi = api;
})();
