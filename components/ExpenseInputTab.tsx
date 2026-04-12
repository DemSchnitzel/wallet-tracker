import React, { useState, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';

import { ExpenseCard } from '@/components/ExpenseCard';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Expense } from '@/types';

interface ExpenseInputTabProps {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onEditExpense: (expense: Expense) => void;
}

export const ExpenseInputTab = ({ expenses, onAddExpense, onEditExpense }: ExpenseInputTabProps) => {
  const [formKey, setFormKey] = useState(0);

  const recentExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [expenses]);

  const handleAdd = (values: Omit<Expense, 'id'>) => {
    onAddExpense(values);
    setFormKey(k => k + 1); // reset form
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
      <ExpenseForm
        key={formKey}
        expenses={expenses}
        onSubmit={handleAdd}
        autoFocus
        submitLabel={
          <>
            <HugeiconsIcon icon={Add01Icon} className="w-5 h-5 mr-2" />
            Hinzufügen
          </>
        }
      />

      {recentExpenses.length > 0 && (
        <div className="space-y-4 px-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Zuletzt hinzugefügt</h3>
          <div className="space-y-3">
            {recentExpenses.map(expense => (
              <ExpenseCard key={expense.id} expense={expense} onEdit={() => onEditExpense(expense)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
