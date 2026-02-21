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
import { AuthButton } from '@/components/auth/auth-button';
import { ModeIndicator } from '@/components/auth/mode-indicator';
import { Settings, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { HighlightType, JobWithFilteredHighlights } from '@/lib/data-types';

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
  mode?: 'anonymous' | 'authenticated';
}

function UnifiedFeedContent({
  initialJobs,
  domains: initialDomains,
  skills: initialSkills,
  searchJobsAction,
  mode = 'authenticated',
}: UnifiedFeedContentProps) {
  const router = useRouter();
  const { filters, hasActiveFilters } = useFilters();
  const [jobs, setJobs] = useState<JobWithFilteredHighlights[]>(initialJobs);
  const [domains, setDomains] = useState<string[]>(initialDomains);
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [isLoading, setIsLoading] = useState(mode === 'anonymous');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dataLayerRef = useRef<import('@/lib/data-layer/types').DataLayer | null>(null);

  const [showNewHighlightDialog, setShowNewHighlightDialog] = useState(false);
  const [showNewJobDialog, setShowNewJobDialog] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInputValue, setNameInputValue] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const totalHighlights = jobs.reduce((sum, job) => sum + job.allHighlightsCount, 0);
  const filteredHighlights = jobs.reduce((sum, job) => sum + job.highlights.length, 0);
  const totalPositions = jobs.length;

  // Anonymous mode: load data from IndexedDB on mount
  useEffect(() => {
    if (mode !== 'anonymous') return;

    async function loadFromIndexedDB() {
      try {
        const { ClientDataLayer } = await import('@/lib/data-layer/client-data-layer');
        const dl = new ClientDataLayer();
        dataLayerRef.current = dl;

        const [jobsData, domainsData, skillsData, profileData] = await Promise.all([
          dl.searchJobsWithHighlights({}),
          dl.getAllDomains(),
          dl.getAllSkills(),
          dl.getProfile(),
        ]);
        setJobs(jobsData);
        setDomains(domainsData);
        setSkills(skillsData);
        if (profileData?.fullName) setFullName(profileData.fullName);
      } catch (error) {
        console.error('Failed to load from IndexedDB:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFromIndexedDB();
  }, [mode]);

  // Load profile for authenticated mode
  useEffect(() => {
    if (mode !== 'authenticated') return;
    async function loadProfile() {
      try {
        const { getProfile } = await import('@/app/actions');
        const profileData = await getProfile();
        if (profileData?.fullName) setFullName(profileData.fullName);
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    }
    loadProfile();
  }, [mode]);

  // Re-fetch when filters change
  useEffect(() => {
    const fetchData = async () => {
      try {
        const filterPayload = {
          query: filters.query || undefined,
          types: filters.types.length > 0 ? filters.types : undefined,
          domains: filters.domains.length > 0 ? filters.domains : undefined,
          skills: filters.skills.length > 0 ? filters.skills : undefined,
          onlyWithMetrics: filters.onlyWithMetrics || undefined,
        };

        if (mode === 'anonymous' && dataLayerRef.current) {
          const result = await dataLayerRef.current.searchJobsWithHighlights(filterPayload);
          setJobs(result);
        } else if (mode === 'authenticated') {
          const result = await searchJobsAction(filterPayload);
          setJobs(result);
        }
      } catch (error) {
        console.error('Failed to fetch filtered data:', error);
      }
    };

    if (!isLoading) {
      fetchData();
    }
  }, [filters, searchJobsAction, mode, isLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(
        (e.target as HTMLElement).tagName
      );

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
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

      if (e.key === 'Escape' && showSearch) {
        e.preventDefault();
        searchInputRef.current?.blur();
        if (!hasActiveFilters) {
          setShowSearch(false);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, hasActiveFilters]);

  const handleNameSave = useCallback(async () => {
    const trimmed = nameInputValue.trim();
    setIsEditingName(false);
    if (trimmed === fullName) return;
    setFullName(trimmed);
    try {
      if (mode === 'anonymous' && dataLayerRef.current) {
        await dataLayerRef.current.updateProfile({ fullName: trimmed });
      } else if (mode === 'authenticated') {
        const { updateProfile } = await import('@/app/actions');
        await updateProfile({ fullName: trimmed });
      }
    } catch (error) {
      console.error('Failed to save name:', error);
    }
  }, [nameInputValue, fullName, mode]);

  const handleUpdate = useCallback(async () => {
    if (mode === 'anonymous' && dataLayerRef.current) {
      // Reload from IndexedDB
      const [jobsData, domainsData, skillsData] = await Promise.all([
        dataLayerRef.current.searchJobsWithHighlights({}),
        dataLayerRef.current.getAllDomains(),
        dataLayerRef.current.getAllSkills(),
      ]);
      setJobs(jobsData);
      setDomains(domainsData);
      setSkills(skillsData);
    } else {
      router.refresh();
    }
  }, [router, mode]);

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-6 border-b border-border/40">
            <div>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={nameInputValue}
                    onChange={(e) => setNameInputValue(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    className="text-lg font-semibold tracking-tight bg-transparent border-b border-foreground/30 outline-none w-48"
                    autoFocus
                  />
                ) : (
                  <h1
                    className="text-lg font-semibold tracking-tight cursor-pointer hover:text-foreground/70 transition-colors"
                    onClick={() => {
                      setNameInputValue(fullName);
                      setIsEditingName(true);
                    }}
                    title="Click to edit your name"
                  >
                    {fullName || 'Your Name'}
                  </h1>
                )}
                <ModeIndicator />
              </div>
              <p className="text-sm text-muted-foreground">
                {totalPositions} positions · {totalHighlights} highlights
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AuthButton />
              {mode === 'authenticated' && (
                <Link
                  href="/optimize"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  title="Optimize Resume"
                >
                  <Sparkles className="h-5 w-5" />
                </Link>
              )}
              <Link
                href="/settings"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <CreateJobDialog
                onSuccess={handleUpdate}
                mode={mode}
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

          {/* Search & Filters — hidden until Cmd+K */}
          {showSearch && (
            <div className="py-6 space-y-4">
              <SearchBar searchInputRef={searchInputRef} />
              <FilterBar domains={domains} skills={skills} />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pb-24">
        {showSearch && (
          <ResultsHeader
            totalHighlights={totalHighlights}
            filteredCount={filteredHighlights}
          />
        )}

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
                mode={mode}
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
                mode={mode}
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
        mode={mode}
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
  mode?: 'anonymous' | 'authenticated';
}

export function UnifiedFeed(props: UnifiedFeedProps) {
  return (
    <FilterProvider>
      <UnifiedFeedContent {...props} />
    </FilterProvider>
  );
}
