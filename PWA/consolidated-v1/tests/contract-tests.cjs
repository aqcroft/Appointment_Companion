'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function context(overrides) {
  const document = {
    documentElement: { classList: { contains: () => false } },
    getElementById: () => null
  };
  const sandbox = Object.assign({
    console,
    URL,
    Event: class Event {},
    CustomEvent: class CustomEvent {},
    document,
    addEventListener: () => {},
    setTimeout,
    clearTimeout,
    serializeForm: () => ({}),
    restoreForm: () => true
  }, overrides || {});
  sandbox.window = sandbox;
  return vm.createContext(sandbox);
}

function load(file, sandbox) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
}

{
  const sandbox = context();
  load('canonical-state-v1.js', sandbox);
  const api = sandbox.AppointmentCompanionCanonical;
  const migrated = api.migrateSnapshot({
    customerName: 'Legacy customer',
    inputs: {
      energyHasElectricity: true,
      energyHasGas: true,
      electricityUsageKwh: '3250',
      electricityUsageSource: 'estimate',
      gasUsageKwh: '11500',
      gasUsageSource: 'manual'
    },
    state: { homeowner: 'homeowner', services: { energy: true }, simCount: 0 }
  });
  assert.equal(migrated.canonical.energy.electricityUsageTotalKwh, 3250);
  assert.equal(migrated.canonical.energy.gasUsageKwh, 11500);
  assert.equal(migrated.canonical.energy.electricityUsageSource, 'estimated');
  assert.equal(migrated.canonical.energy.gasUsageSource, 'actual');
  assert.equal(migrated.canonical.mobile.simCount, 1);

  const legacy = api.toLegacySnapshot(migrated);
  assert.equal(legacy.inputs.electricityUsageTotalKwh, '3250');
  assert.equal(legacy.inputs.electricityUsageKwh, '3250');
  assert.equal(legacy.inputs.gasUsageKwh, '11500');
}

{
  const sandbox = context();
  load('share-policy-v1.js', sandbox);
  const policy = sandbox.AppointmentCompanionSharePolicy;
  const main = policy.main({
    n: 'Allowed', y: 240, bl: 'https://example.com/basket',
    local_id: 'forbidden', cloud_id: 'forbidden', privateNotes: 'forbidden',
    workspace_key: 'forbidden', extra: { customer_id: 'forbidden' },
    up: { y: 300, local_id: 'forbidden' }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(main)), {
    n: 'Allowed', y: 240, bl: 'https://example.com/basket', up: { y: 300 }
  });

  const ev = policy.ev({
    customer_name: '  Test   Person  ', electricity_usage_kwh: 3250,
    local_id: 'forbidden', privateNotes: 'forbidden',
    ev_state: { annual_mileage: 12000, region: 11, cloud_id: 'forbidden' }
  });
  assert.equal(ev.customer_name, 'Test Person');
  assert.equal(ev.electricityUsageTotalKwh, 3250);
  assert.deepEqual(JSON.parse(JSON.stringify(ev.ev_state)), { annual_mileage: 12000, region: 11 });
  assert.equal('local_id' in ev, false);
  assert.equal('privateNotes' in ev, false);
}

console.log('consolidated-v1 contract tests passed');
