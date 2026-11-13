'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const base = process.env.EV_PREVIEW_URL || 'http://example.test/PWA/consolidated-v1/ev-preview-v2710/';
const appOrigin = new URL(base).origin;

async function localOnly(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === appOrigin && url.hostname !== 'example.test') return route.continue();
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
    assert.match(await page.locator('#acEvPreviewRibbon').innerText(), /PREVIEW v2\.71/);

    // Blank prospective visitor -> mileage + efficiency kWh -> home -> overnight.
    await page.locator('.evw-primary').click();
    await page.locator('.evw-choice').filter({ hasText: 'Diesel' }).click();
    const mileage = page.locator('#evwOverlay input[type=range]');
    await mileage.fill('10000');
    assert.match(await page.locator('.evw-usage-live').innerText(), /3125\.00 kWh\/year/);
    await page.locator('.evw-primary').click();
    const suv = page.locator('.evw-choice').filter({ hasText: 'Family SUV' });
    assert.match(await suv.innerText(), /3125\.00 kWh\/year/);
    await suv.click();
    await page.locator('.evw-choice').filter({ hasText: 'Medium' }).click();
    await page.locator('#evwOverlay input[type=range]').fill('15');
    assert.match(await page.locator('#evwOverlay .evw-hint').last().innerText(), /2125\.00 kWh daytime.*375\.00 kWh overnight.*2,500 kWh\/year/);

    // Pin an offline tariff fixture so journey and summary assertions are deterministic.
    await page.evaluate(() => {
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
    await page.locator('.evw-primary').click();
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const fixture = { meter: false, miles: 10000, efficiency: 3.2, evHomePct: 15, services: 3,
        ev: { car: 900, home: 300, total: 1200 }, standard: { car: 0, home: 2100, total: 2100 },
        standardUnitRateExVatP: 25, evPeakRateExVatP: 29, evOffPeakRateExVatP: 7.5 };
      window.__AC_EV_TRADEOFF = fixture;
      document.dispatchEvent(new CustomEvent('ac:ev-comparison', { detail: fixture }));
    });
    await page.locator('.evw-price').first().waitFor({ state: 'visible' });
    assert.equal(await page.locator('.evw-price').count(), 2);
    assert.match(await page.locator('.evw-saving').innerText(), /£50[\s\S]*£600/);
    await page.locator('.evw-kwh summary').click();
    const breakdown = await page.locator('.evw-kwh').innerText();
    assert.match(breakdown, /Home before EV charging[\s\S]*2,500 kWh\/year/);
    assert.match(breakdown, /Additional EV demand[\s\S]*3,125 kWh\/year/);
    assert.match(breakdown, /Combined household \+ EV[\s\S]*5,625 kWh\/year/);
    assert.match(await page.locator('.evw-note').innerText(), /Assumes 15% household night usage, a three-service UW EV bundle/i);
    assert.match(await page.locator('.evw-note').innerText(), /No gas discount/i);
    await page.locator('details summary').filter({ hasText: 'See the full cost breakdown' }).click();
    assert.ok(await page.locator('.evw-detail').count() >= 5);
    assert.match(await page.locator('.evw-detail').filter({ hasText: 'Net household electricity difference' }).innerText(), /£25\.00/);
    assert.match(await page.locator('.evw-detail').filter({ hasText: 'EV energy cost including household effect' }).innerText(), /£100\.00/);
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
    assert.deepEqual(errors, []);
    console.log('EV v2.71 mobile journey, usage transparency, consent and isolated demo checks passed');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
