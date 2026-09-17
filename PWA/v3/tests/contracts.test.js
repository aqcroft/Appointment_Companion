import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrateAppointment, toLegacyCompatibleAppointment } from '../js/state/migrations.js';
import { reconcileSnapshots } from '../js/state/reconciliation.js';
import { buildShareData, figuresText } from '../js/summary/share-data.js';
import { safeHttps } from '../js/summary/share-policy.js';
import { createSummaryActivity, summaryHistory } from '../js/summary/history.js';
import { createAppointment } from '../js/state/canonical-state.js';
import { calculateAnnualDayNightSplit } from '../js/energy/split-helper.js';
import { normaliseAppointment } from '../js/state/canonical-state.js';
import { legacyImportIdentity } from '../js/state/customer-store.js';
import { toolUrl } from '../js/specialists/launcher.js';

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
  assert.equal(typeof data.effectiveUwMonthly, 'number');
  assert.equal(data.mealDealPreview.type, 'meal_deal_sim');
});

test('Copy figures uses the displayed effective UW monthly position', () => {
  const appointment = createAppointment('Copy');
  appointment.services.energy = true;
  appointment.energy.currentMonthly = 100;
  appointment.energy.uwMonthly = 90;
  const data = buildShareData(appointment);
  const text = figuresText(data);
  assert.match(text, new RegExp(`£${data.effectiveUwMonthly.toFixed(2)} effective UW`));
  assert.match(text, new RegExp(`Raw UW service cost: £${data.uw.total.toFixed(2)}`));
});

test('Partner and customer basket links accept HTTPS only', () => {
  assert.equal(safeHttps('https://example.com/basket'), 'https://example.com/basket');
  assert.equal(safeHttps('http://example.com/basket'), '');
  assert.equal(safeHttps('javascript:alert(1)'), '');
  assert.equal(safeHttps('not a url'), '');
  assert.equal(safeHttps(''), '');
});

test('turning peak/off-peak off keeps standard mode while retaining historic values', () => {
  const input = createAppointment('Peak toggle');
  input.energy.peakOffPeak = false;
  input.energy.electricityProfile = 'economy7';
  input.energy.dayKwh = 2000;
  input.energy.nightKwh = 1000;
  const result = normaliseAppointment(input);
  assert.equal(result.energy.peakOffPeak, false);
  assert.equal(result.energy.electricityProfile, 'standard');
  assert.equal(result.energy.dayKwh, 2000);
  assert.equal(result.energy.nightKwh, 1000);
});

test('Should I Fix receives one-way Energy context without a return-data contract', () => {
  const appointment = createAppointment('Fix Story');
  appointment.energy.fuel = 'dual';
  appointment.energy.region = '12';
  appointment.energy.annualElectricityKwh = 2500;
  appointment.energy.annualGasKwh = 11500;
  const url = new URL(toolUrl('fix', appointment, 'https://companion.test/PWA/v3/'));
  assert.equal(url.searchParams.get('n'), 'Fix Story');
  assert.equal(url.searchParams.get('f'), 'dual');
  assert.equal(url.searchParams.get('e'), '2500');
  assert.equal(url.searchParams.get('g'), '11500');
  assert.equal(url.searchParams.get('r'), '12');
  assert.equal(url.searchParams.has('ac_return'), false);
  assert.equal(url.searchParams.has('ac_context'), false);
});

test('EV launch carries exploratory context and returns separately from canonical Energy fields', () => {
  const appointment = createAppointment('EV Story');
  appointment._localId = 'local_ev_contract';
  appointment.energy.annualElectricityKwh = 3200;
  const url = new URL(toolUrl('ev', appointment, 'https://companion.test/PWA/v3/'));
  assert.equal(url.pathname, '/PWA/v3/tools/ev/index.html');
  assert.equal(url.searchParams.get('ac_return'), 'https://companion.test/PWA/v3/');
  assert.ok(url.searchParams.get('ac_context'));

  const appSource = fs.readFileSync(fileURLToPath(new URL('../js/app.js', import.meta.url)), 'utf8');
  const consumer = appSource.slice(appSource.indexOf('async function consumeSpecialistReturn'), appSource.indexOf('async function leavePerson'));
  assert.match(consumer, /record\.specialist_state/);
  assert.doesNotMatch(consumer, /appointment_state\.energy\s*=/);
});

test('legacy import identities are stable for the same profile and discover later profiles distinctly', () => {
  const first = { customer_name: 'First Legacy', savedAt: '2026-09-01T00:00:00Z' };
  const later = { customer_name: 'Later Legacy', savedAt: '2026-09-16T00:00:00Z' };
  assert.equal(legacyImportIdentity(first, 'indexeddb:legacy'), legacyImportIdentity(first, 'indexeddb:legacy'));
  assert.notEqual(legacyImportIdentity(first, 'indexeddb:legacy'), legacyImportIdentity(later, 'indexeddb:legacy'));
});

test('summary history keeps a reopenable compact figure snapshot', () => {
  const appointment = createAppointment('Taylor');
  appointment.services.energy = true;
  appointment.energy.currentMonthly = 100;
  appointment.energy.uwMonthly = 80;
  appointment.activity.push({ type: 'tool_used', tool: 'ev', at: new Date().toISOString() });
  const entry = createSummaryActivity(appointment);
  appointment.activity.push(entry);
  const history = summaryHistory(appointment.activity);
  assert.equal(history.length, 1);
  assert.equal(history[0].headlineResult, entry.snapshot.yearOneResult);
  assert.deepEqual(history[0].services, ['energy']);
  assert.equal(history[0].toolsUsed[0].label, 'EV Companion');
  assert.equal(history[0].snapshot.personName, 'Taylor');
});

test('legacy empty actual usage falls back to UW without inventing a bill source', () => {
  const appointment = migrateAppointment({
    schemaVersion: 3,
    person: { name: 'Empty usage' },
    energy: { usageSource: 'actual', annualElectricityKwh: 0, annualGasKwh: 0 }
  });
  assert.equal(appointment.energy.electricityUsageSource, 'uw');
  assert.equal(appointment.energy.gasUsageSource, 'uw');
  assert.equal(appointment.energy.electricityBillKwh, 0);
  assert.equal(appointment.energy.gasBillKwh, 0);
});

test('bill usage can be hidden without deleting its retained source value', () => {
  const input = createAppointment('Retained bill');
  input.energy.electricityUwKwh = 2500;
  input.energy.electricityBillKwh = 2800;
  input.energy.electricityUsageSource = 'uw';
  input.energy.billUsageAvailable = false;
  const appointment = migrateAppointment(input);
  assert.equal(appointment.energy.billUsageAvailable, false);
  assert.equal(appointment.energy.electricityBillKwh, 2800);
  assert.equal(appointment.energy.annualElectricityKwh, 2500);
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
