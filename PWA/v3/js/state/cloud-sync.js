import { cloudClient } from './cloud-client.js';
import { customerStore } from './customer-store.js';
import { clone } from './canonical-state.js';
import { migrateAppointment, toLegacyCompatibleAppointment } from './migrations.js';
import { reconcileSnapshots, remoteVersion } from './reconciliation.js';

export const AUTH_KEY = 'apptCompanionV301CloudAuthSession';

export function getCloudAuth() {
  try {
    const auth = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
    return auth?.partner_id && auth?.workspace_key ? auth : null;
  } catch { return null; }
}

export function setCloudAuth(auth) {
  if (!auth?.partner_id || !auth?.workspace_key) sessionStorage.removeItem(AUTH_KEY);
  else sessionStorage.setItem(AUTH_KEY, JSON.stringify({ partner_id: String(auth.partner_id).trim(), workspace_key: String(auth.workspace_key) }));
}

function remoteAppointment(remote) {
  const value = remote?.appointment_state || remote?.appointment_state_json || remote?.appointment_snapshot;
  return value ? migrateAppointment(value) : null;
}

function comparableRemote(remote) {
  const appointment_state = remoteAppointment(remote);
  const specialist_state = clone(remote?.specialist_state || {});
  if (remote?.ev_state || remote?.ev_state_json) specialist_state.ev = remote.ev_state || remote.ev_state_json;
  return { appointment_state, specialist_state };
}

function comparableLocal(row) {
  return { appointment_state: row.appointment_state, specialist_state: row.specialist_state || {} };
}

function cloudPayload(row) {
  const appointment = row.appointment_state;
  const energy = appointment.energy;
  return {
    ...(row.cloud_customer || {}),
    customer_id: row.cloud_id || '',
    customer_name: appointment.person.name,
    appointment_state_json: toLegacyCompatibleAppointment(appointment),
    basket_url: appointment.summary.basketUrl || '',
    private_notes: appointment.summary.privateNotes || '',
    electricity_usage_kwh: energy.annualElectricityKwh || null,
    electricity_usage_mode: energy.annualElectricityKwh ? 'known' : '',
    electricity_usage_source: energy.electricityUsageSource || energy.usageSource || '',
    electricity_usage_day_kwh: energy.dayKwh || null,
    electricity_usage_night_kwh: energy.nightKwh || null,
    gas_usage_kwh: energy.annualGasKwh || null,
    gas_usage_source: energy.gasUsageSource || energy.usageSource || '',
    energy_has_electricity: energy.fuel !== 'gas',
    energy_has_gas: energy.fuel !== 'electricity',
    ev_state_json: row.specialist_state?.ev || row.cloud_customer?.ev_state_json || null,
    client_revision_id: row.client_revision_id || '',
    local_sync_revision: row.local_revision,
    base_cloud_revision: row.base_cloud_revision || ''
  };
}

function baseComparable(row) {
  if (!row.base_cloud_snapshot) return {};
  return comparableRemote(row.base_cloud_snapshot);
}

async function recordConflict(row, remote, result) {
  return customerStore.put({
    ...row,
    conflict: { local: comparableLocal(row), cloud: clone(remote), base: clone(row.base_cloud_snapshot), paths: result.conflicts, detected_at: new Date().toISOString() },
    sync_state: 'conflict'
  }, { keepRevision: true, keepSyncState: true });
}

async function adoptRemote(row, remote, mergedComparable = comparableRemote(remote)) {
  const appointment = mergedComparable.appointment_state || row.appointment_state;
  return customerStore.put({
    ...row,
    customer_name: appointment.person.name || remote.customer_name || row.customer_name,
    appointment_state: appointment,
    specialist_state: mergedComparable.specialist_state || {},
    basket_url: appointment.summary.basketUrl || remote.basket_url || '',
    cloud_customer: remote,
    base_cloud_revision: remoteVersion(remote),
    base_cloud_snapshot: remote,
    cloud_synced_local_revision: row.local_revision,
    sync_state: 'synced', conflict: null
  }, { keepRevision: true, keepSyncState: true });
}

export async function syncOne(row, auth = getCloudAuth()) {
  if (!auth) return row;
  if (row.deleted) {
    if (row.cloud_id) await cloudClient.deleteCustomer(auth, row.cloud_id);
    await customerStore.remove(row.local_id);
    return null;
  }
  if (!row.customer_name) return row;

  if (row.cloud_id) {
    let remote;
    try { remote = (await cloudClient.getCustomer(auth, row.cloud_id)).customer; }
    catch (error) {
      if (/not found|missing customer/i.test(String(error?.message || error))) {
        return recordConflict(row, { deleted: true, customer_id: row.cloud_id }, { conflicts: [{ path: '$delete', local: 'present', remote: 'deleted' }] });
      }
      throw error;
    }
    const localChanged = Number(row.local_revision) !== Number(row.cloud_synced_local_revision);
    const remoteChanged = Boolean(row.base_cloud_revision && remoteVersion(remote) && remoteVersion(remote) !== row.base_cloud_revision);
    if (!row.base_cloud_revision && localChanged) {
      const result = reconcileSnapshots({ base: {}, local: comparableLocal(row), remote: comparableRemote(remote) });
      if (result.status === 'conflict') return recordConflict(row, remote, result);
      row = await customerStore.put({ ...row, ...result.merged, base_cloud_revision: remoteVersion(remote), base_cloud_snapshot: remote, cloud_customer: remote, sync_state: 'pending' }, { keepRevision: true, keepSyncState: true });
    } else if (remoteChanged && localChanged) {
      const result = reconcileSnapshots({ base: baseComparable(row), local: comparableLocal(row), remote: comparableRemote(remote) });
      if (result.status === 'conflict') return recordConflict(row, remote, result);
      row = await customerStore.put({ ...row, ...result.merged, base_cloud_revision: remoteVersion(remote), base_cloud_snapshot: remote, cloud_customer: remote, sync_state: 'pending' }, { keepRevision: true, keepSyncState: true });
    } else if (remoteChanged && !localChanged) return adoptRemote(row, remote);
  }

  const saved = (await cloudClient.saveCustomer(auth, cloudPayload(row))).customer;
  if (!saved) throw new Error('Cloud did not acknowledge the saved person.');
  return customerStore.put({
    ...row, cloud_id: saved.customer_id, cloud_customer: saved,
    base_cloud_revision: remoteVersion(saved) || `ack:${row.client_revision_id || row.local_revision}`,
    base_cloud_snapshot: saved, cloud_synced_local_revision: row.local_revision,
    sync_state: 'synced', tombstone: false, conflict: null
  }, { keepRevision: true, keepSyncState: true });
}

export async function hydrateFromCloud(auth = getCloudAuth()) {
  if (!auth) return [];
  const listing = await cloudClient.listCustomers(auth);
  const metadata = Array.isArray(listing.customers) ? listing.customers : [];
  const cloudIds = new Set(metadata.map(row => String(row.customer_id || '')).filter(Boolean));
  for (const meta of metadata) {
    const local = await customerStore.findCloud(meta.customer_id);
    if (local?.deleted) continue;
    if (!local || (remoteVersion(meta) && remoteVersion(meta) !== local.base_cloud_revision)) {
      const remote = (await cloudClient.getCustomer(auth, meta.customer_id)).customer;
      if (!remote) continue;
      if (!local) {
        const comparable = comparableRemote(remote);
        if (!comparable.appointment_state?.person?.name) continue;
        await customerStore.put({
          cloud_id: remote.customer_id, customer_name: remote.customer_name || comparable.appointment_state.person.name,
          ...comparable, basket_url: remote.basket_url || comparable.appointment_state.summary.basketUrl,
          cloud_customer: remote, base_cloud_revision: remoteVersion(remote), base_cloud_snapshot: remote,
          local_revision: 0, cloud_synced_local_revision: 0, sync_state: 'synced'
        }, { keepRevision: true, keepSyncState: true });
      } else if (Number(local.local_revision) === Number(local.cloud_synced_local_revision)) await adoptRemote(local, remote);
      else {
        const result = reconcileSnapshots({ base: baseComparable(local), local: comparableLocal(local), remote: comparableRemote(remote) });
        if (result.status === 'conflict') await recordConflict(local, remote, result);
        else await customerStore.put({ ...local, ...result.merged, cloud_customer: remote, base_cloud_revision: remoteVersion(remote), base_cloud_snapshot: remote, sync_state: 'pending' }, { keepRevision: true, keepSyncState: true });
      }
    }
  }
  const locals = await customerStore.list({ includeDeleted: true });
  for (const row of locals) {
    if (row.cloud_id && !cloudIds.has(row.cloud_id) && row.sync_state === 'synced') await customerStore.remove(row.local_id);
  }
  return customerStore.list({ includeDeleted: true });
}

export async function syncAll(auth = getCloudAuth()) {
  if (!auth || !navigator.onLine) return { status: 'offline' };
  const rows = await customerStore.list({ includeDeleted: true });
  for (const row of rows) if (['pending', 'pending_delete'].includes(row.sync_state)) await syncOne(row, auth);
  await hydrateFromCloud(auth);
  return { status: 'synced' };
}

export async function markDeleted(localId, { syncImmediately = true } = {}) {
  const row = await customerStore.get(localId);
  if (!row) return null;
  const tombstone = await customerStore.put({
    ...row, deleted: true, tombstone: true,
    deletion_requested_at: new Date().toISOString(), sync_state: 'pending_delete'
  });
  if (syncImmediately && navigator.onLine && getCloudAuth()) {
    try { await syncOne(tombstone); return null; } catch { return tombstone; }
  }
  return tombstone;
}

export async function resolveConflict(localId, choice) {
  const row = await customerStore.get(localId);
  if (!row?.conflict) return row;
  const history = [...(row.conflict_history || []), { resolved_at: new Date().toISOString(), choice, conflict: clone(row.conflict) }].slice(-5);
  if (choice === 'cloud') {
    if (row.conflict.cloud?.deleted) { await customerStore.remove(localId); return null; }
    const comparable = comparableRemote(row.conflict.cloud);
    return customerStore.put({ ...row, ...comparable, cloud_customer: row.conflict.cloud, base_cloud_revision: remoteVersion(row.conflict.cloud), base_cloud_snapshot: row.conflict.cloud, sync_state: 'synced', conflict: null, conflict_history: history, cloud_synced_local_revision: row.local_revision }, { keepRevision: true, keepSyncState: true });
  }
  return customerStore.put({ ...row, base_cloud_revision: remoteVersion(row.conflict.cloud), base_cloud_snapshot: row.conflict.cloud, sync_state: 'pending', conflict: null, conflict_history: history }, { keepRevision: true, keepSyncState: true });
}
