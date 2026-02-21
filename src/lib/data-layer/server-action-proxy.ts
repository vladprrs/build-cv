import type { DataLayer } from './types';
import type {
  Job,
  Highlight,
  HighlightType,
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

import {
  getProfile as getProfileAction,
  updateProfile as updateProfileAction,
  getJobs as getJobsAction,
  getJobById as getJobByIdAction,
  createJob as createJobAction,
  updateJob as updateJobAction,
  deleteJob as deleteJobAction,
  getJobsWithHighlights as getJobsWithHighlightsAction,
  getHighlights as getHighlightsAction,
  getHighlightById as getHighlightByIdAction,
  createHighlight as createHighlightAction,
  updateHighlight as updateHighlightAction,
  deleteHighlight as deleteHighlightAction,
  toggleHighlightVisibility as toggleHighlightVisibilityAction,
  getAllHighlightsWithJobs as getAllHighlightsWithJobsAction,
  searchHighlights as searchHighlightsAction,
  searchJobsWithHighlights as searchJobsWithHighlightsAction,
  getAllDomains as getAllDomainsAction,
  getAllSkills as getAllSkillsAction,
  exportDatabase as exportDatabaseAction,
  importDatabase as importDatabaseAction,
  clearDatabase as clearDatabaseAction,
} from '@/app/actions';

/**
 * DataLayer implementation that proxies all calls through server actions.
 * Used by authenticated users on the client side.
 */
export class ServerActionProxy implements DataLayer {
  async getProfile(): Promise<{ fullName: string } | null> {
    return getProfileAction();
  }

  async updateProfile(data: { fullName: string }): Promise<{ fullName: string }> {
    return updateProfileAction(data);
  }

  async getJobs(): Promise<(Job & { highlightCount: number })[]> {
    return getJobsAction();
  }

  async getJobById(id: string): Promise<Job | null> {
    return getJobByIdAction(id);
  }

  async createJob(data: InsertJob): Promise<Job> {
    return createJobAction(data);
  }

  async updateJob(id: string, data: UpdateJob): Promise<Job> {
    return updateJobAction(id, data);
  }

  async deleteJob(id: string): Promise<Job> {
    return deleteJobAction(id);
  }

  async getJobsWithHighlights(): Promise<JobWithHighlights[]> {
    return getJobsWithHighlightsAction();
  }

  async getHighlights(filters?: {
    jobId?: string;
    type?: HighlightType;
    isHidden?: boolean;
  }): Promise<Highlight[]> {
    return getHighlightsAction(filters);
  }

  async getHighlightById(id: string): Promise<Highlight | null> {
    return getHighlightByIdAction(id);
  }

  async createHighlight(data: InsertHighlight): Promise<Highlight> {
    return createHighlightAction(data);
  }

  async updateHighlight(id: string, data: UpdateHighlight): Promise<Highlight> {
    return updateHighlightAction(id, data);
  }

  async deleteHighlight(id: string): Promise<Highlight> {
    return deleteHighlightAction(id);
  }

  async toggleHighlightVisibility(id: string): Promise<Highlight> {
    return toggleHighlightVisibilityAction(id);
  }

  async getAllHighlightsWithJobs(): Promise<HighlightWithJob[]> {
    return getAllHighlightsWithJobsAction();
  }

  async searchHighlights(filters: SearchFilters): Promise<HighlightWithJob[]> {
    return searchHighlightsAction(filters);
  }

  async searchJobsWithHighlights(
    filters: SearchFilters
  ): Promise<JobWithFilteredHighlights[]> {
    return searchJobsWithHighlightsAction(filters);
  }

  async getAllDomains(): Promise<string[]> {
    return getAllDomainsAction();
  }

  async getAllSkills(): Promise<string[]> {
    return getAllSkillsAction();
  }

  async exportDatabase(): Promise<BackupData> {
    return exportDatabaseAction();
  }

  async importDatabase(data: BackupData): Promise<ImportResult> {
    return importDatabaseAction(data);
  }

  async clearDatabase(): Promise<{ jobsDeleted: number; highlightsDeleted: number }> {
    return clearDatabaseAction();
  }
}
