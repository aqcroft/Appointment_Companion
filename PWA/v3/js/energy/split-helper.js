export function calculateAnnualDayNightSplit(totalAnnualKwh, sampleDayKwh, sampleNightKwh) {
  const total = Math.max(0, Number(totalAnnualKwh) || 0);
  const day = Math.max(0, Number(sampleDayKwh) || 0);
  const night = Math.max(0, Number(sampleNightKwh) || 0);
  const sampleTotal = day + night;
  if (!total || !sampleTotal) return { dayPercent: 0, nightPercent: 0, annualDayKwh: 0, annualNightKwh: 0 };
  const dayPercent = day / sampleTotal;
  const annualDayKwh = Math.round(total * dayPercent);
  return {
    dayPercent: dayPercent * 100,
    nightPercent: (1 - dayPercent) * 100,
    annualDayKwh,
    annualNightKwh: Math.max(0, Math.round(total - annualDayKwh))
  };
}

export function calculateEconomy7AnnualCost({ dayKwh = 0, nightKwh = 0, dayRate = 0, nightRate = 0, standingCharge = 0 }) {
  return (Number(dayKwh) * Number(dayRate) + Number(nightKwh) * Number(nightRate)) / 100 + Number(standingCharge) * 3.65;
}

