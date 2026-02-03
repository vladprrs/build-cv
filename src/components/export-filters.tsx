"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type HighlightType } from "@/app/actions";
import { Search, X, Filter, BarChart3, FileText } from "lucide-react";

const typeOptions: { value: HighlightType; label: string }[] = [
  { value: "achievement", label: "Achievement" },
  { value: "project", label: "Project" },
  { value: "responsibility", label: "Responsibility" },
  { value: "education", label: "Education" },
];

export interface ExportFiltersState {
  query: string;
  selectedTypes: HighlightType[];
  selectedDomains: string[];
  selectedSkills: string[];
  onlyWithMetrics: boolean;
  customContext: string;
}

interface ExportFiltersProps {
  domains: string[];
  skills: string[];
  resultCount: number;
  filters: ExportFiltersState;
  onFiltersChange: (filters: ExportFiltersState) => void;
}

export function ExportFilters({
  domains,
  skills,
  resultCount,
  filters,
  onFiltersChange,
}: ExportFiltersProps) {
  const { query, selectedTypes, selectedDomains, selectedSkills, onlyWithMetrics, customContext } = filters;

  const updateFilters = useCallback((updates: Partial<ExportFiltersState>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  // Toggle type selection
  const toggleType = (type: HighlightType) => {
    updateFilters({
      selectedTypes: selectedTypes.includes(type)
        ? selectedTypes.filter((t) => t !== type)
        : [...selectedTypes, type],
    });
  };

  // Toggle domain selection
  const toggleDomain = (domain: string) => {
    updateFilters({
      selectedDomains: selectedDomains.includes(domain)
        ? selectedDomains.filter((d) => d !== domain)
        : [...selectedDomains, domain],
    });
  };

  // Toggle skill selection
  const toggleSkill = (skill: string) => {
    updateFilters({
      selectedSkills: selectedSkills.includes(skill)
        ? selectedSkills.filter((s) => s !== skill)
        : [...selectedSkills, skill],
    });
  };

  // Clear all filters
  const clearFilters = () => {
    onFiltersChange({
      query: "",
      selectedTypes: [],
      selectedDomains: [],
      selectedSkills: [],
      onlyWithMetrics: false,
      customContext: "",
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    query.trim() ||
    selectedTypes.length > 0 ||
    selectedDomains.length > 0 ||
    selectedSkills.length > 0 ||
    onlyWithMetrics;

  return (
    <div className="space-y-6">
      {/* Custom Context */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Custom Context
        </label>
        <Textarea
          placeholder="Add custom context for AI (e.g., 'Targeting Senior Product Manager roles in fintech')..."
          value={customContext}
          onChange={(e) => updateFilters({ customContext: e.target.value })}
          className="min-h-[80px] resize-none"
        />
        <p className="text-xs text-muted-foreground">
          This context will be included in the exported data to help AI understand your goal.
        </p>
      </div>

      <div className="border-t pt-4" />

      {/* Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or content..."
            value={query}
            onChange={(e) => updateFilters({ query: e.target.value })}
            className="pl-10"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => updateFilters({ query: "" })}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Type
              </span>
              {selectedTypes.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedTypes.length}
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
                      checked={selectedTypes.includes(type.value)}
                      onCheckedChange={() => toggleType(type.value)}
                    />
                    <span className="text-sm">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Metrics Toggle */}
        <Button
          variant={onlyWithMetrics ? "default" : "outline"}
          onClick={() => updateFilters({ onlyWithMetrics: !onlyWithMetrics })}
          className="w-full justify-start gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          With Metrics
        </Button>

        {/* Domain Filter */}
        {domains.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Domain
                </span>
                {selectedDomains.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedDomains.length}
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
                        checked={selectedDomains.includes(domain)}
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
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Skills
                </span>
                {selectedSkills.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedSkills.length}
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
                        checked={selectedSkills.includes(skill)}
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
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
              <X className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {query && (
              <Badge variant="secondary" className="gap-1">
                &quot;{query}&quot;
                <button onClick={() => updateFilters({ query: "" })} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedTypes.map((type) => (
              <Badge key={type} variant="secondary" className="gap-1 capitalize">
                {type}
                <button onClick={() => toggleType(type)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedDomains.map((domain) => (
              <Badge key={domain} variant="outline" className="gap-1">
                {domain}
                <button onClick={() => toggleDomain(domain)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedSkills.map((skill) => (
              <Badge key={skill} variant="outline" className="gap-1">
                {skill}
                <button onClick={() => toggleSkill(skill)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {onlyWithMetrics && (
              <Badge variant="secondary" className="gap-1">
                With Metrics
                <button onClick={() => updateFilters({ onlyWithMetrics: false })} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="pt-4 border-t">
        <p className="text-sm font-medium">
          {resultCount === 0 ? (
            <span className="text-destructive">No highlights match your filters</span>
          ) : (
            <span className="text-muted-foreground">
              <span className="font-bold text-foreground">{resultCount}</span> highlight{resultCount !== 1 && "s"} selected for export
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
