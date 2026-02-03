"use client";

import { Suspense } from "react";
import { HighlightsFilters } from "./highlights-filters";

interface HighlightsFiltersWrapperProps {
  domains: string[];
  skills: string[];
  resultCount: number;
}

function FiltersFallback() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="h-10 bg-muted rounded-md animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function HighlightsFiltersWrapper({
  domains,
  skills,
  resultCount,
}: HighlightsFiltersWrapperProps) {
  return (
    <Suspense fallback={<FiltersFallback />}>
      <HighlightsFilters
        domains={domains}
        skills={skills}
        resultCount={resultCount}
      />
    </Suspense>
  );
}
