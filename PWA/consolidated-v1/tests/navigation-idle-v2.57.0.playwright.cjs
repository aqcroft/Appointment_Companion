'use strict';

const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = 'http://127.0.0.1:8765/PWA/consolidated-v1/';
const timeout = 30000;
(async () => {
  const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width:390, height:844 }, isMobile:true, hasTouch:true });
  const errors = [];
  page.on('pageerror', err => errors.push(String(err.message || err)));
  page.route(/^https?:\/\/(?!127\.0\.0\.1:8765)/, route => route.abort());
  try {
    await page.goto(ROOT+'?local=1', {waitUntil:'domcontentloaded',timeout});
    await page.locator('#acSharedToolstrip .ac-toolbtn[aria-label="EV Companion"]').waitFor({timeout});
    await page.locator('#acShareAppMenuButton').waitFor({timeout});
    await page.locator('#cloudActionMenu').click();
    await page.locator('#acShareAppMenuButton').click();
    await page.locator('#acShareAppModal').waitFor({timeout});
    assert.equal(await page.locator('#acShareAppLink').inputValue(),
      'https://aqcroft.github.io/Appointment_Companion/PWA/consolidated-v1/');
    assert.match(await page.locator('#acShareAppModal').innerText(), /no customer details/i);
    await page.locator('#acShareAppDone').click();
    console.log('PASS: App sharing is separate and uses clean no-customer URL');

    // Reproduce the reported failure window after the initial startup.
    await page.waitForTimeout(34000);
    assert.equal(await page.locator('#acV22StatusModal.open').count(), 0,
      'Cloud health must not raise a blocking overlay after the idle period');
    await page.locator('#acSharedToolstrip .ac-toolbtn[aria-label="EV Companion"]').click({timeout:9000});
    await page.waitForURL(/\/consolidated-v1\/ev\//, {timeout});
    console.log('PASS: EV navigation works after 34 seconds of idle time');

    await page.goto(ROOT+'?local=1', {waitUntil:'domcontentloaded',timeout});
    await page.locator('#acSharedToolstrip .ac-toolbtn[aria-label="Should I Fix?"]').waitFor({timeout});
    await page.waitForTimeout(2000);
    await page.locator('#acSharedToolstrip .ac-toolbtn[aria-label="Should I Fix?"]').click({timeout:9000});
    await page.waitForURL(/\/consolidated-v1\/should-i-fix\//, {timeout});
    console.log('PASS: Should I Fix navigation works');
    // Exercise the same EV rate reveal in both Partner and shared customer views.
    for (const shared of [false,true]) {
      const ratesPage = await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
      await ratesPage.setContent('<div class="hero"><div class="hero-grid"><div class="hero-box">Overnight</div><div class="hero-box">Daytime</div></div></div>');
      if (shared) await ratesPage.evaluate(() => document.documentElement.classList.add('shared-view'));
      await ratesPage.addScriptTag({path:require('node:path').resolve(__dirname,'../ev-tap-rates-v2.57.0.js')});
      await ratesPage.evaluate(() => document.dispatchEvent(new CustomEvent('ac:ev-comparison', {
        detail:{vatPercent:5, evOffPeakRateExVatP:7, evPeakRateExVatP:27, evStandingChargeExVatP:50}
      })));
      for (let i=0;i<2;i++) {
        await ratesPage.locator('.hero-grid>.hero-box').nth(i).click();
        await ratesPage.locator('#acEvRateDialog[open]').waitFor({timeout:5000});
        assert.equal(await ratesPage.locator('#acEvRateOffPeak').innerText(),'7.350p');
        assert.equal(await ratesPage.locator('#acEvRatePeak').innerText(),'28.350p');
        assert.equal(await ratesPage.locator('#acEvRateStanding').innerText(),'52.50p');
        await ratesPage.locator('#acEvRateDialogDone').click();
      }
      await ratesPage.close();
    }
    console.log('PASS: Both EV cards show both rates and one standing charge in both Partner and shared views');
    if (errors.length) console.log('Browser errors noted: '+errors.slice(0,5).join(' | '));
  } finally { await browser.close(); }
})().catch(error => {
  console.error('Navigation browser smoke FAILED', error.stack || error);
  process.exitCode = 1;
});
