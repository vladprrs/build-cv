'use server';

import { db } from '@/db';
import { getUserDb } from '@/db';
import { jobs, highlights, profile } from '@/db/schema';
import { eq, desc, sql, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { ServerDataLayer } from '@/lib/data-layer/server-data-layer';
import type {
  SearchFilters,
  JobWithHighlights,
  HighlightWithJob,
  JobWithFilteredHighlights,
  BackupData,
  BackupJob,
  BackupHighlight,
  ImportResult,
} from '@/lib/data-types';

// ============ TYPES ============

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

// Re-export shared types from data-types for consumers
export type {
  SearchFilters,
  JobWithHighlights,
  HighlightWithJob,
  JobWithFilteredHighlights,
  BackupData,
  BackupJob,
  BackupHighlight,
  ImportResult,
} from '@/lib/data-types';

// ============ DATA LAYER HELPER ============

/**
 * Get the appropriate DataLayer for the current user.
 * Authenticated users get their own Turso DB; unauthenticated get the owner DB.
 */
async function getDataLayer(): Promise<ServerDataLayer> {
  const session = await auth();

  if (session?.user?.id) {
    try {
      const userDb = await getUserDb(session.user.id);
      return new ServerDataLayer(userDb);
    } catch {
      // If user DB not found/ready, fall back to owner DB
      // This handles the case during provisioning
      return new ServerDataLayer(db);
    }
  }

  // Unauthenticated — use owner DB (for backward compat)
  return new ServerDataLayer(db);
}

// ============ PROFILE ACTIONS ============

export async function getProfile(): Promise<{ fullName: string } | null> {
  const dl = await getDataLayer();
  return dl.getProfile();
}

export async function updateProfile(data: { fullName: string }): Promise<{ fullName: string }> {
  const dl = await getDataLayer();
  const result = await dl.updateProfile(data);
  revalidatePath('/');
  return result;
}

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

export async function getJobs(): Promise<(Job & { highlightCount: number })[]> {
  const dl = await getDataLayer();
  return dl.getJobs();
}

export async function getJobById(id: string): Promise<Job | null> {
  const dl = await getDataLayer();
  return dl.getJobById(id);
}

export async function createJob(data: Omit<NewJob, 'id' | 'createdAt' | 'updatedAt'>) {
  const validated = jobSchema.parse(data);
  const dl = await getDataLayer();
  const result = await dl.createJob({
    ...validated,
    endDate: validated.endDate ?? null,
    logoUrl: validated.logoUrl ?? null,
    website: validated.website ?? null,
  });

  revalidatePath('/jobs');
  revalidatePath('/');

  return result;
}

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

    if (!cleanedData.company || cleanedData.company.trim() === '') {
      throw new Error('Company name is required');
    }
    if (!cleanedData.role || cleanedData.role.trim() === '') {
      throw new Error('Role is required');
    }
    if (!cleanedData.startDate) {
      throw new Error('Start date is required');
    }
    if (cleanedData.startDate && cleanedData.endDate) {
      if (cleanedData.startDate > cleanedData.endDate) {
        throw new Error('End date must be after start date');
      }
    }

    const dl = await getDataLayer();
    const result = await dl.updateJob(id, cleanedData);

    revalidatePath('/jobs');
    revalidatePath('/');

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update job';
    throw new Error(message);
  }
}

export async function deleteJob(id: string) {
  const dl = await getDataLayer();
  const result = await dl.deleteJob(id);

  revalidatePath('/jobs');
  revalidatePath('/');

  return result;
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

export async function getHighlightsByJobId(jobId: string): Promise<Highlight[]> {
  const dl = await getDataLayer();
  return dl.getHighlights({ jobId });
}

export async function getHighlights(filters?: {
  jobId?: string;
  type?: HighlightType;
  isHidden?: boolean;
}): Promise<Highlight[]> {
  const dl = await getDataLayer();
  return dl.getHighlights(filters);
}

export async function getHighlightById(id: string): Promise<Highlight | null> {
  const dl = await getDataLayer();
  return dl.getHighlightById(id);
}

export async function createHighlight(data: Omit<NewHighlight, 'id' | 'createdAt' | 'updatedAt'>) {
  const validated = highlightSchema.parse(data);
  const dl = await getDataLayer();
  const result = await dl.createHighlight({
    ...validated,
    jobId: validated.jobId ?? null,
    endDate: validated.endDate ?? null,
  });

  revalidatePath('/jobs');
  revalidatePath('/');
  if (validated.jobId) {
    revalidatePath(`/jobs/${validated.jobId}`);
  }

  return result;
}

export async function updateHighlight(id: string, data: Partial<Omit<NewHighlight, 'id' | 'createdAt' | 'updatedAt'>>) {
  const dl = await getDataLayer();
  const existing = await dl.getHighlightById(id);
  if (!existing) throw new Error('Highlight not found');

  const result = await dl.updateHighlight(id, data);

  revalidatePath('/jobs');
  revalidatePath('/');
  if (existing.jobId) {
    revalidatePath(`/jobs/${existing.jobId}`);
  }

  return result;
}

export async function deleteHighlight(id: string) {
  const dl = await getDataLayer();
  const existing = await dl.getHighlightById(id);
  if (!existing) throw new Error('Highlight not found');

  const result = await dl.deleteHighlight(id);

  revalidatePath('/jobs');
  revalidatePath('/');
  if (existing.jobId) {
    revalidatePath(`/jobs/${existing.jobId}`);
  }

  return result;
}

export async function getJobsWithHighlights(): Promise<JobWithHighlights[]> {
  const dl = await getDataLayer();
  return dl.getJobsWithHighlights();
}

export async function toggleHighlightVisibility(id: string) {
  const dl = await getDataLayer();
  const result = await dl.toggleHighlightVisibility(id);

  revalidatePath('/jobs');
  revalidatePath('/');
  revalidatePath('/highlights');

  return result;
}

// ============ TABLE VIEW ACTIONS ============

export async function getAllHighlightsWithJobs(): Promise<HighlightWithJob[]> {
  const dl = await getDataLayer();
  return dl.getAllHighlightsWithJobs();
}

export async function bulkDeleteHighlights(ids: string[]) {
  if (ids.length === 0) return { deleted: 0 };

  // bulkDelete still uses raw db for the IN clause
  const session = await auth();
  let currentDb = db;
  if (session?.user?.id) {
    try {
      currentDb = await getUserDb(session.user.id);
    } catch {
      // fall back to owner db
    }
  }

  const highlightsToDelete = await currentDb
    .select({ id: highlights.id, jobId: highlights.jobId })
    .from(highlights)
    .where(sql`${highlights.id} IN (${ids.join(',')})`);

  const jobIds = [...new Set(highlightsToDelete.map(h => h.jobId).filter(Boolean))];

  const result = await currentDb
    .delete(highlights)
    .where(sql`${highlights.id} IN (${ids.join(',')})`)
    .returning();

  revalidatePath('/jobs');
  revalidatePath('/');
  revalidatePath('/highlights');
  for (const jobId of jobIds) {
    if (jobId) revalidatePath(`/jobs/${jobId}`);
  }

  return { deleted: result.length };
}

export async function quickUpdateHighlightTitle(id: string, title: string) {
  if (!title.trim()) throw new Error('Title is required');

  const dl = await getDataLayer();
  const existing = await dl.getHighlightById(id);
  if (!existing) throw new Error('Highlight not found');

  const result = await dl.updateHighlight(id, { title: title.trim() });

  revalidatePath('/jobs');
  revalidatePath('/');
  revalidatePath('/highlights');
  if (existing.jobId) {
    revalidatePath(`/jobs/${existing.jobId}`);
  }

  return result;
}

// ============ SEARCH & FILTER ACTIONS ============

export async function searchHighlights(filters: SearchFilters = {}): Promise<HighlightWithJob[]> {
  const dl = await getDataLayer();
  return dl.searchHighlights(filters);
}

export async function getAllDomains(): Promise<string[]> {
  const dl = await getDataLayer();
  return dl.getAllDomains();
}

export async function getAllSkills(): Promise<string[]> {
  const dl = await getDataLayer();
  return dl.getAllSkills();
}

// ============ BACKUP & IMPORT ============

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
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function exportDatabase(): Promise<BackupData> {
  // Export uses slug-based IDs for portability
  const session = await auth();
  let currentDb = db;
  if (session?.user?.id) {
    try {
      currentDb = await getUserDb(session.user.id);
    } catch {
      // fall back to owner db
    }
  }

  const allJobs = await currentDb
    .select()
    .from(jobs)
    .orderBy(asc(jobs.startDate), asc(jobs.company), asc(jobs.role));
  const allHighlights = await currentDb
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

  // Get profile data
  const profileResult = await currentDb
    .select({ fullName: profile.fullName })
    .from(profile)
    .where(eq(profile.id, 'default'))
    .limit(1);
  const profileData = profileResult[0];

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    jobs: exportedJobs,
    highlights: exportedHighlights,
    ...(profileData?.fullName ? { profile: profileData } : {}),
  };
}

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
  profile: z.object({ fullName: z.string() }).optional(),
});

export async function importDatabase(backupData: unknown): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    jobsImported: 0,
    highlightsImported: 0,
    errors: [],
  };

  try {
    const validated = backupDataSchema.parse(backupData);

    const session = await auth();
    let currentDb = db;
    if (session?.user?.id) {
      try {
        currentDb = await getUserDb(session.user.id);
      } catch {
        // fall back to owner db
      }
    }

    const jobSlugToId = new Map<string, string>();

    for (const job of validated.jobs) {
      try {
        const jobId = await uuidFromSlug(`job:${job.id}`);
        jobSlugToId.set(job.id, jobId);

        await currentDb
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

    for (const highlight of validated.highlights) {
      try {
        const highlightId = await uuidFromSlug(`highlight:${highlight.id}`);
        const resolvedJobId = highlight.jobId ? jobSlugToId.get(highlight.jobId) ?? null : null;
        if (highlight.jobId && !resolvedJobId) {
          result.errors.push(`Missing job for highlight ${highlight.id}: ${highlight.jobId}`);
        }

        await currentDb
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

    if (validated.profile?.fullName) {
      try {
        const now = new Date().toISOString();
        await currentDb
          .insert(profile)
          .values({ id: 'default', fullName: validated.profile.fullName, updatedAt: now })
          .onConflictDoUpdate({
            target: profile.id,
            set: { fullName: validated.profile.fullName, updatedAt: now },
          });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Failed to import profile: ${message}`);
      }
    }

    result.success = result.errors.length === 0;

    revalidatePath('/');
    revalidatePath('/jobs');
    revalidatePath('/highlights');

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

export async function clearDatabase(): Promise<{ jobsDeleted: number; highlightsDeleted: number }> {
  const dl = await getDataLayer();
  const result = await dl.clearDatabase();

  revalidatePath('/');
  revalidatePath('/jobs');
  revalidatePath('/highlights');
  revalidatePath('/export');
  revalidatePath('/settings');

  return result;
}

// ============ UNIFIED FEED ============

export async function searchJobsWithHighlights(
  filters: SearchFilters = {}
): Promise<JobWithFilteredHighlights[]> {
  const dl = await getDataLayer();
  return dl.searchJobsWithHighlights(filters);
}
