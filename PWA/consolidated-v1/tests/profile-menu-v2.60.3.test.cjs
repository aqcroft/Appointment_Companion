/* Profile + compact menu regression. No real Partner data or Cloud calls. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function profileHelpers(){
  const base=read('../partner-profile-v1.js'),seam='  global.AppointmentCompanionPartnerProfile = {';
  assert.ok(base.includes(seam),'Partner profile test seam exists');
  const code=base.replace(seam,'  global.__partnerTest={cleanSlug,normalise,secureOptionalUrl,displayUrl};\n'+seam);
  const storage={getItem:()=>null,setItem:()=>{}},win={AppointmentCompanionCloud:{},addEventListener:()=>{}};
  vm.runInNewContext(code,{
    window:win,document:{readyState:'loading',addEventListener:()=>{}},
    localStorage:storage,sessionStorage:storage,URL,console,setInterval:()=>0,clearInterval:()=>{}
  },{filename:'partner-profile-v1.js'});
  return win.__partnerTest;
}
test('UW slugs accept UW links and reject general email addresses',()=>{
  const p=profileHelpers();
  assert.equal(p.cleanSlug('adrian@aqcroft.com'),'');
  assert.equal(p.cleanSlug('someone@gmail.com'),'');
  assert.equal(p.cleanSlug('https://malicious.example/first.last/join'),'');
  assert.equal(p.cleanSlug('https://uw.partners/first.last/partner/join'),'first.last');
  assert.equal(p.cleanSlug('first.last1'),'first.last1');
});
test('invalid imported slug cannot generate broken customer and recruitment links',()=>{
  const p=profileHelpers();
  const invalid=p.normalise({name:'Synthetic Partner',partner_slug:'someone@personalmail.com',email:'someone@personalmail.com'});
  assert.equal(invalid.partner_slug,'');
  assert.equal(invalid.join,'');
  assert.equal(invalid.partner_join,'');
  const valid=p.normalise({partner_slug:'first.last',email:'first.last@uw.partners'});
  assert.equal(valid.join,'https://uw.partners/first.last/join');
  assert.equal(valid.partner_join,'https://uw.partners/first.last/partner/join');
});
test('website and booking inputs work without typing https',()=>{
  const p=profileHelpers();
  assert.equal(p.secureOptionalUrl('aqcroft.com'),'https://aqcroft.com/');
  assert.equal(p.secureOptionalUrl('tidycal.com/yourname'),'https://tidycal.com/yourname');
  assert.equal(p.displayUrl('https://aqcroft.com/'),'aqcroft.com');
  assert.equal(p.secureOptionalUrl('http://example.com'),'');
  assert.equal(p.secureOptionalUrl('https://person:password@example.com/'),'');
});
test('the toolbar is short but the modal retains the full release',()=>{
  const status=read('unified-status-v2.59.0.js');
  assert.match(status,/version: 'v2\.\d+\.\d+'/);
  assert.match(status,/meta\.version\.replace/);
  assert.match(status,/ac-us-mini|ac-us-letter/);
  assert.match(status,/aria-label/);
  assert.match(status,/ac-toolbtn\[aria-label="Companion menu"\]/);
});
test('Partner-upload is authenticated; Admin upload is not exposed to Partner settings',()=>{
  const client=read('../cloud-client-v1.js');
  const ui=read('partner-settings-ux-v2.60.3.js');
  assert.match(client,/action: 'uploadPartnerPhoto'/);
  assert.match(client,/authPayload\(auth\)/);
  assert.doesNotMatch(ui,/adminUploadPartnerPhoto/);
  assert.match(ui,/api\.uploadPartnerPhoto\(a,/);
  assert.match(ui,/canvas\.toDataURL\('image\/jpeg'/);
  assert.match(ui,/stopImmediatePropagation/);
});
test('menu sections include Back, root and customer-safe actions',()=>{
  const code=read('menu-groups-v2.60.2.js');
  for(const marker of ['acMenuBack','acMenuRootActions','Back to menu','setView','new-customer','save-as','all-customers','delete-current','acUnifiedMenuLink']){
    assert.ok(code.includes(marker),'Missing '+marker);
  }
});
