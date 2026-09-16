import { normalisePlanId } from '../rules/uw-rules-2026-10-01.js';

export const REGIONS = Object.freeze([
  ['10', 'Eastern'], ['11', 'East Midlands'], ['12', 'London'], ['13', 'Manweb'],
  ['14', 'Midlands'], ['15', 'Northern'], ['16', 'Norweb'], ['17', 'Scottish Hydro'],
  ['18', 'Scottish Power'], ['19', 'Seeboard'], ['20', 'Southern'], ['21', 'Swalec'],
  ['22', 'Sweb'], ['23', 'Yorkshire']
]);

const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const finite = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};
const text = (value, max = 500) => String(value || '').trim().slice(0, max);
const bool = value => value === true || value === 'true' || value === 1 || value === '1';

export function createSim(index = 0) {
  return { name: `SIM ${index + 1}`, include: true, planId: 'essentialMax', currentMonthly: 0, exitFee: 0 };
}

export function createAppointment(name = '') {
  return {
    schemaVersion: 3,
    person: { name: text(name, 80), homeStatus: null },
    services: { energy: false, broadband: false, mobile: false, boilerCover: false },
    energy: {
      region: '11', fuel: 'dual', electricityProfile: 'standard', peakOffPeak: false,
      annualElectricityKwh: 0, annualGasKwh: 0, usageSource: 'actual',
      dayKwh: 0, nightKwh: 0, splitSampleDayKwh: 0, splitSampleNightKwh: 0,
      currentCostMode: 'monthly', currentMonthly: 0, currentElectricityMonthly: 0,
      currentGasMonthly: 0, annualElectricityCost: 0, annualGasCost: 0,
      currentDayRate: 0, currentNightRate: 0, currentStandingCharge: 0,
      electricityExitFee: 0, gasExitFee: 0,
      uwQuoteMode: 'single', uwMonthly: 0, uwTier1: 0, uwTier2: 0, uwTier3: 0,
      quoteStatus: 'indicative', adjustmentEnabled: false, adjustmentTarget: 'current',
      adjustmentPeriod: 'monthly', adjustmentAmount: 0, e7StandardAnnualCost: 0
    },
    broadband: {
      currentMonthly: 0, uwMonthly: 0, packageId: '', wholeHomeWifi: false,
      homePhoneMonthly: 0, exitFee: 0, freeMonthsOffer: false
    },
    mobile: { simCount: 1, sims: [createSim(0)] },
    boilerCover: { monthly: 25 },
    cashback: { enabled: true, tier: 'average', monthlySpend: 1000 },
    adjustments: {
      recurringEnabled: false, period: 'monthly', currentAmount: 0, uwAmount: 0,
      currentReason: '', uwReason: '', oneOffEnabled: false, oneOffType: 'benefit',
      oneOffAmount: 0, oneOffLabel: ''
    },
    benefits: { referral: false, nationalLeague: false },
    summary: { basketUrl: '', privateNotes: '', lastSharedAt: '' },
    activity: []
  };
}

export function normaliseAppointment(input = {}) {
  const defaults = createAppointment();
  const source = clone(input) || {};
  const out = {
    ...defaults,
    ...source,
    person: { ...defaults.person, ...(source.person || {}) },
    services: { ...defaults.services, ...(source.services || {}) },
    energy: { ...defaults.energy, ...(source.energy || {}) },
    broadband: { ...defaults.broadband, ...(source.broadband || {}) },
    mobile: { ...defaults.mobile, ...(source.mobile || {}) },
    boilerCover: { ...defaults.boilerCover, ...(source.boilerCover || {}) },
    cashback: { ...defaults.cashback, ...(source.cashback || {}) },
    adjustments: { ...defaults.adjustments, ...(source.adjustments || {}) },
    benefits: { ...defaults.benefits, ...(source.benefits || {}) },
    summary: { ...defaults.summary, ...(source.summary || {}) }
  };
  out.schemaVersion = 3;
  out.person.name = text(out.person.name, 80);
  out.person.homeStatus = ['homeowner', 'tenant'].includes(out.person.homeStatus) ? out.person.homeStatus : null;
  out.services = {
    energy: bool(out.services.energy),
    broadband: bool(out.services.broadband),
    mobile: bool(out.services.mobile),
    boilerCover: bool(out.services.boilerCover)
  };
  if (out.person.homeStatus === 'tenant') out.services.boilerCover = false;
  out.energy.region = REGIONS.some(([id]) => id === String(out.energy.region)) ? String(out.energy.region) : '11';
  out.energy.fuel = ['electricity', 'gas', 'dual'].includes(out.energy.fuel) ? out.energy.fuel : 'dual';
  out.energy.electricityProfile = ['standard', 'economy7', 'ev'].includes(out.energy.electricityProfile) ? out.energy.electricityProfile : 'standard';
  out.energy.peakOffPeak = out.energy.electricityProfile !== 'standard' || bool(out.energy.peakOffPeak);
  ['annualElectricityKwh', 'annualGasKwh', 'dayKwh', 'nightKwh', 'splitSampleDayKwh', 'splitSampleNightKwh',
    'currentMonthly', 'currentElectricityMonthly', 'currentGasMonthly', 'annualElectricityCost', 'annualGasCost',
    'currentDayRate', 'currentNightRate', 'currentStandingCharge', 'electricityExitFee', 'gasExitFee',
    'uwMonthly', 'uwTier1', 'uwTier2', 'uwTier3', 'adjustmentAmount', 'e7StandardAnnualCost'
  ].forEach(key => { out.energy[key] = finite(out.energy[key]); });
  out.mobile.simCount = Math.max(1, Math.min(5, Math.round(finite(out.mobile.simCount, 1))));
  out.mobile.sims = Array.from({ length: out.mobile.simCount }, (_, index) => {
    const sim = { ...createSim(index), ...(out.mobile.sims?.[index] || {}) };
    sim.name = text(sim.name || `SIM ${index + 1}`, 40);
    sim.include = sim.include !== false;
    sim.planId = normalisePlanId(sim.planId || sim.uwPlan);
    sim.currentMonthly = finite(sim.currentMonthly ?? sim.monthlyCost);
    sim.exitFee = finite(sim.exitFee);
    delete sim.uwPlan;
    delete sim.monthlyCost;
    return sim;
  });
  out.boilerCover.monthly = finite(out.boilerCover.monthly, 25) || 25;
  out.summary.basketUrl = text(out.summary.basketUrl, 500);
  out.summary.privateNotes = String(out.summary.privateNotes || '').slice(0, 5000);
  out.activity = Array.isArray(out.activity) ? out.activity.slice(-20) : [];
  delete out.energy.e7StandardAnnualSaving;
  delete out.incomeProtector;
  return out;
}

export function hasMeaningfulIdentity(appointment) {
  return Boolean(normaliseAppointment(appointment).person.name);
}

export function normaliseName(value) {
  return String(value || '').trim().toLocaleLowerCase('en-GB').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ');
}

export { clone };
