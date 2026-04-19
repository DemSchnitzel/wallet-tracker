import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { User02Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { Expense } from '@/types';
import { ExpenseInputTab } from '@/components/ExpenseInputTab';
import { ExpenseOverviewTab } from '@/components/ExpenseOverviewTab';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useBudget } from '@/lib/useBudget';

// Lazy-loaded: werden erst beim ersten Oeffnen geladen
const EditExpenseModal = lazy(() => import('@/components/EditExpenseModal').then(m => ({ default: m.EditExpenseModal })));
const SettingsModal = lazy(() => import('@/components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const ChangelogSheet = lazy(() => import('@/components/ChangelogSheet').then(m => ({ default: m.ChangelogSheet })));

const SEEN_VERSION_KEY = 'wallet_seen_version';

interface ChangelogEntry { type: 'new' | 'improved' | 'fixed'; text: string; }
interface ChangelogRelease { version: string; date: string; entries: ChangelogEntry[]; }

function useChangelog() {
  const [unread, setUnread] = useState(false);
  const [releases, setReleases] = useState<ChangelogRelease[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const [vRes, cRes] = await Promise.all([
          fetch('/version.json', { cache: 'no-store' }),
          fetch('/changelog.json', { cache: 'no-store' }),
        ]);
        if (!vRes.ok || !cRes.ok) return;
        const { version } = await vRes.json();
        const changelog: ChangelogRelease[] = await cRes.json();
        setReleases(changelog);

        const seen = localStorage.getItem(SEEN_VERSION_KEY);
        if (seen === null) {
          // Erstinstallation – still speichern, kein Badge
          localStorage.setItem(SEEN_VERSION_KEY, version);
        } else if (seen !== version) {
          setUnread(true);
          toast('App aktualisiert', {
            description: 'Schau was neu ist.',
            duration: 8000,
            action: { label: 'Was ist neu?', onClick: () => setUnread(u => { markSeen(version); return false as unknown as typeof u; }) },
          });
        }
      } catch {
        // Netzwerkfehler ignorieren
      }
    }
    init();
  }, []);

  function markSeen(version?: string) {
    if (version) {
      localStorage.setItem(SEEN_VERSION_KEY, version);
    } else {
      fetch('/version.json', { cache: 'no-store' })
        .then(r => r.json())
        .then(({ version: v }) => localStorage.setItem(SEEN_VERSION_KEY, v))
        .catch(() => {});
    }
    setUnread(false);
  }

  return { unread, releases, markSeen };
}

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

function useUpdateCheck() {
  useEffect(() => {
    let knownBuildTime: number | null = null;
    let toastShown = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function check() {
      // Nicht pollen wenn Tab versteckt ist
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/version.json', { cache: 'no-store' });
        if (!res.ok) return;
        const { buildTime } = await res.json();
        if (knownBuildTime === null) {
          knownBuildTime = buildTime;
        } else if (buildTime !== knownBuildTime && !toastShown) {
          toastShown = true;
          toast('Update verfügbar', {
            duration: Infinity,
            action: {
              label: 'Aktualisieren',
              onClick: () => window.location.reload(),
            },
          });
        }
      } catch {
        // Netzwerkfehler ignorieren
      }
    }

    function startPolling() {
      if (intervalId) return;
      intervalId = setInterval(check, 2 * 60 * 1000);
    }

    function stopPolling() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        check(); // sofort pruefen wenn Tab wieder aktiv wird
        startPolling();
      } else {
        stopPolling();
      }
    }

    check();
    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

export default function App() {
  useUpdateCheck();

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

  const { budget, setBudget } = useBudget();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState('eingabe');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const { unread, releases, markSeen } = useChangelog();

  // Debounced localStorage-Schreibvorgang: schreibt nur einmal nach 400ms Ruhe
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem('expenses', JSON.stringify(expenses));
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [expenses]);

  const handleAddExpense = useCallback((newExpense: Omit<Expense, 'id'>) => {
    setExpenses(prev => [...prev, { ...newExpense, id: crypto.randomUUID() }]);
    navigator.vibrate?.(10);
    toast.success('Ausgabe hinzugefügt');
  }, []);

  const handleEditExpense = useCallback((updated: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
    setEditingExpense(null);
    toast.success('Ausgabe gespeichert');
  }, []);

  const handleDeleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    setEditingExpense(null);
    toast.error('Ausgabe gelöscht', { duration: 3000 });
  }, []);

  const handleImport = useCallback((imported: Expense[], mode: 'merge' | 'replace') => {
    const migrated = migrateExpenses(imported);
    if (mode === 'replace') {
      setExpenses(migrated);
      toast.success(`${migrated.length} Ausgaben importiert`);
    } else {
      setExpenses(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const newOnes = migrated.filter(e => !existingIds.has(e.id));
        toast.success(`${newOnes.length} neue Ausgaben hinzugefügt`);
        return [...prev, ...newOnes];
      });
    }
  }, []);

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-[#FEFEFE] text-zinc-900 font-sans pb-24 md:pb-12 selection:bg-zinc-200">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <header className="pt-8 pb-4 sticky top-0 z-50 bg-[#FEFEFE]/80 backdrop-blur-xl">
          <div className="max-w-xl mx-auto px-4 flex items-center justify-between">
            <TabsList className="relative flex justify-start gap-8 bg-transparent p-0">
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

            <button
              onClick={() => setSettingsOpen(true)}
              className="relative w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm hover:bg-zinc-800 transition-colors"
            >
              <HugeiconsIcon icon={User02Icon} className="w-5 h-5 text-white" />
              {unread && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#FEFEFE]" />
              )}
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
              budget={budget}
            />
          </TabsContent>
        </main>
      </Tabs>

      <Suspense fallback={null}>
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          expenses={expenses}
          onImport={handleImport}
          budget={budget}
          setBudget={setBudget}
          changelogUnread={unread}
          onOpenChangelog={() => { setSettingsOpen(false); setChangelogOpen(true); markSeen(); }}
        />

        <ChangelogSheet
          isOpen={changelogOpen}
          onClose={() => setChangelogOpen(false)}
          releases={releases}
        />

        <EditExpenseModal
          expense={editingExpense}
          expenses={expenses}
          onSave={handleEditExpense}
          onDelete={handleDeleteExpense}
          onClose={() => setEditingExpense(null)}
        />
      </Suspense>

      <Toaster richColors position="top-center" />
    </div>
    </ErrorBoundary>
  );
}
