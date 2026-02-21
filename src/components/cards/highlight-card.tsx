'use client';

import { useState, useRef, useCallback } from 'react';
import { EditHighlightDialog } from '@/components/dialogs/highlight-dialog';
import type { Highlight, Metric, HighlightType } from '@/lib/data-types';
import { Award, FolderKanban, Briefcase, GraduationCap, Pencil } from 'lucide-react';

interface HighlightCardProps {
  highlight: Highlight;
  onUpdate?: () => void;
  onDelete?: () => void;
  mode?: 'anonymous' | 'authenticated';
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

function InlineEditText({
  value,
  onSave,
  className = '',
  inputClassName = '',
  multiline = false,
}: {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [value]);

  const save = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setEditing(false);
    setDraft(value);
  }, [value]);

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
          rows={2}
          className={`bg-transparent border border-border rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-ring w-full resize-none ${inputClassName}`}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); save(); }
          if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
        className={`bg-transparent border-b border-foreground/30 outline-none w-full ${inputClassName}`}
      />
    );
  }

  return (
    <span
      onClick={startEdit}
      className={`cursor-pointer hover:text-foreground/70 transition-colors ${className}`}
      title="Click to edit"
    >
      {value}
    </span>
  );
}

export function HighlightCard({ highlight, onUpdate, onDelete, mode = 'authenticated' }: HighlightCardProps) {
  const type = (highlight.type as HighlightType) || 'achievement';
  const config = typeConfig[type];
  const metrics = (highlight.metrics as Metric[]) || [];

  const handleFieldSave = useCallback(async (field: 'title' | 'content', newValue: string) => {
    try {
      if (mode === 'anonymous') {
        const { ClientDataLayer } = await import('@/lib/data-layer/client-data-layer');
        const dl = new ClientDataLayer();
        await dl.updateHighlight(highlight.id, { [field]: newValue });
      } else {
        const { updateHighlight } = await import('@/app/actions');
        await updateHighlight(highlight.id, { [field]: newValue });
      }
      onUpdate?.();
    } catch (error) {
      console.error(`Failed to update highlight ${field}:`, error);
    }
  }, [highlight.id, mode, onUpdate]);

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
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium leading-snug">
                <InlineEditText
                  value={highlight.title}
                  onSave={(v) => handleFieldSave('title', v)}
                  inputClassName="text-sm font-medium"
                />
              </h4>
              {highlight.content && (
                <div className="text-sm text-muted-foreground mt-1">
                  <InlineEditText
                    value={highlight.content}
                    onSave={(v) => handleFieldSave('content', v)}
                    className="line-clamp-2"
                    inputClassName="text-sm text-muted-foreground"
                    multiline
                  />
                </div>
              )}
            </div>
            <EditHighlightDialog
              highlight={highlight}
              onSuccess={onUpdate}
              onDelete={onDelete}
              mode={mode}
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
