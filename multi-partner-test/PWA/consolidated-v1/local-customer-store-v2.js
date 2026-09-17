/* IndexedDB operational store for consolidated v1. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode')) return;
  var DB_NAME = 'apptCompanionConsolidatedV1', DB_VERSION = 1, CUSTOMERS = 'customers', META = 'meta', MIGRATION = 'legacy-import-v1';
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function makeId(prefix) { prefix = prefix || 'local'; return global.crypto && global.crypto.randomUUID ? prefix + '_' + global.crypto.randomUUID().replace(/-/g, '') : prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2); }
  function now() { return new Date().toISOString(); }
  function requestValue(request) { return new Promise(function (resolve, reject) { request.onsuccess = function () { resolve(request.result); }; request.onerror = function () { reject(request.error || new Error('Local database request failed.')); }; }); }
  function transactionDone(tx) { return new Promise(function (resolve, reject) { tx.oncomplete = resolve; tx.onerror = function () { reject(tx.error || new Error('Local database transaction failed.')); }; tx.onabort = function () { reject(tx.error || new Error('Local database transaction aborted.')); }; }); }
  function openNamed(name, version, upgrade) { return new Promise(function (resolve, reject) { var request = version ? indexedDB.open(name, version) : indexedDB.open(name); request.onupgradeneeded = function () { if (upgrade) upgrade(request.result, request.transaction); }; request.onsuccess = function () { resolve(request.result); }; request.onerror = function () { reject(request.error || new Error('Local database could not open.')); }; }); }
  function open() {
    if (!global.indexedDB) return Promise.reject(new Error('IndexedDB is unavailable on this device.'));
    return openNamed(DB_NAME, DB_VERSION, function (db, tx) {
      var store = db.objectStoreNames.contains(CUSTOMERS) ? tx.objectStore(CUSTOMERS) : db.createObjectStore(CUSTOMERS, { keyPath: 'local_id' });
      if (!store.indexNames.contains('cloud_id')) store.createIndex('cloud_id', 'cloud_id', { unique: false });
      if (!store.indexNames.contains('updated_at')) store.createIndex('updated_at', 'updated_at', { unique: false });
      if (!store.indexNames.contains('sync_state')) store.createIndex('sync_state', 'sync_state', { unique: false });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
    });
  }
  function normalise(input) {
    var stamp = now(), row = Object.assign({ schema_version: 1, local_id: makeId(), cloud_id: '', customer_name: '', appointment_state: null, specialist_state: {}, basket_url: '', cloud_customer: null, local_revision: 0, cloud_synced_local_revision: 0, client_revision_id: '', base_cloud_revision: '', base_cloud_snapshot: null, sync_state: 'pending', deleted: false, tombstone: false, deletion_requested_at: '', conflict: null, conflict_history: [], created_at: stamp, updated_at: stamp }, clone(input || {}));
    row.local_id = String(row.local_id || makeId()); row.cloud_id = String(row.cloud_id || ''); row.customer_name = String(row.customer_name || ''); row.local_revision = Number(row.local_revision || 0); row.cloud_synced_local_revision = Number(row.cloud_synced_local_revision || 0); row.specialist_state = row.specialist_state && typeof row.specialist_state === 'object' ? row.specialist_state : {}; row.conflict_history = Array.isArray(row.conflict_history) ? row.conflict_history : [];
    if (global.AppointmentCompanionCanonical && row.appointment_state) row.appointment_state = global.AppointmentCompanionCanonical.normaliseAppointment(row.appointment_state);
    if (row.appointment_state && row.appointment_state.canonical) { row.customer_name = row.appointment_state.canonical.customerName || row.customer_name; row.basket_url = row.appointment_state.canonical.basketUrl || row.basket_url; }
    return row;
  }
  async function read(storeName, key) { var db = await open(); try { return clone(await requestValue(db.transaction(storeName, 'readonly').objectStore(storeName).get(key))); } finally { db.close(); } }
  async function get(localId) { return read(CUSTOMERS, String(localId)); }
  async function findCloud(cloudId) { var db = await open(); try { return clone(await requestValue(db.transaction(CUSTOMERS, 'readonly').objectStore(CUSTOMERS).index('cloud_id').get(String(cloudId)))); } finally { db.close(); } }
  async function write(row) { var db = await open(); try { var tx = db.transaction(CUSTOMERS, 'readwrite'); tx.objectStore(CUSTOMERS).put(row); await transactionDone(tx); return clone(row); } finally { db.close(); } }
  async function put(input, options) {
    var opts = options || {}, existing = input && input.local_id ? await get(input.local_id) : null; if (!existing && input && input.cloud_id) existing = await findCloud(input.cloud_id);
    var next = normalise(Object.assign({}, existing || {}, input || {})); next.updated_at = opts.updatedAt || now();
    if (!opts.keepRevision) { next.local_revision = Number(existing && existing.local_revision || next.local_revision || 0) + 1; next.client_revision_id = makeId('rev'); }
    if (!opts.keepSyncState) next.sync_state = next.deleted ? 'pending_delete' : 'pending';
    return write(next);
  }
  async function list(includeDeleted) { var db = await open(); try { var rows = await requestValue(db.transaction(CUSTOMERS, 'readonly').objectStore(CUSTOMERS).getAll()); return rows.filter(function (row) { return includeDeleted || !row.deleted; }).sort(function (a, b) { return String(b.updated_at).localeCompare(String(a.updated_at)); }).map(clone); } finally { db.close(); } }
  async function remove(localId) { var db = await open(); try { var tx = db.transaction(CUSTOMERS, 'readwrite'); tx.objectStore(CUSTOMERS).delete(String(localId)); await transactionDone(tx); } finally { db.close(); } }
  async function updateSpecialist(localId, toolId, state) { var row = await get(localId); if (!row) return null; var specialists = Object.assign({}, row.specialist_state || {}); specialists[String(toolId)] = clone(state); return put(Object.assign({}, row, { specialist_state: specialists })); }
  async function meta(key, value) { if (arguments.length === 1) { var row = await read(META, String(key)); return row ? clone(row.value) : null; } var db = await open(); try { var tx = db.transaction(META, 'readwrite'); tx.objectStore(META).put({ key: String(key), value: clone(value) }); await transactionDone(tx); return clone(value); } finally { db.close(); } }
  function parse(value, fallback) { try { var parsed = JSON.parse(value || 'null'); return parsed == null ? fallback : parsed; } catch (_) { return fallback; } }
  async function oldLocalFirstRows() {
    try { if (typeof indexedDB.databases === 'function') { var known = await indexedDB.databases(); if (!known.some(function (db) { return db.name === 'apptCompanionLocalFirstV1'; })) return []; } var db = await openNamed('apptCompanionLocalFirstV1'); if (!db.objectStoreNames.contains('customers')) { db.close(); return []; } var rows = await requestValue(db.transaction('customers', 'readonly').objectStore('customers').getAll()); db.close(); return rows || []; } catch (_) { return []; }
  }
  async function importCandidate(candidate) {
    if (!candidate || candidate.deleted) return null;
    var canonical = global.AppointmentCompanionCanonical, appt = canonical ? canonical.migrateSnapshot(candidate.appointment_state || candidate.data || candidate) : candidate.appointment_state;
    var row = { local_id: candidate.local_id, cloud_id: candidate.cloud_id || candidate.customer_id || '', customer_name: candidate.customer_name || candidate.customerName || appt && appt.canonical && appt.canonical.customerName || '', appointment_state: appt, specialist_state: candidate.specialist_state || candidate.specialists || appt && appt.ui_state && appt.ui_state._journey && appt.ui_state._journey.specialists || {}, basket_url: candidate.basket_url || appt && appt.canonical && appt.canonical.basketUrl || '', cloud_customer: candidate.cloud_customer || null, local_revision: candidate.local_revision || 0, cloud_synced_local_revision: candidate.cloud_synced_local_revision || 0, base_cloud_revision: candidate.base_cloud_revision || candidate.cloud_revision || candidate.last_cloud_updated_at || '', base_cloud_snapshot: candidate.base_cloud_snapshot || candidate.cloud_customer || null, sync_state: candidate.sync_state === 'synced' ? 'synced' : 'pending', created_at: candidate.created_at || candidate.savedAt || now(), updated_at: candidate.updated_at || candidate.savedAt || now() };
    if (row.cloud_id && await findCloud(row.cloud_id)) return null; if (row.local_id && await get(row.local_id)) return null;
    return put(row, { keepRevision: !!row.local_revision, keepSyncState: true, updatedAt: row.updated_at });
  }
  async function migrate() {
    if (await meta(MIGRATION)) return;
    var imported = 0, old = await oldLocalFirstRows(); for (var i = 0; i < old.length; i++) if (await importCandidate(old[i])) imported++;
    var working = parse(localStorage.getItem('apptCompanionWorkingRecordV1'), null); if (working && await importCandidate(working)) imported++;
    var saves = parse(localStorage.getItem('apptCompanionSaves_v2'), []); for (var j = 0; j < (Array.isArray(saves) ? saves.length : 0); j++) if (saves[j] && saves[j].data && await importCandidate({ local_id: String(saves[j].id || '').indexOf('cloud:') === 0 ? '' : saves[j].id, cloud_id: String(saves[j].id || '').indexOf('cloud:') === 0 ? String(saves[j].id).slice(6) : '', customer_name: saves[j].label || '', data: saves[j].data, savedAt: saves[j].savedAt })) imported++;
    await meta(MIGRATION, { completed_at: now(), imported: imported });
  }
  global.AppointmentCompanionLocalStore = { open: open, get: get, findCloud: findCloud, put: put, list: list, remove: remove, updateSpecialist: updateSpecialist, meta: meta, migrate: migrate, makeId: function () { return makeId('local'); }, database: { name: DB_NAME, version: DB_VERSION } };
})(window);
