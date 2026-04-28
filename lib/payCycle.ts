import { addMonths, subMonths, format, setDate, getDaysInMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { Budget } from '@/types';

export interface PayCycle {
  start: Date;
  end: Date;
}

/**
 * Berechnet den Gehaltszyklus, in dem `date` liegt.
 * payDay 25, date = 10. Apr → { start: 25. Mär, end: 24. Apr }
 * payDay 25, date = 28. Apr → { start: 25. Apr, end: 24. Mai }
 */
export function getPayCycle(date: Date, payDay: number): PayCycle {
  const clampedDay = Math.min(payDay, getDaysInMonth(date));

  // Gehaltstag im aktuellen Kalendermonat
  const payDayThisMonth = setDate(date, clampedDay);

  let cycleStart: Date;
  if (date >= payDayThisMonth) {
    // date liegt nach/am Gehaltstag → Zyklus beginnt diesen Monat
    cycleStart = payDayThisMonth;
  } else {
    // date liegt vor dem Gehaltstag → Zyklus beginnt letzten Monat
    const prevMonth = subMonths(date, 1);
    const clampedPrev = Math.min(payDay, getDaysInMonth(prevMonth));
    cycleStart = setDate(prevMonth, clampedPrev);
  }

  // Zyklusende = ein Tag vor dem nächsten Gehaltstag
  const nextPayMonth = addMonths(cycleStart, 1);
  const clampedNext = Math.min(payDay, getDaysInMonth(nextPayMonth));
  const nextPayDay = setDate(nextPayMonth, clampedNext);
  const cycleEnd = new Date(nextPayDay);
  cycleEnd.setDate(cycleEnd.getDate() - 1);

  return { start: cycleStart, end: cycleEnd };
}

/** Gibt Zyklen-Navigation einen Zyklus zurück */
export function prevCycle(date: Date, payDay: number): Date {
  return subMonths(date, 1);
}

/** Gibt Zyklen-Navigation einen Zyklus vor */
export function nextCycle(date: Date, payDay: number): Date {
  return addMonths(date, 1);
}

/** Prüft ob `date` im aktuellen (heutigen) Zyklus liegt */
export function isCurrentCycle(date: Date, payDay: number): boolean {
  const today = new Date();
  const { start, end } = getPayCycle(today, payDay);
  return date >= start && date <= end;
}

/** Berechnet den Sparziel-Betrag (löst €/%-Modus auf) */
export function getSavingsGoalAmount(budget: Budget): number | null {
  if (budget.savingsGoal === null) return null;
  if (budget.savingsGoalMode === 'percent') {
    if (budget.monthlyIncome === null) return null;
    return Math.round(budget.monthlyIncome * (budget.savingsGoal / 100) * 100) / 100;
  }
  return budget.savingsGoal;
}

/**
 * Einheitliche Quelle für das verfügbare Budget:
 * - Wenn Einkommen gesetzt → income − savingsGoal (oder income wenn kein Sparziel)
 * - Sonst → monthlyAmount (manuell)
 */
export function getAvailableBudget(budget: Budget): number | null {
  if (budget.monthlyIncome !== null) {
    const savings = getSavingsGoalAmount(budget) ?? 0;
    return Math.round((budget.monthlyIncome - savings) * 100) / 100;
  }
  return budget.monthlyAmount;
}

/** Formatiert Zykluslabel: "25. Mär – 24. Apr" */
export function formatCycleLabel(start: Date, end: Date): string {
  const startYear = format(start, 'yyyy');
  const endYear = format(end, 'yyyy');
  const startStr = format(start, 'd. MMM', { locale: de });
  const endStr = format(end, 'd. MMM', { locale: de });
  if (startYear !== endYear) {
    return `${startStr} ${startYear} – ${endStr} ${endYear}`;
  }
  return `${startStr} – ${endStr}`;
}
