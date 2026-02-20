'use client';

import { useFilters } from '@/contexts/filter-context';

interface ResultsHeaderProps {
  totalHighlights: number;
  filteredCount: number;
}

export function ResultsHeader({
  totalHighlights,
  filteredCount,
}: ResultsHeaderProps) {
  const { hasActiveFilters } = useFilters();

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/20">
      <p className="text-xs text-muted-foreground">
        {hasActiveFilters ? (
          <>
            <span className="text-foreground">{filteredCount}</span> of {totalHighlights}
          </>
        ) : (
          <>{totalHighlights} highlights</>
        )}
      </p>
    </div>
  );
}
