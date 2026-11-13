'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const base = process.env.EV_PREVIEW_URL || 'http://example.test/PWA/consolidated-v1/ev-preview-v2710/';
const appOrigin = new URL(base).origin;
const liveTariffs = process.env.EV_PREVIEW_LIVE_TARIFFS === '1';

async function localOnly(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === appOrigin && url.hostname !== 'example.test') return route.continue();
    if (liveTariffs && ['script.google.com', 'script.googleusercontent.com'].includes(url.hostname)) return route.continue();
    if (url.hostname !== 'example.test') return route.abort();
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) return route.fulfill({ status: 403, body: 'blocked' });
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'missing fixture: ' + url.pathname });
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
    return route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file) });
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    page.setDefaultTimeout(8000);
    page.on('pageerror', error => errors.push(error.message));
    await localOnly(page);
    const response = await page.goto(base + '?local=1', { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.locator('#evwRegion').waitFor({ state: 'visible', timeout: 20000 });
    assert.match(await page.locator('#acEvPreviewRibbon').innerText(), /PREVIEW v2\.71\.1/);
    if (liveTariffs) {
      await page.waitForFunction(() => window.AppointmentCompanionTariffsV242?.state()?.status === 'green', null, { timeout: 30000 });
      await page.waitForFunction(() => Number.isFinite(window.AppointmentCompanionEvFuelComparison?.get('D')?.evAnnual), null, { timeout: 30000 });
    }

    // The car is chosen before the mileage screen reveals its kWh estimate.
    await page.locator('.evw-primary').click();
    await page.locator('.evw-choice').filter({ hasText: 'Diesel' }).click();
    assert.equal(await page.locator('.evw-usage-live').count(), 0, 'Do not show car kWh before a car type is selected');
    const suv = page.locator('.evw-choice').filter({ hasText: 'Family SUV' });
    assert.doesNotMatch(await suv.innerText(), /kWh\/year/);
    await suv.click();
    const mileage = page.locator('#evwOverlay input[type=range]');
    await mileage.fill('10000');
    assert.match(await page.locator('.evw-usage-live').innerText(), /3125\.00 kWh\/year/);
    await page.locator('.evw-primary').click();
    await page.locator('.evw-choice').filter({ hasText: 'Medium' }).click();
    await page.locator('#evwOverlay input[type=range]').fill('15');
    assert.match(await page.locator('#evwOverlay .evw-hint').last().innerText(), /2125\.00 kWh daytime.*375\.00 kWh overnight.*2,500 kWh\/year/);

    if (!liveTariffs) await page.evaluate(() => {
      window.AppointmentCompanionEvFuelComparison = { get: fuel => ({
        currentAnnual: fuel === 'D' ? 1800 : 1600, evAnnual: 1200, savingAnnual: fuel === 'D' ? 600 : 400,
        chargingAnnual: 900, homeDifferenceAnnual: 300
      }) };
      const fixture = { meter: false, miles: 10000, efficiency: 3.2, evHomePct: 15, services: 3,
        ev: { car: 900, home: 300, total: 1200 }, standard: { car: 0, home: 2100, total: 2100 },
        standardUnitRateExVatP: 25, evPeakRateExVatP: 29, evOffPeakRateExVatP: 7.5 };
      window.__AC_EV_TRADEOFF = fixture;
      document.dispatchEvent(new CustomEvent('ac:ev-comparison', { detail: fixture }));
    });
    await page.getByRole('button', { name: 'Show my results' }).click();
    if (!liveTariffs) {
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const fixture = { meter: false, miles: 10000, efficiency: 3.2, evHomePct: 15, services: 3,
          ev: { car: 900, home: 300, total: 1200 }, standard: { car: 0, home: 2100, total: 2100 },
          standardUnitRateExVatP: 25, evPeakRateExVatP: 29, evOffPeakRateExVatP: 7.5 };
        window.__AC_EV_TRADEOFF = fixture;
        document.dispatchEvent(new CustomEvent('ac:ev-comparison', { detail: fixture }));
      });
    }
    await page.locator('.evw-price').first().waitFor({ state: 'visible' });
    assert.equal(await page.locator('.evw-price').count(), 2);
    if (liveTariffs) {
      assert.doesNotMatch(await page.locator('.evw-price').allInnerTexts().then(t => t.join(' ')), /£—/);
      assert.doesNotMatch(await page.locator('.evw-saving').innerText(), /£—/);
    } else assert.match(await page.locator('.evw-saving').innerText(), /£50[\s\S]*£600/);
    assert.match(await page.locator('#evwCarKwh').innerText(), /3,125 kWh\/year/);
    assert.match(await page.locator('#evwHomeKwh').innerText(), /2,500 kWh\/year/);
    assert.match(await page.locator('#evwHouseNight').innerText(), /375 kWh\/year/);
    assert.match(await page.locator('#evwCarNight').innerText(), /3,125 kWh\/year/);
    assert.match(await page.locator('#evwTotalNight').innerText(), /3,500 kWh\/year/);
    assert.match(await page.locator('#evwCombinedKwh').innerText(), /5,625 kWh\/year/);
    assert.match(await page.locator('.evw-note').innerText(), /Assumes 15% household night usage, a three-service UW EV bundle/i);
    assert.match(await page.locator('.evw-note').innerText(), /No gas discount/i);
    await page.locator('details summary').filter({ hasText: 'See how the monthly costs are worked out' }).click();
    assert.ok(await page.locator('.evw-detail').count() >= 5);
    if (liveTariffs) {
      assert.doesNotMatch(await page.locator('.evw-detail').filter({ hasText: 'Net household electricity difference' }).innerText(), /£—/);
      assert.doesNotMatch(await page.locator('.evw-detail').filter({ hasText: 'EV energy cost including household effect' }).innerText(), /£—/);
    } else {
      assert.match(await page.locator('.evw-detail').filter({ hasText: 'Net household electricity difference' }).innerText(), /£25\.00/);
      assert.match(await page.locator('.evw-detail').filter({ hasText: 'EV energy cost including household effect' }).innerText(), /£100\.00/);
    }
    assert.ok(await page.getByText('Estimated annual saving').count());

    // Enquiry requires consent plus a name and at least one contact route.
    await page.getByRole('button', { name: 'Send my EV comparison to Adrian' }).click();
    await page.getByRole('button', { name: 'Open my email to Adrian' }).click();
    assert.equal(page.url().startsWith('mailto:'), false, 'Contact is not launched without consent and contact details');
    assert.equal(await page.locator('#evwContactConsent').isChecked(), false);
    await page.locator('.evw-book').waitFor({ state: 'visible' });
    assert.equal(new URL(await page.locator('.evw-book').getAttribute('href')).hostname, 'tidycal.com');
    assert.deepEqual(errors, []);

    // Safe test customer path uses a synthetic Companion launch and an isolated DB.
    const demo = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    demo.setDefaultTimeout(8000);
    demo.on('pageerror', error => errors.push(error.message));
    await localOnly(demo);
    await demo.goto(base + '?local=1&demo=1', { waitUntil: 'domcontentloaded' });
    await demo.locator('#evBridgeSaveNow').waitFor({ state: 'attached', timeout: 20000 });
    assert.equal(await demo.evaluate(() => window.__AC_LOCAL_ONLY), true);
    assert.equal(await demo.evaluate(() => window.AppointmentCompanionLocalStore.database.name), 'apptCompanionPreviewV271');
    assert.equal(await demo.locator('#houseKwh').inputValue(), '6049', 'Synthetic Companion profile usage is inherited');
    assert.equal(await demo.evaluate(() => document.querySelector('#acEvPreviewRibbon').innerText.includes('Alex Preview')), false);
    const portable = await demo.evaluate(() => {
      const url = window.AppointmentCompanionEvPortableLink('Private Test Name', '', 'p_verified_test', {
        smart: true, uwStatus: 'exploring', partnerRelationship: 'adrian'
      });
      const payload = JSON.parse(atob(new URL(url).hash.slice(4).replace(/-/g, '+').replace(/_/g, '/')));
      return { url, payload };
    });
    assert.equal(portable.payload.n, 'you');
    assert.equal(portable.payload.ep, 10);
    assert.equal(portable.payload.rg, 11);
    assert.equal(portable.payload.ti, 2);
    assert.equal(portable.payload.vat, '5');
    assert.equal(portable.url.includes('Private%20Test%20Name'), false);
    assert.equal(await demo.evaluate(() => window.AppointmentCompanionLocalStore.database.name), 'apptCompanionPreviewV271');

    await demo.evaluate(() => {
      window.__previewNativeShareCalls = 0;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__previewCopiedLink = text; } } });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { window.__previewNativeShareCalls++; } });
      window.AppointmentCompanionShareIdentity = { resolve: async () => 'p_verified_test' };
    });
    await demo.locator('#evCloudShare').dispatchEvent('click');
    await demo.locator('#acEvUwStatusChoice').waitFor({ state: 'visible' });
    await demo.locator('#acEvUwStatusChoice').selectOption('existing');
    await demo.locator('input[name="acEvLinkKind"][value="prefilled"]').check();
    await demo.locator('[data-choice="plain"]').click();
    await demo.waitForFunction(() => Boolean(window.__previewCopiedLink));
    const linkedShare = await demo.evaluate(() => {
      const url = window.__previewCopiedLink.split(/\s+/).find(item => item.startsWith('http'));
      const parsed = new URL(url);
      const payload = JSON.parse(atob(parsed.hash.slice(4).replace(/-/g, '+').replace(/_/g, '/')));
      return { partner: parsed.searchParams.get('pid'), payload, nativeShares: window.__previewNativeShareCalls };
    });
    assert.equal(linkedShare.partner, 'p_verified_test');
    assert.equal(linkedShare.payload.n, 'you');
    assert.equal(linkedShare.payload.uws, 'existing');
    assert.equal(linkedShare.payload.sm, 1);
    assert.equal(linkedShare.nativeShares, 0, 'Preview cannot launch a real customer communication');
    assert.deepEqual(errors, []);

    // Already-electric path uses the two actual readings and adds no estimated EV demand.
    const existing = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    existing.setDefaultTimeout(8000);
    existing.on('pageerror', error => errors.push(error.message));
    await localOnly(existing);
    await existing.goto(base + '?local=1&region=11&fuel=EV', { waitUntil: 'domcontentloaded' });
    await existing.locator('#evwOverlay input[type=number]').first().waitFor({ state: 'visible' });
    await existing.locator('#evwOverlay input[type=number]').nth(0).fill('2275');
    await existing.locator('#evwOverlay input[type=number]').nth(1).fill('4800');
    await existing.locator('#evwOverlay .evw-primary').click();
    await existing.waitForTimeout(500);
    await existing.evaluate(() => {
      const fixture = { meter: true, meterSource: 'ev', meterPeak: 2275, meterNight: 4800, meterTotal: 7075, evHomePct: 10,
        ev: { total: 1900 }, standard: { total: 2200 }, economy7: { total: 2050 } };
      window.__AC_EV_TRADEOFF = fixture;
      document.dispatchEvent(new CustomEvent('ac:ev-comparison', { detail: fixture }));
    });
    await existing.locator('.evw-price').first().waitFor({ state: 'visible' });
    assert.equal(await existing.locator('#evwTotalNight').count(), 0, 'Actual EV readings do not gain a fabricated car/house split');
    assert.match(await existing.locator('#evwMeterDayKwh').innerText(), /2,275 kWh\/year/);
    assert.match(await existing.locator('#evwMeterNightKwh').innerText(), /4,800 kWh\/year/);
    assert.match(await existing.locator('#evwMeterTotalKwh').innerText(), /7,075 kWh\/year/);
    assert.match(await existing.locator('.evw-note').innerText(), /No extra EV usage has been added/);
    assert.match(await existing.locator('.evw-price').allInnerTexts().then(rows => rows.join(' ')), /Standard UW[\s\S]*UW EV tariff/);
    assert.deepEqual(errors, []);
    await existing.close();
    console.log('EV v2.71 mobile journey, usage transparency, consent and isolated demo checks passed' + (liveTariffs ? ' with live tariff feed' : ' with deterministic tariff fixture'));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });

