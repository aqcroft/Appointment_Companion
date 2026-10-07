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


{
  const donor = fs.readFileSync(path.resolve(root, '..', 'cloud', 'companion_cloud_pilot.html'), 'utf8');
  assert.match(donor, /async function ensurePartnerProfileFromCloud\(\)/);
  assert.match(donor, /await bridge\.hydrate\(\)/);
  assert.match(donor, /api\.getPartnerProfile\(auth\)/);
  assert.match(donor, /if \(!await requirePartnerSetup\(\)\) return;/);
  assert.match(donor, /Loading your Cloud Partner profile/);
}


{
  const donor = fs.readFileSync(path.resolve(root, '..', 'cloud', 'companion_cloud_pilot.html'), 'utf8');
  assert.match(donor, /data-boiler-mode="existing"/);
  assert.match(donor, /data-boiler-mode="new"/);
  assert.match(donor, /Boiler Cover — existing cover or new service\?/);
  assert.match(donor, /cashback: !!state\.includeCashback/);
}

{
  const shell = fs.readFileSync(path.resolve(root, '..', '..', 'local-first', 'shell-pilot-v1.js'), 'utf8');
  assert.match(shell, /id="cloudQuickProfiles"/);
  assert.match(shell, /data-local-profile-id/);
  assert.match(shell, /cloud-current-sep/);
  assert.match(shell, /icon\('💳', sum\.cashback !== false/);
}

{
  const controller = fs.readFileSync(path.join(root, 'consolidated-controller-v1.js'), 'utf8');
  assert.match(controller, /Save progress & switch/);
  assert.match(controller, /switchTo: switchToLocalId/);
  assert.match(controller, /mini\('💳', cashback, 'Cashback Card'\)/);
  assert.match(controller, /id="localFirstCustomerSearch"/);
  assert.match(controller, /id="localFirstCustomerSort"/);
  assert.match(controller, /value="recent">Most recent/);
  assert.match(controller, /value="name-asc">Name A-Z/);
  assert.match(controller, /No customers match that search/);
  assert.doesNotMatch(controller, /var syncIcon = conflict \? '⚠️' : isSynced\(row\) \? '☁️' : '💾';/);
}

{
  const spring = fs.readFileSync(path.join(root, 'spring-clean-v2.js'), 'utf8');
  assert.match(spring, /status-icons\/cloud-/);
  assert.match(spring, /status-icons\/' \+ file/);
  assert.match(spring, /Current profile synced/);
  assert.match(spring, /Latest changes saved locally/);
  assert.match(spring, /saved profile/);
}

{
  const serviceUi = fs.readFileSync(path.join(root, 'service-ui-polish-v1.js'), 'utf8');
  assert.match(serviceUi, /min-height:62px/);
  assert.match(serviceUi, /#energyCard input:not/);
  assert.match(serviceUi, /card\.scrollIntoView/);
}

console.log('consolidated-v1 contract tests passed');
