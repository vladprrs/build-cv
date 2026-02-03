'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HighlightCard } from '@/components/cards/highlight-card';
import { CreateHighlightDialog } from '@/components/dialogs/highlight-dialog';
import { EditJobDialog } from '@/components/dialogs/job-dialog';
import { Building2, Calendar, Briefcase, ChevronDown, ChevronUp, Plus, Pencil } from 'lucide-react';
import type { Job, Highlight } from '@/app/actions';

interface CompanySectionProps {
  job: Job;
  highlights: Highlight[];
  onUpdate: () => void;
  defaultExpanded?: boolean;
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

export function CompanySection({
  job,
  highlights,
  onUpdate,
  defaultExpanded = true,
}: CompanySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Logo */}
            <div className="relative shrink-0">
              {job.logoUrl ? (
                <img
                  src={job.logoUrl}
                  alt={job.company}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Company Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold">{job.company}</h3>
                <Badge variant="secondary" className="text-xs">
                  {formatDuration(job.startDate, job.endDate)}
                </Badge>
                {highlights.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{job.role}</span>
                <span className="mx-1">•</span>
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">
                  {formatDate(job.startDate)} — {formatDate(job.endDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <EditJobDialog
              job={job}
              onSuccess={onUpdate}
              trigger={
                <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
              }
            />
            <CreateHighlightDialog
              jobId={job.id}
              onSuccess={onUpdate}
              trigger={
                <button className="text-xs px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add
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
          {highlights.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-lg">
              No highlights yet. Add your first achievement or project!
            </div>
          ) : (
            <div className="space-y-3">
              {highlights.map((highlight) => (
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
      {!isExpanded && highlights.length > 0 && (
        <CardContent className="pt-0 pb-4">
          <div className="text-sm text-muted-foreground">
            {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} • Click to expand
          </div>
        </CardContent>
      )}
    </Card>
  );
}
