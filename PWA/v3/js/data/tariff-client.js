const CACHE_KEY = 'apptCompanionV3TariffSnapshot';
export const TARIFF_FEED_URL = 'https://script.google.com/macros/s/AKfycbw-TllTpk_dbFjHhmojgeai9gKNGRzRaA_BtMooVSLeqvg614mONQyrpElC4M8vqP51/exec';
const FRESH_MS = 36 * 60 * 60 * 1000;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

const valid = data => Boolean(data && Array.isArray(data.tariffLive) && data.tariffLive.length);
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

export async function loadTariffs(feedUrl, { onData, onError } = {}) {
  const cached = read();
  if (cached) onData?.(structuredClone(cached.data), info(cached, 'cache', { revalidating: true }));
  try {
    const response = await fetch(feedUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!valid(data)) throw new Error('Tariff feed returned no usable rows.');
    const saved = { schema_version: 1, checked_at: new Date().toISOString(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(saved));
    onData?.(structuredClone(data), info(saved, 'live'));
    return data;
  } catch (error) {
    const details = cached ? info(cached, 'cache', { verification_failed: true }) : info(null, 'none', { verification_failed: true });
    onError?.(error, details);
    if (!cached) throw error;
    return structuredClone(cached.data);
  }
}

export function cachedTariffs() {
  const saved = read();
  return saved ? { data: structuredClone(saved.data), info: info(saved, 'cache') } : null;
}
