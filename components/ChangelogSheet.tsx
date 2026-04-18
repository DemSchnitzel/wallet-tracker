import React from 'react';
import { BottomSheet } from '@/components/BottomSheet';

interface ChangelogEntry {
  type: 'new' | 'improved' | 'fixed';
  text: string;
}

interface ChangelogRelease {
  version: string;
  date: string;
  entries: ChangelogEntry[];
}

interface ChangelogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  releases: ChangelogRelease[];
}

const TYPE_META: Record<ChangelogEntry['type'], { label: string; color: string }> = {
  new:      { label: 'Neu',        color: 'bg-emerald-100 text-emerald-700' },
  improved: { label: 'Verbessert', color: 'bg-blue-100 text-blue-700' },
  fixed:    { label: 'Behoben',    color: 'bg-amber-100 text-amber-700' },
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function ChangelogSheet({ isOpen, onClose, releases }: ChangelogSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Was ist neu">
      <div className="space-y-6 pb-2">
        {releases.map((release) => (
          <div key={release.version}>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-sm font-semibold text-zinc-900">Version {release.version}</span>
              <span className="text-xs text-zinc-400">{formatDate(release.date)}</span>
            </div>
            <ul className="space-y-2">
              {release.entries.map((entry, i) => {
                const meta = TYPE_META[entry.type];
                return (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-sm text-zinc-600 leading-snug">{entry.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
