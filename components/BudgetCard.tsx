import React from 'react';
import { motion } from 'motion/react';
import { format, getDaysInMonth, differenceInCalendarDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowExpand01Icon, Wallet02Icon } from '@hugeicons/core-free-icons';
import { Budget } from '@/types';
import { formatCurrency } from '@/lib/constants';
import { getAvailableBudget, getSavingsGoalAmount, PayCycle } from '@/lib/payCycle';

interface TotalCardProps {
  totalInView: number;
  budget: Budget;
  currentDate: Date;
  viewMode: 'month' | 'week' | 'day';
  currentCycle: PayCycle | null;
  onExpand: () => void;
}

export function TotalCard({ totalInView, budget, currentDate, viewMode, currentCycle, onExpand }: TotalCardProps) {
  const today = new Date();
  const availableBudget = getAvailableBudget(budget);
  const hasIncomePlan = budget.monthlyIncome !== null;

  // Budget ist aktiv wenn wir in der aktuellen Periode sind
  const inCurrentPeriod = currentCycle
    ? today >= currentCycle.start && today <= currentCycle.end
    : format(currentDate, 'yyyy-MM') === format(today, 'yyyy-MM');

  const hasBudget = availableBudget !== null && inCurrentPeriod;
  const amount = availableBudget ?? 0;

  // Anteiliges Allowance je View-Modus
  const daysInMonth = getDaysInMonth(currentDate);
  const allowance =
    viewMode === 'day'  ? amount / daysInMonth :
    viewMode === 'week' ? (amount / daysInMonth) * 7 :
    amount;

  const rawPercentage = hasBudget ? (totalInView / allowance) * 100 : 0;
  const percentage = Math.min(rawPercentage, 100);
  const isOverBudget = rawPercentage > 100;

  const barColor =
    percentage >= 95 ? '#f87171' :
    percentage >= 75 ? '#fbbf24' :
    '#34d399';

  const allowanceLabel =
    viewMode === 'day'  ? `von ${formatCurrency(allowance)} / Tag` :
    viewMode === 'week' ? `von ${formatCurrency(allowance)} / Woche` :
    `von ${formatCurrency(allowance)}`;

  // Tagesrate berechnen (nur Monatsansicht, nur wenn Budget aktiv)
  const dailyRateLabel = (() => {
    if (!hasBudget || viewMode !== 'month') return null;
    const remaining = allowance - totalInView;
    if (remaining <= 0) return null;
    const end = currentCycle ? currentCycle.end : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysLeft = Math.max(1, differenceInCalendarDays(end, today) + 1);
    return `${formatCurrency(remaining / daysLeft)}/Tag · ${daysLeft} Tage`;
  })();

  const header = hasBudget
    ? (hasIncomePlan ? 'Sparplan' : `Budget ${format(currentDate, 'MMMM', { locale: de })}`)
    : 'Gesamtausgaben';

  return (
    <div
      className="flex-[0_0_80%] bg-zinc-900 text-white rounded-[2rem] p-6 shadow-lg shadow-zinc-900/20 flex flex-col justify-between min-h-[220px] cursor-pointer active:scale-[0.98] transition-transform duration-150 select-none"
      onClick={onExpand}
    >
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-sm font-medium flex items-center gap-2">
          <HugeiconsIcon icon={Wallet02Icon} className="w-4 h-4 text-zinc-400" />
          {header}
        </span>
        <HugeiconsIcon icon={ArrowExpand01Icon} className="w-4 h-4 text-zinc-500" />
      </div>

      <div>
        <div className="text-4xl sm:text-5xl font-light tracking-tight mt-4">
          {formatCurrency(totalInView)}
        </div>

        {hasBudget && (
          <>
            <div className="mt-4 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: barColor }}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className={`text-xs tabular-nums font-medium ${isOverBudget ? 'text-red-400' : 'text-zinc-400'}`}>
                {isOverBudget ? `${Math.round(rawPercentage)}% · über Budget` : `${Math.round(percentage)}%`}
              </span>
              <span className="text-zinc-400 text-xs tabular-nums">{allowanceLabel}</span>
            </div>
            {dailyRateLabel && (
              <div className="mt-2 text-xs text-zinc-500 tabular-nums">
                {dailyRateLabel}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
