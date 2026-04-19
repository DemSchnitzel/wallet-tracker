import { useMemo } from 'react';
import { Expense, Category, CATEGORIES } from '@/types';
import { CATEGORY_META } from '@/lib/constants';

const isValidCategory = (cat: string): cat is Category =>
  cat in CATEGORY_META;

export interface DescriptionSuggestions {
  descriptions: { description: string; category: Category }[];
  tags: { tag: string; category: Category }[];
  categories: Category[];
}

export function useDescriptionSuggestions(
  expenses: Expense[],
  query: string
): DescriptionSuggestions {
  return useMemo(() => {
    if (!query.trim()) return { descriptions: [], tags: [], categories: [] };
    const q = query.toLowerCase();

    const seen = new Set<string>();
    const descriptions: { description: string; category: Category }[] = [];
    for (const e of expenses) {
      if (descriptions.length === 4) break;
      if (!seen.has(e.description) && e.description.toLowerCase().includes(q) && isValidCategory(e.category)) {
        seen.add(e.description);
        descriptions.push({ description: e.description, category: e.category });
      }
    }

    const tags: { tag: string; category: Category }[] = [];
    CATEGORIES.forEach(c => {
      CATEGORY_META[c].tags.forEach(tag => {
        if (tag.toLowerCase().includes(q)) {
          tags.push({ tag, category: c });
        }
      });
    });

    const categories = CATEGORIES.filter(c => c.toLowerCase().includes(q));

    return { descriptions, tags: tags.slice(0, 4), categories };
  }, [expenses, query]);
}
