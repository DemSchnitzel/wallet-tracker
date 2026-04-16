import React, { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, Upload01Icon, Cancel01Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Expense, Category } from '@/types';
import { CATEGORIES } from '@/types';

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
  const cleaned = text.replace(/^\uFEFF/, ''); // strip BOM
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

    // skip reference-only rows (empty datum = category reference column)
    if (!dateStr.trim()) continue;

    // date: DD.MM.YYYY
    const dateParts = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!dateParts) {
      errors.push(`Zeile ${i + 1}: Ungültiges Datum „${dateStr}" — Format: TT.MM.JJJJ`);
      continue;
    }
    const date = `${dateParts[3]}-${dateParts[2].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;

    // amount: accept both comma and dot as decimal separator
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Zeile ${i + 1}: Ungültiger Betrag „${amountStr}"`);
      continue;
    }

    // category
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

export const SettingsModal = ({
  open,
  onClose,
  expenses,
  onImport,
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

    // Reset input so the same file can be re-selected if needed
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);

        if (!raw || typeof raw !== 'object' || raw.version !== 1 || !Array.isArray(raw.expenses)) {
          toast.error('Ungültige Backup-Datei');
          return;
        }

        const valid = raw.expenses.every(isValidExpense);
        if (!valid) {
          toast.error('Backup enthält ungültige Einträge');
          return;
        }

        setPendingImport(raw.expenses as Expense[]);
      } catch {
        toast.error('Datei konnte nicht gelesen werden');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = (mode: 'merge' | 'replace') => {
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
        toast.error('Keine gültigen Einträge gefunden');
        return;
      }

      setPendingCsvImport(expenses);
      if (errors.length > 0) {
        toast.warning(`${errors.length} Zeile(n) übersprungen`);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleCsvImport = (mode: 'merge' | 'replace') => {
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
      <DialogContent className="max-w-lg rounded-[2rem] border-zinc-100 p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-medium tracking-tight">Einstellungen</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-3">

          {/* ── Backup ── */}
          <section className="bg-zinc-50 rounded-2xl p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-700 mb-0.5">Backup</p>
              <p className="text-xs text-zinc-400">Daten sichern oder eine Backup-Datei wiederherstellen.</p>
            </div>

            {/* Export */}
            <div>
              <p className="text-xs text-zinc-500 font-medium mb-2">Exportieren</p>
              <Button
                onClick={handleExport}
                disabled={expenses.length === 0}
                className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium"
              >
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 mr-2" />
                Als JSON herunterladen ({expenses.length})
              </Button>
            </div>

            <div className="border-t border-zinc-200" />

            {/* JSON Import */}
            <div>
              <p className="text-xs text-zinc-500 font-medium mb-2">Importieren</p>
              {pendingImport ? (
                <div className="space-y-2">
                  <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-600">
                    <span className="font-medium text-zinc-900">{pendingImport.length} Ausgaben</span> gefunden — wie fortfahren?
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleImport('merge')}
                      variant="outline"
                      className="h-11 rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      Zusammenführen
                    </Button>
                    <Button
                      onClick={() => handleImport('replace')}
                      className="h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium"
                    >
                      Alles ersetzen
                    </Button>
                  </div>
                  <Button
                    onClick={() => setPendingImport(null)}
                    variant="ghost"
                    className="w-full h-9 rounded-xl text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5 mr-1.5" />
                    Abbrechen
                  </Button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full h-11 rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4 mr-2" />
                    JSON-Backup laden
                  </Button>
                </>
              )}
            </div>
          </section>

          {/* ── CSV-Import ── */}
          <section className="bg-zinc-50 rounded-2xl p-4">
            <div className="mb-3">
              <p className="text-sm font-medium text-zinc-700 mb-0.5">CSV-Import</p>
              <p className="text-xs text-zinc-400">
                Vorlage herunterladen, in Google Sheets befüllen und hier hochladen.
              </p>
            </div>

            {/* Template download */}
            <div className="mb-2">
              <Button
                onClick={handleTemplateDownload}
                variant="outline"
                className="w-full h-11 rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 mr-2" />
                CSV Vorlage herunterladen
              </Button>
            </div>

            {/* CSV errors */}
            {csvErrors.length > 0 && (
              <div className="mb-2 bg-amber-50 border border-amber-100 rounded-xl p-3 max-h-28 overflow-y-auto">
                <p className="text-xs font-medium text-amber-700 mb-1">{csvErrors.length} übersprungene Zeile(n):</p>
                {csvErrors.map((err, i) => (
                  <p key={i} className="text-xs text-amber-600">{err}</p>
                ))}
              </div>
            )}

            {pendingCsvImport ? (
              <div className="space-y-2">
                <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-600">
                  <span className="font-medium text-zinc-900">{pendingCsvImport.length} Ausgaben</span> gefunden — wie fortfahren?
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleCsvImport('merge')}
                    variant="outline"
                    className="h-11 rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    Zusammenführen
                  </Button>
                  <Button
                    onClick={() => handleCsvImport('replace')}
                    className="h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium"
                  >
                    Alles ersetzen
                  </Button>
                </div>
                <Button
                  onClick={() => { setPendingCsvImport(null); setCsvErrors([]); }}
                  variant="ghost"
                  className="w-full h-9 rounded-xl text-xs text-zinc-400 hover:text-zinc-600"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5 mr-1.5" />
                  Abbrechen
                </Button>
              </div>
            ) : (
              <>
                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                />
                <Button
                  onClick={() => csvFileInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-11 rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4 mr-2" />
                  CSV hochladen
                </Button>
              </>
            )}
          </section>

          {/* ── App aktualisieren ── */}
          <section className="bg-zinc-50 rounded-2xl p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-zinc-700 mb-0.5">App aktualisieren</p>
              <p className="text-xs text-zinc-400">Neueste Version laden und App neu starten.</p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full h-11 rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 mr-2" />
              Jetzt aktualisieren
            </Button>
          </section>

        </div>
      </DialogContent>
    </Dialog>
  );
};
