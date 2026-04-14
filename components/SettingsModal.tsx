import React, { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, Upload01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Expense } from '@/types';
import { CATEGORIES } from '@/types';

interface BackupFile {
  version: number;
  exportedAt: string;
  expenses: Expense[];
}

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

  const handleClose = () => {
    setPendingImport(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg rounded-[2rem] border-zinc-100 p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-medium tracking-tight">Einstellungen</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-3">

          {/* Export */}
          <section className="bg-zinc-50 rounded-2xl p-4">
            <p className="text-sm font-medium text-zinc-700 mb-1">Daten exportieren</p>
            <p className="text-xs text-zinc-400 mb-3">
              Alle {expenses.length} Ausgaben als JSON-Backup herunterladen.
            </p>
            <Button
              onClick={handleExport}
              disabled={expenses.length === 0}
              className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium"
            >
              <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 mr-2" />
              Exportieren
            </Button>
          </section>

          {/* Import */}
          <section className="bg-zinc-50 rounded-2xl p-4">
            <p className="text-sm font-medium text-zinc-700 mb-1">Daten importieren</p>
            <p className="text-xs text-zinc-400 mb-3">
              Eine zuvor exportierte Backup-Datei (.json) einlesen.
            </p>

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
                  Datei wählen
                </Button>
              </>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
