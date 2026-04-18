import React, { useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { BottomSheet } from '@/components/BottomSheet';
import { Expense, Category, CATEGORIES } from '@/types';
import { CATEGORY_META, formatCurrency } from '@/lib/constants';

interface KategorienDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  totalInView: number;
}

export function KategorienDetailSheet({
  isOpen,
  onClose,
  expenses,
  totalInView,
}: KategorienDetailSheetProps) {
  const rows = useMemo(() => {
    return CATEGORIES.flatMap((cat) => {
      const current = expenses
        .filter(e => e.category === cat)
        .reduce((s, e) => s + e.amount, 0);
      if (current === 0) return [];

      const pct = totalInView > 0 ? (current / totalInView) * 100 : 0;

      return [{ category: cat, current, pct }];
    }).sort((a, b) => b.current - a.current);
  }, [expenses, totalInView]);

  const totalCategories = rows.length;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Kategorien">
      <div className="space-y-1 pb-2">

        {/* Summary line */}
        {totalCategories > 0 && (
          <p className="text-xs text-zinc-400 mb-4">
            {totalCategories} aktive Kategorie{totalCategories !== 1 ? 'n' : ''} · {formatCurrency(totalInView)} gesamt
          </p>
        )}

        {rows.length === 0 && (
          <div className="py-8 text-center text-zinc-400 text-sm">
            Keine Ausgaben in diesem Zeitraum.
          </div>
        )}

        {rows.map(({ category, current, pct }) => {
          const meta = CATEGORY_META[category as Category];
          return (
            <div key={category} className="py-3 border-b border-zinc-50 last:border-0">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: meta.color }}
                >
                  <HugeiconsIcon icon={meta.icon} className="w-4 h-4 text-zinc-600" />
                </div>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-zinc-700 truncate">{category}</span>
                  </div>
                  <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: meta.chartColor,
                      }}
                    />
                  </div>
                </div>

                {/* Amount + pct */}
                <div className="text-right shrink-0 ml-1">
                  <div className="text-sm font-medium text-zinc-800 tabular-nums">
                    {formatCurrency(current)}
                  </div>
                  <div className="text-[10px] text-zinc-400 tabular-nums">
                    {Math.round(pct)}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
