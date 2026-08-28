import { CashEntry, Settings } from './types';

export interface ForecastWeek {
  index: number;
  start: string;
  end: string;
  opening: number;
  incoming: number;
  outgoing: number;
  closing: number;
  low: number;
  lowDate: string;
  entries: CashEntry[];
}

export interface Forecast {
  weeks: ForecastWeek[];
  low: number;
  lowDate: string;
  finalBalance: number;
  belowReserveWeeks: number;
  estimateCount: number;
}

const parseDate = (date: string) => new Date(`${date}T12:00:00`);
export const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export const addDays = (date: string, days: number) => {
  const value = parseDate(date);
  value.setDate(value.getDate() + days);
  return toISODate(value);
};

export function buildForecast(settings: Settings, allEntries: CashEntry[]): Forecast {
  const active = allEntries
    .filter((entry) => !entry.completed && entry.date >= settings.asOf && entry.date < addDays(settings.asOf, 91))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'outgoing' ? -1 : 1));
  let running = settings.balance;
  let overallLow = running;
  let overallLowDate = settings.asOf;
  const weeks: ForecastWeek[] = [];

  for (let index = 0; index < 13; index += 1) {
    const start = addDays(settings.asOf, index * 7);
    const end = addDays(start, 6);
    const entries = active.filter((entry) => entry.date >= start && entry.date <= end);
    const opening = running;
    let low = opening;
    let lowDate = start;
    let incoming = 0;
    let outgoing = 0;
    entries.forEach((entry) => {
      if (entry.type === 'incoming') { running += entry.amount; incoming += entry.amount; }
      else { running -= entry.amount; outgoing += entry.amount; }
      if (running < low) { low = running; lowDate = entry.date; }
      if (running < overallLow) { overallLow = running; overallLowDate = entry.date; }
    });
    weeks.push({ index, start, end, opening, incoming, outgoing, closing: running, low, lowDate, entries });
  }

  return {
    weeks,
    low: overallLow,
    lowDate: overallLowDate,
    finalBalance: running,
    belowReserveWeeks: weeks.filter((week) => week.low < settings.reserve).length,
    estimateCount: active.filter((entry) => entry.type === 'incoming' && entry.confidence !== 'confirmed').length
  };
}

export function cashStatus(value: number, reserve: number): 'safe' | 'tight' | 'danger' {
  if (value < reserve) return 'danger';
  if (reserve > 0 && value < reserve * 1.2) return 'tight';
  return 'safe';
}
