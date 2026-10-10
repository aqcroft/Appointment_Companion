'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const regionCode = read('customer-region-v2.56.3.js');
const controller = read('consolidated-controller-v2.56.3.js');
const launcher = read('specialist-launcher-v2.55.25.js');
const fixPage = read('should-i-fix/index.html');
const evBridge = read('ev-bridge-v2.56.2.js');
assert.match(regionCode, /DEFAULT_NEW_REGION = '11'/);
assert.match(controller, /freshRegion\.value = '11'/);
assert.match(launcher, /region: c\.region/);
assert.match(fixPage, /u\.searchParams\.set\("r",String\(region\)\)/);
assert.match(evBridge, /customer\.region != null \? customer\.region/);

const mainUrl = 'http://127.0.0.1:8765/PWA/consolidated-v1/?local=1';
const timeout = 26000;
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', err => errors.push(String(err.message || err)));
  await page.route('https://**/*', route => route.abort());

  try {
    await page.goto(mainUrl, { waitUntil: 'domcontentloaded', timeout });
    await page.locator('#customerRegion').waitFor({ state: 'attached', timeout });
    await page.waitForFunction(() => !!window.AppointmentCompanionConsolidated?.currentRecord(), null, { timeout });
    assert.equal(await page.locator('#customerRegion').inputValue(), '11', 'first customer should display East Midlands');
    assert.equal(await page.evaluate(() => window.AppointmentCompanionConsolidated.currentRecord().appointment_state.canonical.region), 11,
      'first local customer snapshot should contain East Midlands');
    console.log('PASS: First blank customer defaults to East Midlands in both UI and local store');

    await page.locator('#customerName').fill('Region Regression');
    await page.locator('.ac-region-chip').click();
    await page.locator('#customerRegion').selectOption('14');
    await page.waitForFunction(() => window.AppointmentCompanionConsolidated?.currentRecord()?.appointment_state?.canonical?.region === 14, null, { timeout });
    const originalId = await page.evaluate(() => window.AppointmentCompanionConsolidated.currentId());
    console.log('PASS: Deliberately selecting a different region saves 14 against the customer');

    await page.evaluate(() => document.querySelector('[data-cloud-action="new-customer"]').click());
    await page.locator('#acProfileSwitchGuard.open').waitFor({ timeout: 9000 });
    await page.locator('[data-switch-choice="save"]').click();
    await page.waitForFunction(id => window.AppointmentCompanionConsolidated?.currentId() !== id, originalId, { timeout });
    assert.equal(await page.locator('#customerRegion').inputValue(), '11', 'new customer should reset to East Midlands, not prior customer region');
    assert.equal(await page.evaluate(() => window.AppointmentCompanionConsolidated.currentRecord().appointment_state.canonical.region), 11,
      'new local snapshot should contain East Midlands');
    const freshId = await page.evaluate(() => window.AppointmentCompanionConsolidated.currentId());
    console.log('PASS: New customer resets region to 11 without copying previous customer');
    // Blank drafts are intentionally transient; name the draft so it becomes a stored profile.
    await page.locator('#customerName').fill('East Midlands Test');
    await page.waitForFunction(async id => (await window.AppointmentCompanionLocalStore.get(id))?.customer_name === 'East Midlands Test', freshId, { timeout });

    await page.evaluate(async id => {
      const row = await window.AppointmentCompanionLocalStore.get(id);
      await window.AppointmentCompanionConsolidated.load(row);
    }, originalId);
    await page.waitForFunction(() => document.getElementById('customerRegion')?.value === '14', null, { timeout });
    assert.equal(await page.locator('#customerRegion').inputValue(), '14',
      'opening saved customer should restore their explicit region');
    const switchFresh = await page.evaluate(async id => {
      const store = window.AppointmentCompanionLocalStore;
      const row = await store.get(id);
      const before = (await store.list(true)).map(r => ({ id: r.local_id, name: r.customer_name, region: r.appointment_state?.canonical?.region, deleted: r.deleted }));
      if (row && !row.deleted) await window.AppointmentCompanionConsolidated.load(row);
      return {
        id: window.AppointmentCompanionConsolidated.currentId(),
        region: window.AppointmentCompanionConsolidated.currentRecord()?.appointment_state?.canonical?.region,
        storedRegion: row?.appointment_state?.canonical?.region,
        storedName: row?.customer_name || null,
        storedDeleted: row?.deleted,
        before
      };
    }, freshId);
    console.log('RESTORE FRESH ' + JSON.stringify(switchFresh));
    assert.equal(switchFresh.id, freshId, 'reopened named customer should be the selected customer');
    assert.equal(switchFresh.storedRegion, 11, 'saved named draft must preserve East Midlands');
    await page.waitForFunction(() => document.getElementById('customerRegion')?.value === '11', null, { timeout: 6500 });
    assert.equal(await page.locator('#customerRegion').inputValue(), '11');
    console.log('PASS: Reopening existing customer restores 14, newer customer restores 11');

    await page.waitForFunction(() => window.AppointmentCompanionConsolidated?.currentRecord()?.customer_name === 'East Midlands Test', null, { timeout });
    await page.evaluate(() => document.querySelector('#cloudCompanionEv').click());
    await page.waitForURL(/\/consolidated-v1\/ev\//, { timeout });
    const evRegion = await page.evaluate(() => {
      const e = window.AppointmentCompanionBridge?.receive();
      return e?.extra?.customer?.region;
    });
    assert.equal(evRegion, 11, 'EV hand-off should include region 11');
    await page.locator('#region').waitFor({ state: 'attached', timeout });
    await page.waitForFunction(() => document.getElementById('region')?.value === '11', null, { timeout });
    console.log('PASS: EV receives East Midlands region 11 from the defaulted Main customer');

    await page.goto(mainUrl, { waitUntil: 'domcontentloaded', timeout });
    await page.locator('#cloudCompanionFix').waitFor({ state: 'attached', timeout });
    await page.evaluate(() => document.querySelector('#cloudCompanionFix').click());
    await page.waitForURL(/\/consolidated-v1\/should-i-fix\//, { timeout });
    const fixRegion = await page.evaluate(() => {
      const e = window.AppointmentCompanionBridge?.receive();
      const frame = document.getElementById('fixFrame');
      return { region: e?.extra?.customer?.region, src: frame?.src || '' };
    });
    assert.equal(fixRegion.region, 11, 'Should I Fix hand-off should include region 11');
    assert.equal(new URL(fixRegion.src).searchParams.get('r'), '11', 'Should I Fix iframe must receive r=11');
    console.log('PASS: Should I Fix receives region 11 in both the hand-off and calculator URL');
    assert.equal(errors.length, 0, 'no uncaught browser errors during Main/EV/Fix hand-offs: ' + errors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('REGION DEFAULT REGRESSION FAILED', err.stack || err);
  process.exitCode = 1;
});
