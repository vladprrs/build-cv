'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HighlightCard } from '@/components/cards/highlight-card';
import { CreateHighlightDialog } from '@/components/dialogs/highlight-dialog';
import { Building2, Calendar, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import type { JobWithHighlights } from '@/app/actions';
import Link from 'next/link';
import Image from 'next/image';

interface TimelineProps {
  jobs: JobWithHighlights[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Present';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatDuration(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  
  const totalMonths = years * 12 + months;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

interface TimelineJobCardProps {
  job: JobWithHighlights;
  onUpdate: () => void;
}

function TimelineJobCard({ job, onUpdate }: TimelineJobCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="relative">
      {/* Timeline connector */}
      <div className="absolute left-6 top-16 bottom-0 w-px bg-border hidden md:block" />
      
      {/* Job Header Card */}
      <Card className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <Link href={`/jobs/${job.id}`} className="flex items-start gap-4 flex-1">
              {/* Logo with timeline dot */}
              <div className="relative">
                {job.logoUrl ? (
                  <Image
                    src={job.logoUrl}
                    alt={job.company}
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                {/* Timeline dot */}
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary hidden md:block" 
                     style={{ marginLeft: '21px' }} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {job.company}
                  </h3>
                  <Badge variant="secondary">
                    {formatDuration(job.startDate, job.endDate)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>{job.role}</span>
                  <span className="mx-1">•</span>
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(job.startDate)} — {formatDate(job.endDate)}</span>
                </div>
              </div>
            </Link>
            
            <div className="flex items-center gap-2">
              <CreateHighlightDialog 
                jobId={job.id}
                onSuccess={onUpdate}
                trigger={
                  <button className="text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    + Add
                  </button>
                }
              />
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </CardHeader>
        
        {/* Highlights Section */}
        {isExpanded && (
          <CardContent className="pt-0">
            {job.highlights.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-lg">
                No highlights yet. Add your first achievement or project!
              </div>
            ) : (
              <div className="space-y-3 pl-16">
                {job.highlights.map((highlight) => (
                  <HighlightCard
                    key={highlight.id}
                    highlight={highlight}
                    onUpdate={onUpdate}
                    onDelete={onUpdate}
                  />
                ))}
              </div>
            )}
          </CardContent>
        )}
        
        {/* Collapsed summary */}
        {!isExpanded && job.highlights.length > 0 && (
          <CardContent className="pt-0 pb-4">
            <div className="pl-16 text-sm text-muted-foreground">
              {job.highlights.length} {job.highlights.length === 1 ? 'highlight' : 'highlights'} • 
              Click to expand
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export function Timeline({ jobs }: TimelineProps) {
  if (jobs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Briefcase className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Your career timeline is empty</h3>
        <p className="text-muted-foreground mt-2 mb-6 max-w-sm mx-auto">
          Add your first job to start building your professional timeline with achievements and projects.
        </p>
        <Link 
          href="/jobs"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Add Your First Job
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <TimelineJobCard 
          key={job.id} 
          job={job} 
          onUpdate={() => window.location.reload()}
        />
      ))}
    </div>
  );
}
