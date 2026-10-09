/* EV Companion v2.55.6 - customer-first exploration and basket handover. */
(function (global) {
  'use strict';
  var params = new URL(location.href).searchParams;
  if (!document.documentElement.classList.contains('shared-view') && !params.has('s')) return;

  var PROFILE = {
    name: 'Adrian Croft',
    role: 'UW Authorised Partner',
    photo: 'https://raw.githubusercontent.com/aqcroft/UW_PET_GH_v2/main/Adrian_Croft.jpg',
    whatsapp: 'https://wa.me/447787400800?text=' + encodeURIComponent("Hi Adrian, I've just used your EV comparison and I'd like to know more"),
    email: 'mailto:adrian.croft@uw.partners?subject=' + encodeURIComponent('EV comparison') + '&body=' + encodeURIComponent("Hi Adrian, I've just used your EV comparison and I'd like to know more"),
    phone: 'tel:+447787400800',
    booking: 'https://tidycal.com/aqcroft/uwpresent',
    quote: 'https://uw.partners/adrian.croft/join',
    site: 'https://aqcroft.com'
  };
  var WHATSAPP_ICON = '<svg viewBox="0 0 39 39" aria-hidden="true"><path fill="#00E676" d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.6 5.9 6-1.5z"/><path fill="#fff" d="M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9zM19.5 34.6c-2.7 0-5.4-.7-7.7-2.1l-.6-.3-5.8 1.5L6.9 28l-.4-.6c-4.4-7.1-2.3-16.5 4.9-20.9s16.5-2.3 20.9 4.9 2.3 16.5-4.9 20.9c-2.3 1.5-5.1 2.3-7.9 2.3zm8.8-11.1l-1.1-.5-2.6-1.2c-.3 0-.5.1-.7.2l-1.5 1.7c-.1.2-.3.3-.5.3-.2 0-.6-.2-.9-.4-1.5-.7-2.8-1.6-3.9-2.8-1-1.1-1.8-2.2-2.4-3.4-.2-.3 0-.6.2-.8l1-1.2c.2-.3.3-.7.2-1-.1-.5-1.3-3.2-1.6-3.8-.2-.3-.4-.4-.7-.5h-1.1c-.5.1-.9.3-1.3.7-1 .9-1.5 2.2-1.5 3.5 0 .8.2 1.6.5 2.3 1 2.2 2.5 4.1 4.3 5.8 2.2 2 4.8 3.4 7.7 4.1 1.1.3 2.4.2 3.4-.3 1-.5 1.8-1.3 2.2-2.3.2-.4.3-.9.4-1.4 0-.3-.1-.5-.4-.6z"/></svg>';

  function safeHttps(value) {
    try { var u = new URL(String(value || '')); return u.protocol === 'https:' ? u.href : ''; }
    catch (_) { return ''; }
  }
  function snapshot() { return global.__AppointmentCompanionEvSharedSnapshot || {}; }
  function basket() { return safeHttps(snapshot().basket_url); }

  function addStyles() {
    if (document.getElementById('acEvCustomerContactStyle')) return;
    var st = document.createElement('style');
    st.id = 'acEvCustomerContactStyle';
    st.textContent = [
      '.ac-ev-profile{position:fixed;top:10px;right:10px;z-index:9997;display:flex;flex-direction:column;align-items:flex-end;gap:7px}',
      '.ac-ev-profile-photo{width:50px;height:50px;border-radius:50%;padding:0;border:3px solid #fff;overflow:hidden;background:linear-gradient(135deg,#7a42c8,#26164f);box-shadow:0 5px 18px rgba(38,22,79,.3);cursor:pointer}',
      '.ac-ev-profile-photo img{width:100%;height:100%;object-fit:cover;display:block}',
      '.ac-ev-profile-card{width:min(310px,calc(100vw - 24px));background:#fff;border:1px solid rgba(38,22,79,.12);border-radius:17px;padding:13px;box-shadow:0 12px 32px rgba(38,22,79,.2);opacity:0;transform:translateY(-8px) scale(.98);pointer-events:none;transition:.2s;color:#26164f}',
      '.ac-ev-profile.open .ac-ev-profile-card{opacity:1;transform:none;pointer-events:auto}',
      '.ac-ev-profile-id{display:flex;align-items:center;gap:9px;padding:1px 2px 10px}.ac-ev-profile-id img{width:39px;height:39px;border-radius:50%;object-fit:cover}',
      '.ac-ev-profile-name{font-weight:900;line-height:1.1}.ac-ev-profile-role{font-size:.72rem;font-weight:700;color:#756d84;margin-top:2px}',
      '.ac-ev-contact-label{font-size:.69rem;text-transform:uppercase;letter-spacing:.04em;font-weight:900;color:#756d84;margin:2px 2px 7px}',
      '.ac-ev-contact-three{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}',
      '.ac-ev-contact-route,.ac-ev-profile-action{border:1px solid #e4dfec;background:#fff;color:#26164f;border-radius:11px;text-decoration:none;font-weight:850;font-size:.74rem;display:flex;align-items:center;justify-content:center;gap:5px;min-height:42px;padding:7px}',
      '.ac-ev-contact-route.whatsapp{color:#128c7e}.ac-ev-contact-route svg{width:20px;height:20px;flex:0 0 auto}',
      '.ac-ev-profile-action{justify-content:flex-start;padding:10px 11px;margin-top:6px;font-size:.78rem}.ac-ev-profile-action.quote{background:linear-gradient(135deg,#7a42c8,#26164f);color:#fff;border-color:transparent}',
      '.ac-ev-profile-site{text-align:center;font-size:.68rem;font-weight:800;margin-top:9px}.ac-ev-profile-site a{color:#7a42c8}.ac-ev-profile-closehint{font-size:.62rem;color:#968da4;text-align:center;margin-top:4px}',
      '.ac-ev-conversion{background:linear-gradient(135deg,#f3ecfc,#fff);border:1px solid rgba(122,66,200,.24);border-radius:16px;padding:17px 16px;margin:16px 0 0;text-align:center;color:#26164f}',
      '.ac-ev-conversion h2{margin:0 0 5px;font-size:18px;color:#26164f}.ac-ev-conversion p{margin:0;color:#6b6277;font-size:.86rem;font-weight:650}',
      '.ac-ev-cta{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;padding:12px 14px;border-radius:11px;background:#7a42c8;color:#fff!important;text-decoration:none;font-weight:850;font-size:14px}',
      '.ac-ev-cta svg{width:21px;height:21px}.ac-ev-cta.secondary{background:#fff;color:#26164f!important;border:1.5px solid rgba(122,66,200,.24)}',
      '.ac-ev-step{margin:11px 0 0!important;color:#4d5360!important;font-size:12px!important;line-height:1.48!important;font-weight:550!important;text-align:left}',
      '.ac-ev-clarifier{margin-top:10px!important;font-size:11px!important;line-height:1.45!important;text-align:left;color:#646c75!important}',
      '.ac-ev-partner{margin-top:12px;font-size:.76rem;color:#6b6277;font-weight:700}.ac-ev-partner a{color:#7a42c8;font-weight:850}',

      'html.shared-view #customerWelcome{display:none!important}',
      '.ac-ev-prepared{display:inline-flex;align-items:center;gap:4px;margin:3px 0 6px;font:650 10px/1.35 system-ui;color:#79698b}',
      '.ac-ev-customer-settings{border:1px solid #e8ddf0;border-radius:13px;background:#fcfaff;margin:13px 0;overflow:hidden}',
      '.ac-ev-customer-settings>summary{list-style:none;display:flex;align-items:center;gap:7px;cursor:pointer;padding:13px 14px;font:800 13px system-ui;color:#503976}',
      '.ac-ev-customer-settings>summary::-webkit-details-marker{display:none}',
      '.ac-ev-customer-settings>summary:after{content:"⌄";font-size:18px;margin-left:auto}',
      '.ac-ev-customer-settings[open]>summary:after{content:"⌃"}',
      '.ac-ev-customer-settings-body{padding:0 10px 11px}',
      '.ac-ev-customer-settings-body>.card{margin:7px 0!important}',
      '.ac-ev-restore{display:block;margin:6px 3px 2px;border:1px solid #ddd1ec;border-radius:9px;background:#fff;color:#59407e;padding:9px;font-weight:750;cursor:pointer}',
      '.ac-ev-fixed-details{margin:16px 0;border:1px solid #e2d5ed;border-radius:14px;overflow:hidden;background:#fff}',
      '.ac-ev-fixed-details>summary{cursor:pointer;list-style:none;padding:15px 14px;color:#46345f}',
      '.ac-ev-fixed-details>summary::-webkit-details-marker{display:none}',
      '.ac-ev-fixed-details>summary:after{content:"Explore fixed and variable  ▾";display:block;text-align:center;margin-top:11px;border-radius:9px;background:#f4eef9;padding:10px;font-weight:850;font-size:12px;color:#67478b}',
      '.ac-ev-fixed-details[open]>summary:after{content:"Close comparison  ▴"}',
      '.ac-ev-fixed-title{display:block;font-size:15px;font-weight:850;margin-bottom:5px}',
      '.ac-ev-fixed-sub{display:block;color:#766d81;font-size:12px;line-height:1.45}',
      '.ac-ev-fixed-details>.card{border:0!important;margin:0!important;padding:12px!important;box-shadow:none!important}',
      '.ac-ev-fixed-details .section-title,.ac-ev-fixed-details .section-copy{display:none!important}',
      '.ac-ev-simple-rates{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:12px 0}',
      '.ac-ev-simple-rate{background:#f8f4fc;border:1px solid #e8ddf2;border-radius:11px;padding:11px 8px;min-width:0;text-align:center}',
      '.ac-ev-simple-rate small{display:block;font-size:11px;color:#715d87;line-height:1.35}',
      '.ac-ev-simple-rate strong{display:block;font-size:19px;color:#503675;margin:7px 0}',
      '.ac-ev-all-rates{border-top:1px solid #ebdfef;margin-top:12px;padding-top:9px}',
      '.ac-ev-all-rates>summary{cursor:pointer;text-align:center;list-style:none;font-size:12px;font-weight:800;color:#7450a2;padding:10px}',
      '.ac-ev-all-rates>summary::-webkit-details-marker{display:none}',
      '.ac-ev-fixed-details .stressbar{display:flex!important;flex-wrap:wrap!important;gap:6px!important}',
      '.ac-ev-fixed-details .stressbar>.stresslabel{flex:1 1 100%!important;font-weight:850}',
      '.ac-ev-fixed-details .stressbuttons{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;width:100%!important}',
      '.ac-ev-fixed-details .stressbuttons button{min-width:0!important;min-height:40px!important;position:relative!important}',
      '.ac-ev-fixed-details .stressbuttons button[data-stress="0"]{grid-column:1/-1!important;min-height:38px!important}',
      '.ac-ev-fixed-details .stressbuttons button[data-stress="21"]:not(.on){border:2px solid #bda3d6!important}',
      '.ac-ev-fixed-details .stressbuttons button[data-stress="21"]::after{content:"forecast";display:block;font-size:8px;font-weight:750;line-height:1.1;opacity:.7}',
      '.ac-ev-fixed-details td.cell.best{background:#e0f4e7!important;color:#08683c!important;font-weight:900!important;box-shadow:inset 0 0 0 1px #6cae81!important}',
      '.ac-ev-fixed-details td.cell.best:after{content:attr(data-best-label);display:block;font-size:8px;line-height:1.2;color:#0c7548!important}',
      '.ac-ev-basket-dialog{position:fixed;inset:0;z-index:10060;display:flex;align-items:center;justify-content:center;background:rgba(25,14,41,.69);padding:16px;box-sizing:border-box}',
      '.ac-ev-basket-dialog[hidden]{display:none!important}',
      '.ac-ev-basket-sheet{width:min(460px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#352945;border-radius:18px;padding:22px 18px;box-shadow:0 20px 60px rgba(0,0,0,.25)}',
      '.ac-ev-basket-sheet h2{font-size:19px;margin:0 0 9px;color:#513771}',
      '.ac-ev-basket-sheet>p{font-size:13px;line-height:1.5;margin:8px 0;color:#554b60}',
      '.ac-ev-basket-compare{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0 10px}',
      '.ac-ev-basket-compare>div{border:1px solid #e6dfee;border-radius:11px;background:#f9f7fb;padding:12px 8px;text-align:center}',
      '.ac-ev-basket-compare>div:last-child{background:#f2ecfa}',
      '.ac-ev-basket-compare small{display:block;font-size:11px;line-height:1.35;color:#766785}',
      '.ac-ev-basket-compare strong{display:block;font-size:24px;margin:7px 0;color:#533975}',
      '.ac-ev-basket-difference{text-align:center;font-size:13px;font-weight:850;color:#16754b;margin:5px 0 12px}',
      '.ac-ev-basket-note{font-size:11px!important;color:#776c80!important}',
      '.ac-ev-basket-actions{display:grid;gap:8px;margin-top:16px}',
      '.ac-ev-basket-actions a{display:block;text-align:center;text-decoration:none;background:#7654a5;color:#fff;padding:13px;border-radius:10px;font-size:14px;font-weight:850}',
      '.ac-ev-basket-actions button{border:1px solid #ded5eb;border-radius:10px;background:#fff;color:#553c77;padding:10px;font-size:13px;font-weight:750;cursor:pointer}',
      '.ac-ev-customer-vat small{display:block;margin-top:4px;font-size:10px}',
      '@media(max-width:560px){.ac-ev-profile{top:8px;right:8px}.ac-ev-profile-photo{width:47px;height:47px}}'
    ].join('');
    document.head.appendChild(st);
  }

  function addProfile() {
    if (document.getElementById('acEvProfile')) return;
    var wrap = document.createElement('div');
    wrap.id = 'acEvProfile';
    wrap.className = 'ac-ev-profile';
    wrap.innerHTML = '<button class="ac-ev-profile-photo" type="button" id="acEvProfileToggle" aria-label="Contact Adrian"><img src="' + PROFILE.photo + '" alt="Adrian Croft"></button><div class="ac-ev-profile-card"><div class="ac-ev-profile-id"><img src="' + PROFILE.photo + '" alt=""><div><div class="ac-ev-profile-name">' + PROFILE.name + '</div><div class="ac-ev-profile-role">' + PROFILE.role + '</div></div></div><div class="ac-ev-contact-label">Contact Adrian</div><div class="ac-ev-contact-three"><a class="ac-ev-contact-route whatsapp" href="' + PROFILE.whatsapp + '" target="_blank" rel="noopener">' + WHATSAPP_ICON + '<span>WhatsApp</span></a><a class="ac-ev-contact-route" href="' + PROFILE.email + '">✉️ <span>Email</span></a><a class="ac-ev-contact-route" href="' + PROFILE.phone + '">📞 <span>Call</span></a></div><a class="ac-ev-profile-action" href="' + PROFILE.booking + '" target="_blank" rel="noopener">🗓️ <span>Book a chat</span></a><a class="ac-ev-profile-action quote" href="' + PROFILE.quote + '" target="_blank" rel="noopener">💷 <span>Get a UW quote</span></a><div class="ac-ev-profile-site"><a href="' + PROFILE.site + '" target="_blank" rel="noopener">AQCroft.com</a></div><div class="ac-ev-profile-closehint">Tap the photo again to close</div></div>';
    document.body.appendChild(wrap);
    wrap.querySelector('#acEvProfileToggle').addEventListener('click', function (e) { e.stopPropagation(); wrap.classList.toggle('open'); });
    document.addEventListener('click', function (e) { if (wrap.classList.contains('open') && !wrap.contains(e.target)) wrap.classList.remove('open'); });
  }


  var lastModel=null, installedCustomer=false, originalTable=null, dialogReturnFocus=null;
  function money(n){return Number.isFinite(n)?'£'+Math.round(n).toLocaleString('en-GB'):'—'}
  function priceMonth(n){return Number.isFinite(n)?money(n/12):'—'}
  function priceDisplay(raw){return raw&&Number.isFinite(raw.total)?priceMonth(raw.total):'—'}
  function safeEsc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function addBottomCard() {
    var old=document.getElementById('acEvConversion');if(old)old.remove();
    var host=document.querySelector('.wrap')||document.body;
    var card=document.createElement('section');card.id='acEvConversion';card.className='ac-ev-conversion';
    var b=basket(),target=b||PROFILE.quote;
    card.innerHTML='<h2>Ready to explore UW?</h2>'+
      '<p>Take a look at your '+(b?'personalised UW basket':'UW quote options')+'.</p>'+
      '<button type="button" class="ac-ev-cta" id="acEvOpenBasket" style="border:0;width:100%;cursor:pointer">🛒 '+(b?'Go to my UW basket':'Explore a UW quote')+' →</button>'+
      '<a class="ac-ev-cta secondary" href="'+PROFILE.whatsapp+'" target="_blank" rel="noopener">'+WHATSAPP_ICON+'<span>Any questions? WhatsApp Adrian</span></a>';
    host.appendChild(card);
    card.querySelector('#acEvOpenBasket').addEventListener('click',function(){showBasket(target,this)});
  }
  function showBasket(url,origin){
    var link=safeHttps(url);if(!link)return;
    var existing=document.getElementById('acEvBasketDialog');if(existing)existing.remove();
    dialogReturnFocus=origin||document.activeElement;
    var panel=document.createElement('div');panel.id='acEvBasketDialog';panel.className='ac-ev-basket-dialog';
    panel.setAttribute('role','presentation');
    var sheet=document.createElement('div');sheet.className='ac-ev-basket-sheet';
    sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','acEvBasketTitle');
    sheet.innerHTML='<h2 id="acEvBasketTitle">A quick heads-up about your UW quote</h2>'+
      '<p>Your initial UW quote uses <strong>standard variable electricity rates</strong>, not the lower overnight EV rates. The electricity estimate may look higher at first.</p>'+
      '<div id="acEvBasketFigures"></div>'+
      '<p>Choose the <strong>EV interest</strong> option when joining, if offered. Once eligible, UW will explain how to switch to the EV tariff.</p>'+
      '<p class="ac-ev-basket-note">Both estimates use the same annual home and EV electricity usage and selected UW services. The EV tariff is subject to eligibility and may change. Neither figure is a guaranteed Direct Debit amount.</p>'+
      '<div class="ac-ev-basket-actions"><a id="acEvBasketContinue" href="'+safeEsc(link)+'" target="_blank" rel="noopener noreferrer">Continue to my UW '+(basket()?'basket':'quote')+' →</a><button type="button" id="acEvBasketClose">Back to comparison</button></div>';
    panel.appendChild(sheet);document.body.appendChild(panel);
    function close(){panel.remove();if(dialogReturnFocus&&dialogReturnFocus.focus)dialogReturnFocus.focus();}
    panel.addEventListener('click',function(e){if(e.target===panel||e.target.closest('#acEvBasketClose'))close()});
    panel.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();close()}});
    panel.querySelector('#acEvBasketContinue').addEventListener('click',close);
    updateBasketNumbers();
    panel.querySelector('#acEvBasketClose').focus();
  }
  function updateBasketNumbers(){
    var host=document.getElementById('acEvBasketFigures');if(!host)return;
    var d=lastModel, std=d&&d.standard,ev=d&&d.ev;
    if(!std||!ev||!Number.isFinite(std.total)||!Number.isFinite(ev.total)){
      host.textContent='Your personalised electricity prices will appear once the current UW rates are available.';
      return;
    }
    host.innerHTML='<div class="ac-ev-basket-compare"><div><small>Initial standard variable<br>electricity estimate</small><strong>'+priceDisplay(std)+'</strong><small>per month</small></div>'+
      '<div><small>Estimated EV<br>electricity cost</small><strong>'+priceDisplay(ev)+'</strong><small>per month</small></div></div>'+
      (std.total>ev.total?'<div class="ac-ev-basket-difference">'+money((std.total-ev.total)/12)+'/month less on the EV estimate</div>':'');
  }
  function cardSettings(){
    if(document.getElementById('acEvCustomerSettings'))return true;
    var hero=document.querySelector('.hero'),wrap=document.querySelector('.wrap');
    if(!hero||!wrap)return false;
    var settings=document.createElement('details');settings.id='acEvCustomerSettings';settings.className='ac-ev-customer-settings';
    var summary=document.createElement('summary');summary.id='acEvSettingsSummary';summary.textContent='⚙️ Your figures & settings';
    var body=document.createElement('div');body.className='ac-ev-customer-settings-body';
    settings.appendChild(summary);settings.appendChild(body);
    var cards=Array.from(wrap.children);
    var first=cards.findIndex(function(n){return n===hero});
    var compare=cards.findIndex(function(n){return n.querySelector&&n.querySelector('.tablewrap #comparison')});
    if(first<0||compare<=first)return false;
    var candidates=cards.slice(first+1,compare);
    candidates.forEach(function(node){
      if(node.id==='acEvConversion'||node.id==='acV2482Vat'||node.id==='acEvTradeoff'||node.classList.contains('ac-ev-profile'))return;
      if(node.matches('.card,details'))body.appendChild(node);
    });
    if(body.children.length===0)return false;
    var restore=document.getElementById('resetSharedBtn');
    if(restore){restore.classList.add('ac-ev-restore');restore.textContent='↺ Restore my starting figures';body.appendChild(restore);}
    var anchor=body.firstElementChild;
    if(anchor&&anchor.parentNode===body)hero.insertAdjacentElement('afterend',settings);
    return true;
  }
  function addComparison(){
    if(document.getElementById('acEvFixedDetails'))return true;
    var table=document.getElementById('comparison');
    var card=table&&table.closest('.card');
    if(!card)return false;
    originalTable=card;
    var outer=document.createElement('details');outer.id='acEvFixedDetails';outer.className='ac-ev-fixed-details';
    var header=document.createElement('summary');
    header.innerHTML='<span class="ac-ev-fixed-title">🛡️ Prefer the certainty of a fixed price?</span><span class="ac-ev-fixed-sub">See how a fixed Economy 7 tariff compares, particularly if electricity prices rise.</span>';
    card.parentNode.insertBefore(outer,card);outer.appendChild(header);outer.appendChild(card);
    var bar=card.querySelector('.stressbar');
    var preview=document.createElement('div');preview.id='acEvSimpleRates';preview.className='ac-ev-simple-rates';
    if(bar)bar.insertAdjacentElement('afterend',preview);
    var tableWrap=card.querySelector('.tablewrap'),footer=tableWrap&&tableWrap.nextElementSibling;
    if(tableWrap){
      var more=document.createElement('details');more.className='ac-ev-all-rates';more.id='acEvAllTariffs';
      var moreLabel=document.createElement('summary');moreLabel.textContent='Curious? Show all UW electricity tariffs ▾';
      more.appendChild(moreLabel);tableWrap.parentNode.insertBefore(more,tableWrap);more.appendChild(tableWrap);
      if(footer&&footer.classList.contains('foot')){
        footer.textContent='Includes home electricity, standing charges and charging at home, not charging elsewhere. Variable rates may change; fixed rates apply for their stated term.';
        more.appendChild(footer);
      }
    }
    return true;
  }
  function updateSimple(){
    if(!document.getElementById('acEvSimpleRates'))return;
    var tier=(document.querySelector('#serviceButtons button.on')||{}).dataset;
    var selected=Number(tier&&tier.tier||2),t=Number.isFinite(selected)?selected:2;
    var keys=[['ev','EV Double Gold (variable)'],['fixedE7','Fixed Saver Economy 7']];
    var out=document.getElementById('acEvSimpleRates');
    out.textContent='';
    keys.forEach(function(pair){
      var row=document.querySelector('#comparison tr[data-row="'+pair[0]+'"]');
      var cell=row&&row.querySelector('td[data-tier="'+t+'"]');
      var name=row&&row.querySelector('.tariff-name');
      var item=document.createElement('div');item.className='ac-ev-simple-rate';
      var small=document.createElement('small');small.textContent=name?name.textContent.trim():pair[1];
      var strong=document.createElement('strong');strong.textContent=cell?cell.textContent.trim():'—';
      var period=document.createElement('small');period.textContent=lastModel&&lastModel.period==='year'?'per year':'per month';
      item.appendChild(small);item.appendChild(strong);item.appendChild(period);out.appendChild(item);
    });
  }
  function updateForecast(){
    var bar=document.getElementById('stressButtons');if(!bar)return;
    var parent=bar.closest('.stressbar'),label=parent&&parent.querySelector('.stresslabel');
    if(label){
      var title=label.firstChild;if(title&&title.nodeType===3)title.textContent='What if variable electricity prices rise? ';
    }
    var current=bar.querySelector('[data-stress="0"]');
    if(current){current.textContent='Current UW rates';current.title='Current published UW electricity rates';}
    var forecast=bar.querySelector('[data-stress="21"]');
    if(forecast){forecast.title='21% MoneySavingExpert January Price Cap forecast - illustrative for UW electricity';}
    document.querySelectorAll('#comparison td.cell.best').forEach(function(cell){
      cell.dataset.bestLabel=bar.querySelector('button.on')?.dataset.stress==='0'?'LOWEST ESTIMATE':'LOWEST IN THIS SCENARIO';
    });
  }
  function updateVat(model){
    var note=document.getElementById('acEvVatNote');
    if(!note||!model)return;
    var isZero=model.vatPercent===0;
    note.textContent=isZero?
      'Temporary 0% electricity VAT applies until 31 March 2027. Switch to 5% for a longer-term comparison.':
      'Electricity VAT is 0% until 31 March 2027. Showing 5% for a longer-term comparison - switch to 0% to see the temporary rate.';
    if(isZero&&model.period==='year')note.textContent+=' The yearly figure is a 0%-rate equivalent, not a full-year VAT forecast.';
  }
  function compactGreeting(){
    var welcome=document.getElementById('customerWelcome');
    var header=document.querySelector('.title-row');if(!header||!welcome)return;
    var x=document.getElementById('acEvPrepared');
    if(!x){x=document.createElement('span');x.id='acEvPrepared';x.className='ac-ev-prepared';header.insertAdjacentElement('afterend',x);}
    var name=document.getElementById('welcomeName');
    x.textContent='Prepared for '+(name&&name.textContent.trim()||'you');
  }
  function customerSetup(){
    if(!document.documentElement.classList.contains('shared-view'))return;
    addStyles();compactGreeting();cardSettings();addComparison();
    var b=document.getElementById('acEvConversion');
    if(global.__AppointmentCompanionEvSharedSnapshot&&(!b||!document.getElementById('acEvOpenBasket')))addBottomCard();
    updateSimple();updateForecast();
  }
  function updateFromModel(model){
    lastModel=model;
    customerSetup();
    updateSimple();updateForecast();updateVat(model);
    updateBasketNumbers();
  }
  function install() {
    if (!document.body || !document.querySelector('.wrap')) return false;
    addStyles();addProfile();customerSetup();
    // A portable link may finish rendering before the contact script loads.
    // Recover that already-computed model, then continue tracking changes.
    if(global.__AC_EV_TRADEOFF)updateFromModel(global.__AC_EV_TRADEOFF);
    return true;
  }
  document.addEventListener('ac:ev-comparison',function(e){updateFromModel(e.detail)});
  global.addEventListener('ac:ev-public-snapshot',function(){addBottomCard();customerSetup()});
  document.addEventListener('click',function(e){
    // The profile shortcut must follow the same pre-basket explanation.
    var a=e.target.closest('.ac-ev-profile-action.quote');
    if(a&&safeHttps(a.href)){e.preventDefault();showBasket(a.href,a)}
  },true);
  if(install())return;
  var tries=0,timer=setInterval(function(){if(install()||++tries>160)clearInterval(timer)},100);
})(window);
