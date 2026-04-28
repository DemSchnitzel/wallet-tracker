import { useState, useEffect } from 'react';
import { Budget } from '@/types';
import { getAvailableBudget } from '@/lib/payCycle';

const STORAGE_KEY = 'budget';

const DEFAULT_BUDGET: Budget = {
  monthlyAmount: null,
  payDay: null,
  monthlyIncome: null,
  savingsGoal: null,
  savingsGoalMode: 'amount',
};

function loadBudget(): Budget {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_BUDGET;
  try {
    const parsed = JSON.parse(saved) as Partial<Budget>;
    // Migration: alte Einträge haben nur monthlyAmount
    return { ...DEFAULT_BUDGET, ...parsed };
  } catch {
    return DEFAULT_BUDGET;
  }
}

export function useBudget() {
  const [budget, setBudgetState] = useState<Budget>(loadBudget);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
  }, [budget]);

  const setBudget = (patch: Partial<Budget>) => {
    setBudgetState(prev => {
      const next = { ...prev, ...patch };
      // Wenn Einkommen gesetzt wird, monthlyAmount auto-berechnen und synchron halten
      if (patch.monthlyIncome !== undefined || patch.savingsGoal !== undefined || patch.savingsGoalMode !== undefined) {
        const available = getAvailableBudget(next);
        return { ...next, monthlyAmount: available };
      }
      return next;
    });
  };

  const availableBudget = getAvailableBudget(budget);
  const hasIncomePlan = budget.monthlyIncome !== null;

  return { budget, setBudget, availableBudget, hasIncomePlan };
}
