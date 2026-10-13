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
    if (errors.length) console.log('Browser errors noted: '+errors.slice(0,5).join(' | '));
  } finally { await browser.close(); }
})().catch(error => {
  console.error('Navigation browser smoke FAILED', error.stack || error);
  process.exitCode = 1;
});
