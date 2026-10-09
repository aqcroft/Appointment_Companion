'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const launcher = fs.readFileSync(path.join(root, 'specialist-launcher-v1.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const region = fs.readFileSync(path.join(root, 'customer-region-v2.55.20.js'), 'utf8');

// A syntax regression in the shared launcher would make both calculators fail.
assert.doesNotThrow(() => new vm.Script(launcher));

// Both tools use the same launcher: a missing region must prompt at the
// customer field, not report an invisible status down in Cloud settings.
assert.match(launcher, /if \(regionInput && !validRegion\(regionInput\)\)\s*\{\s*requestRegion\(spec, button, regionInput\)/);
assert.match(launcher, /if \(editor && editor\.hidden && chip\) chip\.click\(\)/);
assert.match(launcher, /note\.textContent = .*spec\.label/);
assert.match(launcher, /field\.focus\(/);
assert.doesNotMatch(launcher, /status\('Choose the customer electricity region before opening/);

// Choosing a valid region resumes the original tool tap without a second
// visit to the specialist toolbar. Never invent a region for older profiles.
assert.match(launcher, /document\.addEventListener\('change'/);
assert.match(launcher, /launch\(request\.spec, request\.button\)/);
assert.match(launcher, /region: c\.region/);
assert.doesNotMatch(launcher, /regionInput\.value\s*=\s*['"]11['"]/);
assert.match(region, /select\.addEventListener\('change'/);

// The PWA must activate a new cache and load the new release on reopening.
assert.match(main, /Appointment Companion v2\.55\.22/);
assert.match(main, /release-v2\.55\.22\.js/);
assert.match(sw, /appointment-companion-consolidated-v2-55-22-regionlaunch1-20261009/);
assert.match(sw, /release-v2\.55\.22\.js/);
