export const UW_RULES_2026_10_01 = Object.freeze({
  version: '2026-10-01',
  mobile: {
    essentialMax: { id: 'essentialMax', label: 'Go Essentials', monthly: 6 },
    unlimitedMax: { id: 'unlimitedMax', label: 'Go Unlimited', monthly: 13, additionalFreeMonths: 3 },
    maxSims: 5
  },
  boilerCover: { monthly: 25, homeownerOnly: true, introductoryBenefit: 0 },
  incomeProtector: { active: false, monthly: 0 },
  welcomeBonus: { 0: 0, 1: 0, 2: 50, 3: 150, 4: 250 },
  energyTariffCap: 3,
  exitFeeRefund: { minimumServiceCount: 3, maximum: 400 },
  referral: { amount: 50, minimumServiceCount: 2, homeownerOnly: true },
  nationalLeague: { amount: 50, minimumServiceCount: 2 },
  broadband: {
    freeMonths: 6,
    aprilIncrease: 4,
    wholeHomeWifiMonthly: 5,
    packages: [
      { id: 'fibre900', label: 'Full Fibre 900', monthly: 35 },
      { id: 'fibre500', label: 'Full Fibre 500', monthly: 30 },
      { id: 'fibre150', label: 'Full Fibre 150', monthly: 23.95 },
      { id: 'ultraPlus', label: 'Ultra+', monthly: 30 },
      { id: 'ultra', label: 'Ultra', monthly: 26 }
    ]
  },
  cashback: {
    rateLow: 0.01,
    lowMonthlyCaps: { 1: 5, 2: 10, 3: 10, 4: 15, 5: 15 },
    lowCapDefault: 5,
    referenceSpend: 1000,
    referenceAverageAnnual: 215,
    referenceHighAnnual: 456,
    cardFeeMonthly: 3,
    feeFreeMonths: 3
  }
});

const truthy = value => value === true || value === 'true' || value === 1 || value === '1';

export function normalisePlanId(value) {
  const id = String(value || '').trim();
  if (/essential/i.test(id)) return 'essentialMax';
  if (/unlimited/i.test(id)) return 'unlimitedMax';
  return 'essentialMax';
}

export function activeSims(facts = {}) {
  const count = Math.max(0, Math.min(5, Number(facts.simCount || facts.sims?.length || 0)));
  return (facts.sims || []).slice(0, count).filter(sim => sim?.include !== false).map(sim => ({
    ...sim,
    planId: normalisePlanId(sim.planId || sim.uwPlan)
  }));
}

export function mobileServiceContribution(sims = []) {
  if (!sims.length) return 0;
  const unlimited = sims.filter(sim => normalisePlanId(sim.planId) === 'unlimitedMax').length;
  return unlimited >= 2 ? 2 : 1;
}

export function deriveUwRules(facts = {}, rules = UW_RULES_2026_10_01) {
  const services = facts.services || {};
  const energy = truthy(services.energy);
  const broadband = truthy(services.broadband);
  const mobile = truthy(services.mobile);
  const homeowner = facts.homeStatus === 'homeowner';
  const boilerCover = truthy(services.boilerCover) && homeowner;
  const sims = mobile ? activeSims(facts.mobile || facts) : [];
  const mobileContribution = mobileServiceContribution(sims);

  const serviceCount = (energy ? 1 : 0) + (broadband ? 1 : 0) + mobileContribution + (boilerCover ? 1 : 0);
  const energyQualifiers = (broadband ? 1 : 0) + Math.min(2, sims.length) + (boilerCover ? 1 : 0);
  const energyTariff = energy ? Math.min(rules.energyTariffCap, 1 + energyQualifiers) : 0;
  const serviceTypes = [energy, broadband, sims.length > 0, boilerCover].filter(Boolean).length;
  const welcomeBonus = Number(rules.welcomeBonus[serviceTypes] || 0);
  const ongoingMobileMonthly = sims.reduce((sum, sim) => {
    const entered = sim.uwMonthly !== null && sim.uwMonthly !== '' && Number.isFinite(Number(sim.uwMonthly));
    return sum + (entered ? Math.max(0, Number(sim.uwMonthly)) : rules.mobile[normalisePlanId(sim.planId)].monthly);
  }, 0);
  const additionalUnlimited = Math.max(0, sims.filter(sim => sim.planId === 'unlimitedMax').length - 1);
  const mobileIntroBenefit = additionalUnlimited * rules.mobile.unlimitedMax.monthly * rules.mobile.unlimitedMax.additionalFreeMonths;

  return {
    ruleVersion: rules.version,
    serviceCount,
    energyTariff,
    serviceTypes,
    welcomeBonus,
    mobileContribution,
    ongoingMobileMonthly,
    additionalUnlimited,
    mobileIntroBenefit,
    boilerCover,
    boilerCoverMonthly: boilerCover ? rules.boilerCover.monthly : 0,
    boilerCoverIntroBenefit: 0,
    incomeProtectorMonthly: 0
  };
}
