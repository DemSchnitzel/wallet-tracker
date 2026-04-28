import React, { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, Upload01Icon, Cancel01Icon, RefreshIcon, Target01Icon, News01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Expense, Category, Budget, CATEGORIES } from '@/types';
import { getSavingsGoalAmount, getAvailableBudget } from '@/lib/payCycle';
import { formatCurrency } from '@/lib/constants';

interface BackupFile {
  version: number;
  exportedAt: string;
  expenses: Expense[];
}

// ─── CSV helpers ────────────────────────────────────────────────────────────

const CSV_TEMPLATE = [
  'datum,betrag,kategorie,beschreibung,↓ Kategorien kopieren',
  `15.03.2025,12.50,Restaurant & Imbiss,Mittagessen mit Kollegen,${CATEGORIES[0]}`,
  `20.03.2025,47.80,Supermarkt & Drogerie,Wocheneinkauf,${CATEGORIES[1]}`,
  ...CATEGORIES.slice(2).map(cat => `,,,,${cat}`),
].join('\n');

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

interface CsvParseResult {
  expenses: Expense[];
  errors: string[];
}

function parseCsvExpenses(text: string): CsvParseResult {
  const cleaned = text.replace(/^﻿/, '');
  const lines = cleaned.split(/\r?\n/);
  const dataLines = lines.filter(l => l.trim());

  if (dataLines.length < 2) {
    return { expenses: [], errors: ['Die Datei enthält keine Daten.'] };
  }

  const headerCols = parseCSVLine(dataLines[0]).map(h => h.toLowerCase());
  const expected = ['datum', 'betrag', 'kategorie', 'beschreibung'];
  if (!expected.every((h, i) => headerCols[i] === h)) {
    return {
      expenses: [],
      errors: [`Ungültige Kopfzeile. Erwartet: ${expected.join(', ')}`],
    };
  }

  const expenses: Expense[] = [];
  const errors: string[] = [];

  for (let i = 1; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 4) {
      errors.push(`Zeile ${i + 1}: Zu wenige Spalten (${cols.length} von 4)`);
      continue;
    }

    const [dateStr, amountStr, category, description] = cols;
    if (!dateStr.trim()) continue;

    const dateParts = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!dateParts) {
      errors.push(`Zeile ${i + 1}: Ungültiges Datum „${dateStr}" — Format: TT.MM.JJJJ`);
      continue;
    }
    const date = `${dateParts[3]}-${dateParts[2].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;

    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Zeile ${i + 1}: Ungültiger Betrag „${amountStr}"`);
      continue;
    }

    if (!(CATEGORIES as readonly string[]).includes(category)) {
      errors.push(`Zeile ${i + 1}: Unbekannte Kategorie „${category}"`);
      continue;
    }

    if (!description.trim()) {
      errors.push(`Zeile ${i + 1}: Beschreibung fehlt`);
      continue;
    }

    expenses.push({
      id: crypto.randomUUID(),
      date,
      amount: Math.round(amount * 100) / 100,
      category: category as Category,
      description: description.trim(),
    });
  }

  return { expenses, errors };
}

// ────────────────────────────────────────────────────────────────────────────

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  expenses: Expense[];
  onImport: (expenses: Expense[], mode: 'merge' | 'replace') => void;
  budget: Budget;
  setBudget: (patch: Partial<Budget>) => void;
  availableBudget: number | null;
  hasIncomePlan: boolean;
  changelogUnread?: boolean;
  onOpenChangelog?: () => void;
}

function isValidExpense(e: unknown): e is Expense {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.date === 'string' &&
    typeof obj.amount === 'number' &&
    typeof obj.description === 'string' &&
    typeof obj.category === 'string' &&
    (CATEGORIES as readonly string[]).includes(obj.category)
  );
}

// ─── Toggle-Switch ───────────────────────────────────────────────────────────

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${on ? 'bg-zinc-900' : 'bg-zinc-200'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

// ─── Finanzen-Sektion (Budget + Sparplan unified) ────────────────────────────

function FinanzSection({ budget, setBudget, availableBudget }: {
  budget: Budget;
  setBudget: (patch: Partial<Budget>) => void;
  availableBudget: number | null;
}) {
  const sparplanSaved = budget.monthlyIncome !== null;
  const [sparplanOpen, setSparplanOpen] = useState(sparplanSaved);

  const [budgetInput, setBudgetInput] = useState<string>(
    !sparplanSaved && budget.monthlyAmount !== null ? String(budget.monthlyAmount) : ''
  );
  const [payDayInput, setPayDayInput] = useState(budget.payDay !== null ? String(budget.payDay) : '');
  const [incomeInput, setIncomeInput] = useState(budget.monthlyIncome !== null ? String(budget.monthlyIncome) : '');
  const [savingsInput, setSavingsInput] = useState(budget.savingsGoal !== null ? String(budget.savingsGoal) : '');
  const [savingsMode, setSavingsMode] = useState<'amount' | 'percent'>(budget.savingsGoalMode);

  const isPercent = savingsMode === 'percent';

  // Liveberechnung während Eingabe (ohne zu speichern)
  const liveIncome = parseFloat(incomeInput.replace(',', '.')) || null;
  const liveSavings = parseFloat(savingsInput.replace(',', '.')) || null;
  const liveAvailable = liveIncome !== null
    ? liveIncome - (isPercent && liveSavings !== null ? liveIncome * (liveSavings / 100) : (liveSavings ?? 0))
    : null;

  const handleToggleSparplan = () => {
    if (sparplanOpen) {
      // Schließen: gespeicherte Daten ggf. löschen
      if (sparplanSaved) {
        setBudget({ payDay: null, monthlyIncome: null, savingsGoal: null, savingsGoalMode: 'amount', monthlyAmount: null });
      }
      setPayDayInput('');
      setIncomeInput('');
      setSavingsInput('');
      setSparplanOpen(false);
    } else {
      setSparplanOpen(true);
    }
  };

  const handleToggleSavingsMode = (mode: 'amount' | 'percent') => {
    if (mode === savingsMode) return;
    if (liveIncome !== null && liveSavings !== null) {
      if (mode === 'percent') {
        const pct = Math.round((liveSavings / liveIncome) * 100);
        setSavingsInput(String(pct));
      } else {
        const amt = Math.round(liveIncome * (liveSavings / 100) * 100) / 100;
        setSavingsInput(String(amt));
      }
    }
    setSavingsMode(mode);
  };

  const handleSaveBudget = () => {
    const trimmed = budgetInput.trim();
    if (trimmed === '' || trimmed === '0') {
      setBudget({ monthlyAmount: null });
      setBudgetInput('');
      toast.success('Budget entfernt');
      return;
    }
    const parsed = parseFloat(trimmed.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) { toast.error('Bitte einen gültigen Betrag eingeben'); return; }
    setBudget({ monthlyAmount: Math.round(parsed * 100) / 100 });
    toast.success('Budget gespeichert');
  };

  const handleSaveSparplan = () => {
    const payDay = payDayInput.trim() ? Math.min(28, Math.max(1, parseInt(payDayInput))) : null;
    const income = incomeInput.trim() ? parseFloat(incomeInput.replace(',', '.')) : null;
    const savings = savingsInput.trim() ? parseFloat(savingsInput.replace(',', '.')) : null;

    if (income === null || isNaN(income) || income <= 0) { toast.error('Bitte ein gültiges Einkommen eingeben'); return; }
    if (savings !== null && isNaN(savings)) { toast.error('Ungültiges Sparziel'); return; }
    if (savings !== null && isPercent && (savings < 0 || savings > 100)) { toast.error('Prozentsatz muss zwischen 0 und 100 liegen'); return; }

    setBudget({
      payDay,
      monthlyIncome: Math.round(income * 100) / 100,
      savingsGoal: savings !== null ? Math.round(savings * 100) / 100 : null,
      savingsGoalMode: savingsMode,
    });
    toast.success('Sparplan gespeichert');
  };

  return (
    <div className="space-y-3">

      {/* ── Toggle-Zeile ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-700">Sparplan</p>
          <p className="text-xs text-zinc-400">Einkommen & Sparziel festlegen</p>
        </div>
        <ToggleSwitch on={sparplanOpen} onToggle={handleToggleSparplan} />
      </div>

      {/* ── Sparplan-Felder (ausgeklappt) ── */}
      {sparplanOpen ? (
        <div className="space-y-3 pt-1">
          <div className="border-t border-zinc-200" />

          {/* Gehaltstag */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Gehaltstag</label>
            <div className="relative">
              <input
                type="number" inputMode="numeric" min="1" max="28" placeholder="z. B. 25"
                value={payDayInput} onChange={e => setPayDayInput(e.target.value)}
                className="w-full h-11 pl-4 pr-16 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 pointer-events-none">des Monats</span>
            </div>
          </div>

          {/* Nettoeinkommen */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Nettoeinkommen</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">€</span>
              <input
                type="number" inputMode="decimal" min="1" step="1" placeholder="z. B. 2800"
                value={incomeInput} onChange={e => setIncomeInput(e.target.value)}
                className="w-full h-11 pl-8 pr-4 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Sparziel */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500">Sparziel</label>
              <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
                {(['amount', 'percent'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleToggleSavingsMode(mode)}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                      savingsMode === mode
                        ? 'bg-zinc-900 text-white'
                        : 'bg-white text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    {mode === 'amount' ? '€' : '%'}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number" inputMode="decimal" min="0" step="1"
              placeholder={isPercent ? 'z. B. 15' : 'z. B. 400'}
              value={savingsInput} onChange={e => setSavingsInput(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            {/* Live-Umrechnungshinweis */}
            {liveIncome !== null && liveSavings !== null && liveSavings > 0 && (
              <p className="text-xs text-zinc-400 px-1">
                {isPercent
                  ? `= ${formatCurrency(liveIncome * (liveSavings / 100))} pro Zyklus`
                  : `= ${Math.round((liveSavings / liveIncome) * 100)} % des Einkommens`}
              </p>
            )}
          </div>

          {/* Verfügbares Budget (live read-only) */}
          {liveAvailable !== null && liveAvailable > 0 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 px-4 h-11">
              <span className="text-xs text-zinc-400">Verfügbares Budget</span>
              <span className="text-sm font-semibold text-zinc-900 tabular-nums">{formatCurrency(liveAvailable)}</span>
            </div>
          )}

          <Button onClick={handleSaveSparplan} className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium">
            <HugeiconsIcon icon={Target01Icon} className="w-4 h-4 mr-2" />
            Sparplan speichern
          </Button>
        </div>
      ) : (
        /* ── Manuelles Budget (wenn kein Sparplan) ── */
        <div className="space-y-3 pt-1">
          <div className="border-t border-zinc-200" />
          <p className="text-xs text-zinc-400">Oder lege ein monatliches Budget manuell fest.</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">€</span>
              <input
                type="number" inputMode="decimal" min="1" step="1" placeholder="z. B. 1000"
                value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveBudget()}
                className="w-full h-11 pl-8 pr-4 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <Button onClick={handleSaveBudget} className="h-11 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium shrink-0">
              <HugeiconsIcon icon={Target01Icon} className="w-4 h-4 mr-2" />
              Speichern
            </Button>
          </div>
          {budget.monthlyAmount !== null && (
            <button
              onClick={() => { setBudget({ monthlyAmount: null }); setBudgetInput(''); toast.success('Budget entfernt'); }}
              className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              Budget entfernen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export const SettingsModal = ({
  open,
  onClose,
  expenses,
  onImport,
  budget,
  setBudget,
  availableBudget,
  hasIncomePlan,
  changelogUnread = false,
  onOpenChangelog,
}: SettingsModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<Expense[] | null>(null);

  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingCsvImport, setPendingCsvImport] = useState<Expense[] | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  const handleExport = () => {
    const backup: BackupFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      expenses,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Export erfolgreich (${expenses.length} Ausgaben)`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        if (!raw || typeof raw !== 'object' || raw.version !== 1 || !Array.isArray(raw.expenses)) {
          toast.error('Ungültige Backup-Datei'); return;
        }
        if (!raw.expenses.every(isValidExpense)) {
          toast.error('Backup enthält ungültige Einträge'); return;
        }
        setPendingImport(raw.expenses as Expense[]);
      } catch {
        toast.error('Datei konnte nicht gelesen werden');
      }
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = (mode: 'merge' | 'replace') => {
    if (!pendingImport) return;
    onImport(pendingImport, mode);
    setPendingImport(null);
    onClose();
  };

  const handleTemplateDownload = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wallet-tracker-vorlage.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Vorlage heruntergeladen');
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { expenses, errors } = parseCsvExpenses(text);
      setCsvErrors(errors);
      if (expenses.length === 0 && errors.length > 0) {
        toast.error('Keine gültigen Einträge gefunden'); return;
      }
      setPendingCsvImport(expenses);
      if (errors.length > 0) toast.warning(`${errors.length} Zeile(n) übersprungen`);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleCsvImportConfirm = (mode: 'merge' | 'replace') => {
    if (!pendingCsvImport) return;
    onImport(pendingCsvImport, mode);
    setPendingCsvImport(null);
    setCsvErrors([]);
    onClose();
  };

  const handleClose = () => {
    setPendingImport(null);
    setPendingCsvImport(null);
    setCsvErrors([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg rounded-t-[2rem] sm:rounded-[2rem] border-zinc-100 p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-medium tracking-tight">Einstellungen</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-5">

          {/* ── FINANZEN ── */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-2 px-1">Finanzen</p>
            <section className="bg-zinc-50 rounded-2xl p-4">
              <FinanzSection budget={budget} setBudget={setBudget} availableBudget={availableBudget} />
            </section>
          </div>

          {/* ── DATEN ── */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-2 px-1">Daten</p>
            <section className="bg-zinc-50 rounded-2xl p-4 space-y-4">

              {/* Export */}
              <div>
                <p className="text-xs text-zinc-500 font-medium mb-2">Exportieren</p>
                <Button
                  onClick={handleExport}
                  disabled={expenses.length === 0}
                  className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 mr-2" />
                  JSON herunterladen ({expenses.length})
                </Button>
              </div>

              <div className="border-t border-zinc-200" />

              {/* JSON Import */}
              <div>
                {pendingImport ? (
                  <div className="space-y-2">
                    <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-600">
                      <span className="font-medium text-zinc-900">{pendingImport.length} Ausgaben</span> gefunden — wie fortfahren?
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleImportConfirm('merge')} variant="outline" className="h-11 rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
                        Zusammenführen
                      </Button>
                      <Button onClick={() => handleImportConfirm('replace')} className="h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium">
                        Alles ersetzen
                      </Button>
                    </div>
                    <Button onClick={() => setPendingImport(null)} variant="ghost" className="w-full h-9 rounded-xl text-xs text-zinc-400 hover:text-zinc-600">
                      <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5 mr-1.5" />
                      Abbrechen
                    </Button>
                  </div>
                ) : (
                  <>
                    <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileChange} className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-11 rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
                      <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4 mr-2" />
                      JSON-Backup hochladen
                    </Button>
                  </>
                )}
              </div>

              <div className="border-t border-zinc-200" />

              {/* CSV Import */}
              <div>
                <p className="text-xs text-zinc-500 font-medium mb-1">CSV importieren</p>
                <p className="text-xs text-zinc-400 mb-2">Vorlage herunterladen, in Google Sheets befüllen und hochladen.</p>
                <Button onClick={handleTemplateDownload} variant="outline" className="w-full h-11 rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100 mb-2">
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 mr-2" />
                  CSV-Vorlage herunterladen
                </Button>

                {csvErrors.length > 0 && (
                  <div className="mb-2 bg-amber-50 border border-amber-100 rounded-xl p-3 max-h-28 overflow-y-auto">
                    <p className="text-xs font-medium text-amber-700 mb-1">{csvErrors.length} übersprungene Zeile(n):</p>
                    {csvErrors.map((err, i) => <p key={i} className="text-xs text-amber-600">{err}</p>)}
                  </div>
                )}

                {pendingCsvImport ? (
                  <div className="space-y-2">
                    <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-600">
                      <span className="font-medium text-zinc-900">{pendingCsvImport.length} Ausgaben</span> gefunden — wie fortfahren?
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleCsvImportConfirm('merge')} variant="outline" className="h-11 rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
                        Zusammenführen
                      </Button>
                      <Button onClick={() => handleCsvImportConfirm('replace')} className="h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium">
                        Alles ersetzen
                      </Button>
                    </div>
                    <Button onClick={() => { setPendingCsvImport(null); setCsvErrors([]); }} variant="ghost" className="w-full h-9 rounded-xl text-xs text-zinc-400 hover:text-zinc-600">
                      <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5 mr-1.5" />
                      Abbrechen
                    </Button>
                  </div>
                ) : (
                  <>
                    <input ref={csvFileInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} className="hidden" />
                    <Button onClick={() => csvFileInputRef.current?.click()} variant="outline" className="w-full h-11 rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
                      <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4 mr-2" />
                      CSV hochladen
                    </Button>
                  </>
                )}
              </div>

            </section>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-6 pt-1 flex items-center justify-between">
          {onOpenChangelog ? (
            <button onClick={onOpenChangelog} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
              <span className="relative flex items-center">
                <HugeiconsIcon icon={News01Icon} className="w-3.5 h-3.5" />
                {changelogUnread && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />}
              </span>
              Was ist neu?
            </button>
          ) : <span />}
          <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" />
            App aktualisieren
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
