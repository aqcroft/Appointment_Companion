/* Should I Fix forecast feed v2.66.17. Approved GitHub JSON is the sole source for
   scenarios, the tappable MSE table and dates. On a failed fetch, use the bundled snapshot. */
(function () {
  'use strict';
  // The immutable January announcement and newer forecast snapshot own new comparisons.
  // Keep the earlier approved feed only for legacy saved scenarios.
  if(typeof latestCapModel==='function'&&latestCapModel())return;
  const sourceLink = 'https://www.moneysavingexpert.com/utilities/energy-price-cap-prediction/';
  const $ = selector => document.querySelector(selector);
  const dateLabel = date => new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  const signed = pct => (pct > 0 ? '+' : '') + Number(pct).toFixed(Number.isInteger(pct) ? 0 : 1) + '%';
  const move = pct => pct >= 0 ? 'Up ' + Math.abs(pct) + '%' : 'Down ' + Math.abs(pct) + '%';
  const money = value => '£' + Number(value).toLocaleString('en-GB') + ' a year';
  function valid(item) {
    return item && typeof item.change_pct === 'number' && Number.isFinite(item.change_pct) &&
      item.change_pct > -90 && item.change_pct < 150 &&
      Number.isInteger(item.annual_gbp) && item.annual_gbp > 100 && item.annual_gbp < 10000;
  }
  function validate(data) {
    if (!data || data.schema_version !== 1 || !/^mse-\d{4}-\d{2}-\d{2}$/.test(data.revision) ||
        !data.source || data.source.url !== sourceLink ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.source.week_start) ||
        !Array.isArray(data.periods) || data.periods.length !== 4 ||
        !Array.isArray(data.suppliers) || data.suppliers.length !== 3) throw new Error('Invalid forecast document');
    if (data.periods.map(p=>p.key).join(',') !== 'oct2026,jan2027,apr2027,jul2027' ||
        !data.periods.every(p => valid(p.average))) throw new Error('Unexpected forecast periods');
    if (data.suppliers.map(s=>s.name).join(',') !== 'EDF,British Gas,E.on Next' ||
        !data.suppliers.every(s => Array.isArray(s.values) && s.values.length === 4 &&
          s.values.every(v => v === null || valid(v)))) throw new Error('Incomplete supplier table');
    const values = data.periods.map(p=>p.average.change_pct);
    if (values[0] !== 3.6 || values.slice(1).some(v=>v < -50 || v > 80)) {
      throw new Error('Out-of-range published forecast');
    }
    return data;
  }
  function addStatus(message, warning) {
    let el = $('#forecastDataStatus');
    if (!el) {
      el = document.createElement('p');
      el.id = 'forecastDataStatus';
      el.style.cssText = 'font-size:.74rem;line-height:1.45;margin:10px 0 0;font-weight:700;';
      const anchor = $('.outlook-note');
      if (anchor) anchor.insertAdjacentElement('afterend',el);
    }
    el.textContent = message;
    el.style.color = warning ? '#925300' : '#5d5873';
  }
  function safeCell(p) {
    const td = document.createElement('td');
    if (!p) { const x=document.createElement('span'); x.className='move';x.textContent='No prediction yet';td.append(x);return td;}
    const a=document.createElement('span');a.className='move';a.textContent=move(p.change_pct);
    const b=document.createElement('span');b.className='amount';b.textContent=money(p.annual_gbp);
    td.append(a,b);return td;
  }
  function updateTable(data) {
    const tbody = $('#forecastPanelSource .forecast-table tbody');
    if (!tbody) return;
    tbody.replaceChildren();
    [...data.suppliers,{name:'Average',values:data.periods.map(p=>p.average)}].forEach(entry=>{
      const row = document.createElement('tr');
      if (entry.name==='Average') row.className='avg';
      const label=document.createElement('td');label.className='supplier';label.textContent=entry.name;row.append(label);
      entry.values.forEach(v=>row.append(safeCell(v)));tbody.append(row);
    });
    const header=$('.forecast-snapshot-title');
    if(header)header.textContent='Annual Price Cap predictions - week starting '+dateLabel(data.source.week_start);
    const big=$('#forecastPanelSource .source-big');
    if(big)big.textContent=signed(data.periods[1].average.change_pct);
    const sub=$('#forecastPanelSource .source-sub');
    if(sub)sub.textContent='MoneySavingExpert published average. Forecast week starting '+dateLabel(data.source.week_start)+'. January defaults to '+signed(data.periods[1].average.change_pct)+'. These predictions are not confirmed Ofgem rates.';
    const notes=$('#forecastPanelSource .source-note');
    if(notes)notes.textContent='MSE benchmark: 2,500 kWh electricity and 9,500 kWh gas, paying by Direct Debit. '+data.suppliers.map(s=>s.name+(s.values.every(v=>v===null)?' - no current predictions':s.predicted_on?' prediction '+dateLabel(s.predicted_on):' - figures from this MSE table')).join('; ')+'.';
    const outlookCells=document.querySelectorAll('.outlook-grid .outlook-cell b');
    data.periods.forEach((period,index)=>{if(outlookCells[index])outlookCells[index].textContent=signed(period.average.change_pct);});
    const outlook=$('.outlook-note');
    if(outlook)outlook.textContent='Forecast source: MoneySavingExpert, week starting '+dateLabel(data.source.week_start)+'. January, April and July are predictions and may change before Ofgem confirms each cap.';
    const faq=[...document.querySelectorAll('.answer-faq h3')].find(el=>el.textContent.includes('Are energy prices expected'));
    if(faq && faq.nextElementSibling)faq.nextElementSibling.textContent='MoneySavingExpert currently forecasts a '+signed(data.periods[1].average.change_pct)+' movement for January-March 2027, according to its table for the week beginning '+dateLabel(data.source.week_start)+'. This is a forecast, not a confirmed Ofgem cap.';
    const badges=document.querySelectorAll('#forecastPanelModel .forecast-model-badge');
    if(badges.length>=4){badges[0].textContent=signed(data.periods[1].average.change_pct);badges[1].textContent='Apr '+signed(data.periods[2].average.change_pct);badges[2].textContent='Jul '+signed(data.periods[3].average.change_pct);}
  }
  async function load() {
    const base=new URL('./forecast-data.json',location.href);
    base.searchParams.set('fresh',String(Date.now()));
    try {
      const res=await fetch(base.toString(),{cache:'no-store'});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const data=validate(await res.json());
      // Never let stale cached JSON replace a newer approved bundled snapshot.
      const bundled=document.querySelector('meta[name="forecast-bundled-revision"]')?.content||'';
      if(bundled && data.revision<bundled)throw new Error('Forecast feed older than approved bundled snapshot');
      const originalDefault=DEFAULT_JAN_RISE;
      DEFAULT_JAN_RISE=data.periods[1].average.change_pct;
      APR_FROM_JAN=1+data.periods[2].average.change_pct/100;
      JUL_FROM_APR=1+data.periods[3].average.change_pct/100;
      const marker=$('#forecastDefault');
      if(marker)marker.value=String(DEFAULT_JAN_RISE);
      const scenario=$('#janRise');
      const queryHasScenario=new URLSearchParams(location.search).has('j');
      if (scenario && !queryHasScenario && Number(scenario.value)===originalDefault) {
        scenario.value=String(DEFAULT_JAN_RISE);
      }
      updateTable(data);
      window.ShouldIFixApprovedForecast={revision:data.revision,source_week:data.source.week_start,percentages:data.periods.map(x=>x.average.change_pct)};
      if(typeof statics==='function')statics();
      if(typeof render==='function')render();
      addStatus('Approved forecast: week starting '+dateLabel(data.source.week_start)+' · '+data.revision+'.',false);
    } catch(error) {
      const bundled=document.querySelector('meta[name="forecast-bundled-revision"]')?.content||'';
      addStatus('Live forecast refresh unavailable. Displaying the approved built-in '+signed(DEFAULT_JAN_RISE)+' January forecast'+(bundled?' ('+bundled+').':'.'),true);
      console.warn('Should I Fix approved forecast could not load',error);
    }
  }
  load();
})();
