'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const donor = fs.readFileSync(path.resolve(__dirname, '../../cloud/companion_cloud_pilot.html'), 'utf8');
function between(start, end) {
  const a = donor.indexOf(start), b = donor.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Source anchors: ' + start);
  return donor.slice(a, b);
}
function scenario() {
  const elements = Object.create(null);
  const get = id => {
    if (!elements[id]) {
      elements[id] = {
        value: '0', checked: false, textContent: '',
        classList: { contains: () => true, add() {}, remove() {}, toggle() {} },
        querySelector: () => ({ textContent: '' })
      };
    }
    return elements[id];
  };
  const ctx = vm.createContext({
    $: get, getPartner: () => null, basketLink: () => '',
    DEFAULT_PARTNER_ROLE: 'UW Partner',
    cashbackBasisText: () => 'cashback basis',
    estimateDateText: () => '6 November 2026'
  });
  const pieces = [
    between('const CONFIG =', '/* ============================ /CONFIG'),
    between('function toPennies(', 'const state ='),
    between('const state =', 'let previewExtra ='),
    between('function priceSims(', '/* ---------- boiler comparison mode'),
    between('function compute(', 'function validateInputs('),
    between('function money(', 'const basketLink ='),
    between('function saveLine(', 'let partnerProfileLoadFailed ='),
    between('function buildShareData()', '// Push the partner to the +1/+2'),
    between('function renderShared(d)', '/* Customer-side meal-deal toggle.')
  ];
  const app = vm.runInContext(pieces.join('\n') + '\n({compute, buildShareData, renderShared, state, cardAmount, toPennies})', ctx);
  return { ...app, get, elements };
}
function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-8, label + ': expected ' + expected + ', received ' + actual);
}

// Actual monthly customer figures, plus a synthetic £174 one-off amount to
// reproduce the supplied £513 total year-one benefits independently of UW offers.
{
  const c = scenario();
  assert.equal(c.toPennies('119.53'), 11953);
  assert.equal(c.toPennies('42.99'), 4299);
  assert.equal(c.toPennies('12.50'), 1250);
  assert.equal(c.cardAmount(119.53), '£120');
  assert.equal(c.cardAmount(42.99), '£43');
  assert.equal(c.cardAmount(113.39), '£113');
  assert.equal(c.cardAmount(12.5), '£13');
  assert.equal(c.cardAmount(-12.5), '−£13');
  c.state.homeowner = 'homeowner';
  c.state.services = { energy: true, broadband: true, mobile: true };
  c.state.simCount = 1;
  c.state.sims = { sim1: { monthlyCost: 12, exitFee: 0, include: true, uwPlan: 'unlimitedMax' } };
  c.get('currentEnergyMonthly').value = '119.53';
  c.get('uwEnergyMonthly').value = '113.39';
  c.get('currentBroadbandMonthly').value = '42.99';
  c.get('uwBroadbandMonthly').value = '30';
  c.get('wholeHomeWifiToggle').checked = true;
  c.get('bbFreeMonthsToggle').checked = true;
  c.get('spendSlider').value = '750'; // existing average cashback: £13 - £3 fee = £10 net.
  c.get('oneOffToggle').checked = true;
  c.get('oneOffAmount').value = '174';
  c.get('customerName').value = 'Precision test';
  const r = c.compute();
  close(r.currentTotal, 174.52, 'Current monthly total');
  close(r.uwTotalBase, 161.39, 'UW before cashback');
  assert.equal(r.cashbackNet, 10, 'Existing whole-pound cashback rule unchanged');
  close(r.uwTotalBase - r.cashbackNet, 151.39, 'UW net monthly cost');
  close(r.monthlySaving + r.cashbackNet, 23.13, 'Monthly savings');
  close((r.monthlySaving + r.cashbackNet) * 12, 277.56, 'Annual service savings');
  const benefits = r.welcome + r.bbFree + r.mobileFreeMonths + r.freeMonthsValue + r.oneOff - r.exitDeduction;
  close(benefits, 513, 'Year-one benefits');
  close(r.year1, 790.56, 'Full-precision year-one benefit');
  assert.equal(Math.round(r.year1), 791);
  const packed = c.buildShareData().data;
  close(packed.cT, 174.52, 'Shared current monthly');
  close(packed.uT, 161.39, 'Shared UW monthly');
  close(packed.sM, 13.13, 'Shared before-cashback monthly saving');
  assert.equal(packed.cn, 10);
  assert.equal(packed.y, 791);
  c.renderShared(packed);
  assert.equal(c.get('totNow').textContent, '£175');
  assert.equal(c.get('totUw').textContent, '£151');
  assert.equal(c.get('totSave').textContent, '£23');
  assert.equal(c.get('annualServiceSavings').textContent, '£278');
  assert.equal(c.get('scBenefitsTotal').textContent, '£513');
  assert.equal(c.get('scHero').textContent, '791');
  assert.equal(c.get('scEnergyNow').textContent, '£120');
  assert.equal(c.get('scEnergyUw').textContent, '£113');
  assert.equal(c.get('scBbNow').textContent, '£43');
  assert.equal(c.get('scBbUw').textContent, '£35');
  assert.equal(c.get('scMobNow').textContent, '£12');
}

// Split gas/electricity, fractional UW broadband and a share snapshot of
// the broadband free-month offer's exact £143.70, not prematurely rounded £144.
{
  const c = scenario();
  c.state.homeowner = 'tenant';
  c.state.services = { energy: true, broadband: true, mobile: true };
  c.state.sims = { sim1: { monthlyCost: 12, exitFee: 0, include: true, uwPlan: 'unlimitedMax' } };
  c.state.simCount = 1;
  c.get('splitEnergyToggle').checked = true;
  c.get('currentElecMonthly').value = '119.53';
  c.get('currentGasMonthly').value = '41.27';
  c.get('uwEnergyMonthly').value = '140.50';
  c.get('currentBroadbandMonthly').value = '45.25';
  c.get('uwBroadbandMonthly').value = '23.95';
  c.get('bbFreeMonthsToggle').checked = true;
  c.state.includeCashback = false;
  const r = c.compute();
  close(r.currentEnergy, 160.80, 'Gas plus electricity pennies');
  close(r.uwEnergy, 140.50, 'UW energy pennies');
  close(r.uwBb, 23.95, 'UW broadband is not ceiled');
  close(r.bbFree, 143.70, '6 free months at exact quoted rate');
  close(c.buildShareData().data.bf, 143.70, 'Shared broadband benefit retains pennies');
}

// Multiple SIMs and their exit fees are monetary fields, not whole-pound inputs.
{
  const c = scenario();
  c.state.homeowner = 'tenant';
  c.state.includeCashback = false;
  c.state.services = { energy: false, broadband: false, mobile: true };
  c.state.sims = {
    sim1: { monthlyCost: 12.50, exitFee: 10.25, include: true, uwPlan: 'unlimitedMax' },
    sim2: { monthlyCost: 5.25, exitFee: 12.50, include: true, uwPlan: 'essentialMax' }
  };
  c.state.simCount = 2;
  const r = c.compute();
  close(r.currentMob, 17.75, 'SIM monthly pennies');
  close(r.exitFees, 22.75, 'SIM exit-fee pennies');
  close(r.exitDeduction, 22.75, 'Unrefunded fees remain exact');
}

// Annual bill inputs and adjustments must not round their monthly equivalents.
{
  const c = scenario();
  c.state.includeCashback = false;
  c.state.services = { energy: true, broadband: false, mobile: false };
  c.get('useBillCosts').checked = true;
  c.get('elecAnnualCost').value = '1200.01';
  c.get('gasAnnualCost').value = '0';
  c.get('uwEnergyMonthly').value = '90.05';
  c.get('energyAdjustToggle').checked = true;
  c.state.energyAdjustPeriod = 'annual';
  c.get('energyAdjustAmount').value = '1';
  c.get('manualAdjustToggle').checked = true;
  c.state.manualAdjustPeriod = 'annual';
  c.get('manualAdjustCurrent').value = '0.99';
  c.get('manualAdjustUw').value = '-0.25';
  c.get('oneOffToggle').checked = true;
  c.get('oneOffAmount').value = '12.50';
  const r = c.compute();
  close(r.currentEnergy, 1200.01 / 12 + 1 / 12, 'Annual bill and adjustment');
  close(r.manualAdjustCurrent, 0.99 / 12, 'Annual manual adjustment');
  close(r.manualAdjustUw, -0.25 / 12, 'Negative annual adjustment');
  close(r.oneOff, 12.50, 'One-off pennies');
}
const localCard = between('function renderCard(r)', '/* ---------- EV sense-check modal');
assert.match(localCard, /const fmt = \(v, suf\) => cardAmount\(v\)/);
assert.match(donor, /function saveLine\(el, val\) \{\s*el\.textContent = cardAmount\(val\)/);
assert.doesNotMatch(donor, /Math\.ceil\(uwBbRaw\)|parseInt\(el\.value|bbFree = Math\.round/);
console.log('Financial precision regressions passed (calculation, share payload and shared summary).');
