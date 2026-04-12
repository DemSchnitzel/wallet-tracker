import React, { useState, useMemo } from 'react';
import { format, parseISO, subMonths, addMonths, subWeeks, addWeeks, subDays, addDays, isSameWeek, getWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  ArrowLeft01Icon, ArrowRight01Icon, Wallet02Icon, ChartUpIcon, Search01Icon, Cancel01Icon, ArrowDown01Icon
} from '@hugeicons/core-free-icons';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExpenseCard } from '@/components/ExpenseCard';
import { Expense, Category, CATEGORIES } from '@/types';
import { CATEGORY_META, formatCurrency } from '@/lib/constants';

interface ExpenseOverviewTabProps {
  expenses: Expense[];
}

export const ExpenseOverviewTab = ({ expenses }: ExpenseOverviewTabProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const expensesInView = useMemo(() => {
    return expenses.filter(e => {
      const expenseDate = parseISO(e.date);
      if (viewMode === 'month') {
        return format(expenseDate, 'yyyy-MM') === format(currentDate, 'yyyy-MM');
      } else if (viewMode === 'week') {
        return isSameWeek(expenseDate, currentDate, { weekStartsOn: 1 });
      } else {
        return e.date === format(currentDate, 'yyyy-MM-dd');
      }
    });
  }, [expenses, currentDate, viewMode]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return { descriptions: [], tags: [] };
    const query = searchQuery.toLowerCase();
    
    const matchingDescriptions = Array.from(new Set(
      expenses
        .map(e => e.description)
        .filter(desc => desc.toLowerCase().includes(query))
    )).slice(0, 4);

    const matchingTags: { tag: string, category: Category }[] = [];
    CATEGORIES.forEach(c => {
      CATEGORY_META[c].tags.forEach(tag => {
        if (tag.toLowerCase().includes(query)) {
          matchingTags.push({ tag, category: c });
        }
      });
    });

    return { descriptions: matchingDescriptions, tags: matchingTags.slice(0, 4) };
  }, [searchQuery, expenses]);

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
      if (!groups[expense.date]) {
        groups[expense.date] = [];
      }
      groups[expense.date].push(expense);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredExpenses]);

  const totalInView = useMemo(() => {
    return expensesInView.reduce((sum, e) => sum + e.amount, 0);
  }, [expensesInView]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    expensesInView.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return totals;
  }, [expensesInView]);

  const topCategory = useMemo(() => {
    const entries = Object.entries(categoryTotals);
    if (entries.length === 0) return null;
    return entries.reduce((max, curr) => curr[1] > max[1] ? curr : max);
  }, [categoryTotals]);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
      {/* View Mode & Date Navigation */}
      <div className="flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" className="h-10 px-2 -ml-2 rounded-xl hover:bg-zinc-100 text-zinc-900 font-medium text-base flex items-center gap-2" />
          }>
            {viewMode === 'month' && 'Monatsübersicht'}
            {viewMode === 'week' && 'Wochenübersicht'}
            {viewMode === 'day' && 'Tagesübersicht'}
            <HugeiconsIcon icon={ArrowDown01Icon} className="w-4 h-4 text-zinc-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-2xl border-zinc-100 shadow-xl p-2 min-w-[200px]">
            <DropdownMenuItem onClick={() => setViewMode('month')} className="rounded-xl px-3 py-2.5 cursor-pointer">
              Monatsübersicht
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('week')} className="rounded-xl px-3 py-2.5 cursor-pointer">
              Wochenübersicht
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('day')} className="rounded-xl px-3 py-2.5 cursor-pointer">
              Tagesübersicht
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
              else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
              else setCurrentDate(subDays(currentDate, 1));
            }} 
            className="h-8 w-8 rounded-full hover:bg-zinc-100 text-zinc-500"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5" />
          </Button>
          <div className="text-center font-medium text-zinc-900 text-sm min-w-[90px]">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: de })}
            {viewMode === 'week' && `KW ${getWeek(currentDate, { weekStartsOn: 1 })} ${format(currentDate, 'yyyy')}`}
            {viewMode === 'day' && format(currentDate, 'dd. MMM yyyy', { locale: de })}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
              else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
              else setCurrentDate(addDays(currentDate, 1));
            }} 
            className="h-8 w-8 rounded-full hover:bg-zinc-100 text-zinc-500"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 text-white rounded-[2rem] p-6 shadow-lg shadow-zinc-900/20 flex flex-col justify-between min-h-[140px]">
          <div className="text-zinc-400 text-sm font-medium">Gesamtausgaben</div>
          <div className="text-3xl sm:text-4xl font-light tracking-tight mt-4">
            {formatCurrency(totalInView)}
          </div>
        </div>
        
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-zinc-100 flex flex-col justify-between min-h-[140px]">
          <div className="text-zinc-500 text-sm font-medium flex items-center gap-2">
            <HugeiconsIcon icon={ChartUpIcon} className="w-4 h-4 text-zinc-400" />
            Höchste Kategorie
          </div>
          <div className="mt-4">
            <div className="text-lg font-medium text-zinc-900 truncate">
              {topCategory ? topCategory[0] : '-'}
            </div>
            <div className="text-sm text-zinc-500 mt-1">
              {topCategory ? formatCurrency(topCategory[1]) : '0,00 €'}
            </div>
          </div>
        </div>
      </div>

      {/* Smart Search & Filter */}
      <div className="pt-2 space-y-4">
        {/* Search Input with Chips */}
        <div className="relative z-30">
          <div 
            className={`min-h-14 pl-12 pr-4 py-2 rounded-2xl bg-[#F6F6F7] border-none shadow-none transition-all flex items-center flex-wrap gap-2 ${
              isSearchFocused ? 'ring-4 ring-zinc-100' : ''
            }`}
          >
            <div className="absolute top-4 left-4 flex items-center pointer-events-none">
              <HugeiconsIcon icon={Search01Icon} className="w-5 h-5 text-zinc-400" />
            </div>
            
            {selectedFilters.map(filter => (
              <div key={filter} className="flex items-center gap-1.5 bg-zinc-100 text-zinc-800 px-3 py-1.5 rounded-xl text-sm font-medium">
                {CATEGORIES.includes(filter as Category) && (
                  <HugeiconsIcon icon={CATEGORY_META[filter as Category].icon} className="w-3.5 h-3.5 opacity-70" />
                )}
                <span>{filter}</span>
                <button 
                  onClick={() => setSelectedFilters(selectedFilters.filter(f => f !== filter))}
                  className="ml-1 text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                </button>
              </div>
            ))}

            <input
              type="text"
              placeholder={selectedFilters.length === 0 ? "Suchen nach Einträgen oder Kategorien..." : ""}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="flex-1 min-w-[140px] bg-transparent outline-none text-base text-zinc-900 py-1.5"
            />
          </div>
          
          {/* Search Suggestions Dropdown */}
          {isSearchFocused && searchQuery.trim() && (searchSuggestions.descriptions.length > 0 || searchSuggestions.tags.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              {searchSuggestions.tags.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-1.5">Vorschläge</div>
                  {searchSuggestions.tags.map(({ tag, category }) => (
                    <button
                      key={tag}
                      onClick={() => {
                        const formattedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
                        if (!selectedFilters.includes(formattedTag)) setSelectedFilters([...selectedFilters, formattedTag]);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 rounded-xl flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                          <HugeiconsIcon icon={CATEGORY_META[category].icon} className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-zinc-700">{tag.charAt(0).toUpperCase() + tag.slice(1)}</span>
                      </div>
                      <span className="text-xs text-zinc-400">{category}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchSuggestions.descriptions.length > 0 && (
                <div className={`p-2 ${searchSuggestions.tags.length > 0 ? 'border-t border-zinc-100' : ''}`}>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-1.5">Einträge</div>
                  {searchSuggestions.descriptions.map(desc => (
                    <button
                      key={desc}
                      onClick={() => {
                        if (!selectedFilters.includes(desc)) setSelectedFilters([...selectedFilters, desc]);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                        <HugeiconsIcon icon={Search01Icon} className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-zinc-700">{desc}</span>
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
                {format(parseISO(dateStr), 'dd. MMMM yyyy', { locale: de })}
              </h3>
              <div className="space-y-3">
                {dayExpenses.map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
