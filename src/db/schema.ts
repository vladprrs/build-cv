import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Metric type definition
export interface Metric {
  label: string;
  value: number;
  unit: string;
  prefix?: string;
  description?: string;
}

// Jobs table (employment contexts)
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(), // UUID
  company: text('company').notNull(),
  role: text('role').notNull(),
  startDate: text('start_date').notNull(), // ISO Date
  endDate: text('end_date'),
  logoUrl: text('logo_url'),
  website: text('website'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Highlights table (atomic experience units)
export const highlights = sqliteTable('highlights', {
  id: text('id').primaryKey(), // UUID
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  type: text('type', { enum: ['achievement', 'project', 'responsibility', 'education'] }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  // Tags stored as JSON arrays
  domains: text('domains', { mode: 'json' }).$type<string[]>().notNull().default([]),
  skills: text('skills', { mode: 'json' }).$type<string[]>().notNull().default([]),
  keywords: text('keywords', { mode: 'json' }).$type<string[]>().notNull().default([]),
  // Metrics stored as JSON array
  metrics: text('metrics', { mode: 'json' }).$type<Metric[]>().notNull().default([]),
  isHidden: integer('is_hidden', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Relations
export const jobsRelations = relations(jobs, ({ many }) => ({
  highlights: many(highlights),
}));

export const highlightsRelations = relations(highlights, ({ one }) => ({
  job: one(jobs, { fields: [highlights.jobId], references: [jobs.id] }),
}));
