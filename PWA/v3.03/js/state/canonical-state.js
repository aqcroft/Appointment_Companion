import { UW_RULES_2026_10_01, normalisePlanId } from '../rules/uw-rules-2026-10-01.js';

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
  return { name: `SIM ${index + 1}`, include: true, planId: '', currentMonthly: 0, uwMonthly: null, exitFeesApply: false, exitFee: 0 };
}

export function createAppointment(name = '') {
  return {
    schemaVersion: 3,
    person: { name: text(name, 80), homeStatus: null },
    services: { energy: false, broadband: false, mobile: false, boilerCover: false },
    energy: {
      region: '11', fuel: 'dual', electricityProfile: 'standard', peakOffPeak: false,
      annualElectricityKwh: 0, annualGasKwh: 0, usageSource: 'uw',
      electricityUsageSource: 'uw', electricityUwKwh: 0, electricityBillKwh: 0, electricityEstimatedKwh: 0,
      gasUsageSource: 'uw', gasUwKwh: 0, gasBillKwh: 0, gasEstimatedKwh: 0,
      billUsageAvailable: false,
      dayKwh: 0, nightKwh: 0, splitSampleDayKwh: 0, splitSampleNightKwh: 0,
      currentCostMode: 'monthly', currentMonthly: 0, currentElectricityMonthly: 0,
      currentGasMonthly: 0, annualElectricityCost: 0, annualGasCost: 0,
      currentDayRate: 0, currentNightRate: 0, currentStandingCharge: 0, currentRatesIncludeVat: false,
      exitFeesApply: false, electricityExitFee: 0, gasExitFee: 0,
      uwQuoteMode: 'single', uwMonthly: 0, uwTier1: 0, uwTier2: 0, uwTier3: 0,
      quoteStatus: 'indicative', selectedTariffFamily: 'fixed', adjustmentEnabled: false, adjustmentTarget: 'current',
      adjustmentPeriod: 'monthly', adjustmentAmount: 0, adjustmentSign: 'plus', adjustmentReason: '', e7StandardAnnualCost: 0
    },
    broadband: {
      currentMonthly: 0, uwMonthly: 0, packageId: '', connectionFamily: 'full', currentSpeed: '', wholeHomeWifi: false,
      homePhoneEnabled: false, homePhoneBundle: 'none', homePhoneMonthly: 0, exitFeesApply: false, exitFee: 0, freeMonthsOffer: false
    },
    mobile: { simCount: 1, showNames: false, sims: [createSim(0)] },
    boilerCover: { currentMonthly: 0, monthly: 25, exitFeesApply: false, exitFee: 0 },
    cashback: { enabled: true, tier: 'average', monthlySpend: 1000 },
    adjustments: {
      recurringEnabled: false, period: 'monthly',
      currentAmount: 0, uwAmount: 0, currentReason: '', uwReason: '',
      currentPeriod: 'monthly', uwPeriod: 'monthly', currentSign: 'plus', uwSign: 'plus',
      oneOffEnabled: false, oneOffType: 'benefit', oneOffAmount: 0, oneOffLabel: '',
      oneOffCurrentAmount: 0, oneOffUwAmount: 0,
      oneOffCurrentReason: '', oneOffUwReason: '',
      oneOffCurrentSign: 'plus', oneOffUwSign: 'minus'
    },
    benefits: { referral: false, nationalLeague: false },
    completion: { entered: [] },
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
    completion: { ...defaults.completion, ...(source.completion || {}) },
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
  out.energy.selectedTariffFamily = ['standardVariable','tracker','fixed','evVariable','economy7Variable','fixedE7'].includes(out.energy.selectedTariffFamily) ? out.energy.selectedTariffFamily : 'fixed';
  out.energy.electricityProfile = ['standard', 'economy7', 'ev'].includes(out.energy.electricityProfile) ? out.energy.electricityProfile : 'standard';
  const hasPeakOffPeak = Object.prototype.hasOwnProperty.call(source.energy || {}, 'peakOffPeak');
  out.energy.peakOffPeak = hasPeakOffPeak ? bool(source.energy.peakOffPeak) : out.energy.electricityProfile !== 'standard';
  out.energy.currentRatesIncludeVat = Object.prototype.hasOwnProperty.call(source.energy || {}, 'currentRatesIncludeVat')
    ? bool(source.energy.currentRatesIncludeVat)
    : false;
  if (!out.energy.peakOffPeak) out.energy.electricityProfile = 'standard';
  ['annualElectricityKwh', 'annualGasKwh', 'dayKwh', 'nightKwh', 'splitSampleDayKwh', 'splitSampleNightKwh',
    'electricityUwKwh', 'electricityBillKwh', 'electricityEstimatedKwh',
    'gasUwKwh', 'gasBillKwh', 'gasEstimatedKwh',
    'currentMonthly', 'currentElectricityMonthly', 'currentGasMonthly', 'annualElectricityCost', 'annualGasCost',
    'currentDayRate', 'currentNightRate', 'currentStandingCharge', 'electricityExitFee', 'gasExitFee',
    'uwMonthly', 'uwTier1', 'uwTier2', 'uwTier3', 'adjustmentAmount', 'e7StandardAnnualCost'
  ].forEach(key => { out.energy[key] = finite(out.energy[key]); });
  const energyExitFlagSupplied = Object.prototype.hasOwnProperty.call(source.energy || {}, 'exitFeesApply');
  out.energy.exitFeesApply = energyExitFlagSupplied
    ? bool(source.energy.exitFeesApply)
    : out.energy.electricityExitFee > 0 || out.energy.gasExitFee > 0;
  out.energy.adjustmentSign = ['plus','minus'].includes(out.energy.adjustmentSign) ? out.energy.adjustmentSign : 'plus';
  out.energy.adjustmentReason = text(out.energy.adjustmentReason, 120);
  const sourceFor = value => ['uw', 'bill', 'estimated'].includes(value) ? value : value === 'actual' ? 'bill' : 'uw';
  const seedUsage = (fuel, legacyKey) => {
    const sourceKey = `${fuel}UsageSource`;
    const uwKey = `${fuel}UwKwh`;
    const billKey = `${fuel}BillKwh`;
    const estimatedKey = `${fuel}EstimatedKwh`;
    const legacy = finite(source.energy?.[legacyKey]);
    const hadCandidates = [uwKey, billKey, estimatedKey].some(key => finite(source.energy?.[key]) > 0);
    out.energy[sourceKey] = sourceFor(source.energy?.[sourceKey] || source.energy?.usageSource || out.energy[sourceKey]);
    if (!hadCandidates && legacy > 0) {
      const target = out.energy[sourceKey] === 'bill' ? billKey : out.energy[sourceKey] === 'estimated' ? estimatedKey : uwKey;
      out.energy[target] = legacy;
    }
    const sourceCandidates = {
      uw: out.energy[uwKey],
      bill: out.energy[billKey],
      estimated: out.energy[estimatedKey]
    };
    if (!(sourceCandidates[out.energy[sourceKey]] > 0)) {
      out.energy[sourceKey] = sourceCandidates.uw > 0
        ? 'uw'
        : sourceCandidates.bill > 0
          ? 'bill'
          : sourceCandidates.estimated > 0
            ? 'estimated'
            : 'uw';
    }
    out.energy[legacyKey] = sourceCandidates[out.energy[sourceKey]] || legacy;
  };
  seedUsage('electricity', 'annualElectricityKwh');
  seedUsage('gas', 'annualGasKwh');
  const hasBillDisclosure = Object.prototype.hasOwnProperty.call(source.energy || {}, 'billUsageAvailable');
  const selectedBill = (out.energy.electricityUsageSource === 'bill' && out.energy.electricityBillKwh > 0)
    || (out.energy.gasUsageSource === 'bill' && out.energy.gasBillKwh > 0);
  out.energy.billUsageAvailable = selectedBill || (hasBillDisclosure
    ? bool(source.energy.billUsageAvailable)
    : out.energy.electricityBillKwh > 0 || out.energy.gasBillKwh > 0);
  out.energy.usageSource = out.energy.electricityUsageSource === out.energy.gasUsageSource
    ? out.energy.electricityUsageSource
    : 'mixed';
  out.broadband.connectionFamily = ['full','part'].includes(out.broadband.connectionFamily) ? out.broadband.connectionFamily : /^fibre/.test(out.broadband.packageId) ? 'full' : /^ultra/.test(out.broadband.packageId) ? 'part' : 'full';
  out.broadband.currentSpeed = text(out.broadband.currentSpeed, 60);
  out.broadband.homePhoneMonthly = finite(out.broadband.homePhoneMonthly);
  out.broadband.homePhoneEnabled = Object.prototype.hasOwnProperty.call(source.broadband || {}, 'homePhoneEnabled')
    ? bool(source.broadband.homePhoneEnabled)
    : out.broadband.homePhoneMonthly > 0;
  const bundleSupplied = Object.prototype.hasOwnProperty.call(source.broadband || {}, 'homePhoneBundle');
  out.broadband.homePhoneBundle = ['none','peakSaver','offPeakSaver'].includes(out.broadband.homePhoneBundle) ? out.broadband.homePhoneBundle : 'none';
  if (out.broadband.homePhoneEnabled && !bundleSupplied && out.broadband.homePhoneMonthly > 0) {
    out.broadband.homePhoneBundle = out.broadband.homePhoneMonthly >= 10 ? 'peakSaver' : 'offPeakSaver';
  }
  if (!out.broadband.homePhoneEnabled) {
    out.broadband.homePhoneBundle = 'none';
    out.broadband.homePhoneMonthly = 0;
  } else {
    out.broadband.homePhoneMonthly = out.broadband.homePhoneBundle === 'peakSaver'
      ? 13
      : out.broadband.homePhoneBundle === 'offPeakSaver'
        ? 6.5
        : 0;
  }
  out.broadband.exitFee = finite(out.broadband.exitFee);
  out.broadband.exitFeesApply = Object.prototype.hasOwnProperty.call(source.broadband || {}, 'exitFeesApply')
    ? bool(source.broadband.exitFeesApply)
    : out.broadband.exitFee > 0;
  out.mobile.simCount = Math.max(1, Math.min(5, Math.round(finite(out.mobile.simCount, 1))));
  const namesDiffer = (out.mobile.sims || []).some((sim, index) => text(sim?.name, 40) && text(sim?.name, 40) !== `SIM ${index + 1}`);
  out.mobile.showNames = Object.prototype.hasOwnProperty.call(source.mobile || {}, 'showNames') ? bool(source.mobile.showNames) : namesDiffer;
  out.mobile.sims = Array.from({ length: out.mobile.simCount }, (_, index) => {
    const rawSim = out.mobile.sims?.[index] || {};
    const sim = { ...createSim(index), ...rawSim };
    sim.name = text(sim.name || `SIM ${index + 1}`, 40);
    sim.include = sim.include !== false;
    sim.planId = sim.planId || sim.uwPlan ? normalisePlanId(sim.planId || sim.uwPlan) : '';
    sim.currentMonthly = finite(sim.currentMonthly ?? sim.monthlyCost);
    sim.uwMonthly = Object.prototype.hasOwnProperty.call(rawSim, 'uwMonthly')
      ? rawSim.uwMonthly === null || rawSim.uwMonthly === '' ? null : finite(rawSim.uwMonthly)
      : sim.planId
        ? UW_RULES_2026_10_01.mobile[normalisePlanId(sim.planId)].monthly
        : null;
    sim.exitFee = finite(sim.exitFee);
    sim.exitFeesApply = Object.prototype.hasOwnProperty.call(rawSim, 'exitFeesApply')
      ? bool(rawSim.exitFeesApply)
      : sim.exitFee > 0;
    delete sim.uwPlan;
    delete sim.monthlyCost;
    return sim;
  });
  out.boilerCover.currentMonthly = finite(out.boilerCover.currentMonthly);
  out.boilerCover.monthly = finite(out.boilerCover.monthly, 25) || 25;
  out.boilerCover.exitFee = finite(out.boilerCover.exitFee);
  out.boilerCover.exitFeesApply = Object.prototype.hasOwnProperty.call(source.boilerCover || {}, 'exitFeesApply')
    ? bool(source.boilerCover.exitFeesApply)
    : out.boilerCover.exitFee > 0;
  const legacyAdjustmentPeriod = ['monthly','annual'].includes(out.adjustments.period) ? out.adjustments.period : 'monthly';
  out.adjustments.currentPeriod = Object.prototype.hasOwnProperty.call(source.adjustments || {}, 'currentPeriod') && ['monthly','annual'].includes(source.adjustments.currentPeriod)
    ? source.adjustments.currentPeriod
    : legacyAdjustmentPeriod;
  out.adjustments.uwPeriod = Object.prototype.hasOwnProperty.call(source.adjustments || {}, 'uwPeriod') && ['monthly','annual'].includes(source.adjustments.uwPeriod)
    ? source.adjustments.uwPeriod
    : legacyAdjustmentPeriod;
  out.adjustments.currentSign = ['plus','minus'].includes(out.adjustments.currentSign) ? out.adjustments.currentSign : 'plus';
  out.adjustments.uwSign = ['plus','minus'].includes(out.adjustments.uwSign) ? out.adjustments.uwSign : 'plus';
  out.adjustments.currentAmount = finite(out.adjustments.currentAmount);
  out.adjustments.uwAmount = finite(out.adjustments.uwAmount);
  out.adjustments.currentReason = text(out.adjustments.currentReason, 120);
  out.adjustments.uwReason = text(out.adjustments.uwReason, 120);

  const legacyOneOffAmount = finite(out.adjustments.oneOffAmount);
  const oneOffFieldsSupplied = ['oneOffCurrentAmount','oneOffUwAmount','oneOffCurrentReason','oneOffUwReason']
    .some(key => Object.prototype.hasOwnProperty.call(source.adjustments || {}, key));
  if (!oneOffFieldsSupplied && legacyOneOffAmount > 0) {
    out.adjustments.oneOffUwAmount = legacyOneOffAmount;
    out.adjustments.oneOffUwReason = text(out.adjustments.oneOffLabel, 120);
    out.adjustments.oneOffUwSign = out.adjustments.oneOffType === 'charge' ? 'plus' : 'minus';
  }
  out.adjustments.oneOffCurrentAmount = finite(out.adjustments.oneOffCurrentAmount);
  out.adjustments.oneOffUwAmount = finite(out.adjustments.oneOffUwAmount);
  out.adjustments.oneOffCurrentReason = text(out.adjustments.oneOffCurrentReason, 120);
  out.adjustments.oneOffUwReason = text(out.adjustments.oneOffUwReason, 120);
  out.adjustments.oneOffCurrentSign = ['plus','minus'].includes(out.adjustments.oneOffCurrentSign) ? out.adjustments.oneOffCurrentSign : 'plus';
  out.adjustments.oneOffUwSign = ['plus','minus'].includes(out.adjustments.oneOffUwSign) ? out.adjustments.oneOffUwSign : 'minus';
  out.completion.entered = [...new Set((Array.isArray(out.completion.entered) ? out.completion.entered : [])
    .map(value => text(value, 120)).filter(Boolean))];
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
