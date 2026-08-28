export type EntryType = 'incoming' | 'outgoing';
export type Confidence = 'confirmed' | 'likely' | 'possible' | 'committed';
export type Recurrence = 'none' | 'weekly' | 'monthly';

export interface Settings {
  balance: number;
  reserve: number;
  asOf: string;
  currency: string;
}

export interface CashEntry {
  id: string;
  type: EntryType;
  name: string;
  amount: number;
  date: string;
  confidence: Confidence;
  note: string;
  completed: boolean;
  createdAt: string;
  seriesId?: string;
}

export interface CheckIn {
  id: string;
  date: string;
  actualBalance: number;
  projectedLow: number;
  reserve: number;
  note: string;
  createdAt: string;
}

export interface AppData {
  version: 1;
  settings: Settings | null;
  entries: CashEntry[];
  checkIns: CheckIn[];
  updatedAt: string;
}

export const emptyData = (): AppData => ({
  version: 1,
  settings: null,
  entries: [],
  checkIns: [],
  updatedAt: new Date().toISOString()
});
