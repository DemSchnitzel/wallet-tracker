import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, subMonths, addMonths, subWeeks, addWeeks, subDays, addDays, isSameWeek, getWeek, isToday, isYesterday } from 'date-fns';
import { de } from 'date-fns/locale';
import useEmblaCarousel from 'embla-carousel-react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon, ArrowRight01Icon, Wallet02Icon, ChartUpIcon, Search01Icon, Cancel01Icon, ArrowDown01Icon
} from '@hugeicons/core-free-icons';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExpenseCard } from '@/components/ExpenseCard';
import { ExpenseTrendCard } from '@/components/ExpenseTrendCard';
import { Expense, Category, CATEGORIES } from '@/types';
import { CATEGORY_META, formatCurrency } from '@/lib/constants';
import { useDescriptionSuggestions } from '@/lib/useDescriptionSuggestions';

interface ExpenseOverviewTabProps {
  expenses: Expense[];
  onEditExpense: (expense: Expense) => void;
}

export const ExpenseOverviewTab = ({ expenses, onEditExpense }: ExpenseOverviewTabProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [donutShowAmounts, setDonutShowAmounts] = useState(false);

  // Secondary cards carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: false, skipSnaps: false, duration: 25 });
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveCard(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

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

    return { total: prevTotal, label };
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

const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    expensesInView.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({
        name,
        value,
        chartColor: CATEGORY_META[name as Category]?.chartColor ?? '#A1A1AA',
      }));
  }, [expensesInView]);

  // Delta for comparison card
  const delta = previousPeriodData ? totalInView - previousPeriodData.total : null;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
      {/* View Mode & Date Navigation */}
      <div className="flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" className="h-10 px-2 -ml-2 rounded-xl hover:bg-zinc-100 text-zinc-900 font-medium text-base flex items-center gap-2" />
          }>
            {viewMode === 'month' && 'Monatsansicht'}
            {viewMode === 'week' && 'Wochenansicht'}
            {viewMode === 'day' && 'Tagesansicht'}
            <HugeiconsIcon icon={ArrowDown01Icon} className="w-4 h-4 text-zinc-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-2xl border-zinc-100 shadow-xl p-2 min-w-[200px]">
            <DropdownMenuItem onClick={() => setViewMode('month')} className="rounded-xl px-3 py-2.5 cursor-pointer">Monatsansicht</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('week')} className="rounded-xl px-3 py-2.5 cursor-pointer">Wochenansicht</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('day')} className="rounded-xl px-3 py-2.5 cursor-pointer">Tagesansicht</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => {
            if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
            else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
            else setCurrentDate(subDays(currentDate, 1));
          }} className="h-8 w-8 rounded-full hover:bg-zinc-100 text-zinc-500">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5" />
          </Button>
          <div className="text-center font-medium text-zinc-900 text-sm min-w-[90px]">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: de })}
            {viewMode === 'week' && `KW ${getWeek(currentDate, { weekStartsOn: 1 })} ${format(currentDate, 'yyyy')}`}
            {viewMode === 'day' && format(currentDate, 'dd. MMM yyyy', { locale: de })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => {
            if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
            else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
            else setCurrentDate(addDays(currentDate, 1));
          }} className="h-8 w-8 rounded-full hover:bg-zinc-100 text-zinc-500">
            <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Summary Cards Carousel */}
      <div>
        <div className="overflow-hidden -mx-1 px-1 -mt-1 pt-1 -mb-6 pb-6" ref={emblaRef}>
          <div className="flex gap-3">

            {/* Card 1: Gesamtausgaben */}
            <div className="flex-[0_0_80%] bg-zinc-900 text-white rounded-[2rem] p-6 shadow-lg shadow-zinc-900/20 flex flex-col justify-between min-h-[120px]">
              <div className="text-zinc-400 text-sm font-medium flex items-center gap-2">
                <HugeiconsIcon icon={Wallet02Icon} className="w-4 h-4 text-zinc-500" />
                Gesamtausgaben
              </div>
              <div>
                <div className="text-4xl sm:text-5xl font-light tracking-tight mt-4">
                  {formatCurrency(totalInView)}
                </div>
                <div className={`text-xs font-medium mt-1.5 ${delta === null ? 'text-zinc-600' : delta < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {delta === null
                    ? 'Kein Vergleich'
                    : delta === 0
                    ? `Gleich wie ${previousPeriodData!.label.replace('als ', '')}`
                    : `${delta < 0 ? '↑' : '↓'} ${formatCurrency(Math.abs(delta))} ${delta < 0 ? 'weniger' : 'mehr'} ${previousPeriodData!.label}`}
                </div>
              </div>
            </div>

            {/* Card 2: Kategorien Donut */}
            <div className="flex-[0_0_80%] bg-white rounded-[2rem] p-5 shadow-sm border border-zinc-100 min-h-[120px]">
              <div className="text-zinc-500 text-sm font-medium flex items-center gap-2 mb-2">
                <HugeiconsIcon icon={ChartUpIcon} className="w-4 h-4 text-zinc-400" />
                Kategorien
              </div>
              {categoryData.length === 0 ? (
                <div className="text-sm text-zinc-400 mt-4">Keine Daten</div>
              ) : (
                <div className="flex items-center gap-3">
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
                    {/* Center label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-xs font-semibold text-zinc-700">{categoryData.length}</span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    {categoryData.slice(0, 4).map(entry => (
                      <div key={entry.name} className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.chartColor }} />
                        <span className="text-xs text-zinc-600 truncate flex-1">{entry.name}</span>
                        <button
                          onClick={() => setDonutShowAmounts(v => !v)}
                          className="text-xs font-medium text-zinc-400 shrink-0 tabular-nums transition-opacity active:opacity-50"
                        >
                          {donutShowAmounts
                            ? formatCurrency(entry.value)
                            : `${Math.round((entry.value / totalInView) * 100)}%`}
                        </button>
                      </div>
                    ))}
                    {categoryData.length > 4 && (
                      <div className="text-xs text-zinc-400">+{categoryData.length - 4} weitere</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Ausgaben-Trend (nur Monats- und Wochenansicht) */}
            {viewMode !== 'day' && (
              <ExpenseTrendCard expenses={expenses} currentDate={currentDate} viewMode={viewMode} />
            )}


          </div>
        </div>

        {/* Page Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {(viewMode === 'day' ? [0, 1] : [0, 1, 2]).map(i => (
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

            {selectedFilters.map(filter => (
              <div key={filter} className="flex items-center gap-1.5 bg-zinc-100 text-zinc-800 px-3 py-1.5 rounded-xl text-sm font-medium">
                {CATEGORIES.includes(filter as Category) && (
                  <HugeiconsIcon icon={CATEGORY_META[filter as Category].icon} className="w-3.5 h-3.5 opacity-70" />
                )}
                <span>{filter}</span>
                <button onClick={() => setSelectedFilters(selectedFilters.filter(f => f !== filter))} className="ml-1 text-zinc-400 hover:text-zinc-900 transition-colors">
                  <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                </button>
              </div>
            ))}

            <input
              type="text"
              placeholder={selectedFilters.length === 0 ? 'Suchen nach Einträgen oder Kategorien...' : ''}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="flex-1 min-w-[140px] bg-transparent outline-none text-base text-zinc-900 py-1.5"
            />
          </div>

          {isSearchFocused && searchQuery.trim() && (searchSuggestions.descriptions.length > 0 || searchSuggestions.tags.length > 0 || searchSuggestions.categories.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              {searchSuggestions.categories.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-1.5">Kategorien</div>
                  {searchSuggestions.categories.map(category => (
                    <button key={category} onClick={() => {
                      if (!selectedFilters.includes(category)) setSelectedFilters([...selectedFilters, category]);
                      setSearchQuery('');
                    }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 rounded-xl flex items-center gap-3 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                        <HugeiconsIcon icon={CATEGORY_META[category]?.icon} className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-zinc-700">{category}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchSuggestions.tags.length > 0 && (
                <div className={`p-2 ${searchSuggestions.categories.length > 0 ? 'border-t border-zinc-100' : ''}`}>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-1.5">Vorschläge</div>
                  {searchSuggestions.tags.map(({ tag, category }) => (
                    <button key={tag} onClick={() => {
                      const t = tag.charAt(0).toUpperCase() + tag.slice(1);
                      if (!selectedFilters.includes(t)) setSelectedFilters([...selectedFilters, t]);
                      setSearchQuery('');
                    }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 rounded-xl flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                          <HugeiconsIcon icon={CATEGORY_META[category]?.icon} className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-zinc-700">{tag.charAt(0).toUpperCase() + tag.slice(1)}</span>
                      </div>
                      <span className="text-xs text-zinc-400">{category}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchSuggestions.descriptions.length > 0 && (
                <div className={`p-2 ${searchSuggestions.tags.length > 0 || searchSuggestions.categories.length > 0 ? 'border-t border-zinc-100' : ''}`}>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-1.5">Einträge</div>
                  {searchSuggestions.descriptions.map(item => (
                    <button key={item.description} onClick={() => {
                      if (!selectedFilters.includes(item.description)) setSelectedFilters([...selectedFilters, item.description]);
                      setSearchQuery('');
                    }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 rounded-xl flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
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
      </div>

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
                {(() => {
                  const d = parseISO(dateStr);
                  if (isToday(d)) return 'Heute';
                  if (isYesterday(d)) return 'Gestern';
                  return format(d, 'dd. MMMM', { locale: de });
                })()}
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
