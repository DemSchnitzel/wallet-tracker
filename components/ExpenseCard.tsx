import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Package01Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import { Expense } from '@/types';
import { CATEGORY_META, formatCurrency } from '@/lib/constants';

interface ExpenseCardProps {
  expense: Expense;
  onEdit?: () => void;
}

export const ExpenseCard = React.memo(({ expense, onEdit }: ExpenseCardProps) => {
  const Icon = CATEGORY_META[expense.category]?.icon || Package01Icon;

  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={!onEdit}
      aria-label="Ausgabe bearbeiten"
      className="group w-full flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-zinc-100/50 transition-all hover:shadow-md disabled:pointer-events-none text-left"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative w-12 h-12 rounded-full flex items-center justify-center text-zinc-600 shrink-0 transition-colors" style={{ backgroundColor: CATEGORY_META[expense.category]?.color ?? '#F4F4F5' }}>
          {/* Category icon — fades out on hover */}
          <HugeiconsIcon
            icon={Icon}
            className="w-5 h-5 absolute transition-opacity duration-150 group-hover:opacity-0"
          />
          {/* Pencil icon — fades in on hover */}
          <HugeiconsIcon
            icon={PencilEdit01Icon}
            className="w-5 h-5 absolute transition-opacity duration-150 opacity-0 group-hover:opacity-100 text-zinc-500"
          />
        </div>

        <div className="min-w-0">
          <p className="font-medium text-zinc-900 text-base truncate">{expense.description}</p>
          <p className="text-sm text-zinc-500 truncate">{expense.category}</p>
        </div>
      </div>

      <div className="flex items-center shrink-0 pl-4">
        <span className="font-medium text-zinc-900 text-lg">{formatCurrency(expense.amount)}</span>
      </div>
    </button>
  );
});
