'use server';

import { auth } from '@/auth';
import { getAdminDb } from '@/db/admin';
import { userDatabases } from '@/auth/admin-schema';
import { eq } from 'drizzle-orm';
import { createUserDatabase } from '@/db/turso-platform';
import { migrateUserDbSchema } from '@/db/migrate-user-db';
import { createDbFromCredentials } from '@/db';
import { jobs, highlights, profile } from '@/db/schema';
import type { Job, Highlight } from '@/lib/types';

/**
 * Provision a new Turso database for the current user.
 * Creates DB via Turso Platform API, runs schema migration, stores in admin DB.
 */
export async function provisionUserDatabase() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const adminDb = getAdminDb();
  const userId = session.user.id;

  // Check if user already has a database
  const existing = await adminDb
    .select()
    .from(userDatabases)
    .where(eq(userDatabases.userId, userId))
    .limit(1);

  if (existing[0]?.status === 'ready') {
    return existing[0];
  }

  // If there's a failed or creating entry, remove it to retry
  if (existing[0]) {
    await adminDb
      .delete(userDatabases)
      .where(eq(userDatabases.id, existing[0].id));
  }

  // Create record with 'creating' status
  const recordId = crypto.randomUUID();
  const now = new Date().toISOString();
  await adminDb.insert(userDatabases).values({
    id: recordId,
    userId,
    tursoDbName: 'pending',
    tursoDbUrl: 'pending',
    tursoAuthToken: 'pending',
    status: 'creating',
    createdAt: now,
    updatedAt: now,
  });

  try {
    // Create Turso database
    const dbInfo = await createUserDatabase(userId);

    // Update status to migrating
    await adminDb
      .update(userDatabases)
      .set({
        tursoDbName: dbInfo.dbName,
        tursoDbUrl: dbInfo.dbUrl,
        tursoAuthToken: dbInfo.authToken,
        tursoReadOnlyToken: dbInfo.readOnlyToken,
        status: 'migrating',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userDatabases.id, recordId));

    // Run schema migration
    await migrateUserDbSchema(dbInfo.dbUrl, dbInfo.authToken);

    // Update status to ready
    await adminDb
      .update(userDatabases)
      .set({
        status: 'ready',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userDatabases.id, recordId));

    return {
      id: recordId,
      dbName: dbInfo.dbName,
      dbUrl: dbInfo.dbUrl,
      status: 'ready' as const,
    };
  } catch (error) {
    // Update status to error
    await adminDb
      .update(userDatabases)
      .set({
        status: 'error',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userDatabases.id, recordId));

    throw error;
  }
}

/**
 * Get the current user's database info (for settings page).
 */
export async function getUserDatabaseInfo() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const adminDb = getAdminDb();
  const result = await adminDb
    .select({
      tursoDbUrl: userDatabases.tursoDbUrl,
      tursoReadOnlyToken: userDatabases.tursoReadOnlyToken,
      status: userDatabases.status,
    })
    .from(userDatabases)
    .where(eq(userDatabases.userId, session.user.id))
    .limit(1);

  return result[0] || null;
}

/**
 * Check if current user has a ready database.
 */
export async function getUserDatabaseStatus(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const adminDb = getAdminDb();
  const result = await adminDb
    .select({ status: userDatabases.status })
    .from(userDatabases)
    .where(eq(userDatabases.userId, session.user.id))
    .limit(1);

  return result[0]?.status || null;
}

/**
 * Migrate IndexedDB data to the user's Turso database.
 */
export async function migrateLocalData(data: {
  jobs: Job[];
  highlights: Highlight[];
  profile?: { fullName: string };
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const adminDb = getAdminDb();
  const userDbRecord = await adminDb
    .select()
    .from(userDatabases)
    .where(eq(userDatabases.userId, session.user.id))
    .limit(1);

  const record = userDbRecord[0];
  if (!record || record.status !== 'ready') {
    throw new Error('User database not ready');
  }

  const userDb = createDbFromCredentials(record.tursoDbUrl, record.tursoAuthToken);

  // Import jobs first
  for (const job of data.jobs) {
    await userDb
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
  }

  // Import highlights
  for (const highlight of data.highlights) {
    await userDb
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
  }

  // Import profile
  if (data.profile?.fullName) {
    const now = new Date().toISOString();
    await userDb
      .insert(profile)
      .values({ id: 'default', fullName: data.profile.fullName, updatedAt: now })
      .onConflictDoUpdate({
        target: profile.id,
        set: { fullName: data.profile.fullName, updatedAt: now },
      });
  }

  return {
    jobsMigrated: data.jobs.length,
    highlightsMigrated: data.highlights.length,
  };
}
