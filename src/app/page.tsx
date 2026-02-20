import { Suspense } from 'react';
import { UnifiedFeed } from '@/components/unified-feed';
import {
  searchJobsWithHighlights,
  getAllDomains,
  getAllSkills,
} from '@/app/actions';
import type { HighlightType } from '@/lib/data-types';

interface SearchParams {
  q?: string;
  types?: string;
  domains?: string;
  skills?: string;
  metrics?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // Parse filters from URL
  const filters = {
    query: params.q || undefined,
    types: params.types?.split(',').filter(Boolean) as HighlightType[] | undefined,
    domains: params.domains?.split(',').filter(Boolean) || undefined,
    skills: params.skills?.split(',').filter(Boolean) || undefined,
    onlyWithMetrics: params.metrics === 'true' || undefined,
  };

  // Fetch initial data
  const [jobs, domains, skills] = await Promise.all([
    searchJobsWithHighlights(filters),
    getAllDomains(),
    getAllSkills(),
  ]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <UnifiedFeed
        initialJobs={jobs}
        domains={domains}
        skills={skills}
        searchJobsAction={searchJobsWithHighlights}
      />
    </Suspense>
  );
}
