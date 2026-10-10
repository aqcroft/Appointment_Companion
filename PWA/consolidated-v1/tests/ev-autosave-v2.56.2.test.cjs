'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'ev-bridge-v2.56.2.js'), 'utf8');
const mainIndex = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const evIndex = fs.readFileSync(path.join(root, 'ev', 'index.html'), 'utf8');
const cloudStatus = fs.readFileSync(path.join(root, 'spring-clean-v2.js'), 'utf8');

assert.match(mainIndex, /release-v2\.56\.2\.js/);
assert.match(evIndex, /ev-bridge-v2\.56\.2\.js/);
assert.match(script, /localStore\.updateSpecialist\(currentLocalId, 'ev', state\)/);
assert.match(script, /delete copy\.updated_at/);
assert.match(script, /EV draft saved on this device - tap Save to Cloud in Companion when ready/);
assert.match(script, /if \(!String\(launch\.customer_id \|\| ''\)\.trim\(\)\)/);
assert.match(script, /role="status" aria-live="polite"/);
assert.match(cloudStatus, /r\.cloud_id \|\| r\.cloud_creation_approved \|\| r\.deleted/);
assert.match(cloudStatus, /Cloud connected - draft saved on this device/);

const start = script.indexOf('  function setSaveUi(');
const end = script.indexOf('  function showNotice(', start);
assert.ok(start >= 0 && end > start, 'save status implementation exists');
const statusImplementation = script.slice(start, end);
const notifications = [];
const hiddenStatus = { textContent: '', style: {} };
const ctx = {
  document: { querySelectorAll: () => [hiddenStatus] },
  showNotice: (text, tone) => { notifications.push({ text, tone }); }
};
vm.runInNewContext(statusImplementation + '\nthis.setSaveUi = setSaveUi;', ctx);

ctx.setSaveUi('Autosaving changes on this device', 'warn');
ctx.setSaveUi('Saved on this device', 'good');
assert.equal(notifications.length, 0, 'automatic background saves should not display popups');
assert.equal(hiddenStatus.textContent, 'Saved on this device', 'status remains available for accessibility');

ctx.setSaveUi('Saved on this device', 'good', true);
assert.equal(notifications.length, 1, 'manual save should confirm visibly');

ctx.setSaveUi('Local EV save needs attention', 'bad');
assert.equal(notifications.length, 2, 'save failures must remain visible');
console.log('v2.56.2 EV autosave notification tests passed');
