const VAT = 1.05;

const number = value => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const lower = value => String(value || '').trim().toLowerCase();

function explicitTier(row) {
  const value = number(row.service_count ?? row.serviceCount ?? row.qualifying_services ?? row.qualifyingServices ?? row.tier);
  return value >= 1 && value <= 3 ? Math.round(value) : 0;
}

function tierFromRow(row) {
  const explicit = explicitTier(row);
  if (explicit) return explicit;
  const name = lower(row.tariff_name ?? row.tariffName);
  const type = lower(row.tariff_type ?? row.tariffType);
  if (type.includes('fixed') || name.includes('fixed')) {
    if (name.includes('fixed saver')) return 3;
    if (name.includes('fixed start')) return 1;
    if (name.includes('double gold')) return 3;
    if (/(^|\s)gold(\s|$)/.test(name)) return 2;
    if (/(^|\s)value(\s|$)/.test(name)) return 1;
    return 2;
  }
  if (type.includes('variable') || type.includes('tracker') || name.includes('tracker')) {
    if (name.includes('double gold')) return 3;
    if (/(^|\s)gold(\s|$)/.test(name)) return 2;
    if (/(^|\s)value(\s|$)/.test(name)) return 1;
  }
  return 0;
}

export function tariffFamilyFromRow(row) {
  const name = lower(row.tariff_name ?? row.tariffName);
  const type = lower(row.tariff_type ?? row.tariffType);
  if (type.includes('tracker') || name.includes('tracker')) return 'tracker';
  if (type.includes('variable_ev') || type.includes('ev_variable') || /(^|\s)ev(\s|$)/.test(name)) return 'evVariable';
  if (type.includes('economy7') || type.includes('economy_7') || type === 'e7' || name.includes('economy 7') || name.includes('economy7')) return 'economy7Variable';
  if (type.includes('fixed') || name.includes('fixed')) return 'fixed';
  if (type.includes('variable')) return 'standardVariable';
  return '';
}

function usableRows(data, region, tier, family = '') {
  const rows = Array.isArray(data?.tariffLive) ? data.tariffLive : [];
  return rows.filter(row => {
    const rowRegion = Number(row.region_no ?? row.regionNo);
    const payment = lower(row.payment_method ?? row.paymentMethod);
    const familyMatches = !family || tariffFamilyFromRow(row) === family;
    return rowRegion === Number(region)
      && (!payment || payment === 'dd' || payment === 'direct debit')
      && tierFromRow(row) === tier
      && familyMatches;
  });
}

function profileForFamily(_appointment, family) {
  if (family === 'evVariable') return 'ev';
  if (family === 'economy7Variable' || family === 'fixedE7') return 'economy7';
  return 'standard';
}

function calculateFromRow(row, appointment, tier, family = '') {
  if (!row) return null;
  const energy = appointment?.energy || {};
  const profile = profileForFamily(appointment, family);

  let electricityAnnual = 0;
  if (energy.fuel !== 'gas') {
    const standing = number(profile === 'economy7' ? row.EDSC_E7 : row.EDSC_Std);
    if (profile === 'economy7') {
      const day = number(row.EUR_E7_Day), night = number(row.EUR_E7_Night);
      if ([standing, day, night].some(value => value === null)) return null;
      electricityAnnual = (Number(energy.dayKwh || 0) * day + Number(energy.nightKwh || 0) * night + standing * 365) * VAT / 100;
    } else if (profile === 'ev' && number(row.EUR_EV_Peak) !== null && number(row.EUR_EV_OffPeak) !== null) {
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
    tier,
    family: family || tariffFamilyFromRow(row),
    monthly: Math.round(annual / 12 * 100) / 100,
    annual: Math.round(annual * 100) / 100,
    tariffName: String(row.tariff_name ?? row.tariffName ?? 'Central tariff'),
    tariffType: String(row.tariff_type ?? row.tariffType ?? ''),
    sourceRef: String(row.source_ref ?? ''),
    indicative: true
  };
}

function chooseRow(data, appointment, tier, family = '') {
  const sourceFamily = family === 'economy7Variable' ? 'standardVariable' : family === 'fixedE7' ? 'fixed' : family;
  const rows = usableRows(data, appointment.energy.region, tier, sourceFamily);
  if (rows.length) return rows[0];
  if (family) return null;
  const legacy = usableRows(data, appointment.energy.region, tier);
  const preferredType = appointment.energy.electricityProfile === 'ev' ? 'variable_ev' : 'variable';
  return legacy.find(row => lower(row.tariff_type ?? row.tariffType) === preferredType)
    || legacy.find(row => lower(row.tariff_type ?? row.tariffType) === 'fixed')
    || legacy[0]
    || null;
}

export function calculateIndicativeEnergyCost(data, appointment, tier, family = '') {
  const selectedTier = Math.max(1, Math.min(3, Number(tier) || 1));
  const row = chooseRow(data, appointment, selectedTier, family);
  return calculateFromRow(row, appointment, selectedTier, family);
}

export function buildTariffGrid(data, appointment) {
  const families = appointment?.energy?.peakOffPeak
    ? [
        ['evVariable', 'EV Variable'],
        ['standardVariable', 'Standard Variable'],
        ['economy7Variable', 'Economy 7 Variable'],
        ['tracker', 'Tracker'],
        ['fixed', 'Fixed'],
        ['fixedE7', 'Fixed Economy 7']
      ]
    : [
        ['standardVariable', 'Standard Variable'],
        ['tracker', 'Tracker'],
        ['fixed', 'Fixed']
      ];
  return families.map(([id, label]) => {
    const values = Object.fromEntries([1, 2, 3].map(tier => [
      tier,
      calculateIndicativeEnergyCost(data, appointment, tier, id)
    ]));
    return { id, label, values, available: Object.values(values).some(Boolean) };
  }).filter(row => row.available);
}

export function buildIndicativeTiers(data, appointment) {
  const family = appointment?.energy?.selectedTariffFamily || 'fixed';
  return Object.fromEntries([1, 2, 3].map(tier => [
    tier,
    calculateIndicativeEnergyCost(data, appointment, tier, family)
      || calculateIndicativeEnergyCost(data, appointment, tier)
  ]));
}
