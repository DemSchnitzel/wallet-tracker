import { useState, useEffect } from 'react';
import { Budget } from '@/types';

const STORAGE_KEY = 'budget';

export function useBudget() {
  const [budget, setBudgetState] = useState<Budget>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { monthlyAmount: null };
    try {
      return JSON.parse(saved) as Budget;
    } catch {
      return { monthlyAmount: null };
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
  }, [budget]);

  const setBudget = (monthlyAmount: number | null) => {
    setBudgetState({ monthlyAmount });
  };

  return { budget, setBudget };
}
