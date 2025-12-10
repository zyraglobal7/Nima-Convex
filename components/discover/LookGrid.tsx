'use client';

import { useMemo } from 'react';
import { LookCard } from './LookCard';
import { DateGroupHeader } from './DateGroupHeader';
import type { Look } from '@/lib/mock-data';
import { groupLooksByDate } from '@/lib/mock-data';

interface LookGridProps {
  looks: Look[];
  showDateGroups?: boolean;
}

export function LookGrid({ looks, showDateGroups = true }: LookGridProps) {
  const groupedLooks = useMemo(() => {
    if (!showDateGroups) {
      return new Map([['All', looks]]);
    }
    return groupLooksByDate(looks);
  }, [looks, showDateGroups]);

  // Order of date groups
  const groupOrder = ['Today', 'Yesterday', 'Last 7 Days', 'Earlier'];

  // Sort groups by order
  const sortedGroups = [...groupedLooks.entries()].sort((a, b) => {
    const indexA = groupOrder.indexOf(a[0]);
    const indexB = groupOrder.indexOf(b[0]);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  let globalIndex = 0;

  return (
    <div className="w-full">
      {sortedGroups.map(([groupLabel, groupLooks], groupIndex) => (
        <div key={groupLabel} className="mb-6">
          {/* Date group header */}
          {showDateGroups && groupLabel !== 'All' && (
            <DateGroupHeader label={groupLabel} index={groupIndex} />
          )}

          {/* Masonry grid */}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
            {groupLooks.map((look) => {
              const cardIndex = globalIndex++;
              return <LookCard key={look.id} look={look} index={cardIndex} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

