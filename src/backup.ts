import { AppData, CashEntry } from './types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function deriveKey(password: string, salt: Uint8Array, usage: KeyUsage[]) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 250_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    usage
  );
}

export async function encryptBackup(data: AppData, password: string): Promise<string> {
  if (password.length < 8) throw new Error('Use at least 8 characters for an encrypted backup.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(data)));
  return JSON.stringify({ format: 'owner-cash-check-encrypted-v1', salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(ciphertext)) }, null, 2);
}

export async function decryptBackup(text: string, password: string): Promise<unknown> {
  const payload = JSON.parse(text) as { format?: string; salt?: string; iv?: string; data?: string };
  if (payload.format !== 'owner-cash-check-encrypted-v1' || !payload.salt || !payload.iv || !payload.data) {
    throw new Error('This is not an Owner Cash Check encrypted backup.');
  }
  try {
    const salt = fromBase64(payload.salt);
    const iv = fromBase64(payload.iv);
    const key = await deriveKey(password, salt, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(payload.data));
    return JSON.parse(decoder.decode(plain));
  } catch {
    throw new Error('The password is wrong or the backup is damaged.');
  }
}

const csvCell = (value: string | number | boolean) => `"${String(value).replaceAll('"', '""')}"`;
export function entriesToCSV(entries: CashEntry[]): string {
  const rows = [['type', 'name', 'amount', 'date', 'confidence', 'completed', 'note'], ...entries.map((entry) => [entry.type, entry.name, entry.amount, entry.date, entry.confidence, entry.completed, entry.note])];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}
