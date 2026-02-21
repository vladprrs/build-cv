/**
 * Shared composite/operational types used across data layers.
 * Re-exports base entity types from types.ts for convenience.
 */

// Re-export base entity types
export type {
  HighlightType,
  Metric,
  Job,
  Highlight,
  InsertJob,
  InsertHighlight,
  UpdateJob,
  UpdateHighlight,
} from './types';

import type { Job, Highlight, HighlightType } from './types';

// ============ COMPOSITE TYPES ============

export interface JobWithHighlights extends Job {
  highlights: Highlight[];
}

export interface HighlightWithJob extends Highlight {
  job: Job | null;
}

export interface JobWithFilteredHighlights extends Job {
  highlights: Highlight[];
  allHighlightsCount: number;
}

// ============ SEARCH & FILTER TYPES ============

export interface SearchFilters {
  query?: string;
  types?: HighlightType[];
  domains?: string[];
  skills?: string[];
  onlyWithMetrics?: boolean;
}

// ============ BACKUP & IMPORT TYPES ============

export interface BackupJob extends Omit<Job, 'id'> {
  id: string; // slug
}

export interface BackupHighlight extends Omit<Highlight, 'id' | 'jobId'> {
  id: string; // slug
  jobId?: string | null; // job slug
}

export interface BackupData {
  version: string;
  exportedAt: string;
  jobs: BackupJob[];
  highlights: BackupHighlight[];
  profile?: { fullName: string };
}

export interface ImportResult {
  success: boolean;
  jobsImported: number;
  highlightsImported: number;
  errors: string[];
}
