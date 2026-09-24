const CACHE_KEY = 'apptCompanionV3TariffSnapshot';
export const TARIFF_FEED_URL = 'https://script.google.com/macros/s/AKfycbw-TllTpk_dbFjHhmojgeai9gKNGRzRaA_BtMooVSLeqvg614mONQyrpElC4M8vqP51/exec';
const FRESH_MS = 36 * 60 * 60 * 1000;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

const valid = data => Boolean(data && Array.isArray(data.tariffLive) && data.tariffLive.length);
const pick = (row, names) => names.map(name => row?.[name]).find(value => value != null && value !== '') ?? '';
const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return saved && valid(saved.data) ? saved : null;
  } catch { return null; }
};
const info = (saved, source, extra = {}) => {
  const ageMs = saved?.checked_at ? Math.max(0, Date.now() - Date.parse(saved.checked_at)) : Infinity;
  return { source, checked_at: saved?.checked_at || '', age_ms: ageMs, fresh: ageMs <= FRESH_MS, materially_stale: ageMs > STALE_MS, ...extra };
};

export function tariffSignature(data) {
  if (!valid(data)) return '';
  return data.tariffLive.map(row => [
    pick(row,['tariff_name','tariffName']), pick(row,['tariff_type','tariffType']),
    pick(row,['source_ref','sourceRef']), pick(row,['fixed_series','fixedSeries']),
    pick(row,['tracker_series','trackerSeries']), pick(row,['valid_from','validFrom']), pick(row,['valid_to','validTo'])
  ].join('|')).sort().join('~');
}

export function tariffSummary(data) {
  const rows = valid(data) ? data.tariffLive : [];
  const unique = list => [...new Set(list.filter(Boolean))];
  const byType = type => rows.filter(row => String(pick(row,['tariff_type','tariffType'])).toLowerCase() === type);
  const fixed = unique(byType('fixed').map(row => String(pick(row,['fixed_series','fixedSeries']) || '').replace(/\D/g,''))).sort((a,b)=>Number(b)-Number(a));
  const tracker = unique(byType('tracker').map(row => String(pick(row,['tracker_series','trackerSeries']) || '').replace(/\D/g,''))).sort((a,b)=>Number(b)-Number(a));
  const refs = type => unique(byType(type).map(row => String(pick(row,['source_ref','sourceRef']) || ''))).sort();
  return {
    fixed: fixed[0] ? `Fixed ${fixed[0]}` : 'Not supplied',
    tracker: tracker[0] ? `Tracker ${tracker[0]}` : 'Not supplied',
    variable: refs('variable').join(', ') || 'Not supplied',
    ev: refs('variable_ev').join(', ') || 'Not supplied'
  };
}

export function clearTariffCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

export async function loadTariffs(feedUrl, { onData, onError, force = false } = {}) {
  const cached = force ? null : read();
  if (cached) onData?.(structuredClone(cached.data), info(cached, 'cache', {
    revalidating: true, signature: tariffSignature(cached.data), summary: tariffSummary(cached.data)
  }));
  try {
    const response = await fetch(feedUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!valid(data)) throw new Error('Tariff feed returned no usable rows.');
    const saved = { schema_version: 1, checked_at: new Date().toISOString(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(saved));
    onData?.(structuredClone(data), info(saved, 'live', {
      signature: tariffSignature(data), summary: tariffSummary(data)
    }));
    return data;
  } catch (error) {
    const details = cached
      ? info(cached, 'cache', { verification_failed: true, signature: tariffSignature(cached.data), summary: tariffSummary(cached.data) })
      : info(null, 'none', { verification_failed: true });
    onError?.(error, details);
    if (!cached) throw error;
    return structuredClone(cached.data);
  }
}

export function cachedTariffs() {
  const saved = read();
  return saved ? {
    data: structuredClone(saved.data),
    info: info(saved, 'cache', { signature: tariffSignature(saved.data), summary: tariffSummary(saved.data) })
  } : null;
}
