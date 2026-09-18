const HTTPS_FIELDS = new Set(['basketUrl', 'joinUrl']);
const ALLOWED = new Set([
  'schemaVersion', 'sharedAt', 'personName', 'services', 'energyInsight',
  'current', 'uw', 'monthlyServiceSaving', 'serviceCount', 'energyTariff',
  'welcomeBonus', 'mobileIntroBenefit', 'broadbandIntroBenefit', 'referral',
  'nationalLeague', 'exitFees', 'exitFeeDeduction', 'cashbackMonthlyNet',
  'cashbackFeeWaiver', 'oneOff', 'benefitsTotal', 'yearOneResult',
  'effectiveUwMonthly', 'effectiveMonthlySaving', 'upgradePreview', 'mealDealPreview',
  'basketUrl', 'partnerName', 'partnerRole', 'partnerStrap', 'joinUrl'
]);

function safeHttps(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeMoneyMap(value = {}) {
  return Object.fromEntries(['energy', 'broadband', 'mobile', 'boilerCover', 'total']
    .filter(key => Object.prototype.hasOwnProperty.call(value, key))
    .map(key => [key, safeNumber(value[key])]));
}

function sanitiseMealDeal(value) {
  if (!value || value.type !== 'meal_deal_sim' || !value.result) return null;
  const result = value.result;
  return {
    type: 'meal_deal_sim',
    title: '🥪 Meal Deal SIM',
    description: String(value.description || '').slice(0, 220),
    addedSimCount: Math.max(1, Math.min(2, Math.round(safeNumber(value.addedSimCount) || 1))),
    addedMonthlyCost: safeNumber(value.addedMonthlyCost),
    addedAnnualCost: safeNumber(value.addedAnnualCost),
    improvement: safeNumber(value.improvement),
    services: Object.fromEntries(['energy', 'broadband', 'mobile', 'boilerCover'].map(key => [key, Boolean(value.services?.[key])])),
    result: {
      current: safeMoneyMap(result.current), uw: safeMoneyMap(result.uw),
      monthlyServiceSaving: safeNumber(result.monthlyServiceSaving),
      effectiveUwMonthly: safeNumber(result.effectiveUwMonthly),
      effectiveMonthlySaving: safeNumber(result.effectiveMonthlySaving),
      broadbandIntroBenefit: safeNumber(result.broadbandIntroBenefit),
      mobileIntroBenefit: safeNumber(result.mobileIntroBenefit),
      welcomeBonus: safeNumber(result.welcomeBonus), referral: safeNumber(result.referral),
      nationalLeague: safeNumber(result.nationalLeague), exitFees: safeNumber(result.exitFees),
      exitFeeDeduction: safeNumber(result.exitFeeDeduction), cashbackMonthlyNet: safeNumber(result.cashbackMonthlyNet),
      cashbackFeeWaiver: safeNumber(result.cashbackFeeWaiver), oneOff: safeNumber(result.oneOff),
      benefitsTotal: safeNumber(result.benefitsTotal), yearOneResult: safeNumber(result.yearOneResult),
      e7StandardAnnualSaving: safeNumber(result.e7StandardAnnualSaving),
      serviceCount: safeNumber(result.serviceCount), energyTariff: safeNumber(result.energyTariff)
    }
  };
}

export function sanitiseShareData(input = {}) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED.has(key)) continue;
    if (HTTPS_FIELDS.has(key)) {
      const safe = safeHttps(value);
      if (safe) output[key] = safe;
    } else if (key === 'mealDealPreview') {
      const safe = sanitiseMealDeal(value);
      if (safe) output.mealDealPreview = safe;
    } else if (key === 'upgradePreview') {
      if (!value || typeof value !== 'object') continue;
      output.upgradePreview = {
        type: value.type === 'add_sim' ? 'add_sim' : '',
        planId: ['essentialMax', 'unlimitedMax'].includes(value.planId) ? value.planId : '',
        title: String(value.title || '').slice(0, 100),
        description: String(value.description || '').slice(0, 220),
        serviceCount: Number(value.serviceCount || 0),
        energyTariff: Number(value.energyTariff || 0),
        welcomeBonus: Number(value.welcomeBonus || 0),
        yearOneResult: Number(value.yearOneResult || 0),
        improvement: Number(value.improvement || 0)
      };
    } else output[key] = structuredClone(value);
  }
  output.schemaVersion = 1;
  output.personName = String(output.personName || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  delete output.privateNotes;
  delete output.cloud;
  delete output.sync;
  return output;
}

export { safeHttps };
