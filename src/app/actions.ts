'use server';

import { db } from '@/db';
import { jobs, highlights } from '@/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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

    console.log('Updating job:', id, JSON.stringify(cleanedData));

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
  } catch (error: any) {
    console.error('updateJob error:', error);
    throw new Error(error?.message || 'Failed to update job');
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
