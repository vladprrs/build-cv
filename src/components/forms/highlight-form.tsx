'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { HighlightType } from '@/app/actions';

const metricSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  value: z.number(),
  unit: z.string().default(''),
  prefix: z.string().optional(),
  description: z.string().optional(),
});

const highlightFormSchema = z.object({
  jobId: z.string().uuid().nullable(),
  type: z.enum(['achievement', 'project', 'responsibility', 'education']),
  title: z.string().min(1, 'Title is required'),
  content: z.string(),
  startDate: z.string(),
  isCurrent: z.boolean(),
  endDate: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.literal(''),
    z.null(),
  ]),
  domains: z.array(z.string()),
  skills: z.array(z.string()),
  keywords: z.array(z.string()),
  metrics: z.array(metricSchema),
  isHidden: z.boolean(),
}).refine((data) => {
  if (data.isCurrent || !data.endDate || data.endDate === '' || !data.startDate) return true;
  return data.startDate <= data.endDate;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export interface HighlightFormData {
  jobId: string | null;
  type: 'achievement' | 'project' | 'responsibility' | 'education';
  title: string;
  content: string;
  startDate: string;
  isCurrent: boolean;
  endDate: string | null;
  domains: string[];
  skills: string[];
  keywords: string[];
  metrics: { label: string; value: number; unit?: string; prefix?: string; description?: string }[];
  isHidden: boolean;
}

interface HighlightFormProps {
  jobId?: string | null;
  defaultValues?: Partial<HighlightFormData>;
  onSubmit: (data: HighlightFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const typeLabels: Record<HighlightType, string> = {
  achievement: 'Achievement',
  project: 'Project',
  responsibility: 'Responsibility',
  education: 'Education',
};

const typeColors: Record<HighlightType, string> = {
  achievement: 'text-amber-600 bg-amber-50 border-amber-200',
  project: 'text-blue-600 bg-blue-50 border-blue-200',
  responsibility: 'text-gray-600 bg-gray-50 border-gray-200',
  education: 'text-green-600 bg-green-50 border-green-200',
};

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export function HighlightForm({
  jobId,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: HighlightFormProps) {
  // Track which sections are expanded
  const [metricsOpen, setMetricsOpen] = useState(
    defaultValues?.metrics && defaultValues.metrics.length > 0
  );
  const [tagsOpen, setTagsOpen] = useState(
    (defaultValues?.domains?.length || 0) > 0 ||
    (defaultValues?.skills?.length || 0) > 0 ||
    (defaultValues?.keywords?.length || 0) > 0
  );
  const [datesOpen, setDatesOpen] = useState(!!defaultValues?.startDate);

  const form = useForm<HighlightFormData>({
    resolver: zodResolver(highlightFormSchema),
    defaultValues: {
      jobId: jobId ?? null,
      type: 'achievement',
      title: '',
      content: '',
      startDate: getTodayDate(),
      isCurrent: false,
      endDate: '',
      domains: [],
      skills: [],
      keywords: [],
      metrics: [],
      isHidden: false,
      ...defaultValues,
    },
  });

  const { fields: metricFields, append: appendMetric, remove: removeMetric } = useFieldArray({
    control: form.control,
    name: 'metrics',
  });

  const isCurrent = form.watch('isCurrent');
  const type = form.watch('type');

  // Clear end date when "current" is checked
  useEffect(() => {
    if (isCurrent) {
      form.setValue('endDate', '');
    }
  }, [isCurrent, form]);

  // Handle Cmd+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        form.handleSubmit(handleSubmit)();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [form]);

  const handleAddMetric = () => {
    appendMetric({
      label: '',
      value: 0,
      unit: '',
      prefix: '',
      description: '',
    });
    setMetricsOpen(true);
  };

  const handleSubmit = (data: HighlightFormData) => {
    // Clean up empty strings to null
    const cleanedData = {
      ...data,
      content: data.content || '',
      startDate: data.startDate || getTodayDate(),
      endDate: data.isCurrent || data.endDate === '' ? null : data.endDate,
      jobId: jobId ?? data.jobId,
    };
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {/* Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Controller
          name="type"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className={`${typeColors[field.value as HighlightType]} transition-colors`}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Title - Only required field */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="e.g., Increased conversion by 25%"
          {...form.register('title')}
          autoFocus
        />
        {form.formState.errors.title && (
          <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      {/* Content - Optional */}
      <div className="space-y-2">
        <Label htmlFor="content">Description (optional)</Label>
        <Textarea
          id="content"
          placeholder="Describe what you achieved, built, or learned..."
          rows={3}
          {...form.register('content')}
        />
      </div>

      {/* Dates Section - Collapsible */}
      <Collapsible open={datesOpen} onOpenChange={setDatesOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full py-2"
          >
            {datesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Dates
            {!datesOpen && form.watch('startDate') && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {form.watch('startDate')}
              </span>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register('startDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              {!isCurrent ? (
                <Input
                  id="endDate"
                  type="date"
                  disabled={isCurrent}
                  {...form.register('endDate')}
                />
              ) : (
                <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
                  Present
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isCurrent"
              checked={isCurrent}
              onCheckedChange={(checked) => form.setValue('isCurrent', checked as boolean)}
            />
            <Label htmlFor="isCurrent" className="text-sm font-normal cursor-pointer">
              I currently work on this
            </Label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Metrics Section - Collapsible */}
      <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground w-full py-2"
          >
            <div className="flex items-center gap-2">
              {metricsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Metrics
              {metricFields.length > 0 && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  {metricFields.length}
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleAddMetric();
              }}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          {metricFields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add metrics to quantify your impact (e.g., &quot;25% increase&quot;, &quot;$50K saved&quot;)
            </p>
          )}

          {metricFields.map((field, index) => (
            <div key={field.id} className="p-3 rounded-lg border bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Metric {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMetric(index)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2 space-y-1">
                  <Input
                    placeholder="Label (e.g., Revenue)"
                    {...form.register(`metrics.${index}.label`)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    placeholder="Prefix (+, ~)"
                    {...form.register(`metrics.${index}.prefix`)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    step="any"
                    placeholder="Value"
                    {...form.register(`metrics.${index}.value`, { valueAsNumber: true })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <Input
                placeholder="Unit (%, $, users)"
                {...form.register(`metrics.${index}.unit`)}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Tags Section - Collapsible */}
      <Collapsible open={tagsOpen} onOpenChange={setTagsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full py-2"
          >
            {tagsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Tags
            {!tagsOpen && (
              (form.watch('domains')?.length || 0) +
              (form.watch('skills')?.length || 0) +
              (form.watch('keywords')?.length || 0)
            ) > 0 && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {(form.watch('domains')?.length || 0) +
                  (form.watch('skills')?.length || 0) +
                  (form.watch('keywords')?.length || 0)}
              </span>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          {/* Domains */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Domains</Label>
            <Controller
              name="domains"
              control={form.control}
              render={({ field }) => (
                <TagInput
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="e.g., Fintech, Healthcare"
                />
              )}
            />
          </div>

          {/* Skills */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Skills</Label>
            <Controller
              name="skills"
              control={form.control}
              render={({ field }) => (
                <TagInput
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="e.g., React, Python"
                />
              )}
            />
          </div>

          {/* Keywords */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Keywords</Label>
            <Controller
              name="keywords"
              control={form.control}
              render={({ field }) => (
                <TagInput
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="e.g., A/B Testing, SEO"
                />
              )}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Hidden Checkbox */}
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="isHidden"
          checked={form.watch('isHidden')}
          onCheckedChange={(checked) => form.setValue('isHidden', checked as boolean)}
        />
        <Label htmlFor="isHidden" className="text-sm font-normal cursor-pointer">
          Hide this highlight (won&apos;t appear in exports)
        </Label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘↵</kbd> to save
        </span>
        <div className="flex gap-3 ml-auto">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : defaultValues?.title ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </form>
  );
}

// Tag Input Component
interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const tag = input.value.trim();
      if (tag && !value.includes(tag)) {
        onChange([...value, tag]);
        input.value = '';
      }
    }
    if (e.key === 'Backspace' && !e.currentTarget.value && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 border rounded-md bg-background min-h-[38px]">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        placeholder={value.length === 0 ? placeholder : ''}
        onKeyDown={handleKeyDown}
        className="flex-1 min-w-[100px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
      />
    </div>
  );
}
