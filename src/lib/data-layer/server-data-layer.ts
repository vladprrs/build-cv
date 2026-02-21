import { eq, desc, sql, and, asc } from 'drizzle-orm';
import { jobs, highlights } from '@/db/schema';
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

type DrizzleDb = Parameters<typeof ServerDataLayer['prototype']['_unused']> extends never
  ? ReturnType<typeof import('@/db').getOwnerDb>
  : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDrizzle = any;

export class ServerDataLayer implements DataLayer {
  constructor(private db: AnyDrizzle) {}

  async getJobs(): Promise<(Job & { highlightCount: number })[]> {
    return this.db
      .select({
        id: jobs.id,
        company: jobs.company,
        role: jobs.role,
        startDate: jobs.startDate,
        endDate: jobs.endDate,
        logoUrl: jobs.logoUrl,
        website: jobs.website,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        highlightCount: sql<number>`COUNT(${highlights.id})`.mapWith(Number),
      })
      .from(jobs)
      .leftJoin(highlights, eq(jobs.id, highlights.jobId))
      .groupBy(jobs.id)
      .orderBy(desc(jobs.startDate));
  }

  async getJobById(id: string): Promise<Job | null> {
    const result = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, id))
      .limit(1);
    return result[0] || null;
  }

  async createJob(data: InsertJob): Promise<Job> {
    const now = new Date().toISOString();
    const result = await this.db
      .insert(jobs)
      .values({
        id: crypto.randomUUID(),
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return result[0];
  }

  async updateJob(id: string, data: UpdateJob): Promise<Job> {
    const cleanedData = {
      ...data,
      endDate: data.endDate === '' ? null : data.endDate,
      logoUrl: data.logoUrl === '' ? null : data.logoUrl,
      website: data.website === '' ? null : data.website,
    };

    const now = new Date().toISOString();
    const result = await this.db
      .update(jobs)
      .set({ ...cleanedData, updatedAt: now })
      .where(eq(jobs.id, id))
      .returning();

    if (result.length === 0) throw new Error('Job not found');
    return result[0];
  }

  async deleteJob(id: string): Promise<Job> {
    await this.db
      .update(highlights)
      .set({ jobId: null })
      .where(eq(highlights.jobId, id));

    const result = await this.db
      .delete(jobs)
      .where(eq(jobs.id, id))
      .returning();

    if (result.length === 0) throw new Error('Job not found');
    return result[0];
  }

  async getJobsWithHighlights(): Promise<JobWithHighlights[]> {
    const allJobs = await this.db
      .select()
      .from(jobs)
      .orderBy(desc(jobs.startDate));

    const allHighlights = await this.db
      .select()
      .from(highlights)
      .where(eq(highlights.isHidden, false))
      .orderBy(desc(highlights.startDate));

    const highlightsByJob = new Map<string, Highlight[]>();
    for (const h of allHighlights) {
      if (h.jobId) {
        if (!highlightsByJob.has(h.jobId)) highlightsByJob.set(h.jobId, []);
        highlightsByJob.get(h.jobId)!.push(h);
      }
    }

    return allJobs.map((job) => ({
      ...job,
      highlights: highlightsByJob.get(job.id) || [],
    }));
  }

  async getHighlights(filters?: {
    jobId?: string;
    type?: string;
    isHidden?: boolean;
  }): Promise<Highlight[]> {
    const conditions = [];
    if (filters?.jobId) conditions.push(eq(highlights.jobId, filters.jobId));
    if (filters?.type) conditions.push(eq(highlights.type, filters.type));
    if (filters?.isHidden !== undefined)
      conditions.push(eq(highlights.isHidden, filters.isHidden));

    if (conditions.length === 0) {
      return this.db
        .select()
        .from(highlights)
        .orderBy(desc(highlights.startDate));
    }

    return this.db
      .select()
      .from(highlights)
      .where(and(...conditions))
      .orderBy(desc(highlights.startDate));
  }

  async getHighlightById(id: string): Promise<Highlight | null> {
    const result = await this.db
      .select()
      .from(highlights)
      .where(eq(highlights.id, id))
      .limit(1);
    return result[0] || null;
  }

  async createHighlight(data: InsertHighlight): Promise<Highlight> {
    const now = new Date().toISOString();
    const result = await this.db
      .insert(highlights)
      .values({
        id: crypto.randomUUID(),
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return result[0];
  }

  async updateHighlight(id: string, data: UpdateHighlight): Promise<Highlight> {
    const existing = await this.getHighlightById(id);
    if (!existing) throw new Error('Highlight not found');

    const now = new Date().toISOString();
    const cleanedData = {
      ...data,
      endDate: data.endDate === '' ? null : data.endDate,
      domains: data.domains ?? existing.domains,
      skills: data.skills ?? existing.skills,
      keywords: data.keywords ?? existing.keywords,
      metrics: data.metrics ?? existing.metrics,
    };

    const result = await this.db
      .update(highlights)
      .set({ ...cleanedData, updatedAt: now })
      .where(eq(highlights.id, id))
      .returning();
    return result[0];
  }

  async deleteHighlight(id: string): Promise<Highlight> {
    const result = await this.db
      .delete(highlights)
      .where(eq(highlights.id, id))
      .returning();
    if (result.length === 0) throw new Error('Highlight not found');
    return result[0];
  }

  async toggleHighlightVisibility(id: string): Promise<Highlight> {
    const existing = await this.getHighlightById(id);
    if (!existing) throw new Error('Highlight not found');

    const result = await this.db
      .update(highlights)
      .set({ isHidden: !existing.isHidden, updatedAt: new Date().toISOString() })
      .where(eq(highlights.id, id))
      .returning();
    return result[0];
  }

  async getAllHighlightsWithJobs(): Promise<HighlightWithJob[]> {
    const allHighlights = await this.db
      .select()
      .from(highlights)
      .where(eq(highlights.isHidden, false))
      .orderBy(desc(highlights.startDate));

    const allJobs = await this.db.select().from(jobs);
    const jobMap = new Map<string, Job>();
    for (const job of allJobs) jobMap.set(job.id, job);

    return allHighlights.map((h: Highlight) => ({
      ...h,
      job: h.jobId ? jobMap.get(h.jobId) || null : null,
    }));
  }

  async searchHighlights(filters: SearchFilters = {}): Promise<HighlightWithJob[]> {
    const allHighlights = await this.db
      .select()
      .from(highlights)
      .where(eq(highlights.isHidden, false))
      .orderBy(desc(highlights.startDate));

    const allJobs = await this.db.select().from(jobs);
    const jobMap = new Map<string, Job>();
    for (const job of allJobs) jobMap.set(job.id, job);

    let filtered: HighlightWithJob[] = allHighlights.map((h: Highlight) => ({
      ...h,
      job: h.jobId ? jobMap.get(h.jobId) || null : null,
    }));

    filtered = this.applyFilters(filtered, filters);
    return filtered;
  }

  async searchJobsWithHighlights(
    filters: SearchFilters = {}
  ): Promise<JobWithFilteredHighlights[]> {
    const allJobs = await this.db
      .select()
      .from(jobs)
      .orderBy(desc(jobs.startDate));

    const allHighlights = await this.db
      .select()
      .from(highlights)
      .where(eq(highlights.isHidden, false))
      .orderBy(desc(highlights.startDate));

    const highlightCountByJob = new Map<string, number>();
    for (const h of allHighlights) {
      if (h.jobId) {
        highlightCountByJob.set(
          h.jobId,
          (highlightCountByJob.get(h.jobId) || 0) + 1
        );
      }
    }

    let filteredHighlights = [...allHighlights];

    if (filters.query?.trim()) {
      const q = filters.query.toLowerCase().trim();
      filteredHighlights = filteredHighlights.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          h.content.toLowerCase().includes(q)
      );
    }
    if (filters.types?.length) {
      filteredHighlights = filteredHighlights.filter((h) =>
        filters.types!.includes(h.type)
      );
    }
    if (filters.domains?.length) {
      filteredHighlights = filteredHighlights.filter((h) =>
        h.domains.some((d: string) => filters.domains!.includes(d))
      );
    }
    if (filters.skills?.length) {
      filteredHighlights = filteredHighlights.filter((h) =>
        h.skills.some((s: string) => filters.skills!.includes(s))
      );
    }
    if (filters.onlyWithMetrics) {
      filteredHighlights = filteredHighlights.filter(
        (h) => h.metrics && h.metrics.length > 0
      );
    }

    const filteredByJob = new Map<string, Highlight[]>();
    for (const h of filteredHighlights) {
      if (h.jobId) {
        if (!filteredByJob.has(h.jobId)) filteredByJob.set(h.jobId, []);
        filteredByJob.get(h.jobId)!.push(h);
      }
    }

    return allJobs.map((job) => ({
      ...job,
      highlights: filteredByJob.get(job.id) || [],
      allHighlightsCount: highlightCountByJob.get(job.id) || 0,
    }));
  }

  async getAllDomains(): Promise<string[]> {
    const all = await this.db
      .select({ domains: highlights.domains })
      .from(highlights)
      .where(eq(highlights.isHidden, false));

    const set = new Set<string>();
    for (const h of all) {
      if (h.domains) for (const d of h.domains) set.add(d);
    }
    return Array.from(set).sort();
  }

  async getAllSkills(): Promise<string[]> {
    const all = await this.db
      .select({ skills: highlights.skills })
      .from(highlights)
      .where(eq(highlights.isHidden, false));

    const set = new Set<string>();
    for (const h of all) {
      if (h.skills) for (const s of h.skills) set.add(s);
    }
    return Array.from(set).sort();
  }

  async exportDatabase(): Promise<BackupData> {
    const allJobs = await this.db
      .select()
      .from(jobs)
      .orderBy(asc(jobs.startDate), asc(jobs.company), asc(jobs.role));
    const allHighlights = await this.db
      .select()
      .from(highlights)
      .orderBy(asc(highlights.startDate), asc(highlights.title));

    // Use simple IDs for export - the slug logic stays in the server action layer
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      jobs: allJobs,
      highlights: allHighlights,
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
        await this.db
          .insert(jobs)
          .values(job)
          .onConflictDoUpdate({
            target: jobs.id,
            set: {
              company: job.company,
              role: job.role,
              startDate: job.startDate,
              endDate: job.endDate,
              logoUrl: job.logoUrl,
              website: job.website,
              updatedAt: new Date().toISOString(),
            },
          });
        result.jobsImported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Failed to import job ${job.id}: ${message}`);
      }
    }

    for (const highlight of data.highlights) {
      try {
        await this.db
          .insert(highlights)
          .values(highlight)
          .onConflictDoUpdate({
            target: highlights.id,
            set: {
              jobId: highlight.jobId,
              type: highlight.type,
              title: highlight.title,
              content: highlight.content,
              startDate: highlight.startDate,
              endDate: highlight.endDate,
              domains: highlight.domains,
              skills: highlight.skills,
              keywords: highlight.keywords,
              metrics: highlight.metrics,
              isHidden: highlight.isHidden,
              updatedAt: new Date().toISOString(),
            },
          });
        result.highlightsImported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Failed to import highlight ${highlight.id}: ${message}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  async clearDatabase(): Promise<{ jobsDeleted: number; highlightsDeleted: number }> {
    const hCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(highlights);
    const jCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs);

    const highlightsDeleted = Number(hCount[0]?.count ?? 0);
    const jobsDeleted = Number(jCount[0]?.count ?? 0);

    await this.db.delete(highlights);
    await this.db.delete(jobs);

    return { jobsDeleted, highlightsDeleted };
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
