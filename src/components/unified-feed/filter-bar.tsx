'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { type HighlightType } from '@/app/actions';
import { Filter, BarChart3, X } from 'lucide-react';
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
      {/* Filter Buttons Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Type
              {filters.types.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {filters.types.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Filter by Type</h4>
              <div className="space-y-1">
                {typeOptions.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={filters.types.includes(type.value)}
                      onCheckedChange={() => toggleType(type.value)}
                    />
                    <span className="text-sm">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Domain Filter */}
        {domains.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Domain
                {filters.domains.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                    {filters.domains.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Filter by Domain</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {domains.map((domain) => (
                    <label
                      key={domain}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.domains.includes(domain)}
                        onCheckedChange={() => toggleDomain(domain)}
                      />
                      <span className="text-sm truncate">{domain}</span>
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Skills Filter */}
        {skills.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Skills
                {filters.skills.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                    {filters.skills.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Filter by Skills</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {skills.map((skill) => (
                    <label
                      key={skill}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.skills.includes(skill)}
                        onCheckedChange={() => toggleSkill(skill)}
                      />
                      <span className="text-sm truncate">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Metrics Toggle */}
        <Button
          variant={filters.onlyWithMetrics ? 'default' : 'outline'}
          size="sm"
          className="h-8"
          onClick={() => setOnlyWithMetrics(!filters.onlyWithMetrics)}
        >
          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
          With Metrics
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.query && (
            <Badge variant="secondary" className="gap-1 pr-1">
              &quot;{filters.query}&quot;
              <button
                onClick={() => {}}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.types.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1 capitalize pr-1">
              {type}
              <button
                onClick={() => toggleType(type)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {filters.domains.map((domain) => (
            <Badge key={domain} variant="outline" className="gap-1 pr-1">
              {domain}
              <button
                onClick={() => toggleDomain(domain)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {filters.skills.map((skill) => (
            <Badge key={skill} variant="outline" className="gap-1 pr-1">
              {skill}
              <button
                onClick={() => toggleSkill(skill)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {filters.onlyWithMetrics && (
            <Badge variant="secondary" className="gap-1 pr-1">
              With Metrics
              <button
                onClick={() => setOnlyWithMetrics(false)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
