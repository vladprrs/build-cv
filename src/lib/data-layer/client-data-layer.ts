import Dexie, { type EntityTable } from 'dexie';
import type { DataLayer } from './types';
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

interface DexieJob extends Job {}
interface DexieHighlight extends Highlight {}
interface DexieProfile {
  id: string;
  fullName: string;
  updatedAt: string;
}

class BuildCVDatabase extends Dexie {
  jobs!: EntityTable<DexieJob, 'id'>;
  highlights!: EntityTable<DexieHighlight, 'id'>;
  profile!: EntityTable<DexieProfile, 'id'>;

  constructor() {
    super('buildcv');
    this.version(1).stores({
      jobs: 'id, company, role, startDate, createdAt',
      highlights: 'id, jobId, type, title, startDate, isHidden, createdAt',
    });
    this.version(2).stores({
      jobs: 'id, company, role, startDate, createdAt',
      highlights: 'id, jobId, type, title, startDate, isHidden, createdAt',
      profile: 'id',
    });
  }
}

let dbInstance: BuildCVDatabase | null = null;

function getDb(): BuildCVDatabase {
  if (!dbInstance) {
    dbInstance = new BuildCVDatabase();
  }
  return dbInstance;
}

export class ClientDataLayer implements DataLayer {
  private db: BuildCVDatabase;

  constructor() {
    this.db = getDb();
  }

  async getJobs(): Promise<(Job & { highlightCount: number })[]> {
    const allJobs = await this.db.jobs
      .orderBy('startDate')
      .reverse()
      .toArray();
    const allHighlights = await this.db.highlights.toArray();

    const countMap = new Map<string, number>();
    for (const h of allHighlights) {
      if (h.jobId) countMap.set(h.jobId, (countMap.get(h.jobId) || 0) + 1);
    }

    return allJobs.map((j) => ({
      ...j,
      highlightCount: countMap.get(j.id) || 0,
    }));
  }

  async getJobById(id: string): Promise<Job | null> {
    return (await this.db.jobs.get(id)) || null;
  }

  async createJob(data: InsertJob): Promise<Job> {
    const now = new Date().toISOString();
    const job: Job = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.jobs.add(job);
    return job;
  }

  async updateJob(id: string, data: UpdateJob): Promise<Job> {
    const existing = await this.db.jobs.get(id);
    if (!existing) throw new Error('Job not found');

    const updated: Job = {
      ...existing,
      ...data,
      endDate: data.endDate === '' ? null : (data.endDate ?? existing.endDate),
      logoUrl: data.logoUrl === '' ? null : (data.logoUrl ?? existing.logoUrl),
      website: data.website === '' ? null : (data.website ?? existing.website),
      updatedAt: new Date().toISOString(),
    };
    await this.db.jobs.put(updated);
    return updated;
  }

  async deleteJob(id: string): Promise<Job> {
    const existing = await this.db.jobs.get(id);
    if (!existing) throw new Error('Job not found');

    // Nullify jobId on related highlights
    const related = await this.db.highlights
      .where('jobId')
      .equals(id)
      .toArray();
    for (const h of related) {
      await this.db.highlights.update(h.id, { jobId: null });
    }

    await this.db.jobs.delete(id);
    return existing;
  }

  async getJobsWithHighlights(): Promise<JobWithHighlights[]> {
    const allJobs = await this.db.jobs
      .orderBy('startDate')
      .reverse()
      .toArray();
    const allHighlights = await this.db.highlights
      .where('isHidden')
      .equals(0)
      .toArray();

    const byJob = new Map<string, Highlight[]>();
    for (const h of allHighlights) {
      if (h.jobId) {
        if (!byJob.has(h.jobId)) byJob.set(h.jobId, []);
        byJob.get(h.jobId)!.push(h);
      }
    }

    return allJobs.map((j) => ({
      ...j,
      highlights: byJob.get(j.id) || [],
    }));
  }

  async getHighlights(filters?: {
    jobId?: string;
    type?: string;
    isHidden?: boolean;
  }): Promise<Highlight[]> {
    let result = await this.db.highlights
      .orderBy('startDate')
      .reverse()
      .toArray();

    if (filters?.jobId) result = result.filter((h) => h.jobId === filters.jobId);
    if (filters?.type) result = result.filter((h) => h.type === filters.type);
    if (filters?.isHidden !== undefined)
      result = result.filter((h) => h.isHidden === filters.isHidden);

    return result;
  }

  async getHighlightById(id: string): Promise<Highlight | null> {
    return (await this.db.highlights.get(id)) || null;
  }

  async createHighlight(data: InsertHighlight): Promise<Highlight> {
    const now = new Date().toISOString();
    const highlight: Highlight = {
      id: crypto.randomUUID(),
      ...data,
      jobId: data.jobId ?? null,
      domains: data.domains || [],
      skills: data.skills || [],
      keywords: data.keywords || [],
      metrics: data.metrics || [],
      isHidden: data.isHidden ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.highlights.add(highlight);
    return highlight;
  }

  async updateHighlight(id: string, data: UpdateHighlight): Promise<Highlight> {
    const existing = await this.db.highlights.get(id);
    if (!existing) throw new Error('Highlight not found');

    const updated: Highlight = {
      ...existing,
      ...data,
      endDate: data.endDate === '' ? null : (data.endDate ?? existing.endDate),
      domains: data.domains ?? existing.domains,
      skills: data.skills ?? existing.skills,
      keywords: data.keywords ?? existing.keywords,
      metrics: data.metrics ?? existing.metrics,
      updatedAt: new Date().toISOString(),
    };
    await this.db.highlights.put(updated);
    return updated;
  }

  async deleteHighlight(id: string): Promise<Highlight> {
    const existing = await this.db.highlights.get(id);
    if (!existing) throw new Error('Highlight not found');
    await this.db.highlights.delete(id);
    return existing;
  }

  async toggleHighlightVisibility(id: string): Promise<Highlight> {
    const existing = await this.db.highlights.get(id);
    if (!existing) throw new Error('Highlight not found');

    const updated = {
      ...existing,
      isHidden: !existing.isHidden,
      updatedAt: new Date().toISOString(),
    };
    await this.db.highlights.put(updated);
    return updated;
  }

  async getProfile(): Promise<{ fullName: string } | null> {
    const row = await this.db.profile.get('default');
    return row ? { fullName: row.fullName } : null;
  }

  async updateProfile(data: { fullName: string }): Promise<{ fullName: string }> {
    await this.db.profile.put({
      id: 'default',
      fullName: data.fullName,
      updatedAt: new Date().toISOString(),
    });
    return { fullName: data.fullName };
  }

  async getAllHighlightsWithJobs(): Promise<HighlightWithJob[]> {
    const allHighlights = await this.db.highlights
      .orderBy('startDate')
      .reverse()
      .toArray();
    const visibleHighlights = allHighlights.filter((h) => !h.isHidden);

    const allJobs = await this.db.jobs.toArray();
    const jobMap = new Map<string, Job>();
    for (const j of allJobs) jobMap.set(j.id, j);

    return visibleHighlights.map((h) => ({
      ...h,
      job: h.jobId ? jobMap.get(h.jobId) || null : null,
    }));
  }

  async searchHighlights(filters: SearchFilters = {}): Promise<HighlightWithJob[]> {
    const all = await this.getAllHighlightsWithJobs();
    return this.applyFilters(all, filters);
  }

  async searchJobsWithHighlights(
    filters: SearchFilters = {}
  ): Promise<JobWithFilteredHighlights[]> {
    const allJobs = await this.db.jobs
      .orderBy('startDate')
      .reverse()
      .toArray();
    const allHighlights = await this.db.highlights
      .orderBy('startDate')
      .reverse()
      .toArray();
    const visibleHighlights = allHighlights.filter((h) => !h.isHidden);

    const countByJob = new Map<string, number>();
    for (const h of visibleHighlights) {
      if (h.jobId)
        countByJob.set(h.jobId, (countByJob.get(h.jobId) || 0) + 1);
    }

    let filtered = [...visibleHighlights];
    if (filters.query?.trim()) {
      const q = filters.query.toLowerCase().trim();
      filtered = filtered.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          h.content.toLowerCase().includes(q)
      );
    }
    if (filters.types?.length) {
      filtered = filtered.filter((h) => filters.types!.includes(h.type));
    }
    if (filters.domains?.length) {
      filtered = filtered.filter((h) =>
        h.domains.some((d) => filters.domains!.includes(d))
      );
    }
    if (filters.skills?.length) {
      filtered = filtered.filter((h) =>
        h.skills.some((s) => filters.skills!.includes(s))
      );
    }
    if (filters.onlyWithMetrics) {
      filtered = filtered.filter((h) => h.metrics && h.metrics.length > 0);
    }

    const filteredByJob = new Map<string, Highlight[]>();
    for (const h of filtered) {
      if (h.jobId) {
        if (!filteredByJob.has(h.jobId)) filteredByJob.set(h.jobId, []);
        filteredByJob.get(h.jobId)!.push(h);
      }
    }

    return allJobs.map((job) => ({
      ...job,
      highlights: filteredByJob.get(job.id) || [],
      allHighlightsCount: countByJob.get(job.id) || 0,
    }));
  }

  async getAllDomains(): Promise<string[]> {
    const all = await this.db.highlights
      .filter((h) => !h.isHidden)
      .toArray();
    const set = new Set<string>();
    for (const h of all) {
      if (h.domains) for (const d of h.domains) set.add(d);
    }
    return Array.from(set).sort();
  }

  async getAllSkills(): Promise<string[]> {
    const all = await this.db.highlights
      .filter((h) => !h.isHidden)
      .toArray();
    const set = new Set<string>();
    for (const h of all) {
      if (h.skills) for (const s of h.skills) set.add(s);
    }
    return Array.from(set).sort();
  }

  async exportDatabase(): Promise<BackupData> {
    const allJobs = await this.db.jobs.orderBy('startDate').toArray();
    const allHighlights = await this.db.highlights
      .orderBy('startDate')
      .toArray();
    const profileData = await this.getProfile();

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      jobs: allJobs,
      highlights: allHighlights,
      ...(profileData?.fullName ? { profile: profileData } : {}),
    };
  }

  async importDatabase(data: BackupData): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      jobsImported: 0,
      highlightsImported: 0,
      errors: [],
    };

    for (const job of data.jobs) {
      try {
        await this.db.jobs.put(job as Job);
        result.jobsImported++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Failed to import job ${job.id}: ${msg}`);
      }
    }

    for (const h of data.highlights) {
      try {
        await this.db.highlights.put(h as Highlight);
        result.highlightsImported++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Failed to import highlight ${h.id}: ${msg}`);
      }
    }

    if (data.profile?.fullName) {
      try {
        await this.updateProfile({ fullName: data.profile.fullName });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Failed to import profile: ${msg}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  async clearDatabase(): Promise<{ jobsDeleted: number; highlightsDeleted: number }> {
    const jobsDeleted = await this.db.jobs.count();
    const highlightsDeleted = await this.db.highlights.count();

    await this.db.highlights.clear();
    await this.db.jobs.clear();

    return { jobsDeleted, highlightsDeleted };
  }

  /**
   * Export all raw data for migration to server.
   */
  async exportAllRawData(): Promise<{ jobs: Job[]; highlights: Highlight[]; profile?: { fullName: string } }> {
    const allJobs = await this.db.jobs.toArray();
    const allHighlights = await this.db.highlights.toArray();
    const profileData = await this.getProfile();
    return {
      jobs: allJobs,
      highlights: allHighlights,
      ...(profileData?.fullName ? { profile: profileData } : {}),
    };
  }

  private applyFilters(
    items: HighlightWithJob[],
    filters: SearchFilters
  ): HighlightWithJob[] {
    let result = items;

    if (filters.query?.trim()) {
      const q = filters.query.toLowerCase().trim();
      result = result.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          h.content.toLowerCase().includes(q)
      );
    }
    if (filters.types?.length) {
      result = result.filter((h) => filters.types!.includes(h.type));
    }
    if (filters.domains?.length) {
      result = result.filter((h) =>
        h.domains.some((d) => filters.domains!.includes(d))
      );
    }
    if (filters.skills?.length) {
      result = result.filter((h) =>
        h.skills.some((s) => filters.skills!.includes(s))
      );
    }
    if (filters.onlyWithMetrics) {
      result = result.filter((h) => h.metrics && h.metrics.length > 0);
    }

    return result;
  }
}
