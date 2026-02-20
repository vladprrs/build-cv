export type HighlightType = 'achievement' | 'project' | 'responsibility' | 'education';

export interface Metric {
  label: string;
  value: number;
  unit: string;
  prefix?: string;
  description?: string;
}

export interface Job {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  logoUrl: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Highlight {
  id: string;
  jobId: string | null;
  type: HighlightType;
  title: string;
  content: string;
  startDate: string;
  endDate: string | null;
  domains: string[];
  skills: string[];
  keywords: string[];
  metrics: Metric[];
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

// Insert types
export type InsertJob = Omit<Job, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertHighlight = Omit<Highlight, 'id' | 'createdAt' | 'updatedAt' | 'job'>;

// Update types
export type UpdateJob = Partial<Omit<Job, 'id' | 'createdAt' | 'updatedAt'>>;
export type UpdateHighlight = Partial<Omit<Highlight, 'id' | 'createdAt' | 'updatedAt' | 'job'>>;
