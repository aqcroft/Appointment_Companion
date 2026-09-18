const VAT = 1.05;

const number = value => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const lower = value => String(value || '').trim().toLowerCase();

function tierFromRow(row) {
  const name = lower(row.tariff_name ?? row.tariffName);
  const type = lower(row.tariff_type ?? row.tariffType);
  if (type === 'fixed') {
    if (name.includes('fixed saver')) return 3;
    if (name.includes('fixed start')) return 1;
    return 2;
  }
  if (type === 'variable' || type === 'variable_ev') {
    if (name.includes('double gold')) return 3;
    if (/(^|\s)gold(\s|$)/.test(name)) return 2;
    if (/(^|\s)value(\s|$)/.test(name)) return 1;
  }
  return 0;
}

function usableRows(data, region, tier) {
  const rows = Array.isArray(data?.tariffLive) ? data.tariffLive : [];
  return rows.filter(row => {
    const rowRegion = Number(row.region_no ?? row.regionNo);
    const payment = lower(row.payment_method ?? row.paymentMethod);
    return rowRegion === Number(region) && (!payment || payment === 'dd' || payment === 'direct debit') && tierFromRow(row) === tier;
  });
}

function chooseRow(data, appointment, tier) {
  const rows = usableRows(data, appointment.energy.region, tier);
  const preferredType = appointment.energy.electricityProfile === 'ev' ? 'variable_ev' : 'variable';
  return rows.find(row => lower(row.tariff_type ?? row.tariffType) === preferredType)
    || rows.find(row => lower(row.tariff_type ?? row.tariffType) === 'fixed')
    || rows[0]
    || null;
}

export function calculateIndicativeEnergyCost(data, appointment, tier) {
  const energy = appointment?.energy || {};
  const selectedTier = Math.max(1, Math.min(3, Number(tier) || 1));
  const row = chooseRow(data, appointment, selectedTier);
  if (!row) return null;

  let electricityAnnual = 0;
  if (energy.fuel !== 'gas') {
    const standing = number(energy.electricityProfile === 'economy7' ? row.EDSC_E7 : row.EDSC_Std);
    if (energy.electricityProfile === 'economy7') {
      const day = number(row.EUR_E7_Day), night = number(row.EUR_E7_Night);
      if ([standing, day, night].some(value => value === null)) return null;
      electricityAnnual = (Number(energy.dayKwh || 0) * day + Number(energy.nightKwh || 0) * night + standing * 365) * VAT / 100;
    } else if (energy.electricityProfile === 'ev' && number(row.EUR_EV_Peak) !== null && number(row.EUR_EV_OffPeak) !== null) {
      const peak = number(row.EUR_EV_Peak), offPeak = number(row.EUR_EV_OffPeak);
      const total = Number(energy.annualElectricityKwh || 0);
      const night = Number(energy.nightKwh || 0);
      const day = Number(energy.dayKwh || Math.max(0, total - night));
      electricityAnnual = (day * peak + night * offPeak + standing * 365) * VAT / 100;
    } else {
      const unit = number(row.EUR_Std);
      if ([standing, unit].some(value => value === null)) return null;
      electricityAnnual = (Number(energy.annualElectricityKwh || 0) * unit + standing * 365) * VAT / 100;
    }
  }

  let gasAnnual = 0;
  if (energy.fuel !== 'electricity') {
    const standing = number(row.GDSC), unit = number(row.GUR);
    if ([standing, unit].some(value => value === null)) return null;
    gasAnnual = (Number(energy.annualGasKwh || 0) * unit + standing * 365) * VAT / 100;
  }

  const dualDiscount = energy.fuel === 'dual' ? (number(row.dual_fuel_discount_ex_vat) || 0) * VAT : 0;
  const annual = Math.max(0, electricityAnnual + gasAnnual - dualDiscount);
  return {
    tier: selectedTier,
    monthly: Math.round(annual / 12 * 100) / 100,
    annual: Math.round(annual * 100) / 100,
    tariffName: String(row.tariff_name ?? row.tariffName ?? 'Central tariff'),
    tariffType: String(row.tariff_type ?? row.tariffType ?? ''),
    sourceRef: String(row.source_ref ?? ''),
    indicative: true
  };
}

export function buildIndicativeTiers(data, appointment) {
  return Object.fromEntries([1, 2, 3].map(tier => [tier, calculateIndicativeEnergyCost(data, appointment, tier)]));
}
