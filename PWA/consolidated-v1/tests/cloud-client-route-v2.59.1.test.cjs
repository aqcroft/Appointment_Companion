'use strict';
/* Regression: a centrally provisioned Partner profile must be reachable from
   consolidated Appointment Companion, not just standalone /PWA tools. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pwa = path.resolve(__dirname, '..', '..');
const consolidated = path.join(pwa, 'consolidated-v1');
const loader = fs.readFileSync(path.join(consolidated, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(consolidated, 'sw.js'), 'utf8');
const client = fs.readFileSync(path.join(pwa, 'cloud-client-v1.js'), 'utf8');
const panel = fs.readFileSync(path.join(consolidated, 'unified-status-v2.59.0.js'), 'utf8');

test('consolidated loader selects /PWA/cloud-client-v1.js, not stale root client', () => {
  // The loader injects <base href="../cloud/"> into the donor HTML.
  const donorBase = new URL('../cloud/', 'https://aqcroft.github.io/Appointment_Companion/PWA/consolidated-v1/');
  const script = '../cloud-client-v1.js';
  assert.equal(new URL(script, donorBase).pathname,
    '/Appointment_Companion/PWA/cloud-client-v1.js');
  assert.ok(loader.includes('../cloud-client-v1.js?v='));
  assert.ok(!loader.includes('../../cloud-client-v1.js?v='));
  assert.ok(sw.includes("'../cloud-client-v1.js'"));
  assert.ok(!sw.includes("'../../cloud-client-v1.js'"));
});

test('Cloud client provides everything the profile UI and status panel require', () => {
  for (const method of ['listCustomers','getPartnerProfile','savePartnerProfile','saveCustomer','getCustomer','createShare']) {
    assert.match(client, new RegExp('async\\s+' + method + '\\s*\\('));
  }
  assert.ok(panel.includes('api.listCustomers(auth)'));
  assert.ok(panel.includes('api.getPartnerProfile(auth)'));
});

test('new PWA release invalidates old cache without touching stored records', () => {
  assert.match(sw, /CACHE_NAME = 'appointment-companion-consolidated-v2-59-1-/);
  assert.ok(loader.includes('v2.59.1'));
  assert.ok(!loader.includes('localStorage.clear('));
});
