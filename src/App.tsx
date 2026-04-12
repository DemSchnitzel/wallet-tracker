import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon } from '@hugeicons/core-free-icons';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Expense } from '@/types';
import { ExpenseInputTab } from '@/components/ExpenseInputTab';
import { ExpenseOverviewTab } from '@/components/ExpenseOverviewTab';

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  const [activeTab, setActiveTab] = useState('eingabe');

  const handleAddExpense = (newExpense: Omit<Expense, 'id'>) => {
    setExpenses([...expenses, { ...newExpense, id: crypto.randomUUID() }]);
  };

  return (
    <div className="min-h-screen bg-[#FEFEFE] text-zinc-900 font-sans pb-24 md:pb-12 selection:bg-zinc-200">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Header */}
        <header className="pt-8 pb-4 sticky top-0 z-50 bg-[#FEFEFE]/80 backdrop-blur-xl">
          <div className="max-w-xl mx-auto px-6 flex items-center justify-between">
            <TabsList className="relative flex justify-start gap-4 bg-transparent p-0">
              <TabsTrigger 
                value="eingabe" 
                className="text-xl font-normal tracking-tight text-zinc-400 hover:text-zinc-600 data-active:text-zinc-900 data-active:bg-transparent data-active:shadow-none transition-colors px-0 py-2"
              >
                Eingabe
              </TabsTrigger>
              <TabsTrigger 
                value="uebersicht" 
                className="text-xl font-normal tracking-tight text-zinc-400 hover:text-zinc-600 data-active:text-zinc-900 data-active:bg-transparent data-active:shadow-none transition-colors px-0 py-2"
              >
                Übersicht
              </TabsTrigger>
            </TabsList>
            
            <button className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm hover:bg-zinc-800 transition-colors">
              <HugeiconsIcon icon={Settings02Icon} className="w-5 h-5 text-white" />
            </button>
          </div>
        </header>

        <main className="w-full max-w-xl mx-auto px-4 mt-6">
          <TabsContent value="eingabe">
            <ExpenseInputTab expenses={expenses} onAddExpense={handleAddExpense} />
          </TabsContent>

          <TabsContent value="uebersicht">
            <ExpenseOverviewTab expenses={expenses} />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}
