import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppointment, normaliseAppointment } from '../js/state/canonical-state.js';
import { calculateAppointment } from '../js/appointment/calculations.js';
import { calculateIndicativeEnergyCost, buildTariffGrid } from '../js/energy/indicative-cost.js';
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
  appointment.energy.exitFeesApply = true;
  appointment.energy.electricityExitFee = 100;
  appointment.energy.gasExitFee = 50;
  const result = calculateAppointment(appointment);
  assert.equal(result.current.energy, 100);
  assert.equal(result.exitFees, 150);
  assert.equal(result.exitFeeDeduction, 150);
});

test('manual recurring and one-off adjustments stay distinct across Current and UW', () => {
  const appointment = createAppointment('Alex');
  appointment.person.homeStatus = 'homeowner';
  appointment.services.energy = true;
  appointment.energy.currentMonthly = 100;
  appointment.energy.uwMonthly = 90;
  appointment.adjustments.recurringEnabled = true;
  appointment.adjustments.currentPeriod = 'annual';
  appointment.adjustments.uwPeriod = 'annual';
  appointment.adjustments.currentAmount = 120;
  appointment.adjustments.uwAmount = 60;
  appointment.adjustments.currentSign = 'plus';
  appointment.adjustments.uwSign = 'plus';
  appointment.adjustments.oneOffEnabled = true;
  appointment.adjustments.oneOffCurrentAmount = 0;
  appointment.adjustments.oneOffUwAmount = 25;
  appointment.adjustments.oneOffUwSign = 'plus';
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
  appointment.energy.currentRatesIncludeVat = true;
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


test('V3.03 tariff grid defaults to standard rows and derives Economy 7 from the same variable row', () => {
  const appointment = createAppointment('Grid');
  appointment.services.energy = true;
  appointment.energy.region = '11';
  appointment.energy.electricityUwKwh = 2500;
  appointment.energy.annualElectricityKwh = 2500;
  appointment.energy.fuel = 'electricity';
  const rows = [
    { region_no: 11, payment_method: 'DD', tariff_name: 'Value', tariff_type: 'variable', EDSC_Std: 50, EUR_Std: 24, EDSC_E7: 50, EUR_E7_Day: 30, EUR_E7_Night: 12 },
    { region_no: 11, payment_method: 'DD', tariff_name: 'Fixed Start', tariff_type: 'fixed', EDSC_Std: 50, EUR_Std: 22, EDSC_E7: 50, EUR_E7_Day: 28, EUR_E7_Night: 11 }
  ];
  const normal = buildTariffGrid({ tariffLive: rows }, appointment);
  assert.deepEqual(normal.map(row => row.id), ['standardVariable','fixed']);

  appointment.energy.peakOffPeak = true;
  appointment.energy.electricityProfile = 'economy7';
  appointment.energy.dayKwh = 1800;
  appointment.energy.nightKwh = 700;
  const peak = buildTariffGrid({ tariffLive: rows }, appointment);
  assert.deepEqual(peak.map(row => row.id), ['standardVariable','economy7Variable','fixed','fixedE7']);
  assert.ok(peak.find(row => row.id === 'economy7Variable').values[1]);
  assert.ok(peak.find(row => row.id === 'fixedE7').values[1]);
});

test('Tracker row appears only when tracker data exists', () => {
  const appointment = createAppointment('Tracker');
  appointment.services.energy = true;
  appointment.energy.region = '11';
  appointment.energy.fuel = 'electricity';
  appointment.energy.annualElectricityKwh = 2500;
  const data = { tariffLive: [
    { region_no: 11, payment_method: 'DD', tariff_name: 'Value', tariff_type: 'variable', EDSC_Std: 50, EUR_Std: 24 },
    { region_no: 11, payment_method: 'DD', tariff_name: 'Tracker Value', tariff_type: 'tracker', EDSC_Std: 50, EUR_Std: 23 },
    { region_no: 11, payment_method: 'DD', tariff_name: 'Fixed Start', tariff_type: 'fixed', EDSC_Std: 50, EUR_Std: 22 }
  ] };
  assert.deepEqual(buildTariffGrid(data, appointment).map(row => row.id), ['standardVariable','tracker','fixed']);
});


test('digital phone line contributes only when enabled', () => {
  const appointment = createAppointment('Phone line');
  appointment.person.homeStatus = 'homeowner';
  appointment.services.broadband = true;
  appointment.broadband.currentMonthly = 45;
  appointment.broadband.uwMonthly = 24;
  appointment.broadband.homePhoneMonthly = 9;
  appointment.broadband.homePhoneEnabled = false;
  assert.equal(calculateAppointment(appointment).uw.broadband, 24);

  appointment.broadband.homePhoneEnabled = true;
  appointment.broadband.homePhoneBundle = 'peakSaver';
  assert.equal(calculateAppointment(appointment).uw.broadband, 37);
});

test('legacy Broadband phone monthly value maps to the closest current call bundle', () => {
  const appointment = createAppointment('Legacy phone');
  delete appointment.broadband.homePhoneEnabled;
  delete appointment.broadband.homePhoneBundle;
  appointment.broadband.homePhoneMonthly = 7;
  const normalised = normaliseAppointment(appointment);
  assert.equal(normalised.broadband.homePhoneEnabled, true);
  assert.equal(normalised.broadband.homePhoneBundle, 'offPeakSaver');
  assert.equal(normalised.broadband.homePhoneMonthly, 6.5);
});

test('peak off-peak current rates add VAT when bill rates are entered ex VAT', () => {
  const appointment = createAppointment('VAT');
  appointment.services.energy = true;
  appointment.energy.electricityProfile = 'economy7';
  appointment.energy.peakOffPeak = true;
  appointment.energy.dayKwh = 2000;
  appointment.energy.nightKwh = 1000;
  appointment.energy.currentDayRate = 30;
  appointment.energy.currentNightRate = 10;
  appointment.energy.currentStandingCharge = 50;
  appointment.energy.currentRatesIncludeVat = false;
  appointment.energy.e7StandardAnnualCost = 800;
  assert.equal(calculateAppointment(appointment).e7StandardAnnualSaving, 126.63);
});


test('indicative Energy result exposes electricity gas and rate breakdowns', () => {
  const appointment = createAppointment('Breakdown');
  appointment.services.energy = true;
  appointment.energy.region = '11';
  appointment.energy.fuel = 'dual';
  appointment.energy.annualElectricityKwh = 2500;
  appointment.energy.annualGasKwh = 11500;
  const data = { tariffLive: [{
    region_no: 11, payment_method: 'DD', tariff_name: 'Fixed Saver 12M', tariff_type: 'fixed',
    EDSC_Std: 50, EUR_Std: 24, GDSC: 24, GUR: 7, dual_fuel_discount_ex_vat: 0
  }] };
  const detail = calculateIndicativeEnergyCost(data, appointment, 3, 'fixed');
  assert.ok(detail.electricityMonthly > 0);
  assert.ok(detail.gasMonthly > 0);
  assert.equal(Math.round((detail.electricityMonthly + detail.gasMonthly) * 100) / 100, detail.monthly);
  assert.equal(detail.electricityRates.unit, 25.2);
  assert.equal(detail.gasRates.unit, 7.35);
});

test('Part Fibre does not apply Full Fibre-only phone or six-month benefits', () => {
  const appointment = createAppointment('Part Fibre');
  appointment.person.homeStatus = 'homeowner';
  appointment.services.energy = true;
  appointment.energy.currentMonthly = 100;
  appointment.energy.uwMonthly = 90;
  appointment.services.broadband = true;
  appointment.broadband.connectionFamily = 'part';
  appointment.broadband.currentMonthly = 35;
  appointment.broadband.uwMonthly = 26;
  appointment.broadband.homePhoneEnabled = true;
  appointment.broadband.homePhoneBundle = 'peakSaver';
  appointment.broadband.homePhoneMonthly = 13;
  appointment.broadband.freeMonthsOffer = true;
  const result = calculateAppointment(appointment);
  assert.equal(result.uw.broadband, 26);
  assert.equal(result.broadbandIntroBenefit, 0);
});
