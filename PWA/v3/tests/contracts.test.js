import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrateAppointment, toLegacyCompatibleAppointment } from '../js/state/migrations.js';
import { reconcileSnapshots } from '../js/state/reconciliation.js';
import { buildShareData } from '../js/summary/share-data.js';
import { createAppointment } from '../js/state/canonical-state.js';
import { calculateAnnualDayNightSplit } from '../js/energy/split-helper.js';

test('legacy SIM IDs migrate and historic Income Protector is discarded', () => {
  const migrated = migrateAppointment({
    customerName: 'Legacy Person',
    inputs: { incomeProtectorToggle: true },
    state: {
      services: { energy: true, mobile: true, incomeProtector: true },
      simCount: 2,
      sims: { sim1: { uwPlan: 'essentialMax', monthlyCost: 8 }, sim2: { uwPlan: 'unlimitedMax', monthlyCost: 20 } }
    }
  });
  assert.equal(migrated.mobile.sims[0].planId, 'essentialMax');
  assert.equal(migrated.mobile.sims[1].planId, 'unlimitedMax');
  assert.equal(migrated.services.incomeProtector, undefined);
});

test('schema-v3 historic Income Protector flags are also stripped', () => {
  const migrated = migrateAppointment({ schemaVersion: 3, person: { name: 'Historic' }, services: { energy: true, incomeProtector: true } });
  assert.deepEqual(Object.keys(migrated.services).sort(), ['boilerCover', 'broadband', 'energy', 'mobile']);
});

test('Cloud compatibility envelope remains readable by schema-v1 and V3 adapters', () => {
  const appointment = createAppointment('Coexistence Test');
  appointment.services.energy = true;
  appointment.services.mobile = true;
  appointment.energy.region = '12';
  appointment.energy.annualElectricityKwh = 3456;
  appointment.energy.currentCostMode = 'split';
  appointment.energy.currentElectricityMonthly = 70;
  appointment.mobile.simCount = 2;
  appointment.mobile.sims = [
    { name: 'One', include: true, planId: 'essentialMax', currentMonthly: 9, exitFee: 0 },
    { name: 'Two', include: true, planId: 'unlimitedMax', currentMonthly: 20, exitFee: 10 }
  ];
  const envelope = toLegacyCompatibleAppointment(appointment);
  assert.equal(envelope.schema_version, 1);
  assert.equal(envelope.canonical.customerName, 'Coexistence Test');
  assert.equal(envelope.canonical.energy.electricityUsageTotalKwh, 3456);
  const roundTrip = migrateAppointment(envelope);
  assert.equal(roundTrip.energy.region, '12');
  assert.equal(roundTrip.energy.currentCostMode, 'split');
  assert.equal(roundTrip.mobile.sims[1].planId, 'unlimitedMax');
  assert.equal(roundTrip.mobile.sims[1].exitFee, 10);

  envelope.canonical.customerName = 'Edited in old PWA';
  envelope.canonical.energy.region = '14';
  envelope.canonical.energy.electricityUsageTotalKwh = 4100;
  const afterLegacyEdit = migrateAppointment(envelope);
  assert.equal(afterLegacyEdit.person.name, 'Edited in old PWA');
  assert.equal(afterLegacyEdit.energy.region, '14');
  assert.equal(afterLegacyEdit.energy.annualElectricityKwh, 4100);
  assert.equal(afterLegacyEdit.mobile.sims[1].exitFee, 10);
});

test('one-sided populated changes merge without a false conflict', () => {
  const result = reconcileSnapshots({
    base: { person: { name: 'Sam' }, energy: { region: '11', usage: 0 } },
    local: { person: { name: 'Sam' }, energy: { region: '12', usage: 0 } },
    remote: { person: { name: 'Sam' }, energy: { region: '11', usage: 2500 } }
  });
  assert.equal(result.status, 'merged');
  assert.equal(result.merged.energy.region, '12');
  assert.equal(result.merged.energy.usage, 2500);
});

test('different meaningful changes to the same field surface a conflict', () => {
  const result = reconcileSnapshots({ base: { region: '11' }, local: { region: '12' }, remote: { region: '13' } });
  assert.equal(result.status, 'conflict');
  assert.equal(result.conflicts[0].path, 'region');
});

test('share allowlist excludes private notes and Cloud metadata', () => {
  const appointment = createAppointment('Taylor');
  appointment.summary.privateNotes = 'Do not share this';
  appointment.summary.basketUrl = 'https://example.com/basket';
  const data = buildShareData(appointment, { name: 'Partner' });
  const encoded = JSON.stringify(data);
  assert.ok(!encoded.includes('Do not share this'));
  assert.ok(!encoded.includes('workspace_key'));
  assert.equal(data.basketUrl, 'https://example.com/basket');
});

test('Economy 7 split helper applies a sample ratio to annual use', () => {
  const result = calculateAnnualDayNightSplit(4000, 600, 400);
  assert.equal(result.annualDayKwh, 2400);
  assert.equal(result.annualNightKwh, 1600);
  assert.equal(result.dayPercent, 60);
});

test('V3 shell and service worker do not reference Appointment Companion donors', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const files = ['index.html', 'sw.js', 'js/app.js'];
  const content = files.map(file => fs.readFileSync(`${root}/${file}`, 'utf8')).join('\n');
  for (const forbidden of ['consolidated-v1', 'companion_cloud_pilot', 'v5-companion.html', 'v6.html', 'release-v2']) {
    assert.ok(!content.includes(forbidden), `unexpected donor reference: ${forbidden}`);
  }
});
