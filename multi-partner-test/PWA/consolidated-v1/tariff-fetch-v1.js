/* Cache the last verified live tariff response; the live feed remains authoritative. */
(function (global) {
  'use strict';
  var FEED = 'https://script.google.com/macros/s/AKfycbw-TllTpk_dbFjHhmojgeai9gKNGRzRaA_BtMooVSLeqvg614mONQyrpElC4M8vqP51/exec';
  var KEY = 'apptCompanionTariffSnapshotV1';
  var nativeFetch = global.fetch.bind(global);
  function valid(data) { return !!(data && Array.isArray(data.tariffLive) && data.tariffLive.length); }
  function read() { try { var row = JSON.parse(localStorage.getItem(KEY) || 'null'); return row && valid(row.data) ? row : null; } catch (_) { return null; } }
  function save(data) { if (!valid(data)) return; try { localStorage.setItem(KEY, JSON.stringify({ schema_version: 1, checked_at: new Date().toISOString(), data: data })); } catch (_) {} }
  function cachedResponse(data) { return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Companion-Cache': 'verified' } }); }
  global.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input && input.url;
    if (String(url || '') !== FEED) return nativeFetch(input, init);
    var cached = read();
    if (!cached) return nativeFetch(input, init).then(function (response) { var copy = response.clone(); copy.json().then(save).catch(function () {}); return response; });
    nativeFetch(input, init).then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); }).then(save).catch(function () {});
    return Promise.resolve(cachedResponse(cached.data));
  };
})(window);
