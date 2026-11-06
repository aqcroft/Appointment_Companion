/* v2.66.15: manual MSE forecast review is a GitHub-authorised shortcut, never a public dispatcher. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const url='https://github.com/aqcroft/ShouldIFix/actions/workflows/mse-forecast-review.yml';
test('main PWA More options links to the existing GitHub forecast workflow',()=>{
  const source=read('menu-flat-v2.62.2.js');
  assert.ok(source.includes(url));
  assert.match(source,/#acForecastWatchLink/);
  assert.match(source,/target='_blank';a.rel='noopener noreferrer'/);
  assert.match(source,/global\.__AC_SHARED_VIEW/);
  assert.doesNotMatch(source,/ghp_[A-Za-z0-9]+/);
});
test('Should I Fix has the shortcut but EV and public views do not',()=>{
  const source=read('specialist-suite-menu-v2.62.2.js');
  assert.ok(source.includes(url));
  assert.match(source,/item\.action==='forecast-check'.*should-i-fix/);
  assert.match(source,/document\.documentElement\.classList\.contains\('shared-view'\)/);
  assert.match(source,/b\.target='_blank';b\.rel='noopener noreferrer'/);
  assert.match(source,/if\(action==='forecast-check'\)return/);
});
test('combined version is visible in main, specialist, About and manifest',()=>{
  for(const item of ['index.html','should-i-fix/index.html','ev/index.html','unified-status-v2.59.0.js','manifest.webmanifest']){
    assert.ok(read(item).includes('v2.66.24'),item);
  }
  assert.ok(read('sw.js').includes('v2-66-24-instant-customer-actions'));
});
