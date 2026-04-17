import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, addDays, startOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChartUpIcon } from '@hugeicons/core-free-icons';
import { formatCurrency } from '@/lib/constants';
import { Expense } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DayData {
  date: string;
  total: number;
  transactions: Expense[];
}

export interface ExpenseTrendCardProps {
  expenses: Expense[];
  currentDate: Date;
  viewMode: 'month' | 'week' | 'day';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function triggerHaptic() {
  try {
    if ('vibrate' in navigator) navigator.vibrate(3);
  } catch {}
}

function getWeekDays(date: Date): string[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(start, i), 'yyyy-MM-dd')
  );
}

function getMonthDays(date: Date): string[] {
  return eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  }).map(d => format(d, 'yyyy-MM-dd'));
}

function computeDayData(expenses: Expense[], dates: string[]): DayData[] {
  const map: Record<string, DayData> = {};
  dates.forEach(d => { map[d] = { date: d, total: 0, transactions: [] }; });
  expenses.forEach(e => {
    if (map[e.date]) {
      map[e.date].total += e.amount;
      map[e.date].transactions.push(e);
    }
  });
  return dates.map(d => map[d]);
}

// ─── WeekChart ───────────────────────────────────────────────────────────────

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const CHART_HEIGHT = 100; // px, matches h-[100px] container

interface ChartProps {
  days: DayData[];
  selectedDate: string | null;
  cursorDate: string | null;
  onSelectDate: (date: string) => void;
}

function WeekChart({ days, selectedDate, cursorDate, onSelectDate }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastIndexRef = useRef<number>(-1);
  const isPointerDownRef = useRef(false);
  const maxTotal = Math.max(...days.map(d => d.total), 0.01);

  const getIndexFromX = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return -1;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const idx = Math.floor((x / rect.width) * days.length);
      return Math.max(0, Math.min(days.length - 1, idx));
    },
    [days.length]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      containerRef.current?.setPointerCapture(e.pointerId);
      isPointerDownRef.current = true;
      const idx = getIndexFromX(e.clientX);
      if (idx >= 0 && idx !== lastIndexRef.current) {
        lastIndexRef.current = idx;
        onSelectDate(days[idx].date);
        triggerHaptic();
      }
    },
    [days, getIndexFromX, onSelectDate]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPointerDownRef.current) return;
      const idx = getIndexFromX(e.clientX);
      if (idx >= 0 && idx !== lastIndexRef.current) {
        lastIndexRef.current = idx;
        onSelectDate(days[idx].date);
        triggerHaptic();
      }
    },
    [days, getIndexFromX, onSelectDate]
  );

  const handlePointerUp = useCallback(() => {
    isPointerDownRef.current = false;
    lastIndexRef.current = -1;
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[100px] flex gap-2 px-3 cursor-pointer select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {days.map((day, i) => {
        const isSelected = day.date === selectedDate;
        const isCursor = day.date === cursorDate;
        const barH = day.total > 0
          ? Math.max((day.total / maxTotal) * (CHART_HEIGHT - 24), 8)
          : 4;

        return (
          <div
            key={day.date}
            aria-label={`${DAY_LABELS[i]}: ${formatCurrency(day.total)}`}
            className="flex-1 flex flex-col items-center"
            style={{ height: '100%' }}
          >
            <div className="w-3/4 flex-1 flex flex-col justify-end items-center">
              <div
                className="w-3/4 rounded-lg flex flex-col justify-end items-center"
                style={{
                  flex: 1,
                  marginBottom: '6px',
                  backgroundColor: isCursor ? '#F5F5F4' : 'rgba(245,245,244,0)',
                  transition: isCursor ? 'background-color 80ms ease-in' : 'background-color 700ms ease-out',
                }}
              >
                <motion.div
                  className="w-full rounded-lg"
                  animate={{
                    height: barH,
                    backgroundColor: isSelected ? '#18181b' : day.total > 0 ? '#e4e4e7' : '#efefef',
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ height: barH }}
                />
              </div>
            </div>
            <span className="text-[10px] font-medium mt-1" style={{ color: day.date === selectedDate ? '#18181b' : '#a1a1aa' }}>
              {DAY_LABELS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── MonthChart ──────────────────────────────────────────────────────────────

function MonthChart({ days, selectedDate, cursorDate, onSelectDate }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastIndexRef = useRef<number>(-1);
  const isPointerDownRef = useRef(false);
  const maxTotal = Math.max(...days.map(d => d.total), 0.01);
const getIndexFromX = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return -1;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const idx = Math.floor((x / rect.width) * days.length);
      return Math.max(0, Math.min(days.length - 1, idx));
    },
    [days.length]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      containerRef.current?.setPointerCapture(e.pointerId);
      isPointerDownRef.current = true;
      const idx = getIndexFromX(e.clientX);
      if (idx >= 0 && idx !== lastIndexRef.current) {
        lastIndexRef.current = idx;
        onSelectDate(days[idx].date);
        triggerHaptic();
      }
    },
    [days, getIndexFromX, onSelectDate]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPointerDownRef.current) return;
      const idx = getIndexFromX(e.clientX);
      if (idx >= 0 && idx !== lastIndexRef.current) {
        lastIndexRef.current = idx;
        onSelectDate(days[idx].date);
        triggerHaptic();
      }
    },
    [days, getIndexFromX, onSelectDate]
  );

  const handlePointerUp = useCallback(() => {
    isPointerDownRef.current = false;
    lastIndexRef.current = -1;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-[100px] flex gap-[2px] items-end cursor-pointer select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {days.map((day) => {
        const isSelected = day.date === selectedDate;
        const isCursor = day.date === cursorDate;
        const barH = day.total > 0
          ? Math.max((day.total / maxTotal) * CHART_HEIGHT, 4)
          : 4;

        return (
          <div
            key={day.date}
            className="flex-1 flex items-end rounded-sm"
            style={{
              height: '100%',
              backgroundColor: isCursor ? '#F5F5F4' : 'rgba(245,245,244,0)',
              transition: isCursor ? 'background-color 80ms ease-in' : 'background-color 700ms ease-out',
            }}
          >
            <div
              className="w-full rounded-full transition-colors duration-150"
              style={{
                height: barH,
                backgroundColor: isSelected ? '#18181b' : day.total > 0 ? '#d4d4d8' : '#efefef',
              }}
            />
          </div>
        );
      })}

    </div>
  );
}

// ─── ExpenseTrendCard (Main) ──────────────────────────────────────────────────

export function ExpenseTrendCard({ expenses, currentDate, viewMode }: ExpenseTrendCardProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cursorDate, setCursorDate] = useState<string | null>(null);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setCursorDate(date);
    if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
    cursorTimeoutRef.current = setTimeout(() => setCursorDate(null), 1200);
  }, []);

  useEffect(() => {
    return () => { if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current); };
  }, []);

  const segment = viewMode === 'week' ? 'week' : 'month';

  const dates = useMemo(
    () => (segment === 'week' ? getWeekDays(currentDate) : getMonthDays(currentDate)),
    [segment, currentDate]
  );

  const dayDataList = useMemo(
    () => computeDayData(expenses, dates),
    [expenses, dates]
  );

  // Select today by default, or reset when period changes
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setSelectedDate(dates.includes(today) ? today : null);
  }, [segment, currentDate]);

  const totalInView = useMemo(
    () => dayDataList.reduce((sum, d) => sum + d.total, 0),
    [dayDataList]
  );

  const selectedDayData = selectedDate
    ? dayDataList.find(d => d.date === selectedDate) ?? null
    : null;

  const selectedDayLabel = selectedDayData
    ? format(parseISO(selectedDayData.date), 'EEEE, d. MMM', { locale: de })
    : null;

  const headerAmount = selectedDayData?.total ?? totalInView;


  return (
    <div className="flex-[0_0_80%] bg-white rounded-[2rem] p-5 shadow-sm border border-zinc-100 flex flex-col gap-3 min-h-[220px]">
      {/* Label */}
      <div className="text-zinc-500 text-sm font-medium flex items-center gap-2">
        <HugeiconsIcon icon={ChartUpIcon} className="w-4 h-4 text-zinc-400" />
        Ausgaben-Trend
      </div>

      {/* Amount + date above chart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDate ?? 'total'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-zinc-900 tabular-nums leading-tight">
              {formatCurrency(headerAmount)}
            </p>
            {selectedDayLabel && (
              <p className="text-xs text-zinc-400 font-medium">{selectedDayLabel}</p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Chart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={segment}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {segment === 'week' ? (
            <WeekChart
              days={dayDataList}
              selectedDate={selectedDate}
              cursorDate={cursorDate}
              onSelectDate={handleSelectDate}
            />
          ) : (
            <MonthChart
              days={dayDataList}
              selectedDate={selectedDate}
              cursorDate={cursorDate}
              onSelectDate={handleSelectDate}
            />
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
