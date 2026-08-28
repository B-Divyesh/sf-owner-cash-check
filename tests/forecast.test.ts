import { describe, expect, it } from 'vitest';
import { buildForecast, cashStatus } from '../src/forecast';
import { CashEntry, Settings } from '../src/types';

const settings: Settings = { balance: 1000, reserve: 300, asOf: '2026-08-28', currency: 'USD' };
const entry = (values: Partial<CashEntry>): CashEntry => ({
  id: crypto.randomUUID(), type: 'outgoing', name: 'Item', amount: 1, date: '2026-08-29', confidence: 'committed', note: '', completed: false, createdAt: new Date().toISOString(), ...values
});

describe('13-week forecast', () => {
  it('tracks the daily low even when money arrives later on the same day', () => {
    const forecast = buildForecast(settings, [entry({ amount: 900 }), entry({ type: 'incoming', amount: 500, confidence: 'likely' })]);
    expect(forecast.weeks).toHaveLength(13);
    expect(forecast.weeks[0]).toMatchObject({ opening: 1000, outgoing: 900, incoming: 500, low: 100, closing: 600 });
    expect(forecast.low).toBe(100);
    expect(forecast.belowReserveWeeks).toBe(1);
    expect(forecast.estimateCount).toBe(1);
  });

  it('excludes completed, overdue, and beyond-horizon items', () => {
    const forecast = buildForecast(settings, [entry({ date: '2026-08-27', amount: 900 }), entry({ completed: true, amount: 900 }), entry({ date: '2026-11-28', amount: 900 })]);
    expect(forecast.finalBalance).toBe(1000);
    expect(forecast.weeks.flatMap((week) => week.entries)).toHaveLength(0);
  });

  it('labels reserve states without relying on color thresholds', () => {
    expect(cashStatus(299, 300)).toBe('danger');
    expect(cashStatus(330, 300)).toBe('tight');
    expect(cashStatus(400, 300)).toBe('safe');
  });
});
