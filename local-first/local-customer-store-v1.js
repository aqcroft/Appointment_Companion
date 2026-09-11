/* IndexedDB operational customer store for the isolated Step 2 test route. */
(function (global) {
  'use strict';
  var DB_NAME = 'apptCompanionLocalFirstV1';
  var DB_VERSION = 2;
  var CUSTOMERS = 'customers';
  var META = 'meta';
  var MIGRATION_KEY = 'legacy-import-v2';

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function makeId() {
    return global.crypto && global.crypto.randomUUID
      ? 'local_' + global.crypto.randomUUID().replace(/-/g, '')
      : 'local_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  function now() { return new Date().toISOString(); }
  function requestValue(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('Local database request failed.')); };
    });
  }
  function transactionDone(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(tx.error || new Error('Local database transaction failed.')); };
      tx.onabort = function () { reject(tx.error || new Error('Local database transaction was aborted.')); };
    });
  }
  function open() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) return reject(new Error('IndexedDB is unavailable on this device.'));
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        var customers = db.objectStoreNames.contains(CUSTOMERS)
          ? request.transaction.objectStore(CUSTOMERS)
          : db.createObjectStore(CUSTOMERS, { keyPath: 'local_id' });
        if (!customers.indexNames.contains('cloud_id')) customers.createIndex('cloud_id', 'cloud_id', { unique: false });
        if (!customers.indexNames.contains('updated_at')) customers.createIndex('updated_at', 'updated_at', { unique: false });
        if (!customers.indexNames.contains('sync_state')) customers.createIndex('sync_state', 'sync_state', { unique: false });
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('Local database could not open.')); };
    });
  }
  function normalise(input) {
    var stamp = now();
    var record = Object.assign({
      local_id: makeId(), cloud_id: '', customer_name: '', appointment_state: null,
      specialist_state: {}, basket_url: '', cloud_customer: null,
      local_revision: 0, cloud_synced_local_revision: 0, client_revision_id: '',
      cloud_revision: '', last_cloud_updated_at: '', sync_state: 'pending',
      deleted: false, tombstone: false, deletion_requested_at: '',
      conflict: null, conflict_history: [], created_at: stamp, updated_at: stamp
    }, clone(input || {}));
    record.local_id = String(record.local_id || makeId());
    record.cloud_id = String(record.cloud_id || '');
    record.customer_name = String(record.customer_name || '');
    record.local_revision = Number(record.local_revision || 0);
    record.cloud_synced_local_revision = Number(record.cloud_synced_local_revision || 0);
    record.specialist_state = record.specialist_state && typeof record.specialist_state === 'object' ? record.specialist_state : {};
    record.conflict_history = Array.isArray(record.conflict_history) ? record.conflict_history : [];
    return record;
  }
  async function readStore(storeName, key) {
    var db = await open();
    try { return clone(await requestValue(db.transaction(storeName, 'readonly').objectStore(storeName).get(key))); }
    finally { db.close(); }
  }
  async function get(localId) { return readStore(CUSTOMERS, String(localId)); }
  async function findCloud(cloudId) {
    var db = await open();
    try { return clone(await requestValue(db.transaction(CUSTOMERS, 'readonly').objectStore(CUSTOMERS).index('cloud_id').get(String(cloudId)))); }
    finally { db.close(); }
  }
  async function writeRecord(record) {
    var db = await open();
    try {
      var tx = db.transaction(CUSTOMERS, 'readwrite');
      tx.objectStore(CUSTOMERS).put(record);
      await transactionDone(tx);
      return clone(record);
    } finally { db.close(); }
  }
  async function put(input, options) {
    var opts = options || {};
    var existing = input && input.local_id ? await get(input.local_id) : null;
    if (!existing && input && input.cloud_id) existing = await findCloud(input.cloud_id);
    var next = normalise(Object.assign({}, existing || {}, input || {}));
    next.updated_at = opts.updatedAt || now();
    if (!opts.keepRevision) {
      next.local_revision = Number(existing && existing.local_revision || next.local_revision || 0) + 1;
      next.client_revision_id = makeId().replace(/^local_/, 'rev_');
    }
    if (!opts.keepSyncState) next.sync_state = next.deleted ? 'pending_delete' : 'pending';
    return writeRecord(next);
  }
  async function list(includeDeleted) {
    var db = await open();
    try {
      var rows = await requestValue(db.transaction(CUSTOMERS, 'readonly').objectStore(CUSTOMERS).getAll());
      return rows.filter(function (row) { return includeDeleted || !row.deleted; })
        .sort(function (a, b) { return String(b.updated_at).localeCompare(String(a.updated_at)); }).map(clone);
    } finally { db.close(); }
  }
  async function remove(localId) {
    var db = await open();
    try { var tx = db.transaction(CUSTOMERS, 'readwrite'); tx.objectStore(CUSTOMERS).delete(String(localId)); await transactionDone(tx); }
    finally { db.close(); }
  }
  async function updateSpecialist(localId, toolId, state) {
    var record = await get(localId);
    if (!record) return null;
    var specialists = Object.assign({}, record.specialist_state || {});
    specialists[String(toolId)] = clone(state);
    return put(Object.assign({}, record, { specialist_state: specialists }));
  }
  async function meta(key, value) {
    if (arguments.length === 1) { var row = await readStore(META, String(key)); return row ? clone(row.value) : null; }
    var db = await open();
    try { var tx = db.transaction(META, 'readwrite'); tx.objectStore(META).put({ key: String(key), value: clone(value) }); await transactionDone(tx); return clone(value); }
    finally { db.close(); }
  }
  function parse(value, fallback) { try { var result = JSON.parse(value || 'null'); return result == null ? fallback : result; } catch (_) { return fallback; } }
  async function migrate() {
    if (await meta(MIGRATION_KEY)) return;
    var importedCloud = {};
    var working = parse(localStorage.getItem('apptCompanionWorkingRecordV1'), null);
    if (working && (working.customer_id || working.customer_name || working.appointment_state)) {
      var candidate = {
        cloud_id: working.customer_id || '', customer_name: working.customer_name || '',
        appointment_state: working.appointment_state || null, specialist_state: working.specialists || {},
        basket_url: working.basket_url || '', sync_state: 'pending'
      };
      if (!candidate.cloud_id || !(await findCloud(candidate.cloud_id))) {
        var added = await put(candidate, { keepRevision: false, keepSyncState: true });
        if (added.cloud_id) importedCloud[added.cloud_id] = true;
      }
    }
    var backups = parse(localStorage.getItem('apptCompanionSaves_v2'), []);
    for (var i = 0; i < (Array.isArray(backups) ? backups.length : 0); i++) {
      var backup = backups[i] || {}, data = backup.data;
      if (!data) continue;
      var cloudId = data.cloud_backup && data.cloud_backup.customer_id || (String(backup.id || '').indexOf('cloud:') === 0 ? String(backup.id).slice(6) : '');
      if ((cloudId && (importedCloud[cloudId] || await findCloud(cloudId)))) continue;
      var row = await put({ cloud_id: cloudId, customer_name: data.customerName || backup.label || '', appointment_state: data, specialist_state: data._journey && data._journey.specialists || {}, basket_url: data.inputs && data.inputs.basketLink || '', sync_state: 'pending' }, { keepSyncState: true });
      if (row.cloud_id) importedCloud[row.cloud_id] = true;
    }
    await meta(MIGRATION_KEY, { completed_at: now() });
  }
  global.AppointmentCompanionLocalStore = { open: open, get: get, findCloud: findCloud, put: put, list: list, remove: remove, updateSpecialist: updateSpecialist, migrate: migrate, meta: meta, makeId: makeId };
})(window);
