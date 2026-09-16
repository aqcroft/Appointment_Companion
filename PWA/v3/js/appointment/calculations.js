import { UW_RULES_2026_10_01, deriveUwRules } from '../rules/uw-rules-2026-10-01.js';
import { normaliseAppointment } from '../state/canonical-state.js';
import { calculateEconomy7AnnualCost } from '../energy/split-helper.js';

const moneyNumber = value => Math.round((Number(value) || 0) * 100) / 100;

function monthsUntilApril(date = new Date()) {
  const month = date.getMonth();
  if (month === 3) return 12;
  return month < 3 ? 3 - month : 15 - month;
}

function currentEnergyMonthly(energy) {
  if (energy.currentCostMode === 'annual') {
    return (Number(energy.annualElectricityCost) + Number(energy.annualGasCost)) / 12;
  }
  if (energy.currentCostMode === 'split') {
    return (energy.fuel !== 'gas' ? Number(energy.currentElectricityMonthly) : 0) +
      (energy.fuel !== 'electricity' ? Number(energy.currentGasMonthly) : 0);
  }
  if (energy.electricityProfile !== 'standard' && energy.currentDayRate && energy.currentNightRate && (energy.dayKwh || energy.nightKwh)) {
    return calculateEconomy7AnnualCost({
      dayKwh: energy.dayKwh,
      nightKwh: energy.nightKwh,
      dayRate: energy.currentDayRate,
      nightRate: energy.currentNightRate,
      standingCharge: energy.currentStandingCharge
    }) / 12;
  }
  return Number(energy.currentMonthly) || 0;
}

function uwEnergyMonthly(energy, tariff) {
  if (energy.uwQuoteMode !== 'tiers') return Number(energy.uwMonthly) || 0;
  return Number(energy[`uwTier${Math.max(1, Math.min(3, tariff || 1))}`]) || Number(energy.uwMonthly) || 0;
}

function cashback(appointment, serviceCount, rules) {
  const config = rules.cashback;
  const spend = Number(appointment.cashback.monthlySpend) || config.referenceSpend;
  const low = Math.floor(Math.min(spend * config.rateLow, config.lowMonthlyCaps[serviceCount] || config.lowCapDefault));
  const average = Math.floor(config.referenceAverageAnnual * (spend / config.referenceSpend) / 12);
  const high = Math.floor(config.referenceHighAnnual * (spend / config.referenceSpend) / 12);
  const selected = appointment.cashback.tier === 'low' ? low : appointment.cashback.tier === 'high' ? high : average;
  const monthlyNet = selected - config.cardFeeMonthly;
  return { low, average, high, selected, monthlyNet, feeWaiver: config.cardFeeMonthly * config.feeFreeMonths };
}

export function calculateAppointment(input, rules = UW_RULES_2026_10_01, date = new Date()) {
  const appointment = normaliseAppointment(input);
  const derived = deriveUwRules({
    services: appointment.services,
    homeStatus: appointment.person.homeStatus,
    mobile: appointment.mobile
  }, rules);
  let currentEnergy = appointment.services.energy ? currentEnergyMonthly(appointment.energy) : 0;
  let uwEnergy = appointment.services.energy ? uwEnergyMonthly(appointment.energy, derived.energyTariff) : 0;
  if (appointment.energy.adjustmentEnabled && appointment.services.energy) {
    const adjustment = Number(appointment.energy.adjustmentAmount) / (appointment.energy.adjustmentPeriod === 'annual' ? 12 : 1);
    if (appointment.energy.adjustmentTarget === 'uw') uwEnergy += adjustment;
    else currentEnergy += adjustment;
  }

  const currentBroadband = appointment.services.broadband ? Number(appointment.broadband.currentMonthly) : 0;
  const uwBroadbandRaw = appointment.services.broadband ? Number(appointment.broadband.uwMonthly) : 0;
  const uwBroadband = appointment.services.broadband
    ? Math.ceil(uwBroadbandRaw) + (appointment.broadband.wholeHomeWifi ? rules.broadband.wholeHomeWifiMonthly : 0) + Number(appointment.broadband.homePhoneMonthly || 0)
    : 0;
  const sims = appointment.services.mobile ? appointment.mobile.sims.filter(sim => sim.include !== false) : [];
  const currentMobile = sims.reduce((sum, sim) => sum + Number(sim.currentMonthly || 0), 0);
  const recurringDivisor = appointment.adjustments.period === 'annual' ? 12 : 1;
  const adjustmentCurrent = appointment.adjustments.recurringEnabled ? Number(appointment.adjustments.currentAmount) / recurringDivisor : 0;
  const adjustmentUw = appointment.adjustments.recurringEnabled ? Number(appointment.adjustments.uwAmount) / recurringDivisor : 0;
  const currentMonthly = currentEnergy + currentBroadband + currentMobile + adjustmentCurrent;
  const uwMonthly = uwEnergy + uwBroadband + derived.ongoingMobileMonthly + derived.boilerCoverMonthly + adjustmentUw;
  const monthlyServiceSaving = currentMonthly - uwMonthly;

  let broadbandIntroBenefit = 0;
  if (appointment.services.broadband && appointment.broadband.freeMonthsOffer && appointment.person.homeStatus === 'homeowner' && (appointment.services.energy || sims.length)) {
    const months = rules.broadband.freeMonths;
    const beforeApril = monthsUntilApril(date);
    broadbandIntroBenefit = Math.round(beforeApril >= months
      ? months * uwBroadbandRaw
      : beforeApril * uwBroadbandRaw + (months - beforeApril) * (uwBroadbandRaw + rules.broadband.aprilIncrease));
  }
  const referral = appointment.benefits.referral && appointment.person.homeStatus === 'homeowner' && derived.serviceCount >= rules.referral.minimumServiceCount ? rules.referral.amount : 0;
  const nationalLeague = appointment.benefits.nationalLeague && derived.serviceCount >= rules.nationalLeague.minimumServiceCount ? rules.nationalLeague.amount : 0;
  const exitFees = (appointment.services.energy ? Number(appointment.energy.electricityExitFee) + Number(appointment.energy.gasExitFee) : 0) +
    (appointment.services.broadband ? Number(appointment.broadband.exitFee) : 0) + sims.reduce((sum, sim) => sum + Number(sim.exitFee || 0), 0);
  const exitFeeRefundEligible = derived.serviceCount >= rules.exitFeeRefund.minimumServiceCount;
  const exitFeeDeduction = exitFeeRefundEligible ? Math.max(0, exitFees - rules.exitFeeRefund.maximum) : exitFees;
  const card = cashback(appointment, derived.serviceCount, rules);
  card.active = Boolean(appointment.cashback.enabled && derived.serviceCount > 0);
  const oneOff = appointment.adjustments.oneOffEnabled
    ? Number(appointment.adjustments.oneOffAmount) * (appointment.adjustments.oneOffType === 'charge' ? -1 : 1)
    : 0;
  const annualCashback = card.active ? card.monthlyNet * 12 + card.feeWaiver : 0;
  const benefitsTotal = derived.welcomeBonus + derived.mobileIntroBenefit + broadbandIntroBenefit + referral + nationalLeague + oneOff +
    (card.active ? card.feeWaiver : 0) - exitFeeDeduction;
  const yearOneResult = monthlyServiceSaving * 12 + derived.welcomeBonus + derived.mobileIntroBenefit + broadbandIntroBenefit + referral +
    nationalLeague + oneOff - exitFeeDeduction + annualCashback;

  return {
    rules: derived,
    current: { energy: moneyNumber(currentEnergy), broadband: moneyNumber(currentBroadband), mobile: moneyNumber(currentMobile), total: moneyNumber(currentMonthly) },
    uw: { energy: moneyNumber(uwEnergy), broadband: moneyNumber(uwBroadband), mobile: moneyNumber(derived.ongoingMobileMonthly), boilerCover: moneyNumber(derived.boilerCoverMonthly), total: moneyNumber(uwMonthly) },
    monthlyServiceSaving: moneyNumber(monthlyServiceSaving),
    broadbandIntroBenefit: moneyNumber(broadbandIntroBenefit),
    mobileIntroBenefit: moneyNumber(derived.mobileIntroBenefit),
    boilerCoverIntroBenefit: 0,
    welcomeBonus: derived.welcomeBonus,
    referral,
    nationalLeague,
    exitFees: moneyNumber(exitFees),
    exitFeeRefundEligible,
    exitFeeDeduction: moneyNumber(exitFeeDeduction),
    cashback: card,
    oneOff: moneyNumber(oneOff),
    benefitsTotal: moneyNumber(benefitsTotal),
    yearOneResult: moneyNumber(yearOneResult),
    e7StandardAnnualSaving: moneyNumber(appointment.energy.e7StandardAnnualSaving)
  };
}
