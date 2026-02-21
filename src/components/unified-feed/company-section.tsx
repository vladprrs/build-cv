'use client';

import { useState, useRef, useCallback } from 'react';
import { HighlightCard } from '@/components/cards/highlight-card';
import { CreateHighlightDialog } from '@/components/dialogs/highlight-dialog';
import { EditJobDialog } from '@/components/dialogs/job-dialog';
import { Building2, ChevronDown, ChevronRight, Plus, Pencil } from 'lucide-react';
import type { Job, Highlight } from '@/lib/data-types';
import Image from 'next/image';

interface CompanySectionProps {
  job: Job;
  highlights: Highlight[];
  onUpdate: () => void;
  defaultExpanded?: boolean;
  mode?: 'anonymous' | 'authenticated';
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

  if (y === 0) return `${m}mo`;
  if (m === 0) return `${y}yr`;
  return `${y}yr ${m}mo`;
}

function InlineEdit({
  value,
  onSave,
  className = '',
  inputClassName = '',
}: {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(() => {
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
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); save(); }
          if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
        className={`bg-transparent border-b border-foreground/30 outline-none ${inputClassName}`}
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

export function CompanySection({
  job,
  highlights,
  onUpdate,
  defaultExpanded = true,
  mode = 'authenticated',
}: CompanySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleJobFieldSave = useCallback(async (field: 'company' | 'role', newValue: string) => {
    try {
      const update = {
        company: job.company,
        role: job.role,
        startDate: job.startDate,
        endDate: job.endDate,
        logoUrl: job.logoUrl,
        website: job.website,
        [field]: newValue,
      };
      if (mode === 'anonymous') {
        const { ClientDataLayer } = await import('@/lib/data-layer/client-data-layer');
        const dl = new ClientDataLayer();
        await dl.updateJob(job.id, update);
      } else {
        const { updateJob } = await import('@/app/actions');
        await updateJob(job.id, update);
      }
      onUpdate();
    } catch (error) {
      console.error(`Failed to update job ${field}:`, error);
    }
  }, [job, mode, onUpdate]);

  return (
    <div className="group">
      {/* Company Header */}
      <div className="flex items-start gap-4 py-4">
        {/* Logo */}
        <div className="shrink-0">
          {job.logoUrl ? (
            <Image
              src={job.logoUrl}
              alt={job.company}
              width={40}
              height={40}
              unoptimized
              className="h-10 w-10 rounded-lg object-cover ring-1 ring-border/40"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 ring-1 ring-border/40">
              <Building2 className="h-5 w-5 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">
              <InlineEdit
                value={job.company}
                onSave={(v) => handleJobFieldSave('company', v)}
                inputClassName="font-medium w-48"
              />
            </h3>
            <span className="text-xs text-muted-foreground">
              {formatDuration(job.startDate, job.endDate)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            <InlineEdit
              value={job.role}
              onSave={(v) => handleJobFieldSave('role', v)}
              inputClassName="text-sm w-40"
            />
            {' · '}
            {formatDate(job.startDate)} — {formatDate(job.endDate)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <EditJobDialog
            job={job}
            onSuccess={onUpdate}
            mode={mode}
            trigger={
              <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            }
          />
          <CreateHighlightDialog
            jobId={job.id}
            onSuccess={onUpdate}
            mode={mode}
            trigger={
              <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            }
          />
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Highlights */}
      {isExpanded && (
        <div className="pl-14 pb-6 space-y-3">
          {highlights.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 py-2">
              No highlights yet
            </p>
          ) : (
            highlights.map((highlight) => (
              <HighlightCard
                key={highlight.id}
                highlight={highlight}
                onUpdate={onUpdate}
                onDelete={onUpdate}
                mode={mode}
              />
            ))
          )}
        </div>
      )}

      {/* Collapsed count */}
      {!isExpanded && highlights.length > 0 && (
        <div className="pl-14 pb-4">
          <p className="text-xs text-muted-foreground/60">
            {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Separator */}
      <div className="border-b border-border/20" />
    </div>
  );
}
