"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type HighlightType } from "@/app/actions";
import { Search, X, Filter, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const typeOptions: { value: HighlightType; label: string }[] = [
  { value: "achievement", label: "Achievement" },
  { value: "project", label: "Project" },
  { value: "responsibility", label: "Responsibility" },
  { value: "education", label: "Education" },
];

interface HighlightsFiltersProps {
  domains: string[];
  skills: string[];
  resultCount: number;
}

export function HighlightsFilters({
  domains,
  skills,
  resultCount,
}: HighlightsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial values from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedTypes, setSelectedTypes] = useState<HighlightType[]>(
    searchParams.get("types")?.split(",").filter(Boolean) as HighlightType[] || []
  );
  const [selectedDomains, setSelectedDomains] = useState<string[]>(
    searchParams.get("domains")?.split(",").filter(Boolean) || []
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    searchParams.get("skills")?.split(",").filter(Boolean) || []
  );
  const [onlyWithMetrics, setOnlyWithMetrics] = useState(
    searchParams.get("metrics") === "true"
  );

  // Update URL with filter params
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    if (selectedTypes.length > 0) {
      params.set("types", selectedTypes.join(","));
    }
    if (selectedDomains.length > 0) {
      params.set("domains", selectedDomains.join(","));
    }
    if (selectedSkills.length > 0) {
      params.set("skills", selectedSkills.join(","));
    }
    if (onlyWithMetrics) {
      params.set("metrics", "true");
    }

    const queryString = params.toString();
    const newUrl = queryString ? `/highlights?${queryString}` : "/highlights";

    router.push(newUrl, { scroll: false });
  }, [searchQuery, selectedTypes, selectedDomains, selectedSkills, onlyWithMetrics, router]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateUrl();
    }, 300);

    return () => clearTimeout(timer);
  }, [updateUrl]);

  // Toggle type selection
  const toggleType = (type: HighlightType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Toggle domain selection
  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  // Toggle skill selection
  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTypes([]);
    setSelectedDomains([]);
    setSelectedSkills([]);
    setOnlyWithMetrics(false);
    router.push("/highlights", { scroll: false });
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery.trim() ||
    selectedTypes.length > 0 ||
    selectedDomains.length > 0 ||
    selectedSkills.length > 0 ||
    onlyWithMetrics;

  // Active filters count for badge
  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    selectedTypes.length +
    selectedDomains.length +
    selectedSkills.length +
    (onlyWithMetrics ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[120px]">
              <Filter className="h-4 w-4 mr-2" />
              Type
              {selectedTypes.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {selectedTypes.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
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

        {/* Domain Filter */}
        {domains.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[120px]">
                <Filter className="h-4 w-4 mr-2" />
                Domain
                {selectedDomains.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {selectedDomains.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
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
              <Button variant="outline" className="min-w-[120px]">
                <Filter className="h-4 w-4 mr-2" />
                Skills
                {selectedSkills.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {selectedSkills.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
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

        {/* Metrics Toggle */}
        <Button
          variant={onlyWithMetrics ? "default" : "outline"}
          onClick={() => setOnlyWithMetrics(!onlyWithMetrics)}
          className="min-w-[140px]"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          With Metrics
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: &quot;{searchQuery}&quot;
              <button
                onClick={() => setSearchQuery("")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {selectedTypes.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1 capitalize">
              {type}
              <button
                onClick={() => toggleType(type)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {selectedDomains.map((domain) => (
            <Badge key={domain} variant="outline" className="gap-1">
              Domain: {domain}
              <button
                onClick={() => toggleDomain(domain)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {selectedSkills.map((skill) => (
            <Badge key={skill} variant="outline" className="gap-1">
              Skill: {skill}
              <button
                onClick={() => toggleSkill(skill)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {onlyWithMetrics && (
            <Badge variant="secondary" className="gap-1">
              With Metrics
              <button
                onClick={() => setOnlyWithMetrics(false)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className={cn("text-sm", resultCount === 0 ? "text-destructive" : "text-muted-foreground")}>
          Found {resultCount} highlight{resultCount !== 1 && "s"}
        </p>
        {activeFilterCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {activeFilterCount} filter{activeFilterCount !== 1 && "s"} active
          </p>
        )}
      </div>
    </div>
  );
}
