const SLUG = 'owner-cash-check';
const API = 'https://api.sociobot.in/api/v1';
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${TOKEN_KEY}:verdict`;
const DAY = 86_400_000;

interface CachedVerdict { valid: boolean; checkedAt: number; }

export const checkoutUrl = `${API}/products/${SLUG}/checkout`;
export const getLicenseToken = () => localStorage.getItem(TOKEN_KEY);
export const clearLicense = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(VERDICT_KEY); };

export function captureLicenseFromUrl(): boolean {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return false;
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: true, checkedAt: 0 }));
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}

export function storeLicense(token: string) {
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: true, checkedAt: 0 }));
}

export function cachedUnlock(): boolean {
  if (!getLicenseToken()) return false;
  try {
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? '') as CachedVerdict;
    return cached.valid;
  } catch { return true; }
}

export async function verifyLicense(force = false): Promise<{ valid: boolean; reason: string }> {
  const token = getLicenseToken();
  if (!token) return { valid: false, reason: 'missing' };
  try {
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? '') as CachedVerdict;
    if (!force && Date.now() - cached.checkedAt < DAY) return { valid: cached.valid, reason: 'cached' };
  } catch { /* verify now */ }
  const response = await fetch(`${API}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error('License service is unavailable.');
  const result = await response.json() as { valid: boolean; reason: string };
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: result.valid, checkedAt: Date.now() }));
  return result;
}
