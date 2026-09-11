/* Keeps the existing tariff UI unchanged while making its feed request cache-first.
   The verified snapshot is shared with the EV Companion cache module. */
(function (global) {
  'use strict';
  var FEED = 'https://script.google.com/macros/s/AKfycbw-TllTpk_dbFjHhmojgeai9gKNGRzRaA_BtMooVSLeqvg614mONQyrpElC4M8vqP51/exec';
  var KEY = 'apptCompanionTariffSnapshotV1';
  var nativeFetch = global.fetch.bind(global);
  function valid(data) { return !!(data && Array.isArray(data.tariffLive) && data.tariffLive.length); }
  function read() { try { var row = JSON.parse(localStorage.getItem(KEY) || 'null'); return row && valid(row.data) ? row : null; } catch (_) { return null; } }
  function save(data) { if (!valid(data)) return; try { localStorage.setItem(KEY, JSON.stringify({ schema_version: 1, checked_at: new Date().toISOString(), data: data })); } catch (_) {} }
  function response(data) { return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
  global.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input && input.url;
    if (String(url || '') !== FEED) return nativeFetch(input, init);
    var cached = read();
    if (!cached) return nativeFetch(input, init).then(function (res) {
      var copy = res.clone(); copy.json().then(save).catch(function () {}); return res;
    });
    nativeFetch(input, init).then(function (res) { if (res.ok) return res.json(); throw new Error('HTTP ' + res.status); }).then(save).catch(function () {});
    return Promise.resolve(response(cached.data));
  };
})(window);
