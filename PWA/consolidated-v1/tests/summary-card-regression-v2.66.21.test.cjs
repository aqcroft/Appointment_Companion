'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const donor = fs.readFileSync(path.resolve(root,'..','cloud','companion_cloud_pilot.html'), 'utf8');
const start = donor.indexOf('function compute(');
const stop = donor.indexOf('/* Every in-basket', start);
assert.ok(start > 0 && stop > start, 'find the real customer savings calculator');
const source = donor.slice(start, stop);

test('calculator no longer references an April broadband variable', () => {
  assert.ok(!source.includes('mba'), 'stale months-before-April variable cannot be read');
  assert.ok(source.includes('bbFree = Math.round(fm * uwBbRaw)'), 'free-month value is six times quoted broadband cost');
});

test('energy, broadband, mobile and cashback scenario generates valid summary figures', () => {
  const CONFIG = {
    insurance:{boilerCover:25},
    mobile:{servicesCountedMax:2,qualification:{previewPlan:'essentialMax'},plans:{essentialMax:{monthly:10},unlimitedMax:{monthly:20,freeMonths:3}}},
    broadband:{wholeHomeWifi:5,freeMonths:6},
    cashback:{slider:{default:500},lowMonthlyCaps:{3:12},lowCapDefault:12,rateLow:.01,referenceMedAnnual:120,referenceHighAnnual:180,referenceSpend:500,cardFeeMonthly:3,freeMonths:3},
    welcomeBonus:{3:100},referral:{minServices:2,amount:100},nationalLeague:{minServices:2,amount:65},
    connectorCommission:{3:125},exitFeeRefund:{minServices:3,maxRefund:250}
  };
  const state = {homeowner:'homeowner',boilerMode:'new',
    services:{energy:true,broadband:true,mobile:true},
    sims:{sim1:{include:true,uwPlan:'essentialMax',monthlyCost:12,exitFee:0}},
    energyAdjustPeriod:'monthly',manualAdjustPeriod:'monthly',oneOffType:'refund',
    cbTier:'med',includeCashback:true,referralRoute:'none',dhpPlan:0};
  const $ = id => ({checked:id==='bbFreeMonthsToggle',value:id==='spendSlider'?'500':'',classList:{contains:()=>id!=='bundleRatePanel'},textContent:''});
  const num = id => ({currentEnergyMonthly:120,uwEnergyMonthly:100,currentBroadbandMonthly:30}[id]||0);
  const numF = id => ({uwBroadbandMonthly:25}[id]||0);
  const mobileServiceContribution = sims => sims.length;
  const mobileWelcomeBonusEligible = sims => sims.length>0;
  const priceSims = sims => sims.map(()=>10);
  const scope={CONFIG,state,$,num,numF,mobileServiceContribution,mobileWelcomeBonusEligible,priceSims};
  const run=new Function(...Object.keys(scope),source+';return compute(0);');
  const result=run(...Object.values(scope));
  assert.equal(result.currentTotal,162);
  assert.equal(result.uwTotalBase,135);
  assert.equal(result.monthlySaving,27);
  assert.equal(result.bbFree,150);
  assert.equal(result.year1,667);
});
