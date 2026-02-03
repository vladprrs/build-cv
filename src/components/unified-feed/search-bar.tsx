'use client';

import { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder="Search highlights..."
        value={filters.query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 pr-20"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {filters.query && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
    </div>
  );
}
