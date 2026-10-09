'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'ev-customer-contact-v2.55.21.js'), 'utf8');
const evLoader = fs.readFileSync(path.join(root, 'ev', 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert.match(evLoader, /ev-customer-contact-v2\.55\.21\.js/);
assert.match(serviceWorker, /ev-customer-contact-v2\.55\.21\.js/);
assert.match(source, /Why your UW quote starts higher/);
assert.match(source, /until they know they can communicate with your smart meter/);
assert.match(source, /3\. EV TARIFF/);
assert.match(source, /I've already ticked the box/);
assert.match(source, /When creating your UW quote, tick this option/);
assert.match(source, /Email me with more information about your Electric Vehicle Tariff/);
assert.doesNotMatch(source, /tap <span class="ac-ev-save-chip">Save/);

const start = source.indexOf('  function updateBasketNumbers(){');
const end = source.indexOf('  function cardSettings(){', start);
assert.ok(start !== -1 && end > start);
const functionSource = source.slice(start, end);

function renderBasket(model) {
  const host = { innerHTML: '', textContent: '' };
  const sandbox = { document: { getElementById: () => host }, lastModel: model };
  vm.runInNewContext(functionSource + '\nupdateBasketNumbers();', sandbox);
  return host.innerHTML || host.textContent;
}

for (const vatPercent of [0, 5]) {
  const factor = vatPercent === 5 ? 1.05 : 1;
  const html = renderBasket({
    vatPercent,
    standard: { total: 1971.6 * factor },
    ev: { total: 1188 * factor },
    dualFuelSelected: false,
    standardDualFuelDiscountExVatAnnual: 0
  });
  assert.match(html, /1\. COMPANION/);
  assert.match(html, /2\. UW QUOTE/);
  assert.match(html, /3\. EV TARIFF/);
  assert.match(html, /£99/);
  assert.match(html, /£164\.30/);
  assert.match(html, /~£99/);
}

const missing = renderBasket(null);
assert.match(missing, /latest electricity rates are available/);

console.log('EV basket journey v2.55.21 tests passed');
