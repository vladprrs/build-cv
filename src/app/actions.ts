'use server';

import { db } from '@/db';
import { jobs, highlights } from '@/db/schema';
import { eq, desc, sql, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generateN8nWorkflow } from '@/lib/n8n/workflow';
import type {
  N8nWorkflowOptions,
  RAGExportData,
  RAGExportHighlight,
} from '@/lib/n8n/types';

// ============ TYPES ============

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

// ============ VALIDATION SCHEMAS ============

const jobSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  role: z.string().min(1, 'Role is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
}).refine((data) => {
  if (!data.endDate) return true;
  return data.startDate <= data.endDate;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// ============ SERVER ACTIONS ============

/**
 * Get all jobs with highlight count, sorted by start date (newest first)
 */
export async function getJobs(): Promise<(Job & { highlightCount: number })[]> {
  const result = await db
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

  return result;
}

/**
 * Get single job by ID
 */
export async function getJobById(id: string): Promise<Job | null> {
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Create a new job
 */
export async function createJob(data: Omit<NewJob, 'id' | 'createdAt' | 'updatedAt'>) {
  // Validate input
  const validated = jobSchema.parse(data);

  const now = new Date().toISOString();
  const result = await db
    .insert(jobs)
    .values({
      id: crypto.randomUUID(),
      ...validated,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  revalidatePath('/jobs');
  revalidatePath('/');
  
  return result[0];
}

/**
 * Update an existing job
 */
export async function updateJob(id: string, data: Partial<Omit<NewJob, 'id' | 'createdAt' | 'updatedAt'>>) {
  try {
    // Clean up empty strings to null
    const cleanedData = {
      company: data.company,
      role: data.role,
      startDate: data.startDate,
      endDate: data.endDate === '' || data.endDate === undefined ? null : data.endDate,
      logoUrl: data.logoUrl === '' || data.logoUrl === undefined ? null : data.logoUrl,
      website: data.website === '' || data.website === undefined ? null : data.website,
    };

    // Manual validation instead of Zod for now
    if (!cleanedData.company || cleanedData.company.trim() === '') {
      throw new Error('Company name is required');
    }
    if (!cleanedData.role || cleanedData.role.trim() === '') {
      throw new Error('Role is required');
    }
    if (!cleanedData.startDate) {
      throw new Error('Start date is required');
    }

    // Check dates if both provided
    if (cleanedData.startDate && cleanedData.endDate) {
      if (cleanedData.startDate > cleanedData.endDate) {
        throw new Error('End date must be after start date');
      }
    }

    const now = new Date().toISOString();
    const result = await db
      .update(jobs)
      .set({
        ...cleanedData,
        updatedAt: now,
      })
      .where(eq(jobs.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error('Job not found');
    }

    revalidatePath('/jobs');
    revalidatePath('/');
    
    return result[0];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update job';
    throw new Error(message);
  }
}

/**
 * Delete a job (soft delete by hiding)
 * Note: Currently using hard delete, highlights will be orphaned with jobId = null
 */
export async function deleteJob(id: string) {
  // First, set jobId to null for all related highlights
  await db
    .update(highlights)
    .set({ jobId: null })
    .where(eq(highlights.jobId, id));

  // Then delete the job
  const result = await db
    .delete(jobs)
    .where(eq(jobs.id, id))
    .returning();

  if (result.length === 0) {
    throw new Error('Job not found');
  }

  revalidatePath('/jobs');
  revalidatePath('/');
  
  return result[0];
}

// ============ HIGHLIGHT TYPES & SCHEMAS ============

export type Highlight = typeof highlights.$inferSelect;
export type NewHighlight = typeof highlights.$inferInsert;
export type HighlightType = 'achievement' | 'project' | 'responsibility' | 'education';

export interface Metric {
  label: string;
  value: number;
  unit: string;
  prefix?: string;
  description?: string;
}

const metricSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  value: z.number(),
  unit: z.string().default(''),
  prefix: z.string().optional(),
  description: z.string().optional(),
});

const highlightSchema = z.object({
  jobId: z.string().uuid().nullable().optional(),
  type: z.enum(['achievement', 'project', 'responsibility', 'education']),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  domains: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  metrics: z.array(metricSchema).default([]),
  isHidden: z.boolean().default(false),
});

// ============ HIGHLIGHT SERVER ACTIONS ============

/**
 * Get all highlights for a specific job
 */
export async function getHighlightsByJobId(jobId: string): Promise<Highlight[]> {
  const result = await db
    .select()
    .from(highlights)
    .where(eq(highlights.jobId, jobId))
    .orderBy(desc(highlights.startDate));
  
  return result;
}

/**
 * Get all highlights with optional filters
 */
export async function getHighlights(filters?: {
  jobId?: string;
  type?: HighlightType;
  isHidden?: boolean;
}): Promise<Highlight[]> {
  const conditions = [];
  
  if (filters?.jobId) {
    conditions.push(eq(highlights.jobId, filters.jobId));
  }
  if (filters?.type) {
    conditions.push(eq(highlights.type, filters.type));
  }
  if (filters?.isHidden !== undefined) {
    conditions.push(eq(highlights.isHidden, filters.isHidden));
  }
  
  if (conditions.length === 0) {
    const result = await db
      .select()
      .from(highlights)
      .orderBy(desc(highlights.startDate));
    return result;
  }
  
  const result = await db
    .select()
    .from(highlights)
    .where(and(...conditions))
    .orderBy(desc(highlights.startDate));
  return result;
}

/**
 * Get a single highlight by ID
 */
export async function getHighlightById(id: string): Promise<Highlight | null> {
  const result = await db
    .select()
    .from(highlights)
    .where(eq(highlights.id, id))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Create a new highlight
 */
export async function createHighlight(data: Omit<NewHighlight, 'id' | 'createdAt' | 'updatedAt'>) {
  // Validate input
  const validated = highlightSchema.parse(data);
  
  const now = new Date().toISOString();
  const result = await db
    .insert(highlights)
    .values({
      id: crypto.randomUUID(),
      ...validated,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  revalidatePath('/jobs');
  revalidatePath('/');
  if (validated.jobId) {
    revalidatePath(`/jobs/${validated.jobId}`);
  }
  
  return result[0];
}

/**
 * Update an existing highlight
 */
export async function updateHighlight(id: string, data: Partial<Omit<NewHighlight, 'id' | 'createdAt' | 'updatedAt'>>) {
  const existing = await getHighlightById(id);
  if (!existing) {
    throw new Error('Highlight not found');
  }

  const now = new Date().toISOString();
  
  // Clean up the data
  const cleanedData = {
    ...data,
    endDate: data.endDate === '' || data.endDate === undefined ? null : data.endDate,
    domains: data.domains ?? existing.domains,
    skills: data.skills ?? existing.skills,
    keywords: data.keywords ?? existing.keywords,
    metrics: data.metrics ?? existing.metrics,
  };

  const result = await db
    .update(highlights)
    .set({
      ...cleanedData,
      updatedAt: now,
    })
    .where(eq(highlights.id, id))
    .returning();

  revalidatePath('/jobs');
  revalidatePath('/');
  if (existing.jobId) {
    revalidatePath(`/jobs/${existing.jobId}`);
  }
  
  return result[0];
}

/**
 * Delete a highlight
 */
export async function deleteHighlight(id: string) {
  const existing = await getHighlightById(id);
  if (!existing) {
    throw new Error('Highlight not found');
  }

  const result = await db
    .delete(highlights)
    .where(eq(highlights.id, id))
    .returning();

  revalidatePath('/jobs');
  revalidatePath('/');
  if (existing.jobId) {
    revalidatePath(`/jobs/${existing.jobId}`);
  }
  
  return result[0];
}

/**
 * Get all jobs with their highlights (for Timeline view)
 */
export interface JobWithHighlights extends Job {
  highlights: Highlight[];
}

export async function getJobsWithHighlights(): Promise<JobWithHighlights[]> {
  // First, get all jobs sorted by start date
  const allJobs = await db
    .select()
    .from(jobs)
    .orderBy(desc(jobs.startDate));

  // Get all visible highlights
  const allHighlights = await db
    .select()
    .from(highlights)
    .where(eq(highlights.isHidden, false))
    .orderBy(desc(highlights.startDate));

  // Group highlights by jobId
  const highlightsByJob = new Map<string, Highlight[]>();
  for (const highlight of allHighlights) {
    if (highlight.jobId) {
      if (!highlightsByJob.has(highlight.jobId)) {
        highlightsByJob.set(highlight.jobId, []);
      }
      highlightsByJob.get(highlight.jobId)!.push(highlight);
    }
  }

  // Map jobs with their highlights
  return allJobs.map((job) => ({
    ...job,
    highlights: highlightsByJob.get(job.id) || [],
  }));
}

/**
 * Toggle highlight visibility (soft delete)
 */
export async function toggleHighlightVisibility(id: string) {
  const existing = await getHighlightById(id);
  if (!existing) {
    throw new Error('Highlight not found');
  }

  const result = await db
    .update(highlights)
    .set({ isHidden: !existing.isHidden, updatedAt: new Date().toISOString() })
    .where(eq(highlights.id, id))
    .returning();

  revalidatePath('/jobs');
  revalidatePath('/');
  revalidatePath('/highlights');
  if (existing.jobId) {
    revalidatePath(`/jobs/${existing.jobId}`);
  }
  
  return result[0];
}

// ============ TABLE VIEW ACTIONS ============

export interface HighlightWithJob extends Highlight {
  job: Job | null;
}

/**
 * Get all highlights with their associated job info (for Table view)
 */
export async function getAllHighlightsWithJobs(): Promise<HighlightWithJob[]> {
  // Get all non-hidden highlights
  const allHighlights = await db
    .select()
    .from(highlights)
    .where(eq(highlights.isHidden, false))
    .orderBy(desc(highlights.startDate));

  // Get all jobs
  const allJobs = await db.select().from(jobs);
  
  // Create job lookup map
  const jobMap = new Map<string, Job>();
  for (const job of allJobs) {
    jobMap.set(job.id, job);
  }

  // Map highlights with their jobs
  return allHighlights.map((highlight) => ({
    ...highlight,
    job: highlight.jobId ? jobMap.get(highlight.jobId) || null : null,
  }));
}

/**
 * Bulk delete highlights
 */
export async function bulkDeleteHighlights(ids: string[]) {
  if (ids.length === 0) return { deleted: 0 };

  // Get jobIds for revalidation
  const highlightsToDelete = await db
    .select({ id: highlights.id, jobId: highlights.jobId })
    .from(highlights)
    .where(sql`${highlights.id} IN (${ids.join(',')})`);

  const jobIds = [...new Set(highlightsToDelete.map(h => h.jobId).filter(Boolean))];

  // Delete highlights
  const result = await db
    .delete(highlights)
    .where(sql`${highlights.id} IN (${ids.join(',')})`)
    .returning();

  // Revalidate all affected paths
  revalidatePath('/jobs');
  revalidatePath('/');
  revalidatePath('/highlights');
  for (const jobId of jobIds) {
    if (jobId) revalidatePath(`/jobs/${jobId}`);
  }

  return { deleted: result.length };
}

/**
 * Quick update highlight title (inline editing)
 */
export async function quickUpdateHighlightTitle(id: string, title: string) {
  if (!title.trim()) {
    throw new Error('Title is required');
  }

  const existing = await getHighlightById(id);
  if (!existing) {
    throw new Error('Highlight not found');
  }

  const result = await db
    .update(highlights)
    .set({ 
      title: title.trim(), 
      updatedAt: new Date().toISOString() 
    })
    .where(eq(highlights.id, id))
    .returning();

  revalidatePath('/jobs');
  revalidatePath('/');
  revalidatePath('/highlights');
  if (existing.jobId) {
    revalidatePath(`/jobs/${existing.jobId}`);
  }

  return result[0];
}

// ============ SEARCH & FILTER ACTIONS ============

export interface SearchFilters {
  query?: string;
  types?: HighlightType[];
  domains?: string[];
  skills?: string[];
  onlyWithMetrics?: boolean;
}

/**
 * Search highlights with filters
 * Supports:
 * - Full-text search in title and content
 * - Filter by type (multi-select)
 * - Filter by domain (multi-select) - checks if highlight.domains overlaps with filter
 * - Filter by skills (multi-select) - checks if highlight.skills overlaps with filter
 * - Only with metrics toggle
 */
export async function searchHighlights(filters: SearchFilters = {}): Promise<HighlightWithJob[]> {
  const { query, types, domains, skills, onlyWithMetrics } = filters;
  
  // Get all non-hidden highlights with their jobs
  const allHighlights = await db
    .select()
    .from(highlights)
    .where(eq(highlights.isHidden, false))
    .orderBy(desc(highlights.startDate));

  // Get all jobs for mapping
  const allJobs = await db.select().from(jobs);
  const jobMap = new Map<string, Job>();
  for (const job of allJobs) {
    jobMap.set(job.id, job);
  }

  // Map and filter highlights
  let filteredHighlights: HighlightWithJob[] = allHighlights.map((highlight) => ({
    ...highlight,
    job: highlight.jobId ? jobMap.get(highlight.jobId) || null : null,
  }));

  // Apply text search (case-insensitive)
  if (query && query.trim()) {
    const searchTerm = query.toLowerCase().trim();
    filteredHighlights = filteredHighlights.filter(
      (h) =>
        h.title.toLowerCase().includes(searchTerm) ||
        h.content.toLowerCase().includes(searchTerm)
    );
  }

  // Apply type filter
  if (types && types.length > 0) {
    filteredHighlights = filteredHighlights.filter((h) => types.includes(h.type));
  }

  // Apply domain filter (highlight must have at least one of the selected domains)
  if (domains && domains.length > 0) {
    filteredHighlights = filteredHighlights.filter((h) =>
      h.domains.some((d) => domains.includes(d))
    );
  }

  // Apply skills filter (highlight must have at least one of the selected skills)
  if (skills && skills.length > 0) {
    filteredHighlights = filteredHighlights.filter((h) =>
      h.skills.some((s) => skills.includes(s))
    );
  }

  // Apply "only with metrics" filter
  if (onlyWithMetrics) {
    filteredHighlights = filteredHighlights.filter(
      (h) => h.metrics && h.metrics.length > 0
    );
  }

  return filteredHighlights;
}

/**
 * Get all unique domains from highlights (for filter dropdown)
 */
export async function getAllDomains(): Promise<string[]> {
  const allHighlights = await db
    .select({ domains: highlights.domains })
    .from(highlights)
    .where(eq(highlights.isHidden, false));

  const domainSet = new Set<string>();
  for (const h of allHighlights) {
    if (h.domains) {
      for (const d of h.domains) {
        domainSet.add(d);
      }
    }
  }

  return Array.from(domainSet).sort();
}

/**
 * Get all unique skills from highlights (for filter dropdown)
 */
export async function getAllSkills(): Promise<string[]> {
  const allHighlights = await db
    .select({ skills: highlights.skills })
    .from(highlights)
    .where(eq(highlights.isHidden, false));

  const skillSet = new Set<string>();
  for (const h of allHighlights) {
    if (h.skills) {
      for (const s of h.skills) {
        skillSet.add(s);
      }
    }
  }

  return Array.from(skillSet).sort();
}

// ============ BACKUP & IMPORT ============

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
}

/**
 * Export all database data for backup
 */
const slugRegex = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

function slugify(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
}

function ensureUniqueSlug(base: string, used: Map<string, number>) {
  const count = used.get(base) ?? 0;
  if (count === 0) {
    used.set(base, 1);
    return base;
  }

  const next = count + 1;
  used.set(base, next);
  return `${base}-${next}`;
}

function buildJobSlug(job: Job) {
  return slugify(`${job.company}-${job.role}-${job.startDate}`, 'job');
}

function buildHighlightSlug(highlight: Highlight, jobSlug?: string | null) {
  const base = jobSlug
    ? `${jobSlug}-${highlight.title}-${highlight.startDate}`
    : `${highlight.title}-${highlight.startDate}`;
  return slugify(base, 'highlight');
}

async function uuidFromSlug(slug: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`build-cv:${slug}`);
  let hashBytes: Uint8Array;

  if (globalThis.crypto?.subtle) {
    const hash = await globalThis.crypto.subtle.digest('SHA-1', data);
    hashBytes = new Uint8Array(hash);
  } else {
    const { createHash } = await import('crypto');
    hashBytes = new Uint8Array(createHash('sha1').update(data).digest());
  }

  const bytes = hashBytes.slice(0, 16);
  // Set version (5) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function exportDatabase(): Promise<BackupData> {
  const allJobs = await db
    .select()
    .from(jobs)
    .orderBy(asc(jobs.startDate), asc(jobs.company), asc(jobs.role));
  const allHighlights = await db
    .select()
    .from(highlights)
    .orderBy(asc(highlights.startDate), asc(highlights.title));

  const jobSlugMap = new Map<string, string>();
  const usedJobSlugs = new Map<string, number>();
  const exportedJobs: BackupJob[] = allJobs.map((job) => {
    const baseSlug = buildJobSlug(job);
    const slug = ensureUniqueSlug(baseSlug, usedJobSlugs);
    jobSlugMap.set(job.id, slug);
    return { ...job, id: slug };
  });

  const usedHighlightSlugs = new Map<string, number>();
  const exportedHighlights: BackupHighlight[] = allHighlights.map((highlight) => {
    const jobSlug = highlight.jobId ? jobSlugMap.get(highlight.jobId) : null;
    const baseSlug = buildHighlightSlug(highlight, jobSlug);
    const slug = ensureUniqueSlug(baseSlug, usedHighlightSlugs);
    return {
      ...highlight,
      id: slug,
      jobId: jobSlug ?? null,
    };
  });

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    jobs: exportedJobs,
    highlights: exportedHighlights,
  };
}

// Validation schema for backup import
const backupJobSchema = z.object({
  id: z.string().min(1).regex(slugRegex, 'Invalid slug format'),
  company: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const backupHighlightSchema = z.object({
  id: z.string().min(1).regex(slugRegex, 'Invalid slug format'),
  jobId: z.string().min(1).regex(slugRegex, 'Invalid slug format').nullable().optional(),
  type: z.enum(['achievement', 'project', 'responsibility', 'education']),
  title: z.string(),
  content: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  domains: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  metrics: z.array(z.object({
    label: z.string(),
    value: z.number(),
    unit: z.string(),
    prefix: z.string().optional(),
    description: z.string().optional(),
  })).default([]),
  isHidden: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const backupDataSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  jobs: z.array(backupJobSchema),
  highlights: z.array(backupHighlightSchema),
});

export interface ImportResult {
  success: boolean;
  jobsImported: number;
  highlightsImported: number;
  errors: string[];
}

/**
 * Import database from backup data
 * Uses REPLACE to overwrite existing records with same ID
 */
export async function importDatabase(backupData: unknown): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    jobsImported: 0,
    highlightsImported: 0,
    errors: [],
  };

  try {
    // Validate backup structure
    const validated = backupDataSchema.parse(backupData);

    const jobSlugToId = new Map<string, string>();

    // Import jobs first (highlights may reference them)
    for (const job of validated.jobs) {
      try {
        const jobId = await uuidFromSlug(`job:${job.id}`);
        jobSlugToId.set(job.id, jobId);

        await db
          .insert(jobs)
          .values({
            ...job,
            id: jobId,
          })
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

    // Import highlights
    for (const highlight of validated.highlights) {
      try {
        const highlightId = await uuidFromSlug(`highlight:${highlight.id}`);
        const resolvedJobId = highlight.jobId ? jobSlugToId.get(highlight.jobId) ?? null : null;
        if (highlight.jobId && !resolvedJobId) {
          result.errors.push(`Missing job for highlight ${highlight.id}: ${highlight.jobId}`);
        }

        await db
          .insert(highlights)
          .values({
            ...highlight,
            id: highlightId,
            jobId: resolvedJobId,
          })
          .onConflictDoUpdate({
            target: highlights.id,
            set: {
              jobId: resolvedJobId,
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

    // Revalidate all pages
    revalidatePath('/');
    revalidatePath('/jobs');
    revalidatePath('/highlights');
    revalidatePath('/export');

    return result;
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      result.errors = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
    } else {
      const message = err instanceof Error ? err.message : 'Unknown error during import';
      result.errors.push(message);
    }
    return result;
  }
}

/**
 * Clear all data (jobs and highlights)
 */
export async function clearDatabase(): Promise<{ jobsDeleted: number; highlightsDeleted: number }> {
  const highlightCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(highlights);
  const jobCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs);

  const highlightsDeleted = Number(highlightCountResult[0]?.count ?? 0);
  const jobsDeleted = Number(jobCountResult[0]?.count ?? 0);

  // Delete highlights first to avoid FK issues
  await db.delete(highlights);
  await db.delete(jobs);

  revalidatePath('/');
  revalidatePath('/jobs');
  revalidatePath('/highlights');
  revalidatePath('/export');
  revalidatePath('/settings');

  return { jobsDeleted, highlightsDeleted };
}

// ============ UNIFIED FEED ============

export interface JobWithFilteredHighlights extends Job {
  highlights: Highlight[];
  allHighlightsCount: number;
}

/**
 * Search jobs with filtered highlights for Unified Feed
 * Returns all jobs with their highlights filtered by search criteria
 * Jobs with no matching highlights are included but shown collapsed
 */
export async function searchJobsWithHighlights(
  filters: SearchFilters = {}
): Promise<JobWithFilteredHighlights[]> {
  // Get all jobs sorted by start date
  const allJobs = await db
    .select()
    .from(jobs)
    .orderBy(desc(jobs.startDate));

  // Get all visible highlights
  const allHighlights = await db
    .select()
    .from(highlights)
    .where(eq(highlights.isHidden, false))
    .orderBy(desc(highlights.startDate));

  // Get all jobs for mapping
  const allJobsMap = await db.select().from(jobs);
  const jobMap = new Map<string, Job>();
  for (const job of allJobsMap) {
    jobMap.set(job.id, job);
  }

  // Count total highlights per job (before filtering)
  const highlightCountByJob = new Map<string, number>();
  for (const h of allHighlights) {
    if (h.jobId) {
      highlightCountByJob.set(h.jobId, (highlightCountByJob.get(h.jobId) || 0) + 1);
    }
  }

  // Apply filters to highlights
  let filteredHighlights = allHighlights;

  // Text search
  if (filters.query && filters.query.trim()) {
    const searchTerm = filters.query.toLowerCase().trim();
    filteredHighlights = filteredHighlights.filter(
      (h) =>
        h.title.toLowerCase().includes(searchTerm) ||
        h.content.toLowerCase().includes(searchTerm)
    );
  }

  // Type filter
  if (filters.types && filters.types.length > 0) {
    filteredHighlights = filteredHighlights.filter((h) =>
      filters.types!.includes(h.type)
    );
  }

  // Domain filter
  if (filters.domains && filters.domains.length > 0) {
    filteredHighlights = filteredHighlights.filter((h) =>
      h.domains.some((d) => filters.domains!.includes(d))
    );
  }

  // Skills filter
  if (filters.skills && filters.skills.length > 0) {
    filteredHighlights = filteredHighlights.filter((h) =>
      h.skills.some((s) => filters.skills!.includes(s))
    );
  }

  // Only with metrics filter
  if (filters.onlyWithMetrics) {
    filteredHighlights = filteredHighlights.filter(
      (h) => h.metrics && h.metrics.length > 0
    );
  }

  // Group filtered highlights by job
  const filteredHighlightsByJob = new Map<string, Highlight[]>();
  for (const h of filteredHighlights) {
    if (h.jobId) {
      if (!filteredHighlightsByJob.has(h.jobId)) {
        filteredHighlightsByJob.set(h.jobId, []);
      }
      filteredHighlightsByJob.get(h.jobId)!.push(h);
    }
  }

  // Map jobs with their filtered highlights
  return allJobs.map((job) => ({
    ...job,
    highlights: filteredHighlightsByJob.get(job.id) || [],
    allHighlightsCount: highlightCountByJob.get(job.id) || 0,
  }));
}

// ============ RAG EXPORT ============


/**
 * Export highlights in RAG format for AI resume generation
 */
export async function exportHighlightsForRAG(
  customContext?: string,
  filters?: SearchFilters
): Promise<RAGExportData> {
  // Get filtered highlights
  const highlightsWithJobs = await searchHighlights(filters || {});

  // Format highlights for RAG
  const formattedHighlights: RAGExportHighlight[] = highlightsWithJobs.map((h) => {
    // Format period
    const startDate = h.startDate;
    const endDate = h.endDate || "Present";
    const period = `${startDate} - ${endDate}`;

    // Format metrics as string
    const metricsStr = h.metrics && h.metrics.length > 0
      ? h.metrics.map((m) => `${m.label}: ${m.prefix || ""}${m.value}${m.unit}`).join("; ")
      : "";

    // Combine all tags
    const tags = [...h.domains, ...h.skills, ...h.keywords];

    return {
      id: h.id,
      title: h.title,
      company: h.job?.company || undefined,
      period,
      description: h.content,
      metrics: metricsStr,
      tags,
    };
  });

  // Default context if not provided
  const context = customContext || 
    "Professional experience highlights for resume generation. Each highlight represents a specific achievement, project, responsibility, or education entry with associated metrics and tags.";

  return {
    context,
    request_filters: {
      domains: filters?.domains,
      skills: filters?.skills,
      types: filters?.types,
      query: filters?.query,
      onlyWithMetrics: filters?.onlyWithMetrics,
    },
    highlights: formattedHighlights,
  };
}

/**
 * Export n8n workflow for resume optimization using OpenRouter
 */
export async function exportN8nWorkflow(
  customContext?: string,
  filters?: SearchFilters,
  options?: N8nWorkflowOptions
) {
  const data = await exportHighlightsForRAG(customContext, filters);
  return generateN8nWorkflow(data, options);
}
