import React, { useState, useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { FloppyDiskIcon, Delete02Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Expense } from '@/types';

interface EditExpenseModalProps {
  expense: Expense | null;
  expenses: Expense[];
  onSave: (updated: Expense) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const EditExpenseModal = ({
  expense,
  expenses,
  onSave,
  onDelete,
  onClose,
}: EditExpenseModalProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [avoidable, setAvoidable] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset states when a different expense is opened
  useEffect(() => {
    setConfirmDelete(false);
    setAvoidable(expense?.avoidable ?? false);
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [expense?.id]);

  if (!expense) return null;

  const handleSave = (values: Omit<Expense, 'id'>) => {
    onSave({ ...values, id: expense.id, avoidable });
  };

  const handleDeleteClick = () => {
    if (confirmDelete) {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      onDelete(expense.id);
    } else {
      setConfirmDelete(true);
      resetTimer.current = setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <Dialog open={!!expense} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-t-[2rem] sm:rounded-[2rem] border-zinc-100 p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-medium tracking-tight">Ausgabe bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 overflow-y-auto max-h-[70vh]">
          <ExpenseForm
            key={expense.id}
            initialValues={{
              date: expense.date,
              amount: expense.amount,
              category: expense.category,
              description: expense.description,
            }}
            expenses={expenses}
            onSubmit={handleSave}
            submitLabel={
              <>
                <HugeiconsIcon icon={FloppyDiskIcon} className="w-5 h-5 mr-2" />
                Speichern
              </>
            }
          />
        </div>

        {/* Avoidable Toggle */}
        <div className="px-6 pb-4">
          <button
            type="button"
            onClick={() => setAvoidable(v => !v)}
            className={`w-full h-12 rounded-2xl text-sm font-medium flex items-center justify-between px-4 transition-all ${
              avoidable
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-zinc-50 text-zinc-400 border border-transparent hover:bg-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4" />
              Hätte ich vermeiden können
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              avoidable ? 'bg-amber-500 border-amber-500' : 'border-zinc-300'
            }`}>
              {avoidable && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        </div>

        {/* Delete Section */}
        <div className="px-6 pt-2 pb-6">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDeleteClick}
            className={`w-full h-12 rounded-2xl text-sm font-medium transition-all ${
              confirmDelete
                ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                : 'text-zinc-400 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4 mr-2" />
            {confirmDelete ? 'Wirklich löschen?' : 'Ausgabe löschen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
