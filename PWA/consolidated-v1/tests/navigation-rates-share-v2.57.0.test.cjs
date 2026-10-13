'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const main = read('index.html');
const ev = read('ev/index.html');
const fix = read('should-i-fix/index.html');
const sw = read('sw.js');
const spring = read('spring-clean-v2.57.0.js');
const launcher = read('specialist-launcher-v2.57.0.js');
const rates = read('ev-tap-rates-v2.57.0.js');
const appShare = read('share-app-v2.57.0.js');
const release = read('release-v2.57.0.js');
const manifest = JSON.parse(read('manifest.webmanifest'));

for (const [name, code] of [
  ['main loader', main.match(/<script>([\s\S]*?)<\/script>/)?.[1] || ''],
  ['EV loader', ev.match(/<script>([\s\S]*?)<\/script>/)?.[1] || ''],
  ['Should I Fix loader', fix.match(/<script>([\s\S]*?)<\/script>/)?.[1] || ''],
  ['service worker', sw],
  ['Cloud status', spring],
  ['specialist launcher', launcher],
  ['EV rate disclosure', rates],
  ['app link sharing', appShare],
  ['release notes', release]
]) {
  assert(code, name+' must contain JavaScript');
  new vm.Script(code, { filename: name });
}

assert.match(main, /v2\.57\.0/);
assert.match(ev, /v2\.57\.0/);
assert.match(fix, /v2\.57\.0/);
assert.match(manifest.name, /v2\.57\.0/);
assert.match(release, /v2\.57\.0/);
assert.match(sw, /consolidated-v2-57-0-navigation-rates-share/);
for (const file of [
  'specialist-launcher-v2.57.0.js',
  'spring-clean-v2.57.0.js',
  'share-app-v2.57.0.js',
  'release-v2.57.0.js'
]) assert(main.includes(file), 'Main must load '+file);
for (const file of ['spring-clean-v2.57.0.js','ev-tap-rates-v2.57.0.js','release-v2.57.0.js']) {
  assert(ev.includes(file),'EV must load '+file);
}
assert(fix.includes('spring-clean-v2.57.0.js') && fix.includes('release-v2.57.0.js'));
for (const file of ['spring-clean-v2.57.0.js','specialist-launcher-v2.57.0.js','ev-tap-rates-v2.57.0.js','share-app-v2.57.0.js','release-v2.57.0.js']) {
  assert(sw.includes(file),'Offline cache must include '+file);
}

assert.match(launcher,/document\.addEventListener\('click'/);
assert.match(launcher,/#acSharedToolstrip \.ac-toolbtn/);
assert.match(launcher,/event\.stopImmediatePropagation\(\)/);
assert.match(launcher,/launch\(spec, button\)/);
assert.doesNotMatch(spring,/setInterval\(renderStatusMenu,\s*3000\)/);
const cloudRoutine = spring.slice(spring.indexOf('async function maybePromptCloud'), spring.indexOf('function showCloudAttention_'));
assert(!cloudRoutine.includes('showCloudAttention_('),'Routine Cloud checks must not overlay the main appointment');
assert.match(spring,/menu\.classList\.contains\('open'\)/);

assert.match(rates,/acEvRateOffPeak/);
assert.match(rates,/acEvRatePeak/);
assert.match(rates,/acEvRateStanding/);
assert.match(rates,/One daily standing charge applies to both/);
assert.match(rates,/evOffPeakRateExVatP/);
assert.match(rates,/evPeakRateExVatP/);
assert.match(rates,/evStandingChargeExVatP/);
assert.doesNotMatch(rates,/if\s*\(!document\.documentElement\.classList\.contains\('shared-view'\)\)\s*return/);

assert.match(appShare,/Share app link/);
assert.match(appShare,/navigator\.share/);
assert.match(appShare,/navigator\.clipboard/);
const sharedUrl = appShare.match(/var APP_LINK = '([^']+)'/);
assert(sharedUrl,'App share URL must be constant');
assert.equal(sharedUrl[1], 'https://aqcroft.github.io/Appointment_Companion/PWA/consolidated-v1/');
assert(!sharedUrl[1].includes('?') && !sharedUrl[1].includes('#'));
assert.doesNotMatch(appShare,/customerName|customer_id|basket_url|appointment_state|specialist_state/);

console.log('PASS: v2.57.0 entrypoints, script syntax, stable navigation, Cloud status, EV rates, app sharing, cache and release metadata');
