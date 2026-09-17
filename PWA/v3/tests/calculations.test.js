import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppointment, normaliseAppointment } from '../js/state/canonical-state.js';
import { calculateAppointment } from '../js/appointment/calculations.js';
import { calculateIndicativeEnergyCost } from '../js/energy/indicative-cost.js';
import { buildMealDealPreview } from '../js/appointment/upgrade-preview.js';

test('UW/database and bill usage remain separate while the selected source drives calculations', () => {
  const appointment = createAppointment('Alex');
  appointment.energy.electricityUwKwh = 2500;
  appointment.energy.electricityBillKwh = 3100;
  appointment.energy.electricityUsageSource = 'bill';
  appointment.energy.gasUwKwh = 11000;
  appointment.energy.gasBillKwh = 12500;
  appointment.energy.gasUsageSource = 'uw';
  const normalised = normaliseAppointment(appointment);
  assert.equal(normalised.energy.annualElectricityKwh, 3100);
  assert.equal(normalised.energy.electricityUwKwh, 2500);
  assert.equal(normalised.energy.electricityBillKwh, 3100);
  assert.equal(normalised.energy.annualGasKwh, 11000);
  assert.equal(normalised.energy.gasBillKwh, 12500);
});

test('blank basket does not show a Cashback-only first-year result', () => {
  const result = calculateAppointment(createAppointment('Alex'));
  assert.equal(result.rules.serviceCount, 0);
  assert.equal(result.cashback.active, false);
  assert.equal(result.yearOneResult, 0);
});

test('annual electricity and gas costs reverse calculate to a monthly equivalent', () => {
  const appointment = createAppointment('Alex');
  appointment.person.homeStatus = 'homeowner';
  appointment.services.energy = true;
  appointment.energy.currentCostMode = 'annual';
  appointment.energy.annualElectricityCost = 600;
  appointment.energy.annualGasCost = 600;
  appointment.energy.uwMonthly = 80;
  const result = calculateAppointment(appointment);
  assert.equal(result.current.energy, 100);
  assert.equal(result.uw.energy, 80);
  assert.equal(result.monthlyServiceSaving, 20);
});

test('split electricity then gas and exit-fee deduction are retained', () => {
  const appointment = createAppointment('Alex');
  appointment.person.homeStatus = 'homeowner';
  appointment.services.energy = true;
  appointment.energy.currentCostMode = 'split';
  appointment.energy.currentElectricityMonthly = 60;
  appointment.energy.currentGasMonthly = 40;
  appointment.energy.uwMonthly = 80;
  appointment.energy.electricityExitFee = 100;
  appointment.energy.gasExitFee = 50;
  const result = calculateAppointment(appointment);
  assert.equal(result.current.energy, 100);
  assert.equal(result.exitFees, 150);
  assert.equal(result.exitFeeDeduction, 150);
});

test('manual recurring and one-off adjustments stay distinct', () => {
  const appointment = createAppointment('Alex');
  appointment.person.homeStatus = 'homeowner';
  appointment.services.energy = true;
  appointment.energy.currentMonthly = 100;
  appointment.energy.uwMonthly = 90;
  appointment.adjustments.recurringEnabled = true;
  appointment.adjustments.period = 'annual';
  appointment.adjustments.currentAmount = 120;
  appointment.adjustments.uwAmount = 60;
  appointment.adjustments.oneOffEnabled = true;
  appointment.adjustments.oneOffType = 'charge';
  appointment.adjustments.oneOffAmount = 25;
  const result = calculateAppointment(appointment);
  assert.equal(result.current.total, 110);
  assert.equal(result.uw.total, 95);
  assert.equal(result.oneOff, -25);
});

test('Boiler Cover never receives the retired £75 benefit', () => {
  const appointment = createAppointment('Alex');
  appointment.person.homeStatus = 'homeowner';
  appointment.services.energy = true;
  appointment.services.boilerCover = true;
  appointment.energy.currentMonthly = 100;
  appointment.energy.uwMonthly = 90;
  const result = calculateAppointment(appointment);
  assert.equal(result.uw.boilerCover, 25);
  assert.equal(result.boilerCoverIntroBenefit, 0);
  assert.ok(!JSON.stringify(result).includes('75'));
});

test('E7 vs standard insight is derived from tariff facts, not stored as a total', () => {
  const appointment = createAppointment('Alex');
  appointment.services.energy = true;
  appointment.energy.electricityProfile = 'economy7';
  appointment.energy.peakOffPeak = true;
  appointment.energy.dayKwh = 2000;
  appointment.energy.nightKwh = 1000;
  appointment.energy.currentDayRate = 30;
  appointment.energy.currentNightRate = 10;
  appointment.energy.currentStandingCharge = 50;
  appointment.energy.e7StandardAnnualCost = 800;
  const result = calculateAppointment(appointment);
  assert.equal(result.e7StandardAnnualSaving, 82.5);
});

test('effective monthly position folds active Cashback Card contribution into UW', () => {
  const appointment = createAppointment('Alex');
  appointment.services.energy = true;
  appointment.energy.currentMonthly = 100;
  appointment.energy.uwMonthly = 90;
  appointment.cashback.enabled = true;
  appointment.cashback.tier = 'average';
  const result = calculateAppointment(appointment);
  assert.equal(result.cashback.monthlyNet, 14);
  assert.equal(result.effectiveUwMonthly, 76);
  assert.equal(result.effectiveMonthlySaving, 24);
});

test('central tariff rows produce an indicative dual-fuel monthly value', () => {
  const appointment = createAppointment('Alex');
  appointment.services.energy = true;
  appointment.energy.region = '11';
  appointment.energy.annualElectricityKwh = 2500;
  appointment.energy.annualGasKwh = 11500;
  const data = { tariffLive: [{
    region_no: 11, payment_method: 'DD', tariff_name: 'Gold', tariff_type: 'variable',
    EDSC_Std: 50, EUR_Std: 24, GDSC: 24, GUR: 7, dual_fuel_discount_ex_vat: 12
  }] };
  const result = calculateIndicativeEnergyCost(data, appointment, 2);
  assert.equal(result.tariffName, 'Gold');
  assert.equal(result.monthly, 145.52);
});

test('Meal Deal SIM preview is derived without mutating the appointment', () => {
  const appointment = createAppointment('Alex');
  appointment.person.homeStatus = 'homeowner';
  appointment.services.energy = true;
  appointment.services.mobile = true;
  appointment.mobile.sims[0].planId = 'unlimitedMax';
  appointment.energy.currentMonthly = 140;
  appointment.energy.uwQuoteMode = 'tiers';
  appointment.energy.uwTier2 = 130;
  appointment.energy.uwTier3 = 105;
  const before = JSON.stringify(appointment);
  const preview = buildMealDealPreview(appointment);
  assert.equal(JSON.stringify(appointment), before);
  assert.equal(preview.type, 'meal_deal_sim');
  assert.equal(preview.addedMonthlyCost, 6);
  assert.equal(preview.addedAnnualCost, 72);
  assert.equal(preview.appointment.mobile.sims.at(-1).planId, 'essentialMax');
});

test('zero Cashback spend produces zero Cashback without falling back to reference spend', () => {
  const appointment = createAppointment('Zero spend');
  appointment.services.energy = true;
  appointment.energy.currentMonthly = 100;
  appointment.energy.uwMonthly = 90;
  appointment.cashback.monthlySpend = 0;
  const result = calculateAppointment(appointment);
  assert.deepEqual(
    { selected: result.cashback.selected, monthlyNet: result.cashback.monthlyNet, feeWaiver: result.cashback.feeWaiver },
    { selected: 0, monthlyNet: 0, feeWaiver: 0 }
  );
  assert.equal(result.effectiveUwMonthly, result.uw.total);
});
