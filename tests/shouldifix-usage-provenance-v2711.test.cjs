"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const preview=path.join(root,"PWA/consolidated-v1/shouldifix-preview-v269");
const app=fs.readFileSync(path.join(root,"PWA/consolidated-v1/index.html"),"utf8");
const cache=fs.readFileSync(path.join(root,"PWA/consolidated-v1/sw.js"),"utf8");
const manifest=fs.readFileSync(path.join(root,"PWA/consolidated-v1/manifest.webmanifest"),"utf8");
const bridge=fs.readFileSync(path.join(root,"PWA/consolidated-v1/should-i-fix/index.html"),"utf8");
const modes=fs.readFileSync(path.join(root,"PWA/consolidated-v1/should-i-fix/mode-toggle-v2.71.1.js"),"utf8");
const release=fs.readFileSync(path.join(root,"PWA/consolidated-v1/release-v2.71.1.js"),"utf8");
const previewHtml=fs.readFileSync(path.join(preview,"index.html"),"utf8");
const previewModes=fs.readFileSync(path.join(preview,"mode-toggle-v2.70.1.js"),"utf8");
const previewRelease=fs.readFileSync(path.join(preview,"release-v2.70.1.js"),"utf8");

test("Companion app version and service worker cache are advanced",()=>{
  assert.match(app,/<title>Appointment Companion v2\.71\.1<\/title>/);
  assert.match(app,/20261120-v2\.71\.1-sif-usage-source/);
  assert.match(app,/release-v2\.71\.1\.js/);
  assert.match(manifest,/Appointment Companion v2\.71\.1/);
  assert.match(cache,/appointment-companion-consolidated-v2-71-1-sif-usage-20261120/);
  assert.match(cache,/\.\/should-i-fix\/mode-toggle-v2\.71\.1\.js/);
});
test("only valid relevant Companion usage receives the explicit source marker",()=>{
  assert.match(bridge,/validE=!hasE\|\|\(e>0&&e<=200000\)/);
  assert.match(bridge,/validG=!hasG\|\|\(g>0&&g<=300000\)/);
  assert.match(bridge,/if\(\(hasE\|\|hasG\)&&validE&&validG\)\{u\.searchParams\.set\("usageSource","companion"\)/);
  assert.match(bridge,/if\(publicMode\)\{\["r","f","e","g"/);
  assert.doesNotMatch(bridge,/publicMode\)\{[^}]*usageSource/);
});

test("Existing mode preserves Companion provenance but drops it from unrelated links",()=>{
  assert.match(modes,/original\.get\('companion'\) === '1' && original\.get\('usageSource'\) === 'companion'/);
  assert.match(modes,/url\.searchParams\.set\('usageSource', 'companion'\)/);
  assert.match(modes,/version: 'v2\.71\.1'/);
});

test("versioned loader and About release are present",()=>{
  assert.match(bridge,/mode-toggle-v2\.71\.1\.js/);
  assert.match(bridge,/release-v2\.71\.1\.js/);
  assert.match(release,/version:'v2\.71\.1'/);
});

test("hosted review route is responsive, noindex, visibly labelled and uses only test inputs",()=>{
  assert.match(previewHtml,/<meta name="robots" content="noindex,nofollow">/);
  assert.match(previewHtml,/>PREVIEW</);
  assert.match(previewHtml,/@media\(max-width:759px\)/);
  assert.match(previewHtml,/spring-clean-preview-v269\.html\?r=11&amp;f=dual&amp;e=2500&amp;g=9500&amp;companion=1&amp;usageSource=companion/);
  assert.match(previewHtml,/mode-toggle-v2\.70\.1\.js/);
  assert.doesNotMatch(previewHtml,/serviceWorker\.register/);
  assert.match(previewModes,/existing-customer-preview-v269\.html/);
  assert.match(previewRelease,/version:'v2\.70\.1'/);
});
