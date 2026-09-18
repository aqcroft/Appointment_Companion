import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppointment } from '../js/state/canonical-state.js';
import { buildMealDealPreview, mealDealSharePreview } from '../js/appointment/upgrade-preview.js';
import { appointmentCompleteness } from '../js/appointment/completeness.js';

function energyBasket() {
  const appointment = createAppointment('Meal Deal');
  appointment.services.energy = true;
  appointment.energy.currentMonthly = 150;
  appointment.energy.uwQuoteMode = 'tiers';
  appointment.energy.uwTier1 = 140;
  appointment.energy.uwTier2 = 120;
  appointment.energy.uwTier3 = 90;
  appointment.cashback.enabled = false;
  return appointment;
}

test('Energy-only preview considers two £6 SIMs when the third tariff tier makes that best', () => {
  const appointment = energyBasket();
  const preview = buildMealDealPreview(appointment);
  assert.equal(preview.options.length, 2);
  assert.equal(preview.addedSimCount, 2);
  assert.equal(preview.addedAnnualCost, 144);
  assert.equal(preview.previewResult.rules.energyTariff, 3);
  assert.equal(preview.previewResult.uw.mobile, 12);
});

test('Energy-only preview chooses one SIM when a second does not justify its extra cost', () => {
  const appointment = energyBasket();
  appointment.energy.uwTier2 = 90;
  appointment.energy.uwTier3 = 89;
  const preview = buildMealDealPreview(appointment);
  assert.equal(preview.addedSimCount, 1);
  assert.equal(preview.addedAnnualCost, 72);
});

test('two- and three-service baskets add only one preview SIM', () => {
  for (const broadband of [true, false]) {
    const appointment = energyBasket();
    appointment.services.mobile = !broadband;
    appointment.services.broadband = broadband;
    if (broadband) {
      appointment.broadband.currentMonthly = 40;
      appointment.broadband.uwMonthly = 30;
    } else {
      appointment.services.boilerCover = true;
      appointment.person.homeStatus = 'homeowner';
    }
    const preview = buildMealDealPreview(appointment);
    assert.equal(preview.addedSimCount, 1);
  }
});

test('preview exists and includes the £72 cost even where it makes no improvement', () => {
  const appointment = createAppointment('No improvement');
  appointment.services.broadband = true;
  appointment.broadband.currentMonthly = 20;
  appointment.broadband.uwMonthly = 20;
  appointment.cashback.enabled = false;
  const preview = buildMealDealPreview(appointment);
  assert.ok(preview);
  assert.equal(preview.addedAnnualCost, 72);
  assert.ok(preview.improvement < 0);
});

test('preview reuses Energy pricing, Cashback and exit-fee support rules', () => {
  const appointment = energyBasket();
  appointment.services.broadband = true;
  appointment.broadband.currentMonthly = 50;
  appointment.broadband.uwMonthly = 40;
  appointment.energy.electricityExitFee = 300;
  appointment.cashback.enabled = true;
  appointment.cashback.tier = 'low';
  appointment.cashback.monthlySpend = 1000;
  const preview = buildMealDealPreview(appointment);
  assert.equal(preview.originalResult.exitFeeRefundEligible, false);
  assert.equal(preview.previewResult.exitFeeRefundEligible, true);
  assert.ok(preview.previewResult.cashback.selected >= preview.originalResult.cashback.selected);
  assert.equal(preview.previewResult.rules.energyTariff, 3);
});

test('adding a SIM to an existing Mobile basket does not change Welcome Bonus under current rules', () => {
  const appointment = energyBasket();
  appointment.services.mobile = true;
  appointment.mobile.sims[0].planId = 'essentialMax';
  appointment.mobile.sims[0].uwMonthly = 6;
  const preview = buildMealDealPreview(appointment);
  assert.equal(preview.originalResult.welcomeBonus, preview.previewResult.welcomeBonus);
});

test('preview and customer-safe preview never mutate the source appointment', () => {
  const appointment = energyBasket();
  const before = JSON.stringify(appointment);
  const preview = buildMealDealPreview(appointment);
  const shared = mealDealSharePreview(appointment);
  assert.equal(JSON.stringify(appointment), before);
  assert.equal(shared.type, 'meal_deal_sim');
  assert.equal(shared.result.yearOneResult, preview.previewResult.yearOneResult);
  assert.equal(shared.appointment, undefined);
});

test('an applied preview creates fresh Current and Exit fee requirements for each added SIM', () => {
  const appointment = energyBasket();
  appointment.completion.entered.push('mobile.sims.0.currentMonthly', 'mobile.sims.0.exitFee');
  const preview = buildMealDealPreview(appointment);
  const mobileMissing = appointmentCompleteness(preview.appointment).missing
    .filter(item => item.service === 'mobile').map(item => item.label);
  assert.deepEqual(mobileMissing, [
    'Mobile SIM 1 - current monthly cost missing',
    'Mobile SIM 1 - exit fee missing',
    'Mobile SIM 2 - current monthly cost missing',
    'Mobile SIM 2 - exit fee missing'
  ]);
});
