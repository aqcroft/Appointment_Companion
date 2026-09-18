import { clone, hasMeaningfulIdentity, normaliseAppointment } from './canonical-state.js';
import { migrateRecord } from './migrations.js';

const DB_NAME = 'apptCompanionV301Preview';
const DB_VERSION = 1;
const CUSTOMERS = 'customers';
const META = 'meta';
const MIGRATION_KEY = 'v301-preview-import-2026-09-18';
const LEGACY_DATABASES = ['apptCompanionV3', 'apptCompanionConsolidatedV1', 'apptCompanionLocalFirstV1'];

const now = () => new Date().toISOString();
const makeId = (prefix = 'local') => globalThis.crypto?.randomUUID
  ? `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`
  : `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function legacyImportIdentity(candidate = {}, source = 'legacy') {
  const existing = candidate.local_id || candidate.cloud_id || candidate.customer_id;
  if (existing) return String(existing);
  const name = candidate.customer_name || candidate.customerName || candidate.label
    || candidate.appointment_state?.person?.name || candidate.data?.person?.name || '';
  const created = candidate.created_at || candidate.createdAt || candidate.savedAt || candidate.saved_at || '';
  const stableDate = source === 'localStorage:working' ? '' : created;
  return `legacy_${stableHash(`${source}|${String(name).trim().toLocaleLowerCase('en-GB')}|${stableDate}`)}`;
}

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Local database request failed.'));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Local database transaction failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('Local database transaction aborted.'));
  });
}

function openNamed(name, version, upgrade) {
  return new Promise((resolve, reject) => {
    const request = version ? indexedDB.open(name, version) : indexedDB.open(name);
    request.onupgradeneeded = () => upgrade?.(request.result, request.transaction);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(`Could not open ${name}.`));
  });
}

export async function openStore() {
  if (!globalThis.indexedDB) throw new Error('IndexedDB is unavailable on this device.');
  return openNamed(DB_NAME, DB_VERSION, (db, tx) => {
    const store = db.objectStoreNames.contains(CUSTOMERS)
      ? tx.objectStore(CUSTOMERS)
      : db.createObjectStore(CUSTOMERS, { keyPath: 'local_id' });
    if (!store.indexNames.contains('cloud_id')) store.createIndex('cloud_id', 'cloud_id', { unique: false });
    if (!store.indexNames.contains('updated_at')) store.createIndex('updated_at', 'updated_at', { unique: false });
    if (!store.indexNames.contains('sync_state')) store.createIndex('sync_state', 'sync_state', { unique: false });
    if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
  });
}

function normaliseRecord(input = {}) {
  const stamp = now();
  const appointment = normaliseAppointment(input.appointment_state || {});
  return {
    schema_version: 3,
    local_id: String(input.local_id || makeId()),
    cloud_id: String(input.cloud_id || ''),
    customer_name: appointment.person.name || String(input.customer_name || '').trim(),
    appointment_state: appointment,
    specialist_state: clone(input.specialist_state || {}),
    basket_url: appointment.summary.basketUrl || String(input.basket_url || ''),
    cloud_customer: clone(input.cloud_customer || null),
    local_revision: Number(input.local_revision || 0),
    cloud_synced_local_revision: Number(input.cloud_synced_local_revision || 0),
    client_revision_id: String(input.client_revision_id || ''),
    base_cloud_revision: String(input.base_cloud_revision || ''),
    base_cloud_snapshot: clone(input.base_cloud_snapshot || null),
    sync_state: input.sync_state || 'pending',
    deleted: Boolean(input.deleted),
    tombstone: Boolean(input.tombstone),
    deletion_requested_at: String(input.deletion_requested_at || ''),
    conflict: clone(input.conflict || null),
    conflict_history: Array.isArray(input.conflict_history) ? clone(input.conflict_history) : [],
    created_at: input.created_at || stamp,
    updated_at: input.updated_at || stamp
  };
}

async function read(storeName, key) {
  const db = await openStore();
  try { return clone(await requestValue(db.transaction(storeName, 'readonly').objectStore(storeName).get(key))); }
  finally { db.close(); }
}

export const getCustomer = localId => read(CUSTOMERS, String(localId));

export async function findByCloudId(cloudId) {
  const db = await openStore();
  try {
    return clone(await requestValue(db.transaction(CUSTOMERS, 'readonly').objectStore(CUSTOMERS).index('cloud_id').get(String(cloudId))));
  } finally { db.close(); }
}

async function writeRecord(record) {
  const db = await openStore();
  try {
    const transaction = db.transaction(CUSTOMERS, 'readwrite');
    transaction.objectStore(CUSTOMERS).put(record);
    await transactionDone(transaction);
    return clone(record);
  } finally { db.close(); }
}

export async function saveCustomer(input, options = {}) {
  const candidate = normaliseRecord(input);
  if (!hasMeaningfulIdentity(candidate.appointment_state)) throw new Error('Add the person\'s name before saving.');
  let existing = input.local_id ? await getCustomer(input.local_id) : null;
  if (!existing && input.cloud_id) existing = await findByCloudId(input.cloud_id);
  const next = normaliseRecord({ ...existing, ...input, appointment_state: candidate.appointment_state });
  next.updated_at = options.updatedAt || now();
  if (!options.keepRevision) {
    next.local_revision = Number(existing?.local_revision || next.local_revision || 0) + 1;
    next.client_revision_id = makeId('rev');
  }
  if (!options.keepSyncState) next.sync_state = next.deleted ? 'pending_delete' : 'pending';
  return writeRecord(next);
}

export async function listCustomers({ includeDeleted = false } = {}) {
  const db = await openStore();
  try {
    const rows = await requestValue(db.transaction(CUSTOMERS, 'readonly').objectStore(CUSTOMERS).getAll());
    return rows.filter(row => includeDeleted || !row.deleted)
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).map(clone);
  } finally { db.close(); }
}

export async function removeCustomer(localId) {
  const db = await openStore();
  try {
    const transaction = db.transaction(CUSTOMERS, 'readwrite');
    transaction.objectStore(CUSTOMERS).delete(String(localId));
    await transactionDone(transaction);
  } finally { db.close(); }
}

export async function getMeta(key) {
  const row = await read(META, String(key));
  return row ? clone(row.value) : null;
}

export async function setMeta(key, value) {
  const db = await openStore();
  try {
    const transaction = db.transaction(META, 'readwrite');
    transaction.objectStore(META).put({ key: String(key), value: clone(value) });
    await transactionDone(transaction);
  } finally { db.close(); }
  return clone(value);
}

async function databaseExists(name) {
  // Opening an unknown IndexedDB name creates it. Skip database discovery on
  // older engines rather than mutating a legacy namespace during copy import.
  if (typeof indexedDB.databases !== 'function') return false;
  return (await indexedDB.databases()).some(db => db.name === name);
}

async function readLegacyDatabase(name) {
  try {
    if (!(await databaseExists(name))) return [];
    const db = await openNamed(name);
    if (!db.objectStoreNames.contains('customers')) { db.close(); return []; }
    const rows = await requestValue(db.transaction('customers', 'readonly').objectStore('customers').getAll());
    db.close();
    return rows || [];
  } catch { return []; }
}

async function importCandidate(candidate, source = 'legacy') {
  const migrated = migrateRecord(candidate);
  if (!hasMeaningfulIdentity(migrated.appointment_state) || migrated.deleted) return false;
  if (migrated.cloud_id && await findByCloudId(migrated.cloud_id)) return false;
  if (!migrated.local_id) migrated.local_id = legacyImportIdentity(candidate, source);
  if (migrated.local_id && await getCustomer(migrated.local_id)) return false;
  await saveCustomer(migrated, { keepRevision: Boolean(migrated.local_revision), keepSyncState: true, updatedAt: migrated.updated_at || now() });
  return true;
}

export async function importLegacyCustomers() {
  const previous = await getMeta(MIGRATION_KEY);
  let imported = 0;
  for (const databaseName of LEGACY_DATABASES) {
    for (const row of await readLegacyDatabase(databaseName)) if (await importCandidate(row, `indexeddb:${databaseName}`)) imported += 1;
  }
  try {
    const working = JSON.parse(localStorage.getItem('apptCompanionWorkingRecordV1') || 'null');
    if (working && await importCandidate(working, 'localStorage:working')) imported += 1;
    const saves = JSON.parse(localStorage.getItem('apptCompanionSaves_v2') || '[]');
    for (const save of Array.isArray(saves) ? saves : []) {
      if (save?.data && await importCandidate({
        local_id: String(save.id || '').startsWith('cloud:') ? '' : save.id,
        cloud_id: String(save.id || '').startsWith('cloud:') ? String(save.id).slice(6) : '',
        customer_name: save.label || '', data: save.data, savedAt: save.savedAt
      }, 'localStorage:saves')) imported += 1;
    }
  } catch { /* Bad legacy localStorage must not block V3. */ }
  const result = {
    completed_at: previous?.completed_at || now(),
    last_scan_at: now(),
    imported,
    total_imported: Number(previous?.total_imported ?? previous?.imported ?? 0) + imported,
    source_databases: LEGACY_DATABASES
  };
  await setMeta(MIGRATION_KEY, result);
  return result;
}

export const customerStore = {
  open: openStore, get: getCustomer, findCloud: findByCloudId, put: saveCustomer,
  list: listCustomers, remove: removeCustomer, meta: getMeta, setMeta,
  migrate: importLegacyCustomers, makeId: () => makeId(), database: { name: DB_NAME, version: DB_VERSION }
};
