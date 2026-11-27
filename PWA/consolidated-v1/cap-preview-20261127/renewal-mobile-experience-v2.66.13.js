/* Should I Fix v2.66.13 - cost-ranked chart legend; tariff computation unchanged. */
(function () {
 'use strict';
 const ID='renewalSavingsPair';
 const palette={green:'#00865a',amber:'#e57b00',red:'#e21b3c'};
 const css="\n/* Three scannable tap targets above the chart on all screen sizes. */\n#renewalSavingsPair{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:9px!important;margin-bottom:15px}\n#renewalSavingsPair .renewal-saving-card{border:2px solid var(--rank-color,#53398b)!important;border-radius:14px!important;background:#fff!important;padding:12px 10px!important;box-shadow:0 3px 0 color-mix(in srgb,var(--rank-color) 18%,transparent);min-width:0;cursor:pointer;display:flex;gap:3px;flex-direction:column}\n#renewalSavingsPair .renewal-saving-card .kicker{color:var(--rank-color)!important;font-size:clamp(.65rem,1.6vw,.88rem)!important;letter-spacing:0!important;line-height:1.2!important;min-height:2.5em;text-transform:none!important}\n#renewalSavingsPair .renewal-saving-card .amount{order:2;color:var(--rank-color)!important;font:900 clamp(1.15rem,3.3vw,1.9rem)/1.15 Nunito,system-ui,sans-serif!important;margin:4px 0!important;white-space:nowrap}\n#renewalSavingsPair .renewal-saving-card .cost-note{order:1;margin:5px 0 0!important;color:#292139!important;font-size:clamp(.76rem,2.2vw,1rem)!important;line-height:1.2}\n#renewalSavingsPair .renewal-saving-card .cost-note b{font-size:1.06em;color:var(--rank-color)}\n#renewalSavingsPair .renewal-saving-card .saving-note,#renewalSavingsPair .renewal-saving-card .renewal-card-points{display:none!important}\n#renewalSavingsPair .renewal-active-choice::after{content:'Tap for details ⓘ';order:4;margin-top:auto;padding-top:9px;font-weight:800;font-size:.68rem;color:var(--rank-color)}\n#renewalSavingsPair .renewal-active-choice:focus-visible{outline:3px solid #21212b;outline-offset:3px}\n#renewalSavingsPair .renewal-active-choice:hover{background:#fafafa!important}\n#renewalLineLegend{display:flex!important;justify-content:flex-start;flex-direction:column;align-items:stretch;gap:8px!important;margin:10px 0 14px;padding:0!important}\n.renewal-key-item{display:flex;gap:10px;align-items:flex-start;padding:7px 9px;border-left:4px solid var(--rank-color);background:#fff;border-radius:4px}\n.renewal-key-item i{display:block;flex:0 0 22px;border-top:4px solid var(--rank-color);margin-top:8px}\n.renewal-key-item div{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;line-height:1.3}\n.renewal-key-item b{color:var(--rank-color);font-size:.8rem}\n.renewal-key-item strong{color:var(--rank-color);font-size:.85rem}\n.renewal-key-item small{color:#454050;font-size:.72rem;font-weight:700}\n.renewal-key-reference{display:flex;align-items:center;gap:10px;text-align:left;font-size:.73rem;color:#535065;font-weight:800;padding-left:12px}\n.renewal-key-reference i{display:inline-block;width:22px;border-top:3px dashed var(--rank-color)}\n#renewalFourLineChart svg{background:#fff}\n.renewal-quarter-heading{margin:14px 0 10px}\n.renewal-quarter-heading h3{color:#39245c;font-size:1rem;font-weight:900;margin:0 0 3px}\n.renewal-quarter-heading p{margin:0;color:#625c70;font-size:.74rem;line-height:1.4}\n.renewal-quarter-scroll{width:100%;overflow-x:auto;border:1px solid #c7bfd2;border-radius:11px}\n.renewal-quarter-scroll:focus-visible{outline:3px solid #553694}\n.renewal-quarter-scroll table{border-collapse:collapse;width:100%;min-width:585px;font:750 .78rem Nunito,system-ui,sans-serif}\n.renewal-quarter-scroll th,.renewal-quarter-scroll td{padding:10px 9px;border-bottom:1px solid #e5e0ed;text-align:right;white-space:nowrap}\n.renewal-quarter-scroll th:first-child,.renewal-quarter-scroll td:first-child{text-align:left}\n.renewal-quarter-scroll thead{background:#eeeaf5;color:#38244f}\n.renewal-quarter-scroll thead th:not(:first-child){border-top:3px solid var(--rank-color,transparent)}\n.renewal-quarter-scroll tbody td:not(:last-child),.renewal-quarter-scroll tfoot td:not(:last-child){color:var(--rank-color)}\n.renewal-quarter-scroll .quarter-best{background:#e6f3e8;font-weight:900;box-shadow:inset 0 0 0 1px #78b78c}\n.renewal-quarter-scroll tfoot{background:#f6f3f9;font-weight:900}\n#renewalChoiceDetails{border:0;border-radius:17px;max-width:min(95vw,560px);max-height:85vh;overflow:auto;padding:19px;background:white;color:#292139;box-shadow:0 20px 80px #1118}\n#renewalChoiceDetails::backdrop{background:#1e153dc2}\n.renewal-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}\n.renewal-modal-head button{border:1px solid #9a91a8;background:#fff;border-radius:9px;padding:10px 13px;font:800 .84rem Nunito,system-ui;cursor:pointer}\n#renewalChoiceDetailsContent .renewal-saving-card{padding:14px;border:2px solid #756989;border-radius:13px}\n#renewalChoiceDetailsContent .kicker{font-weight:900;color:#30224d;font-size:1rem}\n#renewalChoiceDetailsContent .amount{display:block;font-size:2rem;color:#30224d;font-weight:900}\n#renewalChoiceDetailsContent .saving-note{font-size:.82rem;color:#484151;margin-top:7px}\n#renewalChoiceDetailsContent .cost-note{font-weight:850;margin:8px 0}\n#renewalChoiceDetailsContent .renewal-card-points{display:grid;margin-top:12px}\n#renewalChoiceDetailsContent .renewal-card-points li{font-size:.85rem}\n#renewalPreviewWarning[hidden]{display:none!important}\n@media(max-width:540px){\n #renewalStory{padding:12px 9px!important}\n #renewalSavingsPair{gap:5px!important}\n #renewalSavingsPair .renewal-saving-card{padding:8px 5px!important;min-height:132px}\n #renewalSavingsPair .renewal-saving-card .kicker{font-size:.62rem!important;min-height:2.8em}\n #renewalSavingsPair .renewal-saving-card .amount{font-size:clamp(1rem,4.3vw,1.5rem)!important;letter-spacing:-.03em}\n #renewalSavingsPair .renewal-saving-card .cost-note{font-size:.67rem!important;order:1}\n #renewalSavingsPair .renewal-saving-card .cost-note b{font-size:1em}\n #renewalSavingsPair .renewal-active-choice::after{font-size:.58rem}\n .renewal-key-item{padding:5px 8px}\n .renewal-key-item div{gap:3px 8px}\n .renewal-key-item b{font-size:.72rem}\n .renewal-key-item small{font-size:.66rem}\n .renewal-scenario-buttons{gap:6px!important}\n}\n@media(prefers-reduced-motion:reduce){#renewalSavingsPair .renewal-active-choice{transition:none}}\n\n/* Price-cap quarter strip: same chart column geometry and row format as main Should I Fix. */\n#renewalChartTableScroller{width:100%;max-width:100%;overflow-x:auto;overscroll-behaviour-inline:contain;border:1px solid #ded7e7;border-radius:12px;background:#fff}\n#renewalChartTableScroller:focus-visible{outline:3px solid #58399c;outline-offset:3px}\n#renewalChartTableScroller #renewalFourLineChart{min-width:690px;width:690px}\n#renewalChartTableScroller #renewalFourLineChart svg{width:690px;height:auto}\n#renewalQuarterlyCosts{width:690px;min-width:690px;margin:0!important;padding:0 0 8px!important;border:0!important}\n#renewalQuarterlyCosts .renewal-q-grid{display:grid;width:690px;grid-template-columns:120px var(--quarters-width) 94px;align-items:stretch;line-height:1.25;font-family:Nunito,system-ui,sans-serif;font-size:11px}\n#renewalQuarterlyCosts .renewal-q-spacer{border:0;background:#fff}\n#renewalQuarterlyCosts .renewal-q-label{padding:8px 5px;color:#413353;text-align:left;font-size:10px;font-weight:900;border-bottom:1px solid #e8e3ee;display:flex;align-items:center;position:sticky;left:0;z-index:2;background:#fff}\n#renewalQuarterlyCosts .renewal-q-label.variable{color:var(--variable-colour);background:#fff}\n#renewalQuarterlyCosts .renewal-q-label.offer{color:var(--offer-colour);background:#fff}\n#renewalQuarterlyCosts .renewal-q-label.public{color:var(--public-colour);background:#fff}\n#renewalQuarterlyCosts .renewal-q-cell{padding:7px 2px;min-width:0;text-align:center;font-size:10px;white-space:nowrap;font-weight:850;color:var(--q-color,#4a3c63);border-bottom:1px solid #e8e3ee;border-left:1px solid #ebe7ee}\n#renewalQuarterlyCosts .renewal-q-cell.header{font-size:10px;color:#4e4163;background:#f8f7fb;white-space:normal}\n#renewalQuarterlyCosts .renewal-q-cell.header small{display:block;font-size:9px;color:#666074}\n#renewalQuarterlyCosts .renewal-q-cell.best{box-shadow:inset 0 -2px 0 #168a4f;font-weight:900}\n#renewalQuarterlyCosts .renewal-q-cell .q-delta{display:block;margin-top:3px;color:#5b5268;font-weight:750;font-size:9px;white-space:normal}\n#renewalQuarterlyCosts .renewal-q-cell .q-delta.more{color:#a72231}\n#renewalQuarterlyCosts .renewal-q-cell .q-delta.less{color:#167947}\n#renewalQuarterlyCosts .renewal-q-headline{font-weight:850;color:#49346c;font-size:.79rem;padding:7px 0 3px}\n#renewalChartTableScroller~.renewal-quarter-heading{display:none}\n@media(max-width:570px){#renewalChartTableScroller{scrollbar-width:thin}#renewalChartTableScroller::after{content:none}}\n\n#renewalChoiceDetailsContent .renewal-fuel-breakdown{border-top:1px solid #ded6e9;margin-top:15px;padding-top:12px}\n#renewalChoiceDetailsContent .renewal-fuel-breakdown h3{font:900 .96rem Nunito,system-ui;margin:0 0 10px;color:#352156}\n#renewalChoiceDetailsContent .renewal-fuel-breakdown h4{font:900 .83rem Nunito,system-ui;margin:16px 0 8px;color:#352156}\n#renewalChoiceDetailsContent .renewal-fuel-row{display:grid;grid-template-columns:1fr auto;gap:3px 10px;padding:9px 0;border-bottom:1px solid #eee9f3}\n#renewalChoiceDetailsContent .renewal-fuel-row span{font-weight:850;font-size:.83rem}\n#renewalChoiceDetailsContent .renewal-fuel-row b{font-size:.87rem;color:#352156}\n#renewalChoiceDetailsContent .renewal-fuel-row small{grid-column:2;font-size:.72rem;text-align:right;color:#59506a}\n#renewalChoiceDetailsContent .renewal-fuel-note{font-size:.72rem;line-height:1.5;color:#50475e;margin:9px 0}\n#renewalChoiceDetailsContent .renewal-variable-caution{padding:12px;border:2px solid #b83c34;border-radius:11px;background:#fffaf4;color:#6b2426;font-size:.8rem;font-weight:700;line-height:1.55}\n#renewalChoiceDetailsContent .renewal-rate-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;align-items:center;border:1px solid #dcd4e6;border-radius:9px;overflow:hidden}\n#renewalChoiceDetailsContent .renewal-rate-grid>*{padding:8px 4px;border-bottom:1px solid #e9e4ee;font-size:.72rem;text-align:center;min-width:0}\n#renewalChoiceDetailsContent .renewal-rate-grid>*:nth-child(3n+1){text-align:left;padding-left:7px}\n#renewalChoiceDetailsContent .renewal-rate-grid b{background:#f4f1f8}\n\n/* v2.66.8 main Should I Fix layout parity - scale to the viewport, never 690px. */\n#renewalStory{box-sizing:border-box!important;width:100%!important;min-width:0!important;max-width:100%!important}\n#renewalChartTableScroller{\n box-sizing:border-box!important;display:block!important;width:100%!important;\n min-width:0!important;max-width:100%!important;overflow:visible!important;\n border:1px solid #dfd7e9!important;border-radius:12px!important;background:#fff!important\n}\n#renewalChartTableScroller #renewalFourLineChart{\n display:block!important;box-sizing:border-box!important;width:100%!important;\n min-width:0!important;max-width:100%!important;overflow:hidden!important;\n margin:0!important;padding:0!important\n}\n#renewalChartTableScroller #renewalFourLineChart svg{\n box-sizing:border-box!important;display:block!important;width:100%!important;\n min-width:0!important;max-width:100%!important;height:auto!important;overflow:hidden!important\n}\n#renewalQuarterlyCosts{\n box-sizing:border-box!important;width:100%!important;max-width:100%!important;\n min-width:0!important;margin:0!important;padding:0!important;overflow:hidden!important\n}\n#renewalQuarterlyCosts .renewal-q-grid{\n box-sizing:border-box!important;display:grid!important;width:100%!important;min-width:0!important;\n grid-template-columns:var(--renewal-quarter-columns,minmax(0,130fr) repeat(5,minmax(0,112fr)))!important;\n align-items:stretch!important;line-height:1.25!important;font-variant-numeric:tabular-nums\n}\n#renewalQuarterlyCosts .renewal-q-spacer{display:none!important}\n#renewalQuarterlyCosts .renewal-q-label{\n box-sizing:border-box!important;position:static!important;min-width:0!important;\n display:flex!important;align-items:center!important;padding:8px 4px!important;\n font-size:clamp(.55rem,1.8vw,.74rem)!important;line-height:1.25!important;\n white-space:normal!important;overflow-wrap:normal!important;text-transform:uppercase!important;\n color:var(--row-colour,#49346c)!important;\n background:color-mix(in srgb,var(--row-colour,#6b6483) 10%,white)!important\n}\n#renewalQuarterlyCosts .renewal-q-cell{\n box-sizing:border-box!important;min-width:0!important;overflow-wrap:normal!important;\n text-align:center!important;white-space:normal!important;\n font-size:clamp(.59rem,2vw,.8rem)!important;line-height:1.3!important;\n font-weight:900!important;padding:8px 2px!important\n}\n#renewalQuarterlyCosts .renewal-q-cell.header{\n background:#f8f7fb!important;color:#514365!important;\n font-size:clamp(.51rem,1.75vw,.68rem)!important;padding:7px 1px!important\n}\n#renewalQuarterlyCosts .renewal-q-cell.header small{\n display:block!important;font-size:clamp(.47rem,1.56vw,.6rem)!important;margin-top:3px\n}\n#renewalQuarterlyCosts .renewal-q-cell .q-delta{\n display:block!important;font-size:clamp(.46rem,1.6vw,.63rem)!important;\n line-height:1.2!important;margin:3px 0 0!important;white-space:normal!important\n}\n#renewalQuarterlyCosts .renewal-quarter-title{\n padding:9px 10px;border-top:1px solid #ded7e8;border-bottom:1px solid #ded7e8;\n background:#faf9fc;color:#4b3b61;font:900 clamp(.68rem,2.3vw,.82rem)/1.35 Nunito,system-ui,sans-serif\n}\n#renewalLineLegend{\n display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;\n gap:5px!important;margin:9px 0!important;align-items:start!important\n}\n#renewalLineLegend .renewal-key-item{\n box-sizing:border-box!important;display:block!important;min-width:0!important;\n padding:7px 4px 7px 7px!important;border-left-width:4px;border-radius:5px\n}\n#renewalLineLegend .renewal-key-item i{display:inline-block!important;width:16px!important;margin:0 3px 2px 0!important}\n#renewalLineLegend .renewal-key-item div{display:block!important;min-width:0!important}\n#renewalLineLegend .renewal-key-item b{display:block!important;font-size:clamp(.57rem,1.8vw,.74rem)!important;line-height:1.2;overflow-wrap:anywhere;margin-bottom:3px}\n#renewalLineLegend .renewal-key-item strong{display:block!important;font-size:clamp(.62rem,1.9vw,.81rem)!important;line-height:1.25}\n#renewalLineLegend .renewal-key-item small{display:block!important;font-size:clamp(.52rem,1.6vw,.66rem)!important;line-height:1.25}\n#renewalLineLegend .renewal-key-reference{\n grid-column:span 3!important;display:flex!important;align-items:center!important;\n padding:3px 8px!important;gap:8px!important;font-size:clamp(.61rem,1.75vw,.76rem)!important;\n line-height:1.3\n}\n#renewalLineLegend .renewal-key-reference i{flex:0 0 19px!important;width:19px!important}\n#renewalMethodology{margin:10px 0 0;border:1px solid #e3d9ec;border-radius:10px;background:#faf9fc}\n#renewalMethodology summary{cursor:pointer;list-style:none;padding:10px 12px;color:#53378b;font:850 .79rem Nunito,system-ui,sans-serif}\n#renewalMethodology summary::-webkit-details-marker{display:none}\n#renewalMethodology summary::after{content:\"⌄\";float:right}\n#renewalMethodology[open] summary::after{content:\"⌃\"}\n#renewalMethodology p{padding:3px 12px 11px!important;margin:0!important;font-size:.71rem!important;line-height:1.5!important}\n@media(max-width:390px){\n #renewalQuarterlyCosts .renewal-q-grid{grid-template-columns:var(--renewal-quarter-columns,minmax(0,130fr) repeat(5,minmax(0,112fr)))!important}\n #renewalQuarterlyCosts .renewal-q-label{padding:7px 3px!important}\n #renewalQuarterlyCosts .renewal-q-cell{padding:7px 1px!important}\n}\n/* Shared chart/quarter geometry - no inner chart padding or width mismatch. */\n#renewalChartTableScroller #renewalFourLineChart{padding:0!important;margin:0!important}\n#renewalChartTableScroller #renewalFourLineChart svg{width:100%!important;max-width:100%!important;display:block!important}\n#renewalQuarterlyCosts .renewal-q-grid{\n grid-template-columns:var(--renewal-quarter-columns,minmax(0,130fr) repeat(5,minmax(0,112fr)))!important;\n}\n/* Three vertical chart labels occupy the SVG's existing left gutter, not a separate column. */\n#renewalChartTableScroller #renewalFourLineChart{position:relative!important}\n#renewalFourLineChart #renewalLineLegend{position:absolute!important;z-index:3;box-sizing:border-box!important;left:0!important;top:12%!important;width:15%!important;height:72%!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:1px!important;margin:0!important;padding:0!important;align-items:stretch!important;background:transparent!important;pointer-events:none}\n#renewalFourLineChart #renewalLineLegend .renewal-key-item{box-sizing:border-box!important;display:flex!important;flex-direction:row!important;align-items:flex-start!important;justify-content:center!important;gap:1px!important;min-width:0!important;min-height:0!important;padding:2px 0!important;border:0!important;border-top:3px solid var(--rank-color)!important;background:transparent!important;border-radius:0!important}\n#renewalFourLineChart #renewalLineLegend .renewal-key-item i{display:none!important}\n#renewalFourLineChart #renewalLineLegend .renewal-key-item div{display:flex!important;flex-direction:row!important;align-items:flex-start!important;justify-content:center!important;gap:1px!important;min-width:0!important;width:100%!important;flex-wrap:nowrap!important}\n#renewalFourLineChart #renewalLineLegend .renewal-key-item b,#renewalFourLineChart #renewalLineLegend .renewal-key-item .renewal-key-monthly{writing-mode:vertical-rl!important;transform:rotate(180deg)!important;display:block!important;max-width:none!important;margin:0!important;line-height:1!important;white-space:nowrap!important;overflow-wrap:normal!important;text-align:left!important}\n#renewalFourLineChart #renewalLineLegend .renewal-key-item b{font-size:clamp(.45rem,1.25vw,.64rem)!important;color:#4a3d5b!important;font-weight:850!important}\n#renewalFourLineChart #renewalLineLegend .renewal-key-item .renewal-key-monthly{font-size:clamp(.5rem,1.3vw,.7rem)!important;height:auto!important;color:var(--rank-color)!important;font-weight:900!important}\n#renewalSavingsPair .renewal-saving-card{background:color-mix(in srgb,var(--rank-color) 13%,white)!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rank-color) 12%,transparent)!important}\n@media(max-width:480px){#renewalFourLineChart #renewalLineLegend{width:15.5%!important;top:12%!important}#renewalFourLineChart #renewalLineLegend .renewal-key-item b{font-size:.42rem!important}#renewalFourLineChart #renewalLineLegend .renewal-key-item .renewal-key-monthly{font-size:.46rem!important}}\n/* v2.66.13: stack red, amber, green vertically instead of three narrow columns. */\n#renewalFourLineChart #renewalLineLegend{top:8%!important;height:83%!important;width:15%!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:repeat(3,minmax(0,1fr))!important;gap:5px!important}\n#renewalFourLineChart #renewalLineLegend .renewal-key-item{border-top:0!important;border-left:3px solid var(--rank-color)!important;align-items:center!important;justify-content:center!important;padding:1px 2px!important}\n#renewalFourLineChart #renewalLineLegend .renewal-key-item b{color:var(--rank-color)!important}\n@media(max-width:480px){#renewalFourLineChart #renewalLineLegend{top:7%!important;height:85%!important;width:15.5%!important}}\n/* v2.66.13: quarter costs in dark ink, green for savings, red for extra. */\n#renewalQuarterlyCosts .renewal-q-cell:not(.header){color:#251e2c!important}\n#renewalQuarterlyCosts .renewal-q-label.variable,#renewalQuarterlyCosts .renewal-q-label.offer,#renewalQuarterlyCosts .renewal-q-label.public{color:#44384f!important}\n#renewalQuarterlyCosts .renewal-q-cell.best{box-shadow:inset 0 -2px 0 #aaa0b8!important}\n#renewalQuarterlyCosts .renewal-q-cell .q-delta.less{color:#00865a!important}\n#renewalQuarterlyCosts .renewal-q-cell .q-delta.more{color:#cb2344!important}\n";
 const style=document.createElement('style');
 style.id='renewalMobileStylesV26613';
 style.textContent=css;
 document.head.appendChild(style);
 const existing=document.getElementById(ID);
 if(!existing)return;
 const legendPanel=document.getElementById('renewalLineLegend');
 const chartPanel=document.getElementById('renewalFourLineChart');
 if(legendPanel&&chartPanel)chartPanel.insertAdjacentElement('beforebegin',legendPanel);
 const details=document.createElement('dialog');
 details.id='renewalChoiceDetails';
 details.setAttribute('aria-label','Tariff option details');
 details.innerHTML='<div class="renewal-modal-head"><strong>Tariff option details</strong><button type="button" class="renewal-modal-close" aria-label="Close tariff details">✕ Close</button></div><div id="renewalChoiceDetailsContent"></div>';
 document.body.appendChild(details);
 details.querySelector('.renewal-modal-close').addEventListener('click',()=>details.close());
 details.addEventListener('click',e=>{if(e.target===details)details.close();});
 existing.addEventListener('click',e=>{const card=e.target.closest('.renewal-saving-card');if(card)openCard(card);});
 existing.addEventListener('keydown',e=>{const card=e.target.closest('.renewal-saving-card');if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openCard(card);}});
 function openCard(card){
   if(!card.classList.contains('renewal-active-choice'))return;
   const copy=card.cloneNode(true);
   copy.classList.remove('renewal-active-choice');copy.removeAttribute('role');copy.removeAttribute('tabindex');
   copy.removeAttribute('aria-label');copy.style.removeProperty('--rank-color');
   const target=details.querySelector('#renewalChoiceDetailsContent');
   target.replaceChildren(copy);
   const key=card.dataset.renewalChoice;
   const item=window.__renewalVisualData;
   if(item && item.fuels && item.fuels[key]){
     const fuel=item.fuels[key];
     const annual=item.years[key];
     const section=document.createElement('section');
     section.className='renewal-fuel-breakdown';
     section.innerHTML='<h3>Estimated energy cost by fuel</h3>'+
       '<div class="renewal-fuel-row"><span>⚡ Electricity</span><b>'+gbp(fuel.electricity/12)+'/month</b><small>'+gbp(fuel.electricity)+' over 12 months</small></div>'+
       '<div class="renewal-fuel-row"><span>🔥 Gas</span><b>'+gbp(fuel.gas/12)+'/month</b><small>'+gbp(fuel.gas)+' over 12 months</small></div>'+
       '<p class="renewal-fuel-note">Effective monthly energy-cost averages from seasonal annual usage - not an allocation of your actual Budget Plan Direct Debit.</p>';
     const rate=item.rates && item.rates[key];
     if(key==='variable'){
       section.innerHTML+='<p class="renewal-variable-caution"><b>Illustrative assessment only.</b> Future variable prices are not confirmed. This is a broad forecast scenario, not a published forecast of future unit rates or standing charges. The fuel split is modelled and should not be treated as a quotation.</p>';
     }else if(rate){
       const pence=n=>Number(n).toFixed(3).replace(/0+$/,'').replace(/\.$/,'');
       section.innerHTML+='<h4>Published base rates used</h4>'+
         '<div class="renewal-rate-grid"><div></div><b>Unit rate</b><b>Standing charge</b>'+
         '<span>Electricity</span><strong>'+pence(rate.eU)+'p/kWh</strong><strong>'+pence(rate.eSC)+'p/day</strong>'+
         '<span>Gas</span><strong>'+pence(rate.gU)+'p/kWh</strong><strong>'+pence(rate.gSC)+'p/day</strong></div>'+
         '<p class="renewal-fuel-note">These are the source rates before VAT and before any qualifying-service standing-charge discount. Modelled fuel costs above include applicable VAT, discount and seasonal usage. Check the customer\'s individual tariff offer.</p>';
     }
     target.appendChild(section);
   }
   if(details.showModal)details.showModal();else details.setAttribute('open','');
   details.querySelector('.renewal-modal-close').focus();
 }
 function gbp(n){return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);}
 const sum=xs=>xs.reduce((x,y)=>x+Number(y||0),0);
 const safe=raw=>String(raw??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function ranked(data){
   return [['variable',data.years.variable],['offer',data.years.offer],['public',data.years.public]]
     .sort((a,b)=>a[1]-b[1]||['offer','public','variable'].indexOf(a[0])-['offer','public','variable'].indexOf(b[0]))
     .reduce((o,x,i)=>(o[x[0]]=['green','amber','red'][i],o),{});
 }
 function render(data){
   if(!data||!data.years||!Array.isArray(data.months))return;
   if(details.open)details.close();
   const order=ranked(data);
   const keys=['variable','offer','public'];
   const cards=existing.querySelectorAll('.renewal-saving-card');
   cards.forEach((card,i)=>{
      const key=keys[i],tone=order[key];
      card.classList.add('renewal-active-choice');
      card.dataset.renewalChoice=key;card.dataset.renewalRank=tone;
      card.style.setProperty('--rank-color',palette[tone]);
      card.setAttribute('role','button');card.tabIndex=0;
      card.setAttribute('aria-label',(card.querySelector('.kicker')?.textContent||key)+': '+gbp(data.years[key]/12)+' per month, '+gbp(data.years[key])+' for the comparison period. Tap for details.');
   });
   const labels={
     variable:'Variable',
     offer:data.names.offer||'Your renewal offer',
     public:data.names.public||'Public fixed tariff'
   };
   const legend=document.getElementById('renewalLineLegend');
   if(legend){
     // Highest projected annual cost first, matching red > amber > green.
     legend.innerHTML=keys.slice().sort((a,b)=>data.years[b]-data.years[a] || keys.indexOf(a)-keys.indexOf(b)).map(key=>
       '<div class="renewal-key-item" style="--rank-color:'+palette[order[key]]+'"><i aria-hidden="true"></i><div><b>'+safe(String(labels[key]).replace(/^Default to\s+/i,'').replace(/^Compare with public\s+/i,'').replace(/Fixed Saver\s+/i,'Fixed '))+'</b><strong class="renewal-key-monthly" title="'+safe(gbp(data.years[key]/12)+' per month')+'">'+gbp(data.years[key]/12)+'/m</strong></div></div>'
     ).join('');
   }
   let scroller=document.getElementById('renewalChartTableScroller');
   if(!scroller){
      scroller=document.createElement('div');
      scroller.id='renewalChartTableScroller';
      scroller.setAttribute('role','region');
      scroller.setAttribute('aria-label','Monthly energy graph and aligned quarterly costs');
      scroller.tabIndex=0;
      chartPanel.parentNode.insertBefore(scroller,chartPanel);
      scroller.appendChild(chartPanel);
   }
   // Place key inside the SVG's blank left margin without shrinking or shifting the graph.
   if(legendPanel&&legendPanel.parentNode!==chartPanel)chartPanel.appendChild(legendPanel);
   let quarterly=document.getElementById('renewalQuarterlyCosts');
   if(!quarterly){
      quarterly=document.createElement('section');quarterly.id='renewalQuarterlyCosts';
      quarterly.setAttribute('aria-label','Forecast quarterly energy costs');
      scroller.appendChild(quarterly);
   }
   const groups=[];
   data.monthsMeta.forEach((m,i)=>{
     const id=m.year+'-Q'+(Math.floor(m.cal/3)+1);
     let q=groups[groups.length-1];
     if(!q||q.id!==id){q={id,months:[],cost:{variable:0,offer:0,public:0},forecast:m.phaseLabel};groups.push(q);}
     q.months.push(m);
     keys.forEach(key=>q.cost[key]+=Number(data.series[key][i]||0));
   });
   const name=m=>new Date(Date.UTC(m.year,m.cal,1)).toLocaleString('en-GB',{month:'short',timeZone:'UTC'});
   const label=q=>name(q.months[0])+(q.months.length===1?'':'-'+name(q.months.at(-1)));
   // Use the same quarter boundaries as the SVG month coordinates.
   const geometry=data.quarterLayout;
   if(!geometry||geometry.quarterWidths.length!==groups.length)
     throw new Error('Chart and quarterly table geometry disagree');
   quarterly.style.setProperty('--renewal-quarter-columns',
     [geometry.labelWidth,...geometry.quarterWidths].map(w=>'minmax(0,'+w.toFixed(5)+'fr)').join(' '));
   quarterly.dataset.quarterEdges=geometry.edges.map(n=>n.toFixed(2)).join(',');
   quarterly.dataset.chartAlignment='shared-geometry';
   const paletteFor=key=>palette[order[key]]||'#4a4156';
   const spacer='<div class="renewal-q-spacer" aria-hidden="true"></div>';
   const gridRow=(left,cells,type)=>{
     return '<div class="renewal-q-label '+type+'" style="--row-colour:'+paletteFor(type)+'">'+safe(left)+'</div>'+cells.join('')+spacer;
   };
   let grid=gridRow('PRICE-CAP QUARTER',groups.map(q=>
     '<div class="renewal-q-cell header">'+safe(label(q))+'<small>'+safe(q.forecast)+'</small></div>'),'');
   keys.forEach(key=>{
     const c=paletteFor(key),series=groups.map(q=>q.cost[key]);
     const name=key==='variable'?'VARIABLE':key==='offer'?'YOUR EMAIL OFFER':'PUBLIC FIXED';
     grid+=gridRow(name,groups.map((q,i)=>{
       const change=q.cost.variable-q.cost[key];
       const differential=key==='variable'?'':Math.abs(change)<.5?'<span class="q-delta">about the same</span>':
         '<span class="q-delta '+(change>=0?'less':'more')+'">'+(change>=0?'save ':'extra ')+gbp(Math.abs(change))+'</span>';
       const lowest=Math.min(...keys.map(k=>q.cost[k]));
       return '<div class="renewal-q-cell '+(Math.abs(q.cost[key]-lowest)<.01?'best':'')+
         '">'+gbp(q.cost[key])+differential+'</div>';
     }),key);
   });
   quarterly.style.setProperty('--variable-colour',paletteFor('variable'));
   quarterly.style.setProperty('--offer-colour',paletteFor('offer'));
   quarterly.style.setProperty('--public-colour',paletteFor('public'));
   quarterly.innerHTML='<div class="renewal-quarter-title">Forecast energy cost by price-cap quarter</div>'+
     '<div class="renewal-q-grid">'+grid+'</div>';
   quarterly.dataset.quarterCount=String(groups.length);
   const intro=document.getElementById('renewalChartIntro');
   if(intro)intro.textContent='';
   const caption=document.querySelector('.renewal-chart-caption');
   if(caption)caption.textContent='Grey dotted = modelled previous-tariff costs, where available. Dashed coloured line = public fixed tariff. Prices are energy-cost estimates, not Direct Debit instalments.';
 }
 function clear(){
   // The builder replaces the SVG on every recalculation. Preserve the key element.
   const key=document.getElementById('renewalLineLegend');
   if(key&&key.parentNode===chartPanel)chartPanel.insertAdjacentElement('afterend',key);
   const quarterly=document.getElementById('renewalQuarterlyCosts');
   if(quarterly)quarterly.remove();
   if(details.open)details.close();
 }
 window.RenewalMobileUX={render,clear};
 if(window.__renewalVisualData)render(window.__renewalVisualData);
})();
