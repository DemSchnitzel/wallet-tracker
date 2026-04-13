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

    const descriptions = expenses
      .filter(e => e.description.toLowerCase().includes(q) && isValidCategory(e.category))
      .reduce((acc, curr) => {
        if (!acc.find(item => item.description === curr.description)) {
          acc.push({ description: curr.description, category: curr.category });
        }
        return acc;
      }, [] as { description: string; category: Category }[])
      .slice(0, 4);

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
