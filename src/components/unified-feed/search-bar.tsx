'use client';

import { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useFilters } from '@/contexts/filter-context';

interface SearchBarProps {
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchBar({ searchInputRef }: SearchBarProps) {
  const { filters, setQuery } = useFilters();
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef || internalRef;

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search highlights..."
        value={filters.query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full h-10 pl-10 pr-16 bg-transparent border-b border-border/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {filters.query && (
          <button
            onClick={() => setQuery('')}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border/40 bg-muted/30 px-1.5 font-mono text-[10px] text-muted-foreground/60">
          ⌘K
        </kbd>
      </div>
    </div>
  );
}
