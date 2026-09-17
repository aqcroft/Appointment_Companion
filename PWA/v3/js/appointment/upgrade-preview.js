import { calculateAppointment } from './calculations.js';
import { UW_RULES_2026_10_01 } from '../rules/uw-rules-2026-10-01.js';
import { clone, createSim, normaliseAppointment } from '../state/canonical-state.js';

function addMealDealSims(input, addedSimCount) {
  const original = normaliseAppointment(input);
  const appointment = normaliseAppointment(clone(original));
  const existing = original.services.mobile
    ? appointment.mobile.sims.slice(0, appointment.mobile.simCount)
    : [];
  const capacity = Math.max(0, UW_RULES_2026_10_01.mobile.maxSims - existing.length);
  const count = Math.min(capacity, Math.max(1, Number(addedSimCount) || 1));
  if (!count) return null;

  const added = Array.from({ length: count }, (_, offset) => {
    const sim = createSim(existing.length + offset);
    sim.name = count === 1 ? 'Meal Deal SIM' : `Meal Deal SIM ${offset + 1}`;
    sim.planId = 'essentialMax';
    sim.uwMonthly = UW_RULES_2026_10_01.mobile.essentialMax.monthly;
    sim.currentMonthly = 0;
    sim.exitFee = 0;
    return sim;
  });

  appointment.services.mobile = true;
  appointment.mobile.sims = [...existing, ...added];
  appointment.mobile.simCount = appointment.mobile.sims.length;
  const addedPrefixes = added.map((_sim, offset) => `mobile.sims.${existing.length + offset}.`);
  appointment.completion.entered = appointment.completion.entered
    .filter(path => !addedPrefixes.some(prefix => path.startsWith(prefix)));
  return normaliseAppointment(appointment);
}

function resultSnapshot(result) {
  return {
    current: clone(result.current),
    uw: clone(result.uw),
    monthlyServiceSaving: result.monthlyServiceSaving,
    effectiveUwMonthly: result.effectiveUwMonthly,
    effectiveMonthlySaving: result.effectiveMonthlySaving,
    broadbandIntroBenefit: result.broadbandIntroBenefit,
    mobileIntroBenefit: result.mobileIntroBenefit,
    welcomeBonus: result.welcomeBonus,
    referral: result.referral,
    nationalLeague: result.nationalLeague,
    exitFees: result.exitFees,
    exitFeeDeduction: result.exitFeeDeduction,
    cashbackMonthlyNet: result.cashback.active ? result.cashback.monthlyNet : 0,
    cashbackFeeWaiver: result.cashback.active ? result.cashback.feeWaiver : 0,
    oneOff: result.oneOff,
    benefitsTotal: result.benefitsTotal,
    yearOneResult: result.yearOneResult,
    e7StandardAnnualSaving: result.e7StandardAnnualSaving,
    serviceCount: result.rules.serviceCount,
    energyTariff: result.rules.energyTariff
  };
}

export function buildMealDealPreview(input) {
  const appointment = normaliseAppointment(input);
  const existingCount = appointment.services.mobile ? appointment.mobile.simCount : 0;
  if (existingCount >= UW_RULES_2026_10_01.mobile.maxSims) return null;

  const enabledServices = Object.entries(appointment.services).filter(([, enabled]) => enabled).map(([name]) => name);
  const energyOnly = enabledServices.length === 1 && enabledServices[0] === 'energy';
  const optionCounts = energyOnly && existingCount <= 3 ? [1, 2] : [1];
  const before = calculateAppointment(appointment);
  const options = optionCounts
    .map(addedSimCount => {
      const candidate = addMealDealSims(appointment, addedSimCount);
      if (!candidate) return null;
      const after = calculateAppointment(candidate);
      return {
        appointment: candidate,
        result: after,
        addedSimCount,
        improvement: Math.round((after.yearOneResult - before.yearOneResult) * 100) / 100
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.result.yearOneResult - a.result.yearOneResult || a.addedSimCount - b.addedSimCount);

  if (!options.length) return null;
  const best = options[0];
  return {
    type: 'meal_deal_sim',
    title: '🥪 Meal Deal SIM',
    description: `Preview ${best.addedSimCount === 1 ? 'one' : 'two'} £6 SIM${best.addedSimCount === 1 ? '' : 's'} across the whole basket.`,
    addedSimCount: best.addedSimCount,
    addedMonthlyCost: best.addedSimCount * 6,
    addedAnnualCost: best.addedSimCount * 72,
    improvement: best.improvement,
    appointment: best.appointment,
    originalResult: before,
    previewResult: best.result,
    options
  };
}

export function mealDealSharePreview(input) {
  const preview = buildMealDealPreview(input);
  if (!preview) return null;
  return {
    type: preview.type,
    title: preview.title,
    description: preview.description,
    addedSimCount: preview.addedSimCount,
    addedMonthlyCost: preview.addedMonthlyCost,
    addedAnnualCost: preview.addedAnnualCost,
    improvement: preview.improvement,
    services: clone(preview.appointment.services),
    result: resultSnapshot(preview.previewResult)
  };
}

// Compatibility export for the previously generic preview boundary.
export const previewUpgrade = buildMealDealPreview;
