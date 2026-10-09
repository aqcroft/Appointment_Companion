'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

const sharing = fs.readFileSync(path.join(root, 'ev-sharing-v2.55.23.js'), 'utf8');
const customerModal = fs.readFileSync(path.join(root, 'ev-customer-contact-v2.55.21.js'), 'utf8');
const evRoute = fs.readFileSync(path.join(root, 'ev/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

new vm.Script(sharing);
new vm.Script(customerModal);

assert.match(evRoute, /consolidated-v1\/ev-sharing-v2\.55\.23\.js/);
assert.match(evRoute, /consolidated-v1\/ev-customer-contact-v2\.55\.21\.js/);
assert.match(evRoute, /var portableShared = \/\^p2=/);
assert.match(evRoute, /var shared = params\.has\('s'\)/);

// Both the Cloud ?s route and the portable #p2 route must use the same modal.
// This caught the hard-coded v2.55.9 reference which left portable links stale.
assert.match(sharing, /loadScript\('consolidated-v1\/ev-customer-contact-v2\.55\.21\.js\?v=20261009-v2\.55\.23-portablebridge1'\)/);
assert.doesNotMatch(sharing, /ev-customer-contact-v2\.55\.9\.js/);
assert.match(sharing, /if\(\/\^p2=\/\.test\(hash\)\)/);

assert.match(customerModal, /Why your UW quote starts higher/);
assert.match(customerModal, /3\. EV TARIFF/);
assert.match(customerModal, /Email me with more information about your Electric Vehicle Tariff/);

assert.match(sw, /ev-sharing-v2\.55\.23\.js/);
assert.match(sw, /ev-customer-contact-v2\.55\.21\.js/);
assert.match(sw, /consolidated-v2-55-23-portablebridge1/);

console.log('Both EV customer share routes reference the refreshed bridge modal');
