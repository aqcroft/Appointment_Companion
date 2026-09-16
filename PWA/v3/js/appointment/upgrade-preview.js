import { calculateAppointment } from './calculations.js';
import { clone, createSim, normaliseAppointment } from '../state/canonical-state.js';

function candidate(input, planId) {
  const appointment = normaliseAppointment(clone(input));
  appointment.services.mobile = true;
  const count = Math.min(5, Math.max(1, appointment.mobile.simCount || appointment.mobile.sims.length || 0) + (input.services?.mobile ? 1 : 0));
  appointment.mobile.simCount = count;
  appointment.mobile.sims = Array.from({ length: count }, (_, index) => appointment.mobile.sims[index] || createSim(index));
  appointment.mobile.sims[count - 1].planId = planId;
  appointment.mobile.sims[count - 1].currentMonthly = 0;
  return appointment;
}

export function previewUpgrade(input) {
  const appointment = normaliseAppointment(input);
  if (appointment.services.mobile && appointment.mobile.simCount >= 5) return null;
  const before = calculateAppointment(appointment);
  const options = ['essentialMax', 'unlimitedMax'].map(planId => {
    const upgraded = candidate(appointment, planId);
    const after = calculateAppointment(upgraded);
    return { planId, after, improvement: Math.round((after.yearOneResult - before.yearOneResult) * 100) / 100 };
  }).filter(option => option.improvement > 0).sort((a, b) => b.improvement - a.improvement);
  if (!options.length) return null;
  const best = options[0];
  const planLabel = best.planId === 'unlimitedMax' ? 'Go Unlimited' : 'Go Essentials';
  return {
    type: 'add_sim',
    planId: best.planId,
    title: `Preview adding one ${planLabel} SIM`,
    description: `This would move the basket to ${best.after.rules.serviceCount} service${best.after.rules.serviceCount === 1 ? '' : 's'} and a £${best.after.welcomeBonus} Welcome Bonus.`,
    serviceCount: best.after.rules.serviceCount,
    energyTariff: best.after.rules.energyTariff,
    welcomeBonus: best.after.welcomeBonus,
    yearOneResult: best.after.yearOneResult,
    improvement: best.improvement
  };
}
