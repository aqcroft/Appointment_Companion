import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppointment } from '../js/state/canonical-state.js';
import { calculateAppointment } from '../js/appointment/calculations.js';

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
  appointment.energy.dayKwh = 2000;
  appointment.energy.nightKwh = 1000;
  appointment.energy.currentDayRate = 30;
  appointment.energy.currentNightRate = 10;
  appointment.energy.currentStandingCharge = 50;
  appointment.energy.e7StandardAnnualCost = 800;
  const result = calculateAppointment(appointment);
  assert.equal(result.e7StandardAnnualSaving, 82.5);
});
