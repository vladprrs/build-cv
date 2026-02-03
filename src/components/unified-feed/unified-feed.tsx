'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from './search-bar';
import { FilterBar } from './filter-bar';
import { ResultsHeader } from './results-header';
import { CompanySection } from './company-section';
import { ExportPanel } from './export-panel';
import { FilterProvider, useFilters } from '@/contexts/filter-context';
import { CreateJobDialog } from '@/components/dialogs/job-dialog';
import { CreateHighlightDialog } from '@/components/dialogs/highlight-dialog';
import { Settings, Plus, Briefcase } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Dialog state for keyboard shortcuts
  const [showNewHighlightDialog, setShowNewHighlightDialog] = useState(false);
  const [showNewJobDialog, setShowNewJobDialog] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);

  // Calculate totals
  const totalHighlights = jobs.reduce((sum, job) => sum + job.allHighlightsCount, 0);
  const filteredHighlights = jobs.reduce((sum, job) => sum + job.highlights.length, 0);
  const totalPositions = jobs.length;

  // Fetch filtered data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters, searchJobsAction]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea (except for Escape)
      const isInput = ['INPUT', 'TEXTAREA'].includes(
        (e.target as HTMLElement).tagName
      );

      // Cmd/Ctrl + K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Cmd/Ctrl + Shift + N - New company
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowNewJobDialog(true);
        return;
      }

      // Cmd/Ctrl + N - New highlight (only when not in input)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'n' && !isInput) {
        e.preventDefault();
        setShowNewHighlightDialog(true);
        return;
      }

      // Cmd/Ctrl + Shift + C - Copy JSON
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        // Trigger copy JSON - handled by ResultsHeader
        const copyButton = document.querySelector('[data-copy-json]') as HTMLButtonElement;
        copyButton?.click();
        return;
      }

      // Escape - Clear search if focused
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
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto py-4 px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Build CV</h1>
              <p className="text-sm text-muted-foreground">
                {totalPositions} {totalPositions === 1 ? 'position' : 'positions'} •{' '}
                {totalHighlights} highlight{totalHighlights !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
              <CreateJobDialog
                onSuccess={handleUpdate}
                trigger={
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Job
                  </Button>
                }
                open={showNewJobDialog}
                onOpenChange={setShowNewJobDialog}
              />
            </div>
          </div>

          {/* Search */}
          <div className="mb-3">
            <SearchBar searchInputRef={searchInputRef} />
          </div>

          {/* Filters */}
          <FilterBar domains={domains} skills={skills} />

          {/* Export Panel */}
          <div className="mt-3">
            <ExportPanel isOpen={showExportPanel} onOpenChange={setShowExportPanel} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 px-4 max-w-4xl">
        {/* Results Header */}
        <ResultsHeader
          totalHighlights={totalHighlights}
          filteredCount={filteredHighlights}
        />

        {/* Jobs Feed */}
        <div className="space-y-4 mt-4">
          {jobs.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Your career timeline is empty</h3>
              <p className="text-muted-foreground mt-2 mb-6 max-w-sm mx-auto">
                Add your first job to start building your professional timeline with
                achievements and projects.
              </p>
              <CreateJobDialog
                onSuccess={handleUpdate}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Job
                  </Button>
                }
              />
            </Card>
          ) : hasActiveFilters && filteredHighlights === 0 ? (
            <Card className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No highlights match your filters</h3>
              <p className="text-muted-foreground mt-2 mb-6 max-w-sm mx-auto">
                Try adjusting your search or filters to find what you&apos;re looking for.
              </p>
            </Card>
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

        {/* Keyboard shortcuts hint */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <span className="hidden sm:inline">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘K</kbd> search
            {' • '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘N</kbd> new highlight
            {' • '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘⇧N</kbd> new job
            {' • '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘⇧C</kbd> copy JSON
          </span>
        </div>
      </main>

      {/* Hidden dialog triggers for keyboard shortcuts */}
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
