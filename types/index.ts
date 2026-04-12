export const CATEGORIES = [
  'Supermarkt & Drogerie',
  'Restaurant & Café',
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
