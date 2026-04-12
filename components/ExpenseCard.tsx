import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Package01Icon } from '@hugeicons/core-free-icons';
import { Expense } from '@/types';
import { CATEGORY_META, formatCurrency } from '@/lib/constants';

export const ExpenseCard = ({ expense }: { expense: Expense }) => {
  const Icon = CATEGORY_META[expense.category]?.icon || Package01Icon;
  return (
    <div className="group flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-zinc-100/50 transition-all hover:shadow-md">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600 shrink-0">
          <HugeiconsIcon icon={Icon} className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-zinc-900 text-base truncate">{expense.description}</p>
          <p className="text-sm text-zinc-500 truncate">{expense.category}</p>
        </div>
      </div>
      <div className="flex items-center shrink-0 pl-4">
        <span className="font-medium text-zinc-900 text-lg">{formatCurrency(expense.amount)}</span>
      </div>
    </div>
  );
};
