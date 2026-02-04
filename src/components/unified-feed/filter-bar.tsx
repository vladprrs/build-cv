'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { type HighlightType } from '@/app/actions';
import { ChevronDown, X } from 'lucide-react';
import { useFilters } from '@/contexts/filter-context';

const typeOptions: { value: HighlightType; label: string }[] = [
  { value: 'achievement', label: 'Achievement' },
  { value: 'project', label: 'Project' },
  { value: 'responsibility', label: 'Responsibility' },
  { value: 'education', label: 'Education' },
];

interface FilterBarProps {
  domains: string[];
  skills: string[];
}

export function FilterBar({ domains, skills }: FilterBarProps) {
  const {
    filters,
    toggleType,
    toggleDomain,
    toggleSkill,
    setOnlyWithMetrics,
    clearFilters,
    hasActiveFilters,
  } = useFilters();

  return (
    <div className="space-y-3">
      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded-md transition-colors">
              Type
              {filters.types.length > 0 && (
                <span className="px-1 py-0.5 bg-foreground/10 rounded text-[10px]">
                  {filters.types.length}
                </span>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2" align="start">
            <div className="space-y-1">
              {typeOptions.map((type) => (
                <label
                  key={type.value}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/50 rounded cursor-pointer"
                >
                  <Checkbox
                    checked={filters.types.includes(type.value)}
                    onCheckedChange={() => toggleType(type.value)}
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Domain Filter */}
        {domains.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded-md transition-colors">
                Domain
                {filters.domains.length > 0 && (
                  <span className="px-1 py-0.5 bg-foreground/10 rounded text-[10px]">
                    {filters.domains.length}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="max-h-48 overflow-y-auto space-y-1">
                {domains.map((domain) => (
                  <label
                    key={domain}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/50 rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={filters.domains.includes(domain)}
                      onCheckedChange={() => toggleDomain(domain)}
                    />
                    <span className="truncate">{domain}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Skills Filter */}
        {skills.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded-md transition-colors">
                Skills
                {filters.skills.length > 0 && (
                  <span className="px-1 py-0.5 bg-foreground/10 rounded text-[10px]">
                    {filters.skills.length}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="max-h-48 overflow-y-auto space-y-1">
                {skills.map((skill) => (
                  <label
                    key={skill}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/50 rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={filters.skills.includes(skill)}
                      onCheckedChange={() => toggleSkill(skill)}
                    />
                    <span className="truncate">{skill}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Metrics Toggle */}
        <button
          onClick={() => setOnlyWithMetrics(!filters.onlyWithMetrics)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-md transition-colors ${
            filters.onlyWithMetrics
              ? 'bg-foreground text-background border-foreground'
              : 'text-muted-foreground hover:text-foreground border-border/40'
          }`}
        >
          With Metrics
        </button>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.query && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted/50 rounded">
              &quot;{filters.query}&quot;
              <button onClick={() => {}} className="hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.types.map((type) => (
            <span key={type} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted/50 rounded capitalize">
              {type}
              <button onClick={() => toggleType(type)} className="hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {filters.domains.map((domain) => (
            <span key={domain} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-border/40 rounded">
              {domain}
              <button onClick={() => toggleDomain(domain)} className="hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {filters.skills.map((skill) => (
            <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-border/40 rounded">
              {skill}
              <button onClick={() => toggleSkill(skill)} className="hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
