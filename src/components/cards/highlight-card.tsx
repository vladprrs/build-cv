'use client';

import { EditHighlightDialog } from '@/components/dialogs/highlight-dialog';
import type { Highlight, Metric, HighlightType } from '@/lib/data-types';
import { Award, FolderKanban, Briefcase, GraduationCap, Pencil } from 'lucide-react';

interface HighlightCardProps {
  highlight: Highlight;
  onUpdate?: () => void;
  onDelete?: () => void;
}

const typeConfig: Record<HighlightType, { icon: React.ReactNode; color: string }> = {
  achievement: {
    icon: <Award className="w-3.5 h-3.5" />,
    color: 'text-amber-600',
  },
  project: {
    icon: <FolderKanban className="w-3.5 h-3.5" />,
    color: 'text-blue-600',
  },
  responsibility: {
    icon: <Briefcase className="w-3.5 h-3.5" />,
    color: 'text-muted-foreground',
  },
  education: {
    icon: <GraduationCap className="w-3.5 h-3.5" />,
    color: 'text-green-600',
  },
};

export function HighlightCard({ highlight, onUpdate, onDelete }: HighlightCardProps) {
  const type = (highlight.type as HighlightType) || 'achievement';
  const config = typeConfig[type];
  const metrics = (highlight.metrics as Metric[]) || [];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Present';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="group relative py-3 px-4 -mx-4 rounded-lg hover:bg-muted/30 transition-colors">
      {/* Type Icon & Title */}
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 ${config.color}`}>
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium leading-snug">{highlight.title}</h4>
              {highlight.content && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {highlight.content}
                </p>
              )}
            </div>
            <EditHighlightDialog
              highlight={highlight}
              onSuccess={onUpdate}
              onDelete={onDelete}
              trigger={
                <button className="p-1 text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              }
            />
          </div>

          {/* Metrics */}
          {metrics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {metrics.map((metric, index) => (
                <span
                  key={index}
                  className="text-xs text-muted-foreground"
                >
                  {metric.prefix}{metric.value}{metric.unit} {metric.label}
                </span>
              ))}
            </div>
          )}

          {/* Tags */}
          {(highlight.skills?.length > 0 || highlight.domains?.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {highlight.skills?.slice(0, 3).map((skill) => (
                <span
                  key={`skill-${skill}`}
                  className="px-1.5 py-0.5 text-[10px] text-muted-foreground bg-muted/50 rounded"
                >
                  {skill}
                </span>
              ))}
              {highlight.domains?.slice(0, 2).map((domain) => (
                <span
                  key={`domain-${domain}`}
                  className="px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border/40 rounded"
                >
                  {domain}
                </span>
              ))}
              {((highlight.skills?.length || 0) + (highlight.domains?.length || 0)) > 5 && (
                <span className="text-[10px] text-muted-foreground/50">
                  +{(highlight.skills?.length || 0) + (highlight.domains?.length || 0) - 5}
                </span>
              )}
            </div>
          )}

          {/* Date */}
          <p className="text-[10px] text-muted-foreground/50 mt-2">
            {formatDate(highlight.startDate)} — {formatDate(highlight.endDate)}
          </p>
        </div>
      </div>

      {/* Hidden indicator */}
      {highlight.isHidden && (
        <span className="absolute top-2 right-2 text-[10px] text-muted-foreground/50">
          hidden
        </span>
      )}
    </div>
  );
}
