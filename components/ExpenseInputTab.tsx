import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import useEmblaCarousel from 'embla-carousel-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Calendar01Icon } from '@hugeicons/core-free-icons';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExpenseCard } from '@/components/ExpenseCard';
import { Expense, Category, CATEGORIES } from '@/types';
import { CATEGORY_META } from '@/lib/constants';

interface ExpenseInputTabProps {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
}

export const ExpenseInputTab = ({ expenses, onAddExpense }: ExpenseInputTabProps) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Supermarkt & Drogerie');
  const [description, setDescription] = useState('');
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    dragFree: true,
  });

  useEffect(() => {
    if (emblaApi && category) {
      const index = CATEGORIES.indexOf(category);
      if (index !== -1) {
        emblaApi.scrollTo(index);
      }
    }
  }, [emblaApi, category]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount || '0', 10) / 100;
    if (parsedAmount <= 0) return;

    onAddExpense({
      date,
      amount: parsedAmount,
      category,
      description
    });
    
    setAmount('');
    setDescription('');
  };

  const recentExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [expenses]);

  const descriptionSuggestions = useMemo(() => {
    if (!description.trim()) return { descriptions: [], tags: [] };
    const query = description.toLowerCase();
    
    const matchingDescriptions = expenses
      .filter(e => e.description.toLowerCase().includes(query))
      .reduce((acc, curr) => {
        if (!acc.find(item => item.description === curr.description)) {
          acc.push({ description: curr.description, category: curr.category });
        }
        return acc;
      }, [] as {description: string, category: Category}[])
      .slice(0, 4);

    const matchingTags: { tag: string, category: Category }[] = [];
    CATEGORIES.forEach(c => {
      CATEGORY_META[c].tags.forEach(tag => {
        if (tag.toLowerCase().includes(query)) {
          matchingTags.push({ tag, category: c });
        }
      });
    });

    return { descriptions: matchingDescriptions, tags: matchingTags.slice(0, 4) };
  }, [description, expenses]);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
      <form onSubmit={handleAddExpense} className="space-y-6">
        {/* Amount - Huge Input */}
        <div className="flex flex-col items-center justify-center pt-4 pb-2">
          <div className="relative w-full flex justify-center items-center h-24">
            <div className={`text-6xl sm:text-7xl font-medium tracking-tighter flex items-baseline gap-2 ${amount ? 'text-zinc-900' : 'text-zinc-300 pointer-events-none'}`}>
              <span>{amount ? (parseInt(amount, 10) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</span>
              <span className="text-4xl sm:text-5xl font-medium text-zinc-400">€</span>
            </div>
            <input 
              id="amount" 
              type="number" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                const cleanVal = val.replace(/^0+/, '');
                if (cleanVal.length <= 7) setAmount(cleanVal);
              }}
              required
              autoFocus
              className="absolute inset-0 w-full h-full opacity-0 cursor-text"
            />
          </div>
        </div>

        {/* Category Chips */}
        <div>
          <div ref={emblaRef} className="overflow-hidden pt-1 pl-1 pr-1">
            <div className="flex touch-pan-y pb-2">
              {CATEGORIES.map((c, index) => {
                const Icon = CATEGORY_META[c].icon;
                const isActive = category === c;
                return (
                  <div 
                    key={c} 
                    className={`flex-[0_0_auto] ${index === 0 ? '' : 'pl-3 sm:pl-4'}`}
                  >
                    <button
                      data-category={c}
                      type="button"
                      onClick={() => {
                        setCategory(c);
                        emblaApi?.scrollTo(index);
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

        <div className="space-y-4">
          <div className="relative z-40">
            <Input 
              id="description" 
              placeholder="Wofür war das? (z.B. Rewe, Kino...)" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={() => setIsDescriptionFocused(true)}
              onBlur={() => setTimeout(() => setIsDescriptionFocused(false), 200)}
              required
              autoComplete="off"
              className="h-14 rounded-2xl bg-[#F6F6F7] border-none shadow-none focus-visible:ring-4 focus-visible:ring-zinc-100 transition-all text-base px-5"
            />
            {/* Description Suggestions Dropdown */}
            {isDescriptionFocused && description.trim() && (descriptionSuggestions.descriptions.length > 0 || descriptionSuggestions.tags.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                {descriptionSuggestions.tags.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-1.5">Vorschläge</div>
                    {descriptionSuggestions.tags.map(({ tag, category }) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const formattedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
                          setDescription(formattedTag);
                          setCategory(category);
                          setIsDescriptionFocused(false);
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
                {descriptionSuggestions.descriptions.length > 0 && (
                  <div className={`p-2 ${descriptionSuggestions.tags.length > 0 ? 'border-t border-zinc-100' : ''}`}>
                    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-1.5">Bisherige Einträge</div>
                    {descriptionSuggestions.descriptions.map(item => (
                      <button
                        key={item.description}
                        type="button"
                        onClick={() => {
                          setDescription(item.description);
                          setCategory(item.category);
                          setIsDescriptionFocused(false);
                        }}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 rounded-xl flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                            <HugeiconsIcon icon={CATEGORY_META[item.category].icon} className="w-4 h-4" />
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
          <div className="relative">
            <Popover>
              <PopoverTrigger render={
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full h-14 rounded-2xl bg-[#F6F6F7] border-none shadow-none hover:bg-[#EBEBEF] hover:text-zinc-900 justify-start text-left font-normal text-base px-5 transition-all",
                    !date && "text-muted-foreground"
                  )}
                />
              }>
                <HugeiconsIcon icon={Calendar01Icon} className="mr-3 h-5 w-5 text-zinc-500" />
                {date ? format(parseISO(date), "PPP", { locale: de }) : <span>Datum auswählen</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl border-zinc-100 shadow-xl" align="start">
                <Calendar
                  mode="single"
                  selected={parseISO(date)}
                  onSelect={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
                  initialFocus
                  locale={de}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full h-14 text-base font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl shadow-lg shadow-zinc-900/20 transition-all active:scale-[0.98]">
          <HugeiconsIcon icon={Add01Icon} className="w-5 h-5 mr-2" />
          Hinzufügen
        </Button>
      </form>

      {/* Recent Entries Feedback */}
      {recentExpenses.length > 0 && (
        <div className="space-y-4 px-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Zuletzt hinzugefügt</h3>
          <div className="space-y-3">
            {recentExpenses.map(expense => (
              <ExpenseCard key={expense.id} expense={expense} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
