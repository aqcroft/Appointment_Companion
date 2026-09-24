/* Appointment Companion v2.42 tariff delivery guard.
   Cached data can paint immediately, but every normal launch performs the existing
   single live revalidation. If that live dataset differs, the cache is replaced
   and the page reloads once so the visible tools cannot remain on the old suite.
   No polling is performed.
*/
(function (global) {
  'use strict';

  var FEED = 'https://script.google.com/macros/s/AKfycbw-TllTpk_dbFjHhmojgeai9gKNGRzRaA_BtMooVSLeqvg614mONQyrpElC4M8vqP51/exec';
  var KEY = 'apptCompanionTariffSnapshotV1';
  var RELOAD_KEY = 'apptCompanionTariffReloadV242';
  var nativeFetch = global.fetch.bind(global);
  var forceRefresh = new URL(global.location.href).searchParams.get('refreshTariffs') === '1';
  var state = { status:'checking', deliveredSignature:'', liveSignature:'', checkedAt:'', error:'', summary:null };

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function valid(data) { return !!(data && Array.isArray(data.tariffLive) && data.tariffLive.length); }
  function pick(row, names) {
    for (var i=0;i<names.length;i++) if (row && row[names[i]] != null && row[names[i]] !== '') return row[names[i]];
    return '';
  }
  function rows(data) { return valid(data) ? data.tariffLive : []; }
  function unique(list) { return list.filter(function(v,i,a){ return v && a.indexOf(v) === i; }); }
  function signature(data) {
    if (!valid(data)) return '';
    var parts = rows(data).map(function(r){
      return [
        pick(r,['tariff_name','tariffName']),
        pick(r,['tariff_type','tariffType']),
        pick(r,['source_ref','sourceRef']),
        pick(r,['fixed_series','fixedSeries']),
        pick(r,['tracker_series','trackerSeries']),
        pick(r,['valid_from','validFrom']),
        pick(r,['valid_to','validTo'])
      ].join('|');
    }).sort();
    return parts.join('~');
  }
  function familySummary(data) {
    var rs = rows(data);
    var fixed = unique(rs.filter(function(r){ return String(pick(r,['tariff_type','tariffType'])).toLowerCase()==='fixed'; })
      .map(function(r){ return String(pick(r,['fixed_series','fixedSeries']) || '').replace(/\D/g,''); }));
    var tracker = unique(rs.filter(function(r){ return String(pick(r,['tariff_type','tariffType'])).toLowerCase()==='tracker'; })
      .map(function(r){ return String(pick(r,['tracker_series','trackerSeries']) || '').replace(/\D/g,''); }));
    function refs(type) {
      return unique(rs.filter(function(r){ return String(pick(r,['tariff_type','tariffType'])).toLowerCase()===type; })
        .map(function(r){ return String(pick(r,['source_ref','sourceRef']) || ''); })).sort();
    }
    return {
      fixed: fixed.length ? 'Fixed ' + fixed.sort(function(a,b){return (+b)-(+a);})[0] : 'Not supplied',
      tracker: tracker.length ? 'Tracker ' + tracker.sort(function(a,b){return (+b)-(+a);})[0] : 'Not supplied',
      variable: refs('variable').join(', ') || 'Not supplied',
      ev: refs('variable_ev').join(', ') || 'Not supplied'
    };
  }
  function read() {
    try {
      var row = JSON.parse(localStorage.getItem(KEY) || 'null');
      return row && valid(row.data) ? row : null;
    } catch (_) { return null; }
  }
  function save(data) {
    if (!valid(data)) return null;
    var saved = { schema_version:1, checked_at:new Date().toISOString(), data:data };
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) {}
    return saved;
  }
  function emit(name, detail) {
    try { global.dispatchEvent(new CustomEvent('ac:tariffs:' + name, { detail: clone(detail || {}) })); } catch (_) {}
  }
  function cachedResponse(data) {
    return new Response(JSON.stringify(data), { status:200, headers:{ 'Content-Type':'application/json', 'X-Companion-Cache':'verified' } });
  }
  function cleanForceFlag() {
    if (!forceRefresh) return;
    try {
      var u = new URL(global.location.href);
      u.searchParams.delete('refreshTariffs');
      global.history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash);
    } catch (_) {}
    forceRefresh = false;
  }
  function deliverLive(response) {
    var copy = response.clone();
    copy.json().then(function(data){
      if (!valid(data)) throw new Error('Tariff feed returned no usable rows.');
      var saved = save(data);
      state.status = 'green';
      state.deliveredSignature = signature(data);
      state.liveSignature = state.deliveredSignature;
      state.checkedAt = saved && saved.checked_at || new Date().toISOString();
      state.summary = familySummary(data);
      state.error = '';
      sessionStorage.removeItem(RELOAD_KEY);
      cleanForceFlag();
      emit('verified', state);
    }).catch(function(err){
      state.status='red'; state.error=String(err && err.message || err); emit('error',state);
    });
    return response;
  }
  function revalidate(deliveredData) {
    var deliveredSig = signature(deliveredData);
    nativeFetch(FEED, { cache:'no-store', redirect:'follow' })
      .then(function(response){ if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
      .then(function(data){
        if (!valid(data)) throw new Error('Tariff feed returned no usable rows.');
        var liveSig = signature(data);
        var saved = save(data);
        state.liveSignature = liveSig;
        state.checkedAt = saved && saved.checked_at || new Date().toISOString();
        state.summary = familySummary(data);
        state.error = '';
        if (liveSig && deliveredSig && liveSig !== deliveredSig) {
          state.status='amber';
          emit('changed', state);
          var last = sessionStorage.getItem(RELOAD_KEY) || '';
          if (last !== liveSig) {
            sessionStorage.setItem(RELOAD_KEY, liveSig);
            setTimeout(function(){ global.location.reload(); }, 120);
          }
          return;
        }
        state.status='green';
        sessionStorage.removeItem(RELOAD_KEY);
        emit('verified', state);
      })
      .catch(function(err){
        state.status = deliveredData ? 'amber' : 'red';
        state.error = String(err && err.message || err);
        emit('error', state);
      });
  }

  global.AppointmentCompanionTariffsV242 = {
    feed: FEED,
    cacheKey: KEY,
    state: function(){ return clone(state); },
    cached: function(){ var c=read(); return c ? clone(c) : null; },
    summary: familySummary,
    signature: signature,
    refresh: function(){
      try { localStorage.removeItem(KEY); } catch (_) {}
      var u = new URL(global.location.href);
      u.searchParams.set('refreshTariffs','1');
      global.location.assign(u.toString());
    }
  };

  global.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input && input.url;
    if (String(url || '') !== FEED) return nativeFetch(input, init);

    var cached = forceRefresh ? null : read();
    if (!cached) {
      state.status='checking';
      emit('checking', state);
      return nativeFetch(FEED, Object.assign({}, init || {}, { cache:'no-store' }))
        .then(function(response){
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return deliverLive(response);
        })
        .catch(function(err){
          var fallback = read();
          if (fallback) {
            state.status='amber'; state.error=String(err && err.message || err);
            state.deliveredSignature=signature(fallback.data); state.summary=familySummary(fallback.data);
            emit('error',state);
            return cachedResponse(fallback.data);
          }
          state.status='red'; state.error=String(err && err.message || err); emit('error',state);
          throw err;
        });
    }

    state.deliveredSignature = signature(cached.data);
    state.summary = familySummary(cached.data);
    state.checkedAt = cached.checked_at || '';
    state.status = 'checking';
    setTimeout(function(){ emit('checking',state); },0);
    revalidate(cached.data);
    return Promise.resolve(cachedResponse(cached.data));
  };
})(window);
