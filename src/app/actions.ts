'use server';

import { db } from '@/db';
import { jobs, highlights } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
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
