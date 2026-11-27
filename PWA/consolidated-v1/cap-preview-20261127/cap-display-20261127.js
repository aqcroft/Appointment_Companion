/* Presentation for the immutable 27 November cap snapshot. No profile writes. */
(function(){
  'use strict';
  if(!latestCapModel())return;
  const source='https://www.moneysavingexpert.com/utilities/are-there-any-cheap-fixed-energy-deals-currently-worth-it/';
  const regional='https://www.moneysavingexpert.com/utilities/what-are-the-price-cap-unit-rates-/';
  function update(){
    const jan=Number(document.getElementById('janRise').value);
    document.querySelectorAll('.chart-forecast-label').forEach(el=>el.textContent='January confirmed · test scenarios');
    const ci=document.querySelector('button[onclick="activateForecastMethod(\'cornwall\')"]');
    if(ci){ci.textContent='Confirmed';ci.title='Announced January regional rates';ci.setAttribute('aria-pressed',String(confirmedJanuaryScenario(jan)));}
    document.querySelectorAll('[onclick^="setJanRise("]').forEach(el=>{
      if(el.getAttribute('onclick')==='setJanRise(25.7)'){el.textContent='Confirmed';el.title='Use announced regional January rates';}
    });
    document.querySelectorAll('.forecast-unit-row button[title]').forEach(el=>{el.title='Published January national reference; full precision retained';});
    const outlook=document.querySelector('.outlook-note');
    if(outlook)outlook.textContent='January confirmed. April +2.5% (£2,222); July −8.5% (£2,034). MSE forecast week beginning 23 November 2026, checked 27 November.';
    const cells=document.querySelectorAll('.outlook-grid .outlook-cell b');
    ['+3.6%','Confirmed','+2.5% forecast','−8.5% forecast'].forEach((v,i)=>{if(cells[i])cells[i].textContent=v;});
    const p=document.getElementById('forecastPanelSource');
    if(p)p.innerHTML='<p><b>January–March 2027: confirmed regional Direct Debit cap.</b> Published rates are rounded to two decimal places. <a href="'+regional+'" target="_blank" rel="noopener">Regional source</a>.</p>'+
      '<table class="forecast-table"><thead><tr><th>Period</th><th>Status</th><th>Typical annual bill</th></tr></thead><tbody>'+
      '<tr><td>Jan–Mar</td><td>Confirmed</td><td>£2,166</td></tr><tr><td>Apr–Jun</td><td>Forecast +2.5%</td><td>£2,222</td></tr><tr><td>Jul–Sep</td><td>Forecast −8.5%</td><td>£2,034</td></tr></tbody></table>'+
      '<p>MSE consensus, week beginning 23 November; article updated 27 November 2026. <a href="'+source+'" target="_blank" rel="noopener">Forecast source</a>. The older detailed supplier table is not used.</p>';
    const model=document.getElementById('forecastPanelModel');
    if(model)model.innerHTML='<p>January uses the four published rates for your selected region. Percentage and pence buttons are optional stress scenarios; choosing Confirmed restores the announcement.</p>'+
      '<p>April and July are national typical-bill forecasts, not published regional unit rates. Their annual benchmarks (£2,222 and £2,034) determine the modelled movement, avoiding rounding drift from the displayed percentages. The existing illustrative electricity/gas split (7.6:12.2) allocates that movement to units whilst standing charges stay flat before VAT. Regional differences are preserved.</p>'+
      '<p>Electricity VAT is 0% through 30 June 2027, then 5%; gas remains 5%. July’s headline already includes VAT, so it is accounted for once. October onwards is held at July rates, an assumption rather than a forecast.</p>'+
      '<p>Monthly costs use seasonal kWh and actual active days. Existing customers’ entered variable rates are adjusted proportionately; these remain estimates of supplier prices. The announced cap does not confirm future UW Tracker prices.</p>';
    const method=document.getElementById('method');
    if(method){
      [...method.children].forEach(el=>{
        if(el.textContent.startsWith('VAT:'))el.textContent='VAT: gas 5%; electricity 0% from 1 October 2026 through 30 June 2027, then 5%. Rates entered before VAT are taxed by month.';
        if(el.textContent.startsWith('Confirmed price-cap'))el.textContent='Confirmed regional cap rates through March 2027. April and July use the MSE forecast checked 27 November 2026. Regional unit rates are estimates; standing charges held flat before VAT. October onwards held at July rates.';
      });
    }
    const foot=document.getElementById('foot');
    if(foot)foot.innerHTML=foot.innerHTML.replace(/App version: [^<]+/,'App version: 2.68.0 · January announcement and 23 November forecasts.');
    const faq=[...document.querySelectorAll('.answer-faq h3')].find(el=>el.textContent.includes('Are energy prices expected'));
    if(faq&&faq.nextElementSibling)faq.nextElementSibling.textContent='January–March 2027 is confirmed. The MSE forecast for the week beginning 23 November is +2.5% in April and −8.5% in July. Forecasts may change.';
  }
  const originalRender=render;
  render=function(){const result=originalRender.apply(this,arguments);update();return result;};
  const originalStatics=statics;
  statics=function(){const result=originalStatics.apply(this,arguments);update();return result;};
  update();render();
})();
