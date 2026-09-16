const HTTPS_FIELDS = new Set(['basketUrl', 'joinUrl']);
const ALLOWED = new Set([
  'schemaVersion', 'sharedAt', 'personName', 'services', 'energyInsight',
  'current', 'uw', 'monthlyServiceSaving', 'serviceCount', 'energyTariff',
  'welcomeBonus', 'mobileIntroBenefit', 'broadbandIntroBenefit', 'referral',
  'nationalLeague', 'exitFees', 'exitFeeDeduction', 'cashbackMonthlyNet',
  'cashbackFeeWaiver', 'oneOff', 'benefitsTotal', 'yearOneResult',
  'effectiveUwMonthly', 'effectiveMonthlySaving', 'upgradePreview',
  'basketUrl', 'partnerName', 'partnerRole', 'partnerStrap', 'joinUrl'
]);

function safeHttps(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
}

export function sanitiseShareData(input = {}) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED.has(key)) continue;
    if (HTTPS_FIELDS.has(key)) {
      const safe = safeHttps(value);
      if (safe) output[key] = safe;
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
