/* Appointment Companion v2.61.1 - four one-tap main-menu shortcuts.
   Read-only reporting. Real Cloud checks run only when the modal is opened/refreshed.
   All status dimensions are independent: a green tariff light is NOT Cloud health.
   A dedicated fixture mode runs the EXACT SAME modal UI without reading live data.
*/
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var demo = !!global.__AC_UNIFIED_STATUS_PREVIEW;
  var meta = Object.freeze({
    version: 'v2.61.1',
    date: '15 October 2026',
    summary: 'Four appointment-ready main-menu shortcuts',
    changes: [
      'The main menu shows New customer, Saved quote basket link, Save as new scenario and All Cloud customers.',
      'Shortcuts call the same existing actions, including the full Cloud customer list - not just recent customers.',
      'The three submenu sections, Back navigation, compact TCP control and Partner settings remain available.',
      'No customer data, tariff maths, save logic or Partner identity handling changed.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  var ID = 'acUnifiedStatusModal', trigger = null, checkSeq = 0, previousFocus = null, waitTimer = null, updatesOpen = false;
  var tariffSource = 'https://uw.co.uk/legal/terms-conditions/energy-tariff-information';
  var cloud = { connection: 'idle', profile: 'idle', message: '', profileName: '', customerCount: null, customerIds: null, owner: '', error: '' };
  var sync = { mode: 'checking', detail: 'Checking saved customer profiles…', count: null, pending: 0,
    conflicts: 0, localOnly: 0, localIds: null, current: '', local: 'Checking local save…' };
  function $(id) { return document.getElementById(id); }
  function esc(value) { return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function readable(when) {
    if (!when) return 'Not yet verified';
    var d = new Date(when);
    return Number.isNaN(d.getTime()) ? 'Not yet verified' : d.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  function ownAuth() {
    try {
      var a = JSON.parse(sessionStorage.getItem('apptCloudPilotAuthSession') || 'null');
      if (!(a && a.partner_id && a.workspace_key)) a = JSON.parse(localStorage.getItem('apptCloudPilotAuthDeviceV1') || 'null');
      return a && a.partner_id && a.workspace_key ? a : null;
    } catch (_) { return null; }
  }
  function profileForAuth(profile, auth) {
    if (!profile || !auth) return null;
    var id = String(profile.partner_id || profile.companion_login_id || '').toLowerCase().trim();
    var owner = '';
    try { owner = String(localStorage.getItem('apptCompanionPartnerCloudOwnerV1') || '').toLowerCase().trim(); } catch (_) {}
    if (!id && owner === String(auth.partner_id).toLowerCase().trim()) id = owner;
    return id === String(auth.partner_id).toLowerCase().trim() && profile.name ? profile : null;
  }
  function localPartner(auth) {
    if (!auth) return null;
    var p = null;
    try { p = JSON.parse(localStorage.getItem('apptCompanionPartnerCloudProfileV1') || 'null'); } catch (_) {}
    p = profileForAuth(p, auth);
    if (p) return p;
    try { p = JSON.parse(localStorage.getItem('apptCompanionPartner') || 'null'); } catch (_) {}
    return profileForAuth(p, auth);
  }
  function tariff() {
    if (demo) return {status:'green',summary:{fixed:'Fixed Saver 99',tracker:'Tracker Start 6',variable:'Value',ev:'EV Value'}, checkedAt: '2026-10-14T12:02:00+01:00'};
    var api = global.AppointmentCompanionTariffsV242;
    try { return api && typeof api.state==='function' ? api.state() : {status:'amber',summary:{}}; }
    catch (_) { return {status:'amber',summary:{},error:'Tariff status could not be read'}; }
  }
  function tone(state) { return state==='green' || state==='verified' || state==='loaded' || state==='synced' ? 'good' : state==='red' || state==='failed' || state==='conflict' || state==='disconnected' ? 'bad' : 'warn'; }
  function dimensions() {
    var tariffState=tariff().status;
    var customerProblem=sync.conflicts>0 || sync.mode==='conflict' || sync.mode==='failed' ||
      cloud.connection==='failed' || cloud.connection==='disconnected';
    // The active customer matters most. Other deliberately local drafts do not
    // prevent a verified, fully synchronised current customer from going green.
    var customersReady=cloud.connection==='verified' && sync.currentRevisionSynced===true &&
      Array.isArray(cloud.customerIds) && cloud.customerIds.includes(String(sync.currentCloudId||'')) &&
      sync.conflicts===0 && sync.mode!=='failed' && !sync.currentConflict;
    return [
      {key:'tariff',letter:'T',name:'Tariffs',
        state:tariffState==='green'?'green':tariffState==='red'?'red':'amber'},
      {key:'customer',letter:'C',name:'Customers and Cloud sync',
        state:customerProblem?'red':customersReady?'green':'amber'},
      {key:'partner',letter:'P',name:'Partner profile',
        state:cloud.profile==='loaded'?'green':cloud.profile==='failed'?'red':'amber'}
    ];
  }
  function deviceOnlyCount() {
    if(!Array.isArray(sync.localIds))return null;
    if(!Array.isArray(cloud.customerIds))return sync.localOnly;
    var available=new Set(cloud.customerIds);
    return sync.localOnly+sync.localIds.filter(function(id){return !available.has(id);}).length;
  }
  function cloudOnlyCount() {
    if(!Array.isArray(cloud.customerIds) || !Array.isArray(sync.localIds)) return null;
    var localSet=new Set(sync.localIds);
    return cloud.customerIds.filter(function(id){return !localSet.has(id);}).length;
  }
  function signal(name, letter, status, large) {
    var lamp = status==='green'?'🟢':status==='red'?'🔴':'🟠';
    return '<span class="ac-us-signal'+(large?' big':'')+'" data-state="'+status+'" title="'+esc(name+': '+status)+
      '" role="img" aria-label="'+esc(name+': '+status)+'">'+(large?esc(letter):'<span class="ac-us-light" aria-hidden="true">'+lamp+'</span><span class="ac-us-letter" aria-hidden="true">'+esc(letter)+'</span>')+'</span>';
  }
  function signals() {
    return dimensions().map(function(d){return signal(d.name,d.letter,d.state,false);}).join('');
  }
  function indicator(name) {
    var d=dimensions().find(function(x){return x.key===name;});
    return d ? signal(d.name,d.letter,d.state,true) : '';
  }
  function overallStatus() {
    var states=dimensions();
    var issue=states.find(function(d){return d.state==='red';});
    if(issue)return {state:'red',label:issue.name+' needs attention'};
    var pending=states.find(function(d){return d.state==='amber';});
    if(pending)return {state:'amber',label:pending.name+' needs checking'};
    return {state:'green',label:'Tariffs, Customers and Partner verified'};
  }
  function stateLabel(kind, status) {
    if (kind==='tariff') return status==='green'?'Verified':status==='red'?'Attention needed':'Checking / cached';
    if (status==='verified') return 'Verified';
    if (status==='loaded') return 'Loaded';
    if (status==='checking') return 'Checking…';
    if (status==='saved') return 'Login saved';
    if (status==='local') return 'Local only';
    if (status==='cached') return 'Cached only';
    if (status==='disconnected') return 'Not connected';
    if (status==='failed') return 'Unavailable';
    if (status==='synced') return 'Synced';
    if (status==='conflict') return 'Conflict';
    return 'Needs checking';
  }
  function badge(kind, value) { return '<span class="ac-us-pill '+tone(value)+'">'+esc(stateLabel(kind,value))+'</span>'; }
  function section(title, status, content, id, kind) {
    return '<section class="ac-us-section" aria-labelledby="'+id+'"><div class="ac-us-head"><h3 id="'+id+'">'+indicator(kind)+esc(title)+'</h3>'+status+'</div>'+content+'</section>';
  }
  function tariffSection() {
    var state=tariff(), summary=state.summary||{};
    var specifications=[
      {label:'Fixed',key:'fixed',names:['Start','Fixed','Saver'],patterns:[/^Fixed Start(?:\s|$)/i,/^Fixed(?:\s+\d+)?$/i,/^Fixed Saver(?:\s|$)/i]},
      {label:'Tracker',key:'tracker',names:['Start','Plus','Saver'],patterns:[/^Tracker Start(?:\s|$)/i,/^Tracker Plus(?:\s|$)/i,/^(?:Tracker Saver|Saver Tracker)(?:\s|$)/i]},
      {label:'Variable',key:'variable',names:['Value','Gold','Double Gold'],patterns:[/^Value(?:\s|$)/i,/^Gold(?:\s|$)/i,/^Double Gold(?:\s|$)/i]},
      {label:'EV',key:'ev',names:['Value','Gold','Double Gold'],patterns:[/^EV Value(?:\s|$)/i,/^EV Gold(?:\s|$)/i,/^EV Double Gold(?:\s|$)/i]}
    ];
    var rows=specifications.map(function(family){
      var names=Array.isArray(summary[family.key+'Names'])?summary[family.key+'Names']:[];
      var chips=family.patterns.map(function(pattern,index){
        var matching=names.find(function(name){return pattern.test(name);});
        var label=matching || (family.label+' '+family.names[index]);
        return '<span class="ac-us-tariff'+(matching?' present':' absent')+'" title="'+esc(matching?'Present in verified tariff data':'Not confirmed in tariff data')+'">'+
          (matching?'✓ ':'○ ')+esc(label)+'</span>';
      }).join('');
      if(!names.length)chips='<span class="ac-us-note">Tariff suite not yet confirmed</span>';
      return '<div class="ac-us-detail ac-us-tariff-row"><span>'+esc(family.label)+'</span><div class="ac-us-tariff-list">'+chips+'</div></div>';
    }).join('');
    return section('Tariffs',badge('tariff',state.status),'<div class="ac-us-rows">'+rows+'</div>'+
      '<p class="ac-us-note">Last live verification: '+esc(readable(state.checkedAt))+
      (state.error?' · '+esc(state.error):'')+'</p>'+
      '<div class="ac-us-actions"><button type="button" data-us-action="tariff">Refresh tariff data</button>'+
      '<a href="'+tariffSource+'" target="_blank" rel="noopener noreferrer">Take me to the UW TIL ↗</a></div>','acUsTariff','tariff');
  }
  function appSection() {
    var history=[
      {version:meta.version,date:meta.date,summary:meta.summary,changes:meta.changes},
      {version:'v2.61.0',date:'15 October 2026',summary:'Verified Partner identity and modal access'},
      {version:'v2.60.3',date:'15 October 2026',summary:'Compact TCP and improved Partner settings'}
    ];
    return '<div class="ac-us-release"><div class="ac-us-update-head"><span class="ac-us-version">'+esc(meta.version)+'</span><strong>'+esc(meta.summary)+'</strong>'+
      '<button type="button" data-us-action="updates" aria-expanded="'+(updatesOpen?'true':'false')+'">'+
      (updatesOpen?'Hide updates ▴':'Last 3 updates ▾')+'</button></div>'+
      (updatesOpen?'<div class="ac-us-update-history">'+history.map(function(item,index){
        return '<div class="ac-us-update"><b>'+esc(item.version)+'</b> · '+esc(item.summary)+
          '<small>'+esc(item.date)+'</small>'+
          (index===0?'<ul>'+item.changes.map(function(change){return '<li>'+esc(change)+'</li>';}).join('')+'</ul>':'')+
          '</div>';
      }).join('')+'<a href="https://github.com/aqcroft/Appointment_Companion/commits/main/" target="_blank" rel="noopener noreferrer">View full change history ↗</a></div>':'')+'</div>';
  }
  function partnerSection() {
    var auth=demo?{partner_id:'DEMO'}:ownAuth();
    var status=demo?'loaded':cloud.profile;
    var details='<p class="ac-us-note">'+esc(demo?'Example Partner - fictional data':
      cloud.profileName?cloud.profileName+(status==='cached'?' (cached on this device)':''):
      'No verified Partner profile loaded')+'</p>';
    if(auth && !demo)details+='<p class="ac-us-note">Companion Partner ID: '+esc(auth.partner_id)+'</p>';
    if(!demo && status==='failed')details+='<p class="ac-us-error">Partner details could not be verified. Check the Companion login.</p>';
    if(!demo)details+='<button type="button" data-us-action="connect">Connect / reconnect Cloud</button>';
    return section('Partner',badge('profile',status),details,'acUsPartner','partner');
  }
  function customerSection() {
    var status=demo?'synced':sync.mode;
    var customerCount=demo?3:sync.count;
    var explanation=demo?'Three example customer profiles available and synchronised':sync.detail;
    var current=demo?'Example customer synced':sync.current;
    var local=demo?'Saved locally':sync.local;
    var cloudOnly=demo?0:cloudOnlyCount();
    var cloudCount=demo?3:cloud.customerCount;
    var connection=demo?'verified':cloud.connection;
    var details='<div class="ac-us-minirow"><span>Cloud connection</span>'+badge('cloud',connection)+'</div>'+
      '<p class="ac-us-note">'+esc(demo?'Cloud connected':cloud.message || 'Cloud status not yet checked')+'</p>'+
      '<p class="ac-us-note">'+esc(explanation)+'</p>'+
      (customerCount==null?'':'<div class="ac-us-minirow"><span>Customer profiles on this device</span><strong>'+customerCount+'</strong></div>')+
      '<div class="ac-us-minirow"><span>On device only (not in Cloud)</span><button type="button" data-us-action="device-only">'+esc(demo?0:deviceOnlyCount()==null?'Checking…':deviceOnlyCount())+' · View →</button></div>'+
      '<div class="ac-us-minirow"><span>In Cloud only (not on this device)</span><button type="button" data-us-action="cloud-only">'+esc(cloudOnly==null?'Not checked':cloudOnly)+' · View →</button></div>'+
      (cloudCount==null?'':'<div class="ac-us-minirow"><span>Total customers in Cloud</span><strong>'+cloudCount+'</strong></div>')+
      (current?'<p class="ac-us-note">'+esc(current)+'</p>':'')+
      (sync.conflicts && !demo?'<p class="ac-us-error">'+sync.conflicts+' sync conflict(s) need attention. Please review both versions before deciding which to keep.</p>':'')+
      (sync.pending && !demo?'<p class="ac-us-note">'+sync.pending+' Cloud-enabled profile(s) waiting to sync.</p>':'')+
      (sync.conflicts && !demo?'<button type="button" data-us-action="review-customers">Review '+sync.conflicts+' conflict'+(sync.conflicts===1?'':'s')+' →</button>':'')+
      (!sync.conflicts && !demo?'<button type="button" data-us-action="all-customers">View customer records →</button>':'')+
      '<div class="ac-us-minirow"><span>Local device save</span><span>'+esc(local)+'</span></div>';
    var customerTraffic=dimensions().find(function(d){return d.key==='customer';}).state;
    var customerBadge=demo?'synced':
      sync.conflicts>0 || sync.mode==='conflict'?'conflict':
      sync.mode==='failed' || cloud.connection==='failed'?'failed':
      cloud.connection==='disconnected'?'disconnected':
      customerTraffic==='green'?'synced':'checking';
    return section('Customers',badge('customers',customerBadge),details,'acUsCustomers','customer');
  }
  function css() {
    if ($('acUnifiedStatusCss')) return;
    var st=document.createElement('style'); st.id='acUnifiedStatusCss';
    st.textContent = [
      '#acV22StatusBlock{display:none!important}', // old five-row menu status block
      '#acUnifiedStatusTrigger{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;height:34px;width:38px;min-height:34px;min-width:38px;max-width:38px;box-sizing:border-box;padding:2px 2px;border:1px solid #e4d6f4;border-radius:9px;background:#fff;color:#533587;font:800 9px/1 system-ui,sans-serif;cursor:pointer}',
      '#acUnifiedStatusTrigger .ac-us-version-top{font-size:9px;line-height:10px;letter-spacing:-.25px;white-space:nowrap}',
      '#acUnifiedStatusTrigger .ac-us-signals{display:flex;gap:0;align-items:center;justify-content:center;min-height:19px}',
      '#acUnifiedStatusTrigger .ac-us-signal{display:flex;flex-direction:column;width:11px;height:19px;align-items:center;gap:0;border:0;border-radius:0;background:transparent;color:#594378;padding:0;font-size:8px;line-height:8px}',
      '#acUnifiedStatusTrigger .ac-us-light{font-size:10px;line-height:11px;display:block;font-family:system-ui,sans-serif}',
      '#acUnifiedStatusTrigger .ac-us-letter{font:800 8px/8px system-ui,sans-serif;display:block}',
      '.ac-us-signal{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;font:800 9px/1 system-ui,sans-serif;background:#fff3db;color:#8d5608;border:1px solid #e4bc73;flex-shrink:0}',
      '.ac-us-signal[data-state="green"]{background:#def3e6;color:#136e3d;border-color:#82d2a3}',
      '.ac-us-signal[data-state="red"]{background:#ffe7e7;color:#a92e39;border-color:#eaa0a5}',
      '.ac-us-signal.big{width:22px;height:22px;font-size:12px;margin-right:4px}',
      '#acUnifiedStatusTrigger[data-overall="green"]{border-color:#a7d8b9}',
      '#acUnifiedStatusTrigger[data-overall="red"]{border-color:#e8adb2}',
      '@media(max-width:430px){body>#acSharedToolstrip .ac-toolstrip-inner{gap:2px!important;width:100%!important;min-width:0!important}body>#acSharedToolstrip .ac-toolstrip-inner>.ac-sep{display:none!important}body>#acSharedToolstrip .ac-toolstrip-inner>.ac-toolbtn{min-width:29px!important;flex:0 1 34px!important;padding-left:2px!important;padding-right:2px!important}body>#acSharedToolstrip .ac-toolstrip-inner>.ac-toolbtn[aria-label="Companion menu"]{flex:0 0 34px!important;min-width:34px!important;margin-left:auto!important;position:sticky;right:0;z-index:3;background:#fffbe3!important}}',
      '.ac-version-stack{flex:0 0 38px!important;min-width:38px!important;max-width:38px!important;min-height:34px!important;height:34px!important;overflow:visible!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}',
      '.ac-toolstrip-inner{min-width:0!important}',
      '.ac-toolstrip-inner .ac-sep{flex-shrink:1!important}',
      '#acUnifiedStatusTrigger:focus-visible,.ac-us-card button:focus-visible{outline:3px solid #a88bd9;outline-offset:2px}',
      '#acUnifiedStatusModal{position:fixed;inset:0;z-index:17000;background:#201633a3;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}',
      '#acUnifiedStatusModal[hidden]{display:none!important}',
      '#acUnifiedStatusModal .ac-us-card{width:min(468px,100%);max-height:calc(100dvh - 24px);overflow:auto;overscroll-behavior:contain;border-radius:17px;background:white;color:#281b3d;padding:18px;box-sizing:border-box;box-shadow:0 18px 65px #180e3545;font:13px/1.45 system-ui,sans-serif}',
      '.ac-us-mainhead{display:flex;justify-content:space-between;align-items:start;gap:12px;margin-bottom:10px}',
      '.ac-us-mainhead h2{font-size:18px;line-height:1.2;margin:0;color:#3b235d}',
      '.ac-us-mainhead p{margin:3px 0 0;color:#756884;font-size:11px}',
      '.ac-us-close{font-size:25px!important;line-height:1!important;width:32px!important;height:32px!important;min-height:32px!important;padding:0!important;flex:0 0 32px;border:0!important;box-shadow:none!important;background:transparent!important;border-radius:50%!important;color:#766485!important;margin:0!important}',
      '.ac-us-close:hover{background:#f4eef9!important;color:#351d59!important}',
      '.ac-us-section{border-top:1px solid #e9e4f0;padding:12px 0 10px}',
      '.ac-us-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}',
      '.ac-us-head h3{font-size:14px;line-height:1.2;margin:0;color:#321b51;display:flex;align-items:center;gap:6px}',
      '.ac-us-version{font-weight:850;color:#67439b;font-size:12px}',
      '.ac-us-pill{font-size:10px;font-weight:800;padding:4px 8px;border-radius:99px;white-space:nowrap;background:#fff2dd;color:#8d5608}',
      '.ac-us-pill.good{background:#e3f6e9;color:#167642}',
      '.ac-us-pill.bad{background:#ffe9e9;color:#b02734}',
      '.ac-us-section .ac-us-note{font-size:11px;color:#756e7b;margin:5px 0;line-height:1.4}',
      '.ac-us-section .ac-us-error{font-size:11px;color:#b02734;margin:6px 0}',
      '.ac-us-summary{font-size:12px;margin:5px 0;font-weight:600}',
      '.ac-us-changes{padding-left:18px;margin:7px 0 0;font-size:11px;color:#52465f}',
      '.ac-us-changes li{margin:4px 0}',
      '.ac-us-rows{display:grid;gap:0}',
      '.ac-us-detail,.ac-us-minirow{display:flex;align-items:start;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid #f0edf4;font-size:11px}',
      '.ac-us-detail span,.ac-us-minirow span:first-child{color:#64566f}',
      '.ac-us-detail strong{margin-left:auto;text-align:right;font-weight:750}',
      '.ac-us-detail small{color:#8a8292}',
      '.ac-us-section button,.ac-us-foot button{min-height:36px;border:1px solid #dbceed;border-radius:9px;background:#fff;color:#56347f;font-weight:800;padding:7px 11px;font-size:12px;cursor:pointer;margin-top:7px}',
      '.ac-us-head>span:last-child{display:flex;align-items:center;gap:4px}',
      '.ac-us-minihead{display:inline-flex;align-items:center;gap:5px}',
      '.ac-us-tariff-row{display:grid;grid-template-columns:65px minmax(0,1fr);gap:6px}',
      '.ac-us-tariff-list{display:flex;flex-wrap:wrap;gap:4px 6px;justify-content:flex-end;text-align:right}',
      '.ac-us-tariff{font-size:10px;border-radius:8px;padding:2px 4px;white-space:nowrap}',
      '.ac-us-tariff.present{color:#157144;background:#edf8f0}',
      '.ac-us-tariff.absent{color:#887f8c;background:#f2f0f5}',
      '.ac-us-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '.ac-us-actions a{display:inline-flex;align-items:center;min-height:34px;border:1px solid #dbceed;border-radius:9px;background:#fff;color:#56347f;padding:5px 10px;font-size:12px;font-weight:800;text-decoration:none;margin-top:7px}',
      '.ac-us-release{padding:5px 0 9px;border-bottom:1px solid #e9e4f0}',
      '.ac-us-update-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;flex-wrap:wrap}',
      '.ac-us-update-head strong{flex:1;min-width:0;font-weight:600}',
      '.ac-us-update-head button{white-space:nowrap;font-size:11px;min-height:30px;margin:0}',
      '.ac-us-update-history{font-size:11px;margin-top:8px}',
      '.ac-us-update{padding:6px 0;border-top:1px solid #f0edf4}',
      '.ac-us-update small{display:block;color:#8a8292;font-size:10px}',
      '.ac-us-update ul{padding-left:18px;margin:5px 0}',
      '.ac-us-update-history>a{display:inline-block;margin:7px 0;color:#624198}',
      '.ac-us-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid #e9e4f0}',
      '.ac-us-foot .primary{background:#7645b9;color:white;border-color:#7645b9}',
      '#acUnifiedStatusMessage{font-size:11px;min-height:15px;color:#705887}',
      '#acUnifiedMenuLink{display:flex;align-items:center;gap:8px}',
      '.ac-us-demo{font-size:10px;color:#a63b49;font-weight:850;letter-spacing:.04em}'
    ].join('');
    document.head.appendChild(st);
  }
  function ensure() {
    css();
    var el=$(ID);if(el)return el;
    el=document.createElement('div');el.id=ID;el.hidden=true;
    el.innerHTML='<div class="ac-us-card" role="dialog" aria-modal="true" aria-labelledby="acUnifiedStatusHeading">'+
      '<div class="ac-us-mainhead"><div><h2 id="acUnifiedStatusHeading">App status & updates</h2>'+(demo?'<p class="ac-us-demo">DEMO DATA</p>':'')+'</div>'+
      '<button type="button" class="ac-us-close" aria-label="Close status" title="Close status" data-us-action="close">&times;</button></div>'+
      '<div id="acUnifiedStatusContent"></div>'+
      '<div class="ac-us-foot"><span id="acUnifiedStatusMessage" role="status" aria-live="polite"></span>'+
      '<div><button type="button" data-us-action="refresh">Refresh status</button> '+
      '<button type="button" class="primary" data-us-action="close">Done</button></div></div></div>';
    el.addEventListener('click', function(e){
      if(e.target===el)return close();
      var action=e.target.closest('[data-us-action]');if(!action)return;
      var a=action.getAttribute('data-us-action');
      if(a==='close')close();
      else if(a==='refresh')refreshAll();
      else if(a==='updates'){updatesOpen=!updatesOpen;paint();}
      else if(a==='all-customers'){
        var allCustomers=$('cloudCustomerShortcut')||document.querySelector('[data-cloud-action="all-customers"]');
        if(allCustomers){close();allCustomers.click();}
      }
      else if(a==='tariff')refreshTariff();
      else if(a==='device-only' || a==='cloud-only'){
        var browser=global.AppointmentCompanionConsolidated;
        if(browser&&typeof browser.openCustomerBrowser==='function'){
          close();browser.openCustomerBrowser({scope:a==='device-only'?'localOnly':'cloudOnly'});
        }
      }
      else if(a==='review-customers'){
        var engine=global.AppointmentCompanionConsolidated;
        if(engine && typeof engine.openCustomerBrowser==='function'){
          close();engine.openCustomerBrowser({conflictsOnly:true});
        } else {
          var list=$('cloudCustomerShortcut')||document.querySelector('[data-cloud-action="all-customers"]');
          if(list){close();list.click();}
          else showMessage('Open Customers on this device from the main menu to review the conflict.');
        }
      }
      else if(a==='connect') {close(); var b=$('cloudSettingsConnect')||document.querySelector('[data-cloud-action="settings"]');if(b)b.click();}
    });
    document.body.appendChild(el);
    return el;
  }
  function paint() {
    if(trigger){
      var all=overallStatus();
      trigger.dataset.overall=all.state;
      var tray=trigger.querySelector('.ac-us-signals');
      if(tray)tray.innerHTML=signals();
      trigger.title='App status & updates - '+all.label;
      trigger.setAttribute('aria-label',trigger.title);
    }
    var target=$('acUnifiedStatusContent');if(!target)return;
    target.innerHTML=appSection()+tariffSection()+customerSection()+partnerSection();
  }
  function showMessage(msg){var e=$('acUnifiedStatusMessage');if(e)e.textContent=msg||'';}
  function onEsc(e){if(e.key==='Escape')close();}
  function open() {
    previousFocus=document.activeElement;
    ensure().hidden=false;
    document.addEventListener('keydown',onEsc);
    paint();showMessage('');
    var closeBtn=document.querySelector('#'+ID+' [data-us-action="close"]');
    if(closeBtn)closeBtn.focus();
    refreshAll();
  }
  function close(){
    var m=$(ID);if(m)m.hidden=true;
    document.removeEventListener('keydown',onEsc);
    checkSeq++;
    if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
  }
  function refreshTariff(){
    if(demo){showMessage('Demo data - no live tariff request made.');return;}
    var api=global.AppointmentCompanionTariffsV242;
    if(!api||typeof api.refresh!=='function'){showMessage('Tariff refresh is currently unavailable.');return;}
    if(!confirm('Refreshing tariff data reloads Appointment Companion. Save any unsaved work before continuing. Refresh now?'))return;
    showMessage('Refreshing tariff data…');
    try {Promise.resolve(api.refresh()).then(function(){paint();showMessage('Tariff refresh finished.');},function(){paint();showMessage('Could not refresh tariff data.');});}
    catch(_){showMessage('Could not refresh tariff data.');}
  }
  function timeout(promise, ms) {
    return new Promise(function(resolve) {
      var finished=false,t=setTimeout(function(){if(!finished){finished=true;resolve({ok:false,error:'Timed out'});}},ms);
      Promise.resolve(promise).then(function(data){if(!finished){finished=true;clearTimeout(t);resolve({ok:true,data:data});}},
        function(e){if(!finished){finished=true;clearTimeout(t);resolve({ok:false,error:String(e&&e.message||e)});}});
    });
  }
  async function refreshCustomerSync(sequence, background) {
    if(demo){sync={mode:'synced',detail:'Three example customers synchronised',count:3,pending:0,conflicts:0,localOnly:0,localIds:['demo1','demo2','demo3'],current:'Example customer synced',local:'Saved locally'};paint();return;}
    var engine=global.AppointmentCompanionConsolidated;
    var localHealth=$('cloudLocalState');
    sync.local=localHealth ? (localHealth.classList.contains('warn')?'Saving latest changes…':'Local save indicator healthy') : 'Local save status unavailable';
    if(!engine||typeof engine.list!=='function'){sync.mode='checking';sync.detail='Customer store unavailable';paint();return;}
    try{
      var rows=await engine.list();
      if(sequence!==checkSeq || (!background && (!$(ID) || $(ID).hidden)))return;
      rows=Array.isArray(rows)?rows:[];
      var meaningful=rows.filter(function(r){return r&&(String(r.customer_name||'').trim()||r.deleted||r.tombstone);});
      // A draft is intentionally local until Save to Cloud is explicitly approved.
      var pending=meaningful.filter(function(r){return (r.sync_state==='pending'||r.sync_state==='pending_delete') &&
        (r.cloud_id || r.cloud_creation_approved || r.deleted);});
      var conflicts=meaningful.filter(function(r){return r.sync_state==='conflict'||r.conflict;});
      var current=typeof engine.currentRecord==='function'?engine.currentRecord():null;
      var currentMessage='';
      if(current&&String(current.customer_name||'').trim()){
        if(current.sync_state==='conflict'||current.conflict)currentMessage='Current customer: sync conflict';
        else if(current.sync_state==='pending'&&current.cloud_id)currentMessage='Current customer: awaiting Cloud sync';
        else if(!current.cloud_id&&!current.cloud_creation_approved)currentMessage='Current customer: saved on this device only';
        else if(current.cloud_id&&current.sync_state==='synced'&&Number(current.cloud_synced_local_revision)===Number(current.local_revision))currentMessage='Current customer: synced to Cloud';
        else if(!current.cloud_id&&!current.cloud_creation_approved)currentMessage='Current customer: local draft (not sent to Cloud)';
        else currentMessage='Current customer: Cloud sync status not confirmed';
      }
      var localRevisionSynced=!!(current&&current.cloud_id&&current.sync_state==='synced'&&
      Number(current.cloud_synced_local_revision)===Number(current.local_revision));
    var currentIsSynced=localRevisionSynced && Array.isArray(cloud.customerIds) &&
      cloud.customerIds.includes(String(current.cloud_id));
    var currentPending=!!(current&&String(current.customer_name||'').trim()&&!currentIsSynced);
      sync={mode:conflicts.length?'conflict':pending.length?'checking':currentIsSynced?'synced':'local',
        detail:conflicts.length?'Some customers have Cloud sync conflicts':pending.length?'Some customers are waiting to sync':'Local profiles checked. Deliberate drafts may remain on this device.',
        count:meaningful.filter(function(r){return !r.deleted && !r.tombstone && String(r.customer_name||'').trim();}).length,
        pending:pending.length,conflicts:conflicts.length,
        localOnly:meaningful.filter(function(r){return !r.deleted && !r.tombstone && String(r.customer_name||'').trim() && !r.cloud_id;}).length,
        localIds:meaningful.filter(function(r){return !r.deleted && !r.tombstone && String(r.customer_name||'').trim() && r.cloud_id;})
          .map(function(r){return String(r.cloud_id);}),
        current:currentMessage,local:sync.local,currentSynced:currentIsSynced,currentPending:currentPending,
        currentCloudId:current&&current.cloud_id||'',currentRevisionSynced:localRevisionSynced,
        currentConflict:!!(current&&(current.conflict||current.sync_state==='conflict'))};
    }catch(e){sync.mode='failed';sync.detail='Could not read saved customer profiles';}
    if(sequence===checkSeq)paint();
  }
  async function refreshCloud(sequence) {
    if(demo){cloud={connection:'verified',profile:'loaded',message:'Example login verified',profileName:'Demo Partner',customerCount:3,customerIds:['demo1','demo2','demo3'],error:''};paint();return;}
    var auth=ownAuth();
    if(!auth){cloud={connection:'disconnected',profile:'failed',message:'Not signed in to Companion Cloud',profileName:'',customerCount:null,error:''};paint();return;}
    var cached=localPartner(auth);
    // Retain an already verified same-user status whilst rechecking; never inherit
    // somebody else's green result after changing Companion login.
    var sameOwner=cloud.owner===String(auth.partner_id).trim().toLowerCase();
    if(!(sameOwner && cloud.connection==='verified' && cloud.profile==='loaded')) {
      cloud={connection:'checking',profile:'checking',message:'Checking Cloud with your saved Companion login…',
        profileName:cached?cached.name:'',customerCount:null,error:'',owner:''};
    }
    paint();
    if(global.__AC_LOCAL_ONLY){
      cloud.connection='saved';cloud.profile=cached?'cached':'failed';
      cloud.message='Local-only mode: Cloud verification paused on this device.';
      paint();return;
    }
    var api=global.AppointmentCompanionCloud;
    if(!api||typeof api.listCustomers!=='function'||typeof api.getPartnerProfile!=='function'){
      cloud.connection='failed';cloud.profile=cached?'cached':'failed';cloud.message='The Cloud connection component did not load correctly. Refresh Appointment Companion.';paint();return;
    }
    var checks=await Promise.all([
      timeout(api.listCustomers(auth),6500),
      timeout(api.getPartnerProfile(auth),6500)
    ]);
    if(sequence!==checkSeq||!$(ID)||$(ID).hidden)return;
    var latestAuth=ownAuth();
    if(!latestAuth || latestAuth.partner_id!==auth.partner_id || latestAuth.workspace_key!==auth.workspace_key){
      refreshAll();return;
    }
    cloud.owner=String(auth.partner_id).trim().toLowerCase();
    var clients=checks[0],p=checks[1];
    cloud.connection=clients.ok?'verified':'failed';
    cloud.message=clients.ok?'Companion login verified with Cloud.':'Cloud login could not be verified just now.';
    cloud.customerCount=clients.ok&&Array.isArray(clients.data.customers)?clients.data.customers.length:null;
    cloud.customerIds=clients.ok&&Array.isArray(clients.data.customers)?
      clients.data.customers.filter(function(r){return r&&r.customer_id;})
        .map(function(r){return String(r.customer_id);}):null;
    var candidate=p.ok&&p.data?p.data.partner:null;
    // The authenticated getPartnerProfile endpoint can return legacy records
    // without a partner_id. Accept those only if no conflicting ID is present.
    var returnedId=String(candidate&&(candidate.partner_id||candidate.companion_login_id)||'').trim().toLowerCase();
    var verified=candidate&&String(candidate.name||'').trim()&&(!returnedId||returnedId===String(auth.partner_id).trim().toLowerCase())?candidate:null;
    cloud.profile=verified?'loaded':cached?'cached':'failed';
    cloud.profileName=verified?verified.name:cached?cached.name:'';
    cloud.error=(!clients.ok||!p.ok)?('Cloud checks: '+(!clients.ok?'connection '+(clients.error||'unavailable')+'; ':'')+(!p.ok?'profile '+(p.error||'unavailable'):'')).slice(0,220):'';
    paint();
  }
  function refreshAll(){
    if(!$(ID)||$(ID).hidden)return;
    var seq=++checkSeq;
    paint();showMessage(demo?'Preview uses fictional status values.':'Checking status…');
    Promise.all([refreshCloud(seq),refreshCustomerSync(seq)]).then(function(){
      if(seq===checkSeq&&$(ID)&&!$(ID).hidden){paint();showMessage(demo?'Demonstration only.':'Status checked.');}
    });
  }
  function install(){
    var version=document.querySelector('.ac-version-mini'),rag=$('acTariffHealth242');
    if(!version)return false;
    var stack=version.closest('.ac-version-stack');
    if(!stack){stack=document.createElement('span');stack.className='ac-version-stack';version.parentNode.insertBefore(stack,version);stack.appendChild(version);}
    if($('acUnifiedStatusTrigger'))return true;
    css();
    version.style.display='none';if(rag)rag.style.display='none';
    trigger=document.createElement('button');trigger.id='acUnifiedStatusTrigger';trigger.type='button';
    trigger.innerHTML='<span class="ac-us-version-top">'+esc(meta.version.replace(/^(v\d+\.\d+)\.\d+$/, '$1'))+'</span>'+
      '<span class="ac-us-signals" aria-hidden="true">'+signals()+'</span>';
    stack.insertBefore(trigger,version);
    trigger.addEventListener('click',open);
    paint();
    if(!demo){
      var menu=$('cloudMenuPopover');
      if(menu&&!$('acUnifiedMenuLink')){
        var b=document.createElement('button');b.className='pill cloud-menu-item';b.type='button';b.id='acUnifiedMenuLink';
        b.innerHTML='<span class="menu-ico">🔎</span><span>App status & updates</span>';
        b.addEventListener('click',function(){menu.classList.remove('open');open();});
        var settings=menu.querySelector('[data-cloud-action="settings"]');
        if(settings)menu.insertBefore(b,settings);else menu.appendChild(b);
      }
    }
    ['checking','changed','error','verified'].forEach(function(name){global.addEventListener('ac:tariffs:'+name,paint);});
    // Routine customer sync checks local records but never restarts remote Partner verification.
    global.addEventListener('ac:cloud-sync-state-changed',function(){refreshCustomerSync(checkSeq,true);});
    ['ac:cloud-authenticated','ac:cloud-disconnected'].forEach(function(name){
      global.addEventListener(name,function(){
        // A new authenticated session, including changed credentials for the
        // same Partner ID, must never inherit the previous session's green result.
        cloud.connection=name==='ac:cloud-disconnected'?'disconnected':'idle';
        cloud.profile=name==='ac:cloud-disconnected'?'failed':'idle';
        cloud.owner='';
        cloud.customerIds=null;
        cloud.customerCount=null;
        if($(ID)&&!$(ID).hidden)refreshAll();
        else paint();
      });
    });
    global.addEventListener('ac:partner-profile-ready',function(){
      var cached=localPartner(ownAuth());
      if(cached && cloud.connection==='verified' && cloud.profile==='loaded')cloud.profileName=cached.name;
      paint();
    });
    refreshCustomerSync(checkSeq,true);
    return true;
  }
  var tries=0,work=setInterval(function(){if(install()||++tries>240)clearInterval(work);},50);
  global.AppointmentCompanionUnifiedStatus={open:open,refresh:refreshAll,version:meta.version};
})(window);
