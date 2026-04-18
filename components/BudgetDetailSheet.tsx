import React from 'react';
import {
  getDaysInMonth,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  format,
} from 'date-fns';
import { BottomSheet } from '@/components/BottomSheet';
import { Budget, Expense } from '@/types';
import { formatCurrency } from '@/lib/constants';

interface TotalDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  totalInView: number;
  avgPerDay: number | null;
  previousPeriodData: { total: number; label: string } | null;
  viewMode: 'month' | 'week' | 'day';
  budget: Budget;
  expenses: Expense[];
  currentDate: Date;
}

export function TotalDetailSheet({
  isOpen,
  onClose,
  totalInView,
  avgPerDay,
  previousPeriodData,
  viewMode,
  budget,
  expenses,
  currentDate,
}: TotalDetailSheetProps) {
  const inCurrentMonth = format(currentDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM');
  const hasBudget = budget.monthlyAmount !== null && inCurrentMonth;
  const monthlyAmount = budget.monthlyAmount ?? 0;

  const today = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const daysPassed = Math.max(1, differenceInDays(today, monthStart) + 1);
  const daysLeft = Math.max(0, differenceInCalendarDays(monthEnd, today));

  // Anteiliges Allowance je View-Modus
  const allowance =
    viewMode === 'day'  ? monthlyAmount / daysInMonth :
    viewMode === 'week' ? (monthlyAmount / daysInMonth) * 7 :
    monthlyAmount;
  const remaining = allowance - totalInView;

  // Burn-Rate und Prognose nur für Monatsansicht relevant
  const dailyRate = totalInView / daysPassed;
  const forecast = dailyRate * daysInMonth;
  const showForecast = hasBudget && viewMode === 'month' && daysPassed > 1 && daysLeft > 0;

  const delta = previousPeriodData ? totalInView - previousPeriodData.total : null;

  const showComparisonSection = previousPeriodData !== null || (!hasBudget && avgPerDay !== null);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={hasBudget ? 'Budget-Details' : 'Ausgaben-Details'}
    >
      <div className="space-y-6 pb-2">

        {/* ── Budget Status ── */}
        {hasBudget && (
          <>
            {/* Hero: Noch verfügbar / über Budget */}
            <div className={`rounded-2xl px-4 py-4 ${remaining >= 0 ? 'bg-zinc-50' : 'bg-red-50'}`}>
              <div className={`text-xs font-medium mb-1 ${remaining >= 0 ? 'text-zinc-400' : 'text-red-400'}`}>
                {remaining >= 0 ? 'Noch verfügbar' : 'über Budget'}
              </div>
              <div className={`text-3xl font-semibold tabular-nums ${remaining >= 0 ? 'text-zinc-900' : 'text-red-500'}`}>
                {formatCurrency(Math.abs(remaining))}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {formatCurrency(totalInView)} von {formatCurrency(allowance)}{' '}
                {viewMode === 'day' ? 'Tagesbudget' : viewMode === 'week' ? 'Wochenbudget' : 'ausgegeben'}
              </div>
            </div>

            {/* Burn-Rate-Kacheln nur in Monatsansicht */}
            {viewMode === 'month' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-50 rounded-2xl p-4">
                  <div className="text-xs text-zinc-400 font-medium mb-1">Bisher pro Tag</div>
                  <div className="text-lg font-semibold text-zinc-900 tabular-nums">
                    {formatCurrency(dailyRate)}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {daysPassed} Tag{daysPassed !== 1 ? 'e' : ''} vergangen
                  </div>
                </div>
                <div className="bg-zinc-50 rounded-2xl p-4">
                  <div className="text-xs text-zinc-400 font-medium mb-1">Noch pro Tag</div>
                  <div className={`text-lg font-semibold tabular-nums ${remaining > 0 ? 'text-zinc-900' : 'text-red-400'}`}>
                    {remaining > 0 && daysLeft > 0 ? formatCurrency(remaining / daysLeft) : '—'}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {daysLeft} Tag{daysLeft !== 1 ? 'e' : ''} verbleibend
                  </div>
                </div>
              </div>
            )}

            {showForecast && (
              <div className={`rounded-2xl px-4 py-3.5 flex items-center justify-between ${forecast > monthlyAmount ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <div>
                  <div className={`text-xs font-medium ${forecast > monthlyAmount ? 'text-red-600' : 'text-emerald-700'}`}>
                    Prognose bis Monatsende
                  </div>
                  <div className={`text-sm mt-0.5 ${forecast > monthlyAmount ? 'text-red-500' : 'text-emerald-600'}`}>
                    {forecast > monthlyAmount
                      ? `~${formatCurrency(forecast - monthlyAmount)} über Budget`
                      : `~${formatCurrency(monthlyAmount - forecast)} unter Budget`}
                  </div>
                </div>
                <div className={`text-xl font-semibold tabular-nums ${forecast > monthlyAmount ? 'text-red-500' : 'text-emerald-600'}`}>
                  ~{formatCurrency(forecast)}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Zeitraum-Vergleich ── */}
        {showComparisonSection && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Zeitraum-Vergleich
            </h3>
            <div className="space-y-3">
              {previousPeriodData && (
                <div className="bg-zinc-50 rounded-2xl px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-zinc-500">Vorperiode</div>
                    {delta !== null && (
                      <div className={`text-xs mt-0.5 ${delta > 0 ? 'text-red-500' : delta < 0 ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {delta === 0
                          ? 'Gleich wie Vorperiode'
                          : `${delta < 0 ? '↑' : '↓'} ${formatCurrency(Math.abs(delta))} ${delta < 0 ? 'mehr gespart' : 'weniger gespart'} ${previousPeriodData.label}`}
                      </div>
                    )}
                  </div>
                  <div className="text-xl font-semibold text-zinc-700 tabular-nums">
                    {formatCurrency(previousPeriodData.total)}
                  </div>
                </div>
              )}
              {!hasBudget && avgPerDay !== null && (
                <div className="bg-zinc-50 rounded-2xl px-4 py-3.5 flex items-center justify-between">
                  <div className="text-xs font-medium text-zinc-500">Ø pro Tag</div>
                  <div className="text-xl font-semibold text-zinc-700 tabular-nums">
                    {formatCurrency(avgPerDay)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </BottomSheet>
  );
}
