import type {
  Job,
  Highlight,
  InsertJob,
  InsertHighlight,
  UpdateJob,
  UpdateHighlight,
} from '@/lib/types';
import type {
  JobWithHighlights,
  HighlightWithJob,
  JobWithFilteredHighlights,
  SearchFilters,
  BackupData,
  ImportResult,
} from '@/lib/data-types';

export interface DataLayer {
  // Job CRUD
  getJobs(): Promise<(Job & { highlightCount: number })[]>;
  getJobById(id: string): Promise<Job | null>;
  createJob(data: InsertJob): Promise<Job>;
  updateJob(id: string, data: UpdateJob): Promise<Job>;
  deleteJob(id: string): Promise<Job>;
  getJobsWithHighlights(): Promise<JobWithHighlights[]>;

  // Highlight CRUD
  getHighlights(filters?: {
    jobId?: string;
    type?: string;
    isHidden?: boolean;
  }): Promise<Highlight[]>;
  getHighlightById(id: string): Promise<Highlight | null>;
  createHighlight(data: InsertHighlight): Promise<Highlight>;
  updateHighlight(id: string, data: UpdateHighlight): Promise<Highlight>;
  deleteHighlight(id: string): Promise<Highlight>;
  toggleHighlightVisibility(id: string): Promise<Highlight>;

  // Table view
  getAllHighlightsWithJobs(): Promise<HighlightWithJob[]>;

  // Search
  searchHighlights(filters: SearchFilters): Promise<HighlightWithJob[]>;
  searchJobsWithHighlights(
    filters: SearchFilters
  ): Promise<JobWithFilteredHighlights[]>;
  getAllDomains(): Promise<string[]>;
  getAllSkills(): Promise<string[]>;

  // Profile
  getProfile(): Promise<{ fullName: string } | null>;
  updateProfile(data: { fullName: string }): Promise<{ fullName: string }>;

  // Backup
  exportDatabase(): Promise<BackupData>;
  importDatabase(data: BackupData): Promise<ImportResult>;
  clearDatabase(): Promise<{ jobsDeleted: number; highlightsDeleted: number }>;
}
