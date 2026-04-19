import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, subMonths, addMonths, subWeeks, addWeeks, subDays, addDays, isSameWeek, getWeek, isToday, isYesterday, getDaysInMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import useEmblaCarousel from 'embla-carousel-react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon, ArrowRight01Icon, Wallet02Icon, Tag01Icon, Search01Icon, Cancel01Icon, ArrowExpand01Icon
} from '@hugeicons/core-free-icons';

import { Button } from '@/components/ui/button';
import { ExpenseCard } from '@/components/ExpenseCard';
import { ExpenseTrendCard } from '@/components/ExpenseTrendCard';
import { TotalCard } from '@/components/BudgetCard';
import { TotalDetailSheet } from '@/components/BudgetDetailSheet';
import { KategorienDetailSheet } from '@/components/KategorienDetailSheet';
import { TrendDetailSheet } from '@/components/TrendDetailSheet';
import { Expense, Category, CATEGORIES, Budget } from '@/types';
import { CATEGORY_META, formatCurrency } from '@/lib/constants';
import { useDescriptionSuggestions } from '@/lib/useDescriptionSuggestions';

interface ExpenseOverviewTabProps {
  expenses: Expense[];
  onEditExpense: (expense: Expense) => void;
  budget: Budget;
}

export const ExpenseOverviewTab = ({ expenses, onEditExpense, budget }: ExpenseOverviewTabProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isTotalSheetOpen, setIsTotalSheetOpen] = useState(false);
  const [isKategorienSheetOpen, setIsKategorienSheetOpen] = useState(false);
  const [isTrendSheetOpen, setIsTrendSheetOpen] = useState(false);

  // Secondary cards carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: false, skipSnaps: false, duration: 25 });

  // Category filter carousel
  const [categoryEmblaRef, categoryEmblaApi] = useEmblaCarousel({ loop: true, align: 'start', dragFree: true });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveCard(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  // Auto-scroll back to first active filter after 4s idle
  useEffect(() => {
    const categoryFilters = selectedFilters.filter(f => CATEGORIES.includes(f as Category));
    if (categoryFilters.length === 0 || !categoryEmblaApi) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    const firstActiveIndex = CATEGORIES.findIndex(c => categoryFilters.includes(c));

    const startTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        categoryEmblaApi.scrollTo(firstActiveIndex);
      }, 4000);
    };

    const container = categoryEmblaApi.rootNode();
    container.addEventListener('pointerdown', startTimer);
    container.addEventListener('touchstart', startTimer);

    startTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      container.removeEventListener('pointerdown', startTimer);
      container.removeEventListener('touchstart', startTimer);
    };
  }, [selectedFilters, categoryEmblaApi]);

  // Current period expenses
  const expensesInView = useMemo(() => {
    return expenses.filter(e => {
      const d = parseISO(e.date);
      if (viewMode === 'month') return format(d, 'yyyy-MM') === format(currentDate, 'yyyy-MM');
      if (viewMode === 'week') return isSameWeek(d, currentDate, { weekStartsOn: 1 });
      return e.date === format(currentDate, 'yyyy-MM-dd');
    });
  }, [expenses, currentDate, viewMode]);

  // Previous period expenses
  const previousPeriodData = useMemo(() => {
    const prevDate =
      viewMode === 'month' ? subMonths(currentDate, 1) :
      viewMode === 'week'  ? subWeeks(currentDate, 1) :
                             subDays(currentDate, 1);

    const prevExpenses = expenses.filter(e => {
      const d = parseISO(e.date);
      if (viewMode === 'month') return format(d, 'yyyy-MM') === format(prevDate, 'yyyy-MM');
      if (viewMode === 'week') return isSameWeek(d, prevDate, { weekStartsOn: 1 });
      return e.date === format(prevDate, 'yyyy-MM-dd');
    });

    if (prevExpenses.length === 0) return null;

    const prevTotal = prevExpenses.reduce((sum, e) => sum + e.amount, 0);
    const label =
      viewMode === 'month' ? `als im ${format(prevDate, 'MMMM', { locale: de })}` :
      viewMode === 'week'  ? 'als letzte Woche' :
                             'als gestern';

    return { total: prevTotal, label, expenses: prevExpenses };
  }, [expenses, currentDate, viewMode]);

  const searchSuggestions = useDescriptionSuggestions(expenses, searchQuery);

  const filteredExpenses = useMemo(() => {
    const categoryFilters = selectedFilters.filter(f => CATEGORIES.includes(f as Category));
    const termFilters = selectedFilters.filter(f => !CATEGORIES.includes(f as Category));
    return expensesInView
      .filter(e => {
        const matchesSearchText = e.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilters.length === 0 || categoryFilters.includes(e.category);
        const matchesTerms = termFilters.length === 0 || termFilters.some(term => e.description === term);
        return matchesSearchText && matchesCategory && matchesTerms;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expensesInView, searchQuery, selectedFilters]);

  const groupedFilteredExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach(expense => {
      if (!groups[expense.date]) groups[expense.date] = [];
      groups[expense.date].push(expense);
    });
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => [date, [...items].reverse()] as [string, Expense[]]);
  }, [filteredExpenses]);

  const totalInView = useMemo(() =>
    expensesInView.reduce((sum, e) => sum + e.amount, 0),
  [expensesInView]);

  // Average spend per day for the current period
  const avgPerDay = useMemo(() => {
    if (viewMode === 'week') return totalInView > 0 ? totalInView / 7 : null;
    if (viewMode === 'month') {
      const today = new Date();
      const isCurrentMonthView = format(currentDate, 'yyyy-MM') === format(today, 'yyyy-MM');
      const days = isCurrentMonthView ? today.getDate() : getDaysInMonth(currentDate);
      return totalInView > 0 ? totalInView / days : null;
    }
    return null;
  }, [totalInView, currentDate, viewMode]);

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    expensesInView.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        chartColor: CATEGORY_META[name as Category]?.chartColor ?? '#A1A1AA',
      }));
  }, [expensesInView]);

  const today = new Date();
  const isCurrentPeriod =
    viewMode === 'month' ? format(currentDate, 'yyyy-MM') === format(today, 'yyyy-MM') :
    viewMode === 'week'  ? isSameWeek(currentDate, today, { weekStartsOn: 1 }) :
                           isToday(currentDate);

  const formatDateHeading = (dateStr: string): string => {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Heute';
    if (isYesterday(d)) return 'Gestern';
    return format(d, 'dd. MMMM', { locale: de });
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
      {/* View Mode & Date Navigation */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center bg-zinc-100 rounded-xl p-1 gap-1">
          {(['month', 'week', 'day'] as const).map((mode) => {
            const labels = { month: 'Monat', week: 'Woche', day: 'Tag' };
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>

        <div className="relative flex items-center justify-center gap-3 mt-3">
          <Button variant="ghost" size="icon" onClick={() => {
            if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
            else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
            else setCurrentDate(subDays(currentDate, 1));
          }} className="h-9 w-9 shrink-0 rounded-xl hover:bg-zinc-100 text-zinc-500">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-6 h-6" />
          </Button>
          <div className="text-center font-medium text-zinc-900 text-sm w-[110px]">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: de })}
            {viewMode === 'week' && `KW ${getWeek(currentDate, { weekStartsOn: 1 })} ${format(currentDate, 'yyyy')}`}
            {viewMode === 'day' && format(currentDate, 'dd. MMM yyyy', { locale: de })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => {
            if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
            else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
            else setCurrentDate(addDays(currentDate, 1));
          }} className="h-9 w-9 shrink-0 rounded-xl hover:bg-zinc-100 text-zinc-500">
            <HugeiconsIcon icon={ArrowRight01Icon} className="w-6 h-6" />
          </Button>
          {!isCurrentPeriod && (
            <button
              onClick={() => setCurrentDate(new Date())}
              className="absolute right-0 text-xs font-medium text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              Heute
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards Carousel */}
      <div className="-mt-4">
        <div className="overflow-hidden -mx-1 px-1 -mt-1 pt-1 -mb-6 pb-6" ref={emblaRef}>
          <div className="flex gap-3">

            {/* Card 1: Gesamtausgaben / Budget (merged) */}
            <TotalCard
              totalInView={totalInView}
              budget={budget}
              currentDate={currentDate}
              viewMode={viewMode}
              onExpand={() => setIsTotalSheetOpen(true)}
            />

            {/* Card 2: Kategorien Donut */}
            <div
              className="flex-[0_0_80%] bg-white rounded-[2rem] p-5 shadow-sm border border-zinc-100 min-h-[220px] flex flex-col cursor-pointer active:scale-[0.98] transition-transform duration-150 select-none"
              onClick={() => setIsKategorienSheetOpen(true)}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-zinc-500 text-sm font-medium flex items-center gap-2">
                  <HugeiconsIcon icon={Tag01Icon} className="w-4 h-4 text-zinc-400" />
                  Kategorien
                </div>
                <HugeiconsIcon icon={ArrowExpand01Icon} className="w-4 h-4 text-zinc-300" />
              </div>

              {categoryData.length === 0 || totalInView === 0 ? (
                <div className="flex-1 flex items-center gap-3">
                  <div className="shrink-0 w-[88px] h-[88px] rounded-full border-[14px] border-zinc-100 flex items-center justify-center">
                    <span className="text-xs font-semibold text-zinc-300">0</span>
                  </div>
                  <div className="text-sm text-zinc-400">Keine Daten</div>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-3">
                  {/* Donut */}
                  <div className="shrink-0 relative" style={{ pointerEvents: 'none' }}>
                    <PieChart width={88} height={88} style={{ outline: 'none' }}>
                      <Pie
                        data={categoryData}
                        cx={40}
                        cy={40}
                        innerRadius={27}
                        outerRadius={41}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={2}
                        stroke="#fff"
                        cornerRadius={3}
                        isAnimationActive={false}
                      >
                        {categoryData.map((entry) => (
                          <Cell key={entry.name} fill={entry.chartColor} />
                        ))}
                      </Pie>
                    </PieChart>
                  </div>
                  {/* Legend – top 3 + overflow hint */}
                  <div className="flex flex-col gap-2.5 min-w-0 flex-1">
                    {categoryData.slice(0, 3).map(entry => (
                      <div key={entry.name} className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.chartColor }} />
                        <span className="text-xs text-zinc-600 truncate flex-1">{entry.name}</span>
                        <span className="text-xs font-medium text-zinc-400 shrink-0 tabular-nums">
                          {formatCurrency(entry.value)}
                        </span>
                      </div>
                    ))}
                    {categoryData.length > 3 && (
                      <span className="text-xs text-zinc-300 tabular-nums">
                        + {categoryData.length - 3} weitere
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Ausgaben-Trend (nur Monats- und Wochenansicht) */}
            {viewMode !== 'day' && (
              <ExpenseTrendCard
                expenses={expenses}
                currentDate={currentDate}
                viewMode={viewMode}
                onExpand={() => setIsTrendSheetOpen(true)}
              />
            )}


          </div>
        </div>

        {/* Page Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({
            length: viewMode === 'day' ? 2 : 3
          }, (_, i) => i).map(i => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`rounded-full transition-all duration-300 ${
                activeCard === i
                  ? 'w-4 h-1.5 bg-zinc-900'
                  : 'w-1.5 h-1.5 bg-zinc-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Smart Search & Filter */}
      <div className="pt-2 space-y-4">
        <div className="relative z-30">
          <div className={`min-h-14 pl-12 pr-4 py-2 rounded-2xl bg-[#F6F6F7] border-none shadow-none transition-all flex items-center flex-wrap gap-2 ${isSearchFocused ? 'ring-4 ring-zinc-100' : ''}`}>
            <div className="absolute top-4 left-4 flex items-center pointer-events-none">
              <HugeiconsIcon icon={Search01Icon} className="w-5 h-5 text-zinc-400" />
            </div>

            {selectedFilters.filter(f => !CATEGORIES.includes(f as Category)).map(filter => (
              <div key={filter} className="flex items-center gap-1.5 bg-zinc-100 text-zinc-800 px-3 py-1.5 rounded-xl text-sm font-medium">
                <span>{filter}</span>
                <button onClick={() => setSelectedFilters(selectedFilters.filter(f => f !== filter))} className="ml-1 p-0.5 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition-colors">
                  <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
                </button>
              </div>
            ))}

            <input
              type="text"
              placeholder={selectedFilters.filter(f => !CATEGORIES.includes(f as Category)).length === 0 ? 'Suchen nach Einträgen...' : ''}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="flex-1 min-w-[140px] bg-transparent outline-none text-base text-zinc-900 py-1.5"
            />
            {searchQuery && (
              <button
                onMouseDown={(e) => { e.preventDefault(); setSearchQuery(''); }}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            )}
          </div>

          {isSearchFocused && searchQuery.trim() && searchSuggestions.descriptions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              {searchSuggestions.descriptions.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-1.5">Einträge</div>
                  {searchSuggestions.descriptions.map(item => (
                    <button key={item.description} onClick={() => {
                      if (!selectedFilters.includes(item.description)) setSelectedFilters([...selectedFilters, item.description]);
                      setSearchQuery('');
                    }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 rounded-xl flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600" style={{ backgroundColor: CATEGORY_META[item.category]?.color ?? '#F4F4F5' }}>
                          <HugeiconsIcon icon={CATEGORY_META[item.category]?.icon} className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-zinc-700">{item.description}</span>
                      </div>
                      <span className="text-xs text-zinc-400">{item.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category Filter Carousel */}
        <div className="overflow-hidden -my-2 py-2">
          <div ref={categoryEmblaRef}>
          <div className="flex touch-pan-y ml-0">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_META[c].icon;
              const isActive = selectedFilters.includes(c);
              return (
                <div key={c} className="flex-[0_0_auto] pl-3 sm:pl-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFilters(prev =>
                        prev.includes(c) ? prev.filter(f => f !== c) : [...prev, c]
                      );
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/20 scale-105'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <HugeiconsIcon icon={Icon} className={`w-4 h-4 ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`} />
                    <span className="whitespace-nowrap">{c}</span>
                  </button>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </div>

      {/* Trend Detail Sheet */}
      {viewMode !== 'day' && (
        <TrendDetailSheet
          isOpen={isTrendSheetOpen}
          onClose={() => setIsTrendSheetOpen(false)}
          expenses={expensesInView}
          currentDate={currentDate}
          viewMode={viewMode}
        />
      )}

      {/* Kategorien Detail Sheet */}
      <KategorienDetailSheet
        isOpen={isKategorienSheetOpen}
        onClose={() => setIsKategorienSheetOpen(false)}
        expenses={expensesInView}
        totalInView={totalInView}
      />

      {/* Total / Budget Detail Sheet */}
      <TotalDetailSheet
        isOpen={isTotalSheetOpen}
        onClose={() => setIsTotalSheetOpen(false)}
        totalInView={totalInView}
        avgPerDay={avgPerDay}
        previousPeriodData={previousPeriodData}
        viewMode={viewMode}
        budget={budget}
        expenses={expensesInView}
        currentDate={currentDate}
      />

      {/* Expenses List */}
      <div className="space-y-6 pb-8">
        {groupedFilteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 bg-white rounded-[2rem] border border-zinc-100 border-dashed">
            <HugeiconsIcon icon={Wallet02Icon} className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Keine Ausgaben gefunden.</p>
          </div>
        ) : (
          groupedFilteredExpenses.map(([dateStr, dayExpenses]) => (
            <div key={dateStr} className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2">
                {formatDateHeading(dateStr)}
              </h3>
              <div className="space-y-3">
                {dayExpenses.map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} onEdit={() => onEditExpense(expense)} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
