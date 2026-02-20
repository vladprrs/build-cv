'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SearchBar } from './search-bar';
import { FilterBar } from './filter-bar';
import { ResultsHeader } from './results-header';
import { CompanySection } from './company-section';
import { FilterProvider, useFilters } from '@/contexts/filter-context';
import { CreateJobDialog } from '@/components/dialogs/job-dialog';
import { CreateHighlightDialog } from '@/components/dialogs/highlight-dialog';
import { Settings, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Job, Highlight, HighlightType } from '@/app/actions';

interface JobWithFilteredHighlights extends Job {
  highlights: Highlight[];
  allHighlightsCount: number;
}

interface UnifiedFeedContentProps {
  initialJobs: JobWithFilteredHighlights[];
  domains: string[];
  skills: string[];
  searchJobsAction: (filters: {
    query?: string;
    types?: HighlightType[];
    domains?: string[];
    skills?: string[];
    onlyWithMetrics?: boolean;
  }) => Promise<JobWithFilteredHighlights[]>;
}

function UnifiedFeedContent({
  initialJobs,
  domains,
  skills,
  searchJobsAction,
}: UnifiedFeedContentProps) {
  const router = useRouter();
  const { filters, hasActiveFilters } = useFilters();
  const [jobs, setJobs] = useState<JobWithFilteredHighlights[]>(initialJobs);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [showNewHighlightDialog, setShowNewHighlightDialog] = useState(false);
  const [showNewJobDialog, setShowNewJobDialog] = useState(false);

  const totalHighlights = jobs.reduce((sum, job) => sum + job.allHighlightsCount, 0);
  const filteredHighlights = jobs.reduce((sum, job) => sum + job.highlights.length, 0);
  const totalPositions = jobs.length;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await searchJobsAction({
          query: filters.query || undefined,
          types: filters.types.length > 0 ? filters.types : undefined,
          domains: filters.domains.length > 0 ? filters.domains : undefined,
          skills: filters.skills.length > 0 ? filters.skills : undefined,
          onlyWithMetrics: filters.onlyWithMetrics || undefined,
        });
        setJobs(result);
      } catch (error) {
        console.error('Failed to fetch filtered data:', error);
      }
    };

    fetchData();
  }, [filters, searchJobsAction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(
        (e.target as HTMLElement).tagName
      );

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowNewJobDialog(true);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'n' && !isInput) {
        e.preventDefault();
        setShowNewHighlightDialog(true);
        return;
      }

      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.blur();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-6 border-b border-border/40">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Build CV</h1>
              <p className="text-sm text-muted-foreground">
                {totalPositions} positions · {totalHighlights} highlights
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <CreateJobDialog
                onSuccess={handleUpdate}
                trigger={
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors">
                    <Plus className="h-4 w-4" />
                    Add Job
                  </button>
                }
                open={showNewJobDialog}
                onOpenChange={setShowNewJobDialog}
              />
            </div>
          </div>

          {/* Search & Filters */}
          <div className="py-6 space-y-4">
            <SearchBar searchInputRef={searchInputRef} />
            <FilterBar domains={domains} skills={skills} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pb-24">
        <ResultsHeader
          totalHighlights={totalHighlights}
          filteredCount={filteredHighlights}
        />

        {/* Jobs Feed */}
        <div className="mt-6 space-y-6">
          {jobs.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-muted-foreground mb-6">
                Your career timeline is empty.
                <br />
                Add your first job to get started.
              </p>
              <CreateJobDialog
                onSuccess={handleUpdate}
                trigger={
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors">
                    <Plus className="h-4 w-4" />
                    Add Your First Job
                  </button>
                }
              />
            </div>
          ) : hasActiveFilters && filteredHighlights === 0 ? (
            <div className="py-24 text-center">
              <p className="text-muted-foreground">
                No highlights match your filters.
                <br />
                Try adjusting your search criteria.
              </p>
            </div>
          ) : (
            jobs.map((job) => (
              <CompanySection
                key={job.id}
                job={job}
                highlights={job.highlights}
                onUpdate={handleUpdate}
                defaultExpanded={!hasActiveFilters || job.highlights.length > 0}
              />
            ))
          )}
        </div>

        {/* Keyboard hints */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-4 text-xs text-muted-foreground/60">
          <span><kbd className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] font-mono">⌘K</kbd> search</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] font-mono">⌘N</kbd> highlight</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] font-mono">⌘⇧N</kbd> job</span>
        </div>
      </main>

      <CreateHighlightDialog
        onSuccess={handleUpdate}
        trigger={<span className="hidden" />}
        open={showNewHighlightDialog}
        onOpenChange={setShowNewHighlightDialog}
      />
    </div>
  );
}

interface UnifiedFeedProps {
  initialJobs: JobWithFilteredHighlights[];
  domains: string[];
  skills: string[];
  searchJobsAction: (filters: {
    query?: string;
    types?: HighlightType[];
    domains?: string[];
    skills?: string[];
    onlyWithMetrics?: boolean;
  }) => Promise<JobWithFilteredHighlights[]>;
}

export function UnifiedFeed(props: UnifiedFeedProps) {
  return (
    <FilterProvider>
      <UnifiedFeedContent {...props} />
    </FilterProvider>
  );
}
