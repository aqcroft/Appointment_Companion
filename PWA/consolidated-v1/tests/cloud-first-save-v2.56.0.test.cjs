'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dir = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(dir, 'consolidated-controller-v2.56.0.js'), 'utf8');
const shell = fs.readFileSync(path.resolve(dir, '..', '..', 'local-first', 'shell-pilot-v1.js'), 'utf8');
const page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
assert.match(page, /consolidated-controller-v2\.56\.0\.js/);
assert.match(shell, /data-cloud-action="save"[^>]*>[^\n]*Save to Cloud/);
assert.match(source, /if \(!rows\[i\]\.deleted && !rows\[i\]\.cloud_id && !rows\[i\]\.cloud_creation_approved\) continue/);

function copy(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }

async function check() {
  let name = '';
  let localId = 0;
  let cloudSaves = 0;
  const local = new Map();
  const remote = new Map();
  const intervals = [];
  const clicked = [];
  const disk = new Map();
  function storage(prefix) {
    return {
      getItem(key) { return disk.get(prefix + key) || null; },
      setItem(key, value) { disk.set(prefix + key, value); },
      removeItem(key) { disk.delete(prefix + key); }
    };
  }
  const localStorage = storage('local:'), sessionStorage = storage('session:');
  localStorage.setItem('apptCloudPilotAuthDeviceV1', JSON.stringify({ partner_id: 'TEST', workspace_key: 'fake-test-key' }));
  const snapshot = () => ({ canonical: {
    customerName: name, privateNotes: '', basketUrl: '', selectedServices: {},
    energy: { electricityUsageTotalKwh: 3000, electricityUsageSource: 'manual',
      electricityUsageDayKwh: null, electricityUsageNightKwh: null,
      gasUsageKwh: 12000, gasUsageSource: 'manual', energyFuelSelection: 'both' }
  }, ui_state: {} });
  const store = {
    migrate: async () => {}, makeId: () => 'local_' + ++localId,
    get: async id => copy(local.get(id)), findCloud: async id => copy([...local.values()].find(x => x.cloud_id === id)),
    list: async (includeDeleted) => copy([...local.values()].filter(x => includeDeleted || !x.deleted)),
    remove: async id => { local.delete(id); },
    put: async (input, opts = {}) => {
      const old = local.get(input.local_id);
      const row = Object.assign({}, old || {}, input);
      if (!opts.keepRevision) { row.local_revision = (old && old.local_revision || 0) + 1; row.sync_state = row.deleted ? 'pending_delete' : 'pending'; }
      row.cloud_id = row.cloud_id || '';
      local.set(row.local_id, copy(row));
      return copy(row);
    }
  };
  const api = {
    listCustomers: async () => ({ customers: copy([...remote.values()]) }),
    getCustomer: async (_, id) => ({ customer: copy(remote.get(id)) }),
    saveCustomer: async (_, data) => {
      cloudSaves += 1;
      const id = data.customer_id || 'customer_' + cloudSaves;
      const row = Object.assign({}, data, { customer_id: id, updated_at: '2026-10-10T23:00:' + String(cloudSaves).padStart(2, '0') + 'Z' });
      remote.set(id, copy(row));
      return { customer: copy(row) };
    },
    deleteCustomer: async () => { throw new Error('No deletion should occur'); }
  };
  const el = { cloudPilotCard: {}, cloudPilotStatus: { textContent: '', style: {} }, customerName: { focus() {} } };
  for (const key of ['cloudLocalState', 'cloudConnectionState']) el[key] = { innerHTML: '', title: '', classList: { toggle() {} } };
  const document = {
    documentElement: { classList: { contains: () => false } },
    getElementById: key => el[key] || null,
    addEventListener: (type, callback) => { if (type === 'click') clicked.push(callback); }
  };
  const sandbox = {
    console, document, navigator: { onLine: true }, localStorage, sessionStorage,
    AppointmentCompanionLocalStore: store,
    AppointmentCompanionCanonical: { capture: snapshot, normaliseAppointment: value => value, restore() {}, toLegacySnapshot: value => value },
    AppointmentCompanionCanonicalControls: { reset() {} },
    AppointmentCompanionCloud: api, resetForm: () => { name = ''; },
    CustomEvent: class CustomEvent {}, dispatchEvent() {}, addEventListener() {},
    setInterval: fn => { intervals.push(fn); return intervals.length; }, clearInterval() {},
    setTimeout: () => 1, clearTimeout() {}, confirm: () => true
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'consolidated-controller-v2.56.0.js' });
  assert.ok(intervals.length, 'controller should schedule boot');
  intervals[0]();
  for (let i = 0; i < 20; i++) await Promise.resolve();
  const controller = sandbox.AppointmentCompanionConsolidated;
  assert.ok(controller, 'controller initialised');

  name = 'T';
  await controller.persist(false); await controller.sync();
  name = 'A complete name';
  await controller.persist(false); await controller.sync();
  assert.equal(cloudSaves, 0, 'typing and local drafts must not create Cloud customers');
  assert.equal(controller.currentRecord().cloud_creation_approved, false);

  await controller.persist(true, true); await controller.sync();
  assert.equal(cloudSaves, 1, 'first explicit Save creates a single Cloud record');
  const firstId = controller.currentRecord().cloud_id;
  assert.ok(firstId);

  name = 'Updated existing Cloud customer';
  await controller.persist(false); await controller.sync();
  assert.equal(cloudSaves, 2, 'subsequent edits still sync');
  assert.equal(remote.size, 1, 'existing updates must not create duplicate rows');
  assert.equal(controller.currentRecord().cloud_id, firstId);
}

check().then(() => console.log('v2.56.0 first Cloud save test passed')).catch(err => { console.error(err); process.exitCode = 1; });
