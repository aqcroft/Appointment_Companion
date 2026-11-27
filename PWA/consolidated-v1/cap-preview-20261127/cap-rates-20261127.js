/* Approved snapshot, 27 November 2026. Pence per kWh / pence per day.
 * Regional DD single-rate figures transcribed from MSE's Jan-Mar table:
 * https://www.moneysavingexpert.com/utilities/what-are-the-price-cap-unit-rates-/
 * Rounded published rates; these are cap benchmarks, not supplier quotations.
 * Forecast: MSE fixing guide updated 27 Nov, week beginning 23 Nov 2026:
 * https://www.moneysavingexpert.com/utilities/are-there-any-cheap-fixed-energy-deals-currently-worth-it/
 */
(function(root){
  'use strict';
  const data={revision:'20261127',version:'2.68.0',week:'2026-11-23',updated:'2026-11-27',
    annual:{jan:2166,apr:2222,jul:2034},percent:{jan:25.7,apr:2.5,jul:-8.5},
    national:{eU:32.69,eSC:54.77,gU:10.96,gSC:29.65},
    january:{
      10:{eU:33.05,eSC:51.76,gU:10.90,gSC:29.28},
      11:{eU:31.65,eSC:51.38,gU:10.81,gSC:29.37},
      12:{eU:33.08,eSC:42.88,gU:11.14,gSC:30.19},
      13:{eU:34.44,eSC:67.59,gU:10.90,gSC:30.06},
      14:{eU:32.00,eSC:57.16,gU:10.89,gSC:29.68},
      15:{eU:31.69,eSC:61.51,gU:10.92,gSC:29.77},
      16:{eU:32.85,eSC:45.62,gU:10.85,gSC:29.78},
      17:{eU:32.40,eSC:55.07,gU:10.86,gSC:29.84},
      18:{eU:32.57,eSC:61.33,gU:10.86,gSC:29.86},
      19:{eU:33.29,eSC:52.25,gU:11.04,gSC:29.21},
      20:{eU:32.78,eSC:47.74,gU:11.16,gSC:29.10},
      21:{eU:32.92,eSC:55.35,gU:11.08,gSC:29.94},
      22:{eU:32.86,eSC:55.51,gU:11.11,gSC:29.26},
      23:{eU:32.11,eSC:61.59,gU:10.89,gSC:29.73}
    }};
  const annual=r=>((r.eSC+r.gSC)*365+r.eU*2500+r.gU*9500)/100;
  // A headline bill forecast does not specify a fuel split. Retain the existing
  // illustrative 7.6:12.2 electricity/gas movement shape, holding ex-VAT SC flat.
  // Annual totals are used rather than the rounded displayed percentages.
  function next(base,ratio,eVatRatio){
    const taxed={eU:base.eU*eVatRatio,eSC:base.eSC*eVatRatio,gU:base.gU,gSC:base.gSC};
    const delta=annual(base)*ratio-annual(taxed);
    const scale=delta/(taxed.eU*2500/100*7.6+taxed.gU*9500/100*12.2);
    return {...taxed,eU:taxed.eU*(1+scale*7.6),gU:taxed.gU*(1+scale*12.2)};
  }
  const nationalApr=next(data.national,data.annual.apr/data.annual.jan,1);
  // July headline already includes electricity VAT: subtract its effect before
  // allocating the remaining movement to units; do not add VAT twice.
  const nationalJul=next(nationalApr,data.annual.jul/data.annual.apr,1.05);
  const ratio=(a,b)=>Object.fromEntries(Object.keys(a).map(k=>[k,a[k]/b[k]]));
  const multiply=(a,b)=>Object.fromEntries(Object.keys(a).map(k=>[k,a[k]*b[k]]));
  const future={jan:{eU:1,eSC:1,gU:1,gSC:1},apr:ratio(nationalApr,data.national),jul:ratio(nationalJul,data.national)};
  future.flat=future.jul;
  function rate(region,phase,stress={e:1,g:1}){
    const jan=data.january[region.n];
    if(!jan)throw new Error('Unknown price-cap region '+region.n);
    if(phase==='conf')return {...region.cap.octdec};
    if(phase==='now')return {...region.cap.julsep};
    const r=multiply(jan,future[phase]||future.jul);
    r.eU*=stress.e;r.gU*=stress.g;
    return r;
  }
  function active(search){
    const p=new URLSearchParams(search);
    // Existing unversioned share links retain their legacy calculation path.
    if(p.has('cr'))return p.get('cr')===data.revision;
    return p.get('companion')==='1'||p.get('existing')==='1'||(!p.has('r')&&!p.has('e')&&!p.has('renew'));
  }
  root.Cap2027={data,annual,next,rate,active,future,nationalApr,nationalJul};
})(typeof window==='undefined'?globalThis:window);
