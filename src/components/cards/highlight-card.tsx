'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EditHighlightDialog } from '@/components/dialogs/highlight-dialog';
import type { Highlight, Metric, HighlightType } from '@/app/actions';
import { Award, FolderKanban, Briefcase, GraduationCap } from 'lucide-react';

interface HighlightCardProps {
  highlight: Highlight;
  onUpdate?: () => void;
  onDelete?: () => void;
}

const typeConfig: Record<HighlightType, { icon: React.ReactNode; label: string; colors: string }> = {
  achievement: {
    icon: <Award className="w-4 h-4" />,
    label: 'Achievement',
    colors: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800',
  },
  project: {
    icon: <FolderKanban className="w-4 h-4" />,
    label: 'Project',
    colors: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/20 dark:border-blue-800',
  },
  responsibility: {
    icon: <Briefcase className="w-4 h-4" />,
    label: 'Responsibility',
    colors: 'bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900/40 dark:border-gray-700',
  },
  education: {
    icon: <GraduationCap className="w-4 h-4" />,
    label: 'Education',
    colors: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/20 dark:border-green-800',
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

  const formatPeriod = () => {
    const start = formatDate(highlight.startDate);
    const end = formatDate(highlight.endDate);
    return `${start} — ${end}`;
  };

  return (
    <Card className={`${config.colors} border-l-4 transition-all hover:shadow-md group`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 text-xs font-medium opacity-70">
                {config.icon}
                {config.label}
              </span>
              {highlight.isHidden && (
                <Badge variant="secondary" className="text-xs">Hidden</Badge>
              )}
            </div>
            <h3 className="text-base font-semibold leading-tight">{highlight.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{formatPeriod()}</p>
          </div>
          <EditHighlightDialog
            highlight={highlight}
            onSuccess={onUpdate}
            onDelete={onDelete}
            trigger={
              <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/50 dark:hover:bg-white/10 rounded">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm leading-relaxed">{highlight.content}</p>

        {/* Metrics */}
        {metrics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {metrics.map((metric, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-white/70 dark:bg-white/10 font-normal"
              >
                {metric.prefix}
                {metric.value}
                {metric.unit} {metric.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Tags */}
        {(highlight.skills?.length || highlight.domains?.length || highlight.keywords?.length) > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-current/10">
            {highlight.skills?.map((skill) => (
              <span
                key={`skill-${skill}`}
                className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full"
              >
                {skill}
              </span>
            ))}
            {highlight.domains?.map((domain) => (
              <span
                key={`domain-${domain}`}
                className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full"
              >
                {domain}
              </span>
            ))}
            {highlight.keywords?.map((keyword) => (
              <span
                key={`keyword-${keyword}`}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
