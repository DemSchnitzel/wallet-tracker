import React, { useMemo } from 'react';
import { format, parseISO, getDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { HugeiconsIcon } from '@hugeicons/react';
import { BottomSheet } from '@/components/BottomSheet';
import { computeDayData, getWeekDays, getMonthDays, DayData } from '@/components/ExpenseTrendCard';
import { Expense } from '@/types';
import { formatCurrency } from '@/lib/constants';

interface TrendDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  currentDate: Date;
  viewMode: 'month' | 'week';
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAY_PLURAL = ['Montage', 'Dienstage', 'Mittwoche', 'Donnerstage', 'Freitage', 'Samstage', 'Sonntage'];

// ─── Gemeinsamer Breakdown für Woche + Monat ──────────────────────────────────

function TrendBreakdown({ dayDataList, viewMode }: { dayDataList: DayData[]; viewMode: 'month' | 'week' }) {
  const activeDays = dayDataList.filter(d => d.total > 0);
  const emptyDays = dayDataList.length - activeDays.length;

  // Top-Tage: 3 für Woche, 5 für Monat
  const topDays = [...activeDays]
    .sort((a, b) => b.total - a.total)
    .slice(0, viewMode === 'week' ? 3 : 5);

  // Wochentag-Muster (nur Monat — für eine einzelne Woche identisch mit dem Chart)
  const weekdayTotals = Array(7).fill(0) as number[];
  if (viewMode === 'month') {
    activeDays.forEach(day => {
      const jsDay = getDay(parseISO(day.date));
      const idx = jsDay === 0 ? 6 : jsDay - 1;
      weekdayTotals[idx] += day.total;
    });
  }
  const maxWeekday = Math.max(...weekdayTotals, 0.01);
  const peakIdx = weekdayTotals.indexOf(Math.max(...weekdayTotals));

  const emptyLabel = viewMode === 'week' ? 'Keine Ausgaben in dieser Woche.' : 'Keine Ausgaben in diesem Monat.';

  if (activeDays.length === 0) {
    return <div className="py-8 text-center text-zinc-400 text-sm">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-6">

      {/* ── Stats-Grid ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-50 rounded-2xl p-4">
          <div className="text-xs text-zinc-400 font-medium mb-1">Aktivste Tage</div>
          <div className="text-2xl font-semibold text-zinc-900">{activeDays.length}</div>
          <div className="text-xs text-zinc-400 mt-0.5">von {dayDataList.length} Tagen</div>
        </div>
        <div className="bg-zinc-50 rounded-2xl p-4">
          <div className="text-xs text-zinc-400 font-medium mb-1">Ohne Ausgaben</div>
          <div className="text-2xl font-semibold text-zinc-900">{emptyDays}</div>
          <div className="text-xs text-zinc-400 mt-0.5">
            {emptyDays === 1 ? 'Tag' : 'Tage'} gespart
          </div>
        </div>
      </div>

      {/* ── Wochentag-Muster (nur Monat) ── */}
      {viewMode === 'month' && activeDays.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Ausgaben nach Wochentag
          </h3>
          <div className="space-y-2">
            {WEEKDAY_LABELS.map((label, i) => {
              const total = weekdayTotals[i];
              const pct = maxWeekday > 0 ? (total / maxWeekday) * 100 : 0;
              const isPeak = i === peakIdx && total > 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className={`text-xs font-medium w-6 shrink-0 ${isPeak ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {label}
                  </span>
                  <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isPeak ? '#18181b' : '#d4d4d8',
                      }}
                    />
                  </div>
                  <span className={`text-xs tabular-nums w-16 text-right shrink-0 ${isPeak ? 'font-semibold text-zinc-900' : 'text-zinc-400'}`}>
                    {total > 0 ? formatCurrency(total) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
          {weekdayTotals[peakIdx] > 0 && (
            <p className="text-xs text-zinc-400 mt-3">
              {WEEKDAY_PLURAL[peakIdx]} sind dein ausgabenreichster Wochentag.
            </p>
          )}
        </div>
      )}

      {/* ── Tageswerte (nur Woche) ── */}
      {viewMode === 'week' && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Tageswerte
          </h3>
          <div className="space-y-2">
            {dayDataList.map((day, i) => {
              const maxTotal = Math.max(...dayDataList.map(d => d.total), 0.01);
              const pct = (day.total / maxTotal) * 100;
              const isPeak = day.total === maxTotal && day.total > 0;
              return (
                <div key={day.date} className="flex items-center gap-3">
                  <span className={`text-xs font-medium w-6 shrink-0 ${isPeak ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {WEEKDAY_LABELS[i]}
                  </span>
                  <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isPeak ? '#18181b' : '#d4d4d8',
                      }}
                    />
                  </div>
                  <span className={`text-xs tabular-nums w-16 text-right shrink-0 ${isPeak ? 'font-semibold text-zinc-900' : 'text-zinc-400'}`}>
                    {day.total > 0 ? formatCurrency(day.total) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Teuerste Tage ── */}
      {topDays.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Teuerste Tage
          </h3>
          <div className="space-y-1">
            {topDays.map((day, rank) => (
              <div key={day.date} className="flex items-center gap-3 py-2 border-b border-zinc-50 last:border-0">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-zinc-500">{rank + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-700">
                    {format(parseISO(day.date), 'EEEE, d. MMMM', { locale: de })}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {day.transactions.length} Buchung{day.transactions.length !== 1 ? 'en' : ''}
                  </p>
                </div>
                <span className="text-sm font-semibold text-zinc-900 tabular-nums">
                  {formatCurrency(day.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TrendDetailSheet({
  isOpen,
  onClose,
  expenses,
  currentDate,
  viewMode,
}: TrendDetailSheetProps) {
  const dates = useMemo(
    () => viewMode === 'week' ? getWeekDays(currentDate) : getMonthDays(currentDate),
    [viewMode, currentDate]
  );

  const dayDataList = useMemo(
    () => computeDayData(expenses, dates),
    [expenses, dates]
  );

  const title = viewMode === 'week' ? 'Diese Woche' : 'Monatsdetails';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <TrendBreakdown dayDataList={dayDataList} viewMode={viewMode} />
    </BottomSheet>
  );
}
