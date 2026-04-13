import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { Expense } from '@/types';
import { CATEGORY_META } from '@/lib/constants';
import { ExpenseInputTab } from '@/components/ExpenseInputTab';
import { ExpenseOverviewTab } from '@/components/ExpenseOverviewTab';
import { EditExpenseModal } from '@/components/EditExpenseModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Umbenannte Kategorien: alter Name → neuer Name
const CATEGORY_MIGRATIONS: Record<string, string> = {
  'Restaurant & Café': 'Restaurant & Imbiss',
};

function migrateExpenses(raw: Expense[]): Expense[] {
  return raw.map(e => {
    const migrated = CATEGORY_MIGRATIONS[e.category];
    return migrated ? { ...e, category: migrated as Expense['category'] } : e;
  });
}

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    if (!saved) return [];
    const parsed: Expense[] = JSON.parse(saved);
    const migrated = migrateExpenses(parsed);
    // Direkt zurückschreiben falls sich etwas geändert hat
    if (migrated.some((e, i) => e.category !== parsed[i].category)) {
      localStorage.setItem('expenses', JSON.stringify(migrated));
    }
    return migrated;
  });

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState('eingabe');

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  const handleAddExpense = (newExpense: Omit<Expense, 'id'>) => {
    setExpenses(prev => [...prev, { ...newExpense, id: crypto.randomUUID() }]);
    navigator.vibrate?.(10);
    toast.success('Ausgabe hinzugefügt');
  };

  const handleEditExpense = (updated: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
    setEditingExpense(null);
    toast.success('Ausgabe gespeichert');
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    setEditingExpense(null);
    toast.error('Ausgabe gelöscht', { duration: 3000 });
  };

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-[#FEFEFE] text-zinc-900 font-sans pb-24 md:pb-12 selection:bg-zinc-200">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            <ExpenseInputTab
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onEditExpense={setEditingExpense}
            />
          </TabsContent>

          <TabsContent value="uebersicht">
            <ExpenseOverviewTab
              expenses={expenses}
              onEditExpense={setEditingExpense}
            />
          </TabsContent>
        </main>
      </Tabs>

      <EditExpenseModal
        expense={editingExpense}
        expenses={expenses}
        onSave={handleEditExpense}
        onDelete={handleDeleteExpense}
        onClose={() => setEditingExpense(null)}
      />

      <Toaster richColors position="bottom-center" />
    </div>
    </ErrorBoundary>
  );
}
