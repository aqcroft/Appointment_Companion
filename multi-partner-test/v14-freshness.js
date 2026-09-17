(function(){
'use strict';
var FEED='https://script.google.com/macros/s/AKfycbw-TllTpk_dbFjHhmojgeai9gKNGRzRaA_BtMooVSLeqvg614mONQyrpElC4M8vqP51/exec';
var $=function(id){return document.getElementById(id)};
var open=false;
function iso(v){var s=String(v||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:''}
function today(){var d=new Date(),m=String(d.getMonth()+1).padStart(2,'0'),x=String(d.getDate()).padStart(2,'0');return d.getFullYear()+'-'+m+'-'+x}
function qinfo(s){var p=String(s||'').split('-'),y=+p[0],m=+p[1];if(!y||!m)return null;var q=Math.floor((m-1)/3),d=[['❄️','Winter','Jan-Mar'],['🌱','Spring','Apr-Jun'],['☀️','Summer','Jul-Sep'],['🍂','Autumn','Oct-Dec']],sm=q*3+1,em=sm+2,last=new Date(y,em,0).getDate();return{q:q,year:y,icon:d[q][0],name:d[q][1],short:d[q][2],from:y+'-'+String(sm).padStart(2,'0')+'-01',to:y+'-'+String(em).padStart(2,'0')+'-'+String(last).padStart(2,'0')}}
function fmt(s){if(!s)return'—';var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
function fresh(row,now){if(!row)return null;var f=iso(row.valid_from!=null?row.valid_from:row.validFrom),t=iso(row.valid_to!=null?row.valid_to:row.validTo);if(f&&t)return now>=f&&now<=t;if(f){var a=qinfo(f),b=qinfo(now);return!!(a&&b&&a.q===b.q&&a.year===b.year)}return null}
function series(rows){for(var i=0;i<rows.length;i++){var r=rows[i],type=String(r.tariff_type||r.tariffType||'').toLowerCase();if(type==='fixed'&&r.fixed_series)return String(r.fixed_series).replace(/\D/g,'')}return'—'}
function latest(meta){var v=meta&&(meta.latestFixedSeries!=null?meta.latestFixedSeries:meta.latest_fixed_series);return v==null?'':String(v).replace(/\D/g,'')}
function render(data){var rows=Array.isArray(data.tariffLive)?data.tariffLive:[],meta=data.meta||{},loaded=series(rows),last=latest(meta),now=today();
  $('fixedTopSeries').textContent=loaded;$('fixedFresh').classList.remove('good','stale');if(loaded!=='—')$('fixedFresh').classList.add(last&&last!==loaded?'stale':'good');
  var standard=null;for(var i=0;i<rows.length;i++){var typ=String(rows[i].tariff_type||rows[i].tariffType||'').toLowerCase();if(typ==='variable'){standard=rows[i];break}}
  var from=standard?iso(standard.valid_from||standard.validFrom):'',to=standard?iso(standard.valid_to||standard.validTo):'',qi=qinfo(from),cq=qinfo(now),isFresh=fresh(standard,now),btn=$('variableFresh');
  btn.classList.remove('good','stale');if(isFresh===true)btn.classList.add('good');else if(isFresh===false)btn.classList.add('stale');
  $('seasonIcon').textContent=qi?qi.icon:'◷';$('seasonName').textContent=qi?qi.name+' variable':'Variable period';$('seasonRange').textContent=qi?(qi.short+' '+qi.year):'date unavailable';
  $('seasonDetailTitle').textContent=(qi?qi.icon+' '+qi.name+' ':'')+'standard variable period';$('seasonDetailDates').textContent=from&&to?'Rates applied: '+fmt(from)+' to '+fmt(to):(from?'Rates loaded from '+fmt(from):'No validity dates found in the loaded standard variable row.');
  var ds=$('seasonDetailState');ds.className='';if(isFresh===true)ds.textContent='✓ Current';else if(isFresh===false){ds.textContent='⚠️ Out of date';ds.className='stale'}else ds.textContent='Date check unavailable';
  var stale=false;for(i=0;i<rows.length;i++){var t=String(rows[i].tariff_type||rows[i].tariffType||'').toLowerCase();if((t==='variable'||t==='variable_ev')&&fresh(rows[i],now)===false){stale=true;break}}
  var parts=[];if(stale&&qi&&cq)parts.push('<strong>⚠️ VARIABLE TARIFF DATA NEEDS UPDATING</strong>The tool is still using '+qi.name+' ('+fmt(from)+' to '+fmt(to)+') variable data, but today falls in '+cq.name+' ('+fmt(cq.from)+' to '+fmt(cq.to)+'). Variable and EV comparisons may be out of date until UW publishes the new rates and Tariff_Live is refreshed.');if(last&&loaded!=='—'&&last!==loaded)parts.push('<strong>⚠️ FIXED TARIFF VERSION MISMATCH</strong>Fixed '+loaded+' is loaded, but the feed metadata says Fixed '+last+' is the latest published series.');$('freshWarning').innerHTML=parts.join('<br>');$('freshWarning').hidden=!parts.length;
}
function toggle(){open=!open;$('variableFreshDetail').hidden=!open;$('variableFresh').setAttribute('aria-expanded',open?'true':'false')}
$('variableFresh').addEventListener('click',toggle);
fetch(FEED,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error();return r.json()}).then(render).catch(function(){ $('seasonName').textContent='Variable status';$('seasonRange').textContent='unavailable';$('fixedTopSeries').textContent='—';});
})();
