/* Appointment Companion tariff cache v1
   Uses the last successfully verified tariff snapshot immediately, then
   revalidates in the background. Cached figures remain visibly timestamped.
*/
(function (global) {
  'use strict';

  const CACHE_KEY = 'apptCompanionTariffSnapshotV1';
  const FRESH_MS = 36 * 60 * 60 * 1000;
  const MATERIALLY_STALE_MS = 7 * 24 * 60 * 60 * 1000;
  const inflight = {};

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function valid(data) {
    return !!(data && Array.isArray(data.tariffLive) && data.tariffLive.length);
  }

  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return saved && valid(saved.data) ? saved : null;
    } catch (_) { return null; }
  }

  function infoFor(saved, source, extra) {
    const checkedAt = saved && saved.checked_at ? saved.checked_at : '';
    const ageMs = checkedAt ? Math.max(0, Date.now() - Date.parse(checkedAt)) : Infinity;
    return Object.assign({
      source: source,
      checked_at: checkedAt,
      age_ms: ageMs,
      fresh: ageMs <= FRESH_MS,
      materially_stale: ageMs > MATERIALLY_STALE_MS
    }, extra || {});
  }

  function emit(name, detail) {
    global.dispatchEvent(new CustomEvent('ac:tariffs:' + name, { detail: clone(detail || {}) }));
  }

  function fetchFresh(feedUrl) {
    const key = String(feedUrl || '');
    if (!inflight[key]) {
      inflight[key] = fetch(key, { cache: 'no-store' }).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      }).then(function (data) {
        if (!valid(data)) throw new Error('Tariff feed returned no usable rows.');
        const saved = { schema_version: 1, checked_at: new Date().toISOString(), data: data };
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(saved)); } catch (_) {}
        return saved;
      }).finally(function () { delete inflight[key]; });
    }
    return inflight[key];
  }

  function load(feedUrl, options) {
    const opts = options || {};
    const cached = read();
    if (cached) {
      const cachedInfo = infoFor(cached, 'cache', { revalidating: true });
      if (typeof opts.onData === 'function') opts.onData(clone(cached.data), cachedInfo);
      emit('data', { data: cached.data, info: cachedInfo });
    }

    return fetchFresh(feedUrl).then(function (saved) {
      const liveInfo = infoFor(saved, 'live', { revalidating: false });
      if (typeof opts.onData === 'function') opts.onData(clone(saved.data), liveInfo);
      emit('data', { data: saved.data, info: liveInfo });
      return clone(saved.data);
    }).catch(function (error) {
      const failureInfo = cached
        ? infoFor(cached, 'cache', { revalidating: false, verification_failed: true })
        : { source: 'none', checked_at: '', age_ms: Infinity, fresh: false, materially_stale: true, verification_failed: true };
      if (typeof opts.onError === 'function') opts.onError(error, failureInfo);
      emit('error', { message: (error && error.message) || String(error), info: failureInfo });
      if (!cached) throw error;
      return clone(cached.data);
    });
  }

  global.AppointmentCompanionTariffs = {
    load: load,
    getCached: function () {
      const saved = read();
      return saved ? { data: clone(saved.data), info: infoFor(saved, 'cache', { revalidating: false }) } : null;
    },
    clear: function () { try { localStorage.removeItem(CACHE_KEY); } catch (_) {} }
  };
})(window);
