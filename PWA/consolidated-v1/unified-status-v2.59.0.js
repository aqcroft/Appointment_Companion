/* Appointment Companion v2.66.12 - unified renewal chart and standalone tariff selection.
   Read-only reporting. Real Cloud checks run only when the modal is opened/refreshed.
   All status dimensions are independent: a green tariff light is NOT Cloud health.
   A dedicated fixture mode runs the EXACT SAME modal UI without reading live data.
*/
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view') || /(?:^|[?&])public=1(?:&|$)/.test(String((global.location && global.location.search) || ''))) return;
  var demo = !!global.__AC_UNIFIED_STATUS_PREVIEW;
  var meta = Object.freeze({
    version: 'v2.66.12',
    date: '28 October 2026',
    summary: 'Cleaner renewal comparison and more vibrant tariff colours',
    changes: [
      'Removed the redundant Current monthly payment / Budget Plan question; actual tariff calculations use usage and rates, not payment instalments.',
      'Existing-customer results now lead directly with three colour-coded options and the chart, without the extra heading, narrative or routine Ready to share message.',
      'Brightened and separated the red, orange and green line, key and hero card colours while preserving sharing safeguards and previous-tariff reference.',
      'Existing-customer chart legend is now stacked red, amber and green by cost; names and monthly equivalents use matching colours.',
      'The previous variable Double Gold chart label is shortened to Variable; close-priced fixes remain separately identified.',
      'Prospective chart legend shows the corresponding average full-month cost for Fixed, Tracker and Variable in their established line colours.',
      'Prospective chart now displays full-calendar-month equivalents at the start and end, avoiding near-zero October points; totals and quarterly calculations stay pro-rated.',
      'Existing-customer chart keeps the previous tariff in grey, removes the flat Budget Plan line and displays the red/amber/green names vertically inside the left chart margin.',
      'Three tappable summary cards now have subtle matching tints; the public fixed tariff line is dashed to distinguish close-priced alternatives.',
      'The renewal legend now sits left of the chart: red/amber/green, ordered most expensive to cheapest, with vertical monthly estimates.',
      'The three tappable option cards remain unchanged; month and price-cap quarter columns remain aligned.',
      'Standalone Existing customers opens the live historical tariff-selector builder rather than legacy manual inputs.',
      'Existing-customer month markers now line up with the appropriate quarters in the table underneath, using shared chart geometry.',
      'The three comparison options have one distinct green, amber and red line each - without a duplicated red variable line.',
      'Budget Plan and previous-cost references remain differentiated and the quarterly numbers still fit on a mobile screen.',
      'Tariff maths, mode switching, forecast scenario controls and verified customer-link safeguards are unchanged.',
      'Existing-customer chart and quarterly breakdown now fit the mobile viewport without sideways scrolling.',
      'Five price-cap quarters and three tariff rows mirror the clean prospective comparison layout.',
      'Colour-coded cost totals remain visible; detailed chart methodology is behind How these estimates work.',
      'The historical rate feed, customer sharing guard and manual rate options remain unchanged.',
      'Should I Fix uses the same visible app version as Appointment Companion: v2.66.12.',
      'Existing-customer tariff shortcuts are now 66 / 65 / Choose and 100 / 99 / Choose, each with a manual-rate settings cog.',
      'Tariff details are available on demand; lengthy selection confirmations are hidden without removing the archive or calculations.',
      'Manually entered renewal rates remain on-screen scenarios only and cannot generate verified customer-sharing links.',
      'Existing-customer quick offers now include only Fixed 99 and 100, with a separate tariff chooser.',
      'Historical fixed labels distinguish the April 2026 rate version.',
      'Tap a result card for modelled gas/electricity averages, fixed base rates and variable forecast cautions.',
      'Quarterly prices align beneath the forecast graph, and the main prospective headline is restored.',
      'Only one Prospective customers / Existing customers switch appears in the integrated Should I Fix tool.',
      'Switching modes preserves entered customer details, without reloading either calculator.',
      'The renewal screen no longer shows the misleading Standalone calculator header note.',
      'Existing customers keep their dedicated renewal sharing controls, not the prospective Share card.',
      'Prospective customers continue to use the original live tariff calculator and verified sharing safeguards.',
      'Historical renewal rates still load automatically from the verified Apps Script v18 tariff archive.',
      'Region and annual usage are transferred from the appointment when available; public share routes remain separate.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  var ID = 'acUnifiedStatusModal', trigger = null, checkSeq = 0, previousFocus = null, waitTimer = null, updatesOpen = false;
  var cloudFlight=null,flightAuth=null,cloudNonce=0,localNonce=0,lastCloudCheckAt=0,lastVerifiedAt=0,queuedRefresh=null;
  var CLOUD_CHECK_INTERVAL=120000;
  var manualCustomerSyncRunning=false,manualCloudSaveRunning=false;
  function sameAuth(a,b){return !!(a&&b&&String(a.partner_id)===String(b.partner_id)&&String(a.workspace_key)===String(b.workspace_key));}
  function modalVisible(){var el=$(ID);return !!(el&&!el.hidden);}
  function queueRefresh(delay,force){
    clearTimeout(queuedRefresh);
    queuedRefresh=setTimeout(function(){refreshAll(!!force);},delay||0);
  }
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
    // A blank current customer or intentionally local draft is not a Cloud failure.
    // A Cloud-backed current customer must really be synchronised.
    var currentNeedsAttention=!!(sync.currentNeedsCloud && !sync.currentSynced);
    var customersReady=cloud.connection==='verified' && sync.checked===true &&
      Array.isArray(cloud.customerIds) && sync.pending===0 && sync.conflicts===0 &&
      !sync.currentConflict && !currentNeedsAttention;
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
    if (status==='pending') return 'Waiting to sync';
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
      {version:'v2.64.6',date:'17 October 2026',summary:'Four forecast scenarios: 0%, 15%, 25% and 30%'},
      {version:'v2.64.5',date:'17 October 2026',summary:'Should I Fix MSE forecast refreshed to 25%'},
      {version:'v2.64.4',date:'17 October 2026',summary:'Verified Partner details in shared tools'},
      {version:'v2.64.2',date:'16 October 2026',summary:'Reliable EV shared-header regression verification'},
      {version:'v2.64.1',date:'16 October 2026',summary:'Fix shared EV header and consolidate legacy CI'},
      {version:'v2.64.0',date:'16 October 2026',summary:'More reliable SIMs, Cloud saving and menus'},
      {version:'v2.63.3',date:'15 October 2026',summary:'Safe handling of deleted Cloud records and stable customer sync'},
      {version:'v2.63.2',date:'15 October 2026',summary:'Manual Cloud sync and pending customer review'},
      {version:'v2.63.1',date:'15 October 2026',summary:'Accurate conflict reviews and meaningful customer saves'},
      {version:'v2.63.0',date:'15 October 2026',summary:'One-row customer header and confirmed-name saves'},
      {version:'v2.62.5',date:'15 October 2026',summary:'Responsive three-light status checks'},
      {version:'v2.62.4',date:'15 October 2026',summary:'Tracker solid for published quarter, dashed for forecast'},
      {version:'v2.62.3',date:'15 October 2026',summary:'Live tariff versions in the chart key and electricity-first fuel buttons'},
      {version:'v2.62.2',date:'15 October 2026',summary:'Flat Partner menus across the tools'},
      {version:'v2.62.1',date:'15 October 2026',summary:'First version of simplified Companion menus'},
      {version:'v2.62.0',date:'15 October 2026',summary:'Quarterly kWh in Should I Fix'}
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
    var canSaveCurrent=!demo&&!manualCloudSaveRunning&&!!sync.currentIsLocalDraft&&!!sync.currentLocalId;
    var local=demo?'Saved locally':sync.local;
    var cloudOnly=demo?0:cloudOnlyCount();
    var cloudCount=demo?3:cloud.customerCount;
    var connection=demo?'verified':cloud.connection;
    var engine=global.AppointmentCompanionConsolidated;
    var recentSync=!demo&&engine&&typeof engine.syncHealth==='function'?engine.syncHealth():null;
    var syncNote='';
    if(!demo&&recentSync){
      if(recentSync.state==='running')syncNote='<p class="ac-us-note">Customer synchronisation is running. Please leave the app open.</p>';
      else if(recentSync.completedAt){
        syncNote='<p class="ac-us-note">Last customer sync: '+esc(readable(recentSync.completedAt))+
          ' · '+esc(recentSync.state==='completed'?'Check finished':recentSync.state==='incomplete'?'Some updates failed':'Sync failed')+
          ' ('+esc(recentSync.attempted||0)+' attempted, '+esc(recentSync.failed||0)+' failed).</p>'+
          (recentSync.error?'<p class="ac-us-error">Reason: '+esc(String(recentSync.error).slice(0,250))+'</p>':'');
      }
    }
    var details='<div class="ac-us-minirow"><span>Cloud connection</span>'+badge('cloud',connection)+'</div>'+
      '<p class="ac-us-note">'+esc(demo?'Cloud connected':cloud.message || 'Cloud status not yet checked')+'</p>'+
      '<p class="ac-us-note">'+esc(explanation)+'</p>'+
      (customerCount==null?'':'<div class="ac-us-minirow"><span>Customer profiles on this device</span><strong>'+customerCount+'</strong></div>')+
      '<div class="ac-us-minirow"><span>On device only (not in Cloud)</span><button type="button" data-us-action="device-only">'+esc(demo?0:deviceOnlyCount()==null?'Checking…':deviceOnlyCount())+' · View →</button></div>'+
      '<div class="ac-us-minirow"><span>In Cloud only (not on this device)</span><button type="button" data-us-action="cloud-only">'+esc(cloudOnly==null?'Not checked':cloudOnly)+' · View →</button></div>'+
      (cloudCount==null?'':'<div class="ac-us-minirow"><span>Total customers in Cloud</span><strong>'+cloudCount+'</strong></div>')+
      (current?'<p class="ac-us-note">'+esc(current)+'</p>':'')+
      (sync.conflicts && !demo?'<p class="ac-us-error">'+sync.conflicts+' sync conflict(s) need attention. Please review both versions before deciding which to keep.</p>':'')+
      (sync.pending && !demo?'<p class="ac-us-note">'+sync.pending+' Cloud-linked profile(s) awaiting a confirmed sync.</p>':'')+
      syncNote+
      (sync.conflicts && !demo?'<button type="button" data-us-action="review-customers">Review '+sync.conflicts+' conflict'+(sync.conflicts===1?'':'s')+' →</button>':'')+
      (!sync.conflicts && sync.pending && !demo?'<button type="button" data-us-action="pending-customers">Review '+sync.pending+' pending →</button>':'')+
      (!sync.conflicts && !demo?'<button type="button" data-us-action="all-customers">View customer records →</button>':'')+
      (canSaveCurrent && engine && typeof engine.saveLocalToCloud==='function'?
        '<button type="button" data-us-action="save-current-cloud">☁️ Save current customer to Cloud</button>':'')+
      (!demo?'<button type="button" data-us-action="sync-customers"'+(manualCustomerSyncRunning?' disabled aria-disabled="true"':'')+'>'+
        (manualCustomerSyncRunning?'Synchronising…':'Sync customers now')+'</button>':'')+
      '<div class="ac-us-minirow"><span>Local device save</span><span>'+esc(local)+'</span></div>';
    var customerTraffic=dimensions().find(function(d){return d.key==='customer';}).state;
    var customerBadge=demo?'synced':
      sync.conflicts>0 || sync.mode==='conflict'?'conflict':
      sync.mode==='failed' || cloud.connection==='failed'?'failed':
      cloud.connection==='disconnected'?'disconnected':
      customerTraffic==='green'?'synced':sync.pending>0?'pending':'checking';
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
      else if(a==='refresh')refreshAll(true);
      else if(a==='updates'){updatesOpen=!updatesOpen;paint();}
      else if(a==='all-customers'){
        var allCustomers=$('cloudCustomerShortcut')||document.querySelector('[data-cloud-action="all-customers"]');
        if(allCustomers){close();allCustomers.click();}
      }
      else if(a==='tariff')refreshTariff();
      else if(a==='sync-customers')syncCustomersNow();
      else if(a==='save-current-cloud')saveCurrentToCloud();
      else if(a==='pending-customers'){
        var pendingBrowser=global.AppointmentCompanionConsolidated;
        if(pendingBrowser&&typeof pendingBrowser.openCustomerBrowser==='function'){
          close();pendingBrowser.openCustomerBrowser({scope:'pending'});
        }
      }
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
    refreshAll(false);
  }
  function close(){
    var m=$(ID);if(m)m.hidden=true;
    document.removeEventListener('keydown',onEsc);
    // Let background checks finish even when the status window closes.
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
    var requestId=++localNonce;
    if(demo){
      sync={mode:'synced',checked:true,detail:'Three example customers synchronised',count:3,pending:0,conflicts:0,localOnly:0,
        localIds:['demo1','demo2','demo3'],current:'Example customer synced',local:'Saved locally'};
      paint();return;
    }
    var engine=global.AppointmentCompanionConsolidated,store=global.AppointmentCompanionLocalStore;
    var localHealth=$('cloudLocalState');
    var localHint=localHealth?String(localHealth.title||''):'';
    var localLabel=!localHealth?'Local save status unavailable':
      /Saving this local revision/i.test(localHint)?'Saving latest changes…':
      /Local persistence needs attention/i.test(localHint)?'Local save needs attention':
      /Unsaved working draft/i.test(localHint)?'New customer not saved yet':
      /Customer record saved on this device/i.test(localHint)?'Current customer saved on this device':
      localHint||'Local save status unavailable';
    // Include tombstones so pending Cloud deletions cannot be hidden by the default list filter.
    var list=store&&typeof store.list==='function'?function(){return store.list(true); }:
      engine&&typeof engine.list==='function'?engine.list.bind(engine):null;
    if(!list){sync.mode='checking';sync.checked=false;sync.detail='Local customer store not ready';sync.local=localLabel;paint();return;}
    try{
      var rows=await list();
      if(sequence!==checkSeq||requestId!==localNonce)return;
      rows=Array.isArray(rows)?rows:[];
      var meaningful=rows.filter(function(r){return r&&(String(r.customer_name||'').trim()||r.deleted||r.tombstone);});
      var pending=meaningful.filter(function(r){return (r.sync_state==='pending'||r.sync_state==='pending_delete') &&
        (r.cloud_id||r.cloud_creation_approved||r.deleted);});
      var conflicts=meaningful.filter(function(r){return r.sync_state==='conflict'||r.conflict;});
      var current=engine&&typeof engine.currentRecord==='function'?engine.currentRecord():null;
      if(!current){
        var selected='';
        try{selected=String(sessionStorage.getItem('apptCompanionConsolidatedCurrentV1')||'');}catch(_){}
        if(selected)current=rows.find(function(r){return String(r.local_id)===selected;})||null;
      }
      var named=!!(current&&String(current.customer_name||'').trim());
      var currentNeedsCloud=!!(named&&(current.cloud_id||current.cloud_creation_approved||current.deleted));
      var revisionSynced=!!(current&&current.cloud_id&&current.sync_state==='synced'&&
        Number(current.cloud_synced_local_revision)===Number(current.local_revision));
      var currentSynced=!!(revisionSynced&&Array.isArray(cloud.customerIds)&&cloud.customerIds.includes(String(current.cloud_id)));
      var currentMessage='';
      if(named){
        if(current.sync_state==='conflict'||current.conflict)currentMessage='Current customer: sync conflict';
        else if(currentNeedsCloud&&!currentSynced)currentMessage='Current customer: awaiting Cloud verification or sync';
        else if(currentSynced)currentMessage='Current customer: synced to Cloud';
        else currentMessage='Current customer: intentionally saved on this device';
      }
      sync={
        mode:conflicts.length?'conflict':pending.length?'pending':currentNeedsCloud&&!currentSynced?'pending':'synced',
        checked:true,
        detail:conflicts.length?'Some customers have Cloud sync conflicts':
          pending.length?'Some customers are waiting to sync':
          currentNeedsCloud&&!currentSynced?'Current customer awaiting Cloud sync or verification':
          'Local records checked. Intentionally local drafts do not require Cloud sync.',
        count:meaningful.filter(function(r){return !r.deleted&&!r.tombstone&&String(r.customer_name||'').trim();}).length,
        pending:pending.length,conflicts:conflicts.length,
        localOnly:meaningful.filter(function(r){return !r.deleted&&!r.tombstone&&String(r.customer_name||'').trim()&&!r.cloud_id;}).length,
        localIds:meaningful.filter(function(r){return r.cloud_id;})
          .map(function(r){return String(r.cloud_id);}),
        current:currentMessage,local:localLabel,currentSynced:currentSynced,
        currentLocalId:current&&current.local_id||'',
        currentIsLocalDraft:!!(named&&!current.cloud_id&&!current.cloud_creation_approved&&!current.deleted),
        currentCloudId:current&&current.cloud_id||'',currentRevisionSynced:revisionSynced,
        currentNeedsCloud:currentNeedsCloud,currentConflict:!!(current&&(current.conflict||current.sync_state==='conflict'))
      };
    }catch(e){
      if(sequence!==checkSeq||requestId!==localNonce)return;
      sync.mode='failed';sync.checked=false;sync.detail='Could not read saved customer profiles';
    }
    if(sequence===checkSeq&&requestId===localNonce)paint();
  }
  async function refreshCloud(sequence, force) {
    if(demo){cloud={connection:'verified',profile:'loaded',message:'Example login verified',profileName:'Demo Partner',customerCount:3,customerIds:['demo1','demo2','demo3'],error:''};paint();return;}
    var auth=ownAuth();
    if(!auth){
      ++cloudNonce;cloudFlight=null;flightAuth=null;lastCloudCheckAt=0;lastVerifiedAt=0;
      cloud={connection:'disconnected',profile:'failed',message:'Not signed in to Companion Cloud',profileName:'',customerCount:null,customerIds:null,error:'',owner:''};
      paint();return;
    }
    var cached=localPartner(auth),owner=String(auth.partner_id).trim().toLowerCase();
    if(global.__AC_LOCAL_ONLY){
      cloud.connection='saved';cloud.profile=cached?'cached':'checking';cloud.profileName=cached?cached.name:'';
      cloud.customerIds=null;cloud.owner='';cloud.message='Local-only mode: remote verification paused on this device.';
      paint();return;
    }
    var api=global.AppointmentCompanionCloud;
    if(!api||typeof api.listCustomers!=='function'||typeof api.getPartnerProfile!=='function'){
      cloud.connection='failed';cloud.profile=cached?'cached':'failed';
      cloud.customerIds=null;cloud.message='Cloud connection component unavailable. Refresh the Companion.';paint();return;
    }
    // Reuse an in-progress check and avoid excessive identical Apps Script calls.
    if(cloudFlight&&sameAuth(flightAuth,auth))return cloudFlight;
    var recentVerified=cloud.connection==='verified'&&cloud.profile==='loaded';
    var cooldown=recentVerified?CLOUD_CHECK_INTERVAL:20000;
    if(!force&&cloud.owner===owner&&lastCloudCheckAt&&Date.now()-lastCloudCheckAt<cooldown){paint();return;}
    if(cloudFlight){++cloudNonce;cloudFlight=null;flightAuth=null;}
    var sameOwner=cloud.owner===owner&&lastVerifiedAt>0;
    if(!sameOwner){
      cloud={connection:'checking',profile:'checking',message:'Verifying Cloud and Partner account…',
        profileName:cached?cached.name:'',customerCount:null,customerIds:null,error:'',owner:''};
      paint();
    }
    var nonce=++cloudNonce;
    lastCloudCheckAt=Date.now();
    flightAuth=auth;
    cloudFlight=(async function(){
      var checks=await Promise.all([
        timeout(api.listCustomers(auth),12000),
        timeout(api.getPartnerProfile(auth),12000)
      ]);
      if(nonce!==cloudNonce)return;
      var latest=ownAuth();
      if(!sameAuth(latest,auth)){queueRefresh(300,true);return;}
      var clients=checks[0],p=checks[1],listOk=clients.ok&&clients.data&&Array.isArray(clients.data.customers);
      var candidate=p.ok&&p.data?p.data.partner:null;
      var returnedId=String(candidate&&(candidate.partner_id||candidate.companion_login_id)||'').trim().toLowerCase();
      var verified=!!(candidate&&String(candidate.name||'').trim()&&(!returnedId||returnedId===owner));
      cloud.owner=owner;
      cloud.connection=listOk?'verified':'failed';
      cloud.message=listOk?'Companion login and customer list verified with Cloud.':'Cloud customer list could not be verified just now.';
      cloud.customerCount=listOk?clients.data.customers.length:null;
      cloud.customerIds=listOk?clients.data.customers.filter(function(r){return r&&r.customer_id;}).map(function(r){return String(r.customer_id);}):null;
      cloud.profile=verified?'loaded':returnedId&&returnedId!==owner?'failed':cached?'cached':'failed';
      cloud.profileName=verified?candidate.name:cached?cached.name:'';
      cloud.error=(!clients.ok||!p.ok)?('Cloud checks: '+(!clients.ok?'connection '+(clients.error||'unavailable')+'; ':'')+(!p.ok?'profile '+(p.error||'unavailable'):'')).slice(0,220):'';
      if(listOk&&verified)lastVerifiedAt=Date.now();
      paint();
      // Local state may have been checked before the verified Cloud IDs arrived.
      await refreshCustomerSync(checkSeq,true);
    })();
    try{return await cloudFlight;}
    finally{if(nonce===cloudNonce){cloudFlight=null;flightAuth=null;}}
  }
  async function saveCurrentToCloud(){
    if(manualCloudSaveRunning||demo)return;
    var engine=global.AppointmentCompanionConsolidated,id=sync.currentLocalId;
    if(!engine||typeof engine.saveLocalToCloud!=='function'||!id){showMessage('Open a named, saved customer first.');return;}
    if(!navigator.onLine||global.__AC_LOCAL_ONLY){showMessage('Cloud is offline or paused; the customer remains on this device.');return;}
    manualCloudSaveRunning=true;paint();showMessage('Checking the Cloud for existing customers before saving…');
    try {
      // The controller performs the duplicate-name check and obtains confirmation.
      var result=await engine.saveLocalToCloud(id);
      await refreshAll(true);
      showMessage(result&&result.message?String(result.message):
        'Cloud save requested. Please check the current customer and sync status.');
    }catch(error){
      await refreshAll(true);
      showMessage('Cloud save not completed: '+String(error&&error.message||error).slice(0,250));
    }finally{manualCloudSaveRunning=false;paint();}
  }
  async function syncCustomersNow(){
    if(manualCustomerSyncRunning)return;
    if(demo){showMessage('Preview - no live synchronisation attempted.');return;}
    var engine=global.AppointmentCompanionConsolidated;
    if(!engine||typeof engine.syncNow!=='function'){
      showMessage('Customer sync is not ready. Reopen the Companion and try again.');return;
    }
    if(!navigator.onLine){showMessage('Offline. Local records are safe; reconnect to sync.');return;}
    if(global.__AC_LOCAL_ONLY){showMessage('Local-only mode: Cloud sync is paused.');return;}
    manualCustomerSyncRunning=true;
    paint();showMessage('Synchronising Cloud-linked customers. Keep the app open…');
    try {
      var outcome=await engine.syncNow();
      if(outcome&&outcome.state==='running'){
        showMessage('A background customer sync is already running. Please wait for it to finish.');
        return;
      }
      await refreshAll(true);
      var reason=outcome&&outcome.error?String(outcome.error).slice(0,150):'';
      if(sync.conflicts)showMessage('Sync checked. '+sync.conflicts+' conflict(s) need review. No automatic conflict resolution was applied.');
      else if(sync.pending)showMessage('Sync checked. '+sync.pending+' profile(s) still pending.'+(reason?' '+reason:' Review pending for details.'));
      else showMessage('Customer sync verified. No Cloud-linked profiles remain pending.');
    } catch(err) {
      showMessage('Could not complete customer sync: '+String(err&&err.message||err).slice(0,180));
    } finally {
      manualCustomerSyncRunning=false;
      paint();
    }
  }
  function refreshAll(force){
    var seq=++checkSeq;
    paint();
    if(modalVisible())showMessage(demo?'Preview uses fictional status values.':'Checking status…');
    return Promise.all([refreshCloud(seq,!!force),refreshCustomerSync(seq,true)]).then(function(){
      if(seq===checkSeq){
        paint();
        if(modalVisible())showMessage(demo?'Demonstration only.':'Status checked.');
      }
    });
  }
  function checkSpecialistTariffs(){
    if(demo||!String(global.location.pathname||'').includes('/should-i-fix/'))return;
    var api=global.AppointmentCompanionTariffsV242;
    if(!api||typeof api.state!=='function'||!api.feed)return;
    try {
      // The chart runs in a separate-origin iframe, and cannot verify this
      // page's top-left tariff indicator without a separate parent check.
      if(api.state().status==='checking')global.fetch(api.feed,{cache:'no-store'}).catch(function(){paint();});
    }catch(_){paint();}
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
    global.addEventListener('ac:cloud-sync-state-changed',function(){
      refreshCustomerSync(checkSeq,true).then(function(){
        // A newly uploaded record can be synced locally before the Cloud ID list
        // refreshes. Verify immediately instead of leaving C amber for minutes.
        if(sync.currentRevisionSynced&&sync.currentCloudId&&
          Array.isArray(cloud.customerIds)&&!cloud.customerIds.includes(String(sync.currentCloudId))){
          queueRefresh(Math.max(600,1600-(Date.now()-lastCloudCheckAt)),true);
        }
      });
    });
    global.addEventListener('ac:customer-switched',function(){refreshCustomerSync(checkSeq,true);});
    global.addEventListener('ac:customer-name-committed',function(){refreshCustomerSync(checkSeq,true);});
    ['ac:cloud-authenticated','ac:cloud-disconnected'].forEach(function(name){
      global.addEventListener(name,function(){
        ++cloudNonce;cloudFlight=null;flightAuth=null;lastCloudCheckAt=0;lastVerifiedAt=0;
        cloud.connection=name==='ac:cloud-disconnected'?'disconnected':'checking';
        cloud.profile=name==='ac:cloud-disconnected'?'failed':'checking';
        cloud.owner='';cloud.customerIds=null;cloud.customerCount=null;
        if(name==='ac:cloud-authenticated')queueRefresh(300,true);
        paint();
      });
    });
    global.addEventListener('ac:partner-profile-ready',function(){
      var cached=localPartner(ownAuth());
      if(cached&&cloud.connection==='verified'&&cloud.profile==='loaded')cloud.profileName=cached.name;
      paint();
    });
    global.addEventListener('online',function(){queueRefresh(300,true);});
    global.addEventListener('offline',function(){
      ++cloudNonce;cloudFlight=null;flightAuth=null;
      cloud.connection='disconnected';cloud.message='Device offline. Cloud verification unavailable.';paint();
    });
    global.addEventListener('focus',function(){refreshAll(false);});
    document.addEventListener('visibilitychange',function(){if(!document.hidden)refreshAll(false);});
    setInterval(function(){if(!document.hidden)refreshAll(false);},180000);
    refreshCustomerSync(checkSeq,true);
    checkSpecialistTariffs();
    queueRefresh(400,false);
    return true;
  }
  var tries=0,work=setInterval(function(){if(install()||++tries>240)clearInterval(work);},50);
  global.AppointmentCompanionUnifiedStatus={open:open,refresh:function(){return refreshAll(true);},version:meta.version};
})(window);
