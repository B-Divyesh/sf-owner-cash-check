import { describe, expect, it } from 'vitest';
import { decryptBackup, encryptBackup, entriesToCSV } from '../src/backup';
import { emptyData } from '../src/types';

describe('portable backups', () => {
  it('round-trips a password-encrypted local backup', async () => {
    const data = emptyData();
    data.settings = { balance: 1200, reserve: 400, asOf: '2026-08-28', currency: 'USD' };
    const encrypted = await encryptBackup(data, 'correct horse');
    await expect(decryptBackup(encrypted, 'correct horse')).resolves.toMatchObject({ settings: { balance: 1200 } });
    await expect(decryptBackup(encrypted, 'wrong password')).rejects.toThrow('wrong');
  });

  it('quotes owner-entered CSV fields safely', () => {
    const data = emptyData();
    data.entries.push({ id: '1', type: 'incoming', name: 'Invoice, "Acme"', amount: 50, date: '2026-09-01', confidence: 'likely', completed: false, note: 'Net 7', createdAt: '' });
    expect(entriesToCSV(data.entries)).toContain('"Invoice, ""Acme"""');
  });
});
