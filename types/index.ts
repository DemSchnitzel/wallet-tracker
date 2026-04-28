export const CATEGORIES = [
  'Supermarkt & Drogerie',
  'Restaurant & Imbiss',
  'Ausgehen & Party',
  'Kultur & Events',
  'Shopping',
  'Mobilität',
  'Gesundheit & Pflege',
  'Geschenke & Mitbringsel',
  'Hobbys & Sport',
  'Urlaub & Ausflüge',
  'Wohnen & Haushalt',
  'Sonstiges'
] as const;

export type Category = typeof CATEGORIES[number];

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: Category;
  description: string;
}

export interface Budget {
  monthlyAmount: number | null;
  payDay: number | null;
  monthlyIncome: number | null;
  savingsGoal: number | null;
  savingsGoalMode: 'amount' | 'percent';
}
