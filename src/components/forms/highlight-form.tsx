'use client';

import { useEffect } from 'react';
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
import { Plus, X, Trash2 } from 'lucide-react';
import type { HighlightType, Metric } from '@/app/actions';

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
  content: z.string().min(1, 'Content is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
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
  if (data.isCurrent || !data.endDate || data.endDate === '') return true;
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

export function HighlightForm({
  jobId,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: HighlightFormProps) {
  const form = useForm<HighlightFormData>({
    resolver: zodResolver(highlightFormSchema),
    defaultValues: {
      jobId: jobId ?? null,
      type: 'achievement',
      title: '',
      content: '',
      startDate: '',
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

  const handleAddMetric = () => {
    appendMetric({
      label: '',
      value: 0,
      unit: '',
      prefix: '',
      description: '',
    });
  };

  const handleSubmit = (data: HighlightFormData) => {
    // Clean up empty strings to null
    const cleanedData = {
      ...data,
      endDate: data.isCurrent || data.endDate === '' ? null : data.endDate,
      jobId: jobId ?? data.jobId,
    };
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
        {form.formState.errors.type && (
          <p className="text-sm text-red-500">{form.formState.errors.type.message}</p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g., Increased conversion by 25%"
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">Description</Label>
        <Textarea
          id="content"
          placeholder="Describe what you achieved, built, or learned..."
          rows={4}
          {...form.register('content')}
        />
        {form.formState.errors.content && (
          <p className="text-sm text-red-500">{form.formState.errors.content.message}</p>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            {...form.register('startDate')}
          />
          {form.formState.errors.startDate && (
            <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
          )}
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
          {form.formState.errors.endDate && (
            <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>
          )}
        </div>
      </div>

      {/* Current checkbox */}
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

      {/* Metrics Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Metrics (Optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddMetric}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Metric
          </Button>
        </div>

        {metricFields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Add metrics to quantify your impact (e.g., "25% increase", "$50K saved")
          </p>
        )}

        {metricFields.map((field, index) => (
          <div key={field.id} className="p-4 rounded-lg border bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Metric {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeMetric(index)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  placeholder="e.g., Revenue Growth"
                  {...form.register(`metrics.${index}.label`)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prefix</Label>
                <Input
                  placeholder="e.g., +, ~, <"
                  {...form.register(`metrics.${index}.prefix`)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Value</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="25"
                  {...form.register(`metrics.${index}.value`, { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit</Label>
                <Input
                  placeholder="e.g., %, users, $"
                  {...form.register(`metrics.${index}.unit`)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description (Optional)</Label>
              <Input
                placeholder="Additional context..."
                {...form.register(`metrics.${index}.description`)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tags Section */}
      <div className="space-y-4">
        <Label>Tags (Optional)</Label>
        
        {/* Domains */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Domains</Label>
          <Controller
            name="domains"
            control={form.control}
            render={({ field }) => (
              <TagInput
                value={field.value || []}
                onChange={field.onChange}
                placeholder="e.g., Fintech, Healthcare, E-commerce"
              />
            )}
          />
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Skills</Label>
          <Controller
            name="skills"
            control={form.control}
            render={({ field }) => (
              <TagInput
                value={field.value || []}
                onChange={field.onChange}
                placeholder="e.g., React, Python, Leadership"
              />
            )}
          />
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Keywords</Label>
          <Controller
            name="keywords"
            control={form.control}
            render={({ field }) => (
              <TagInput
                value={field.value || []}
                onChange={field.onChange}
                placeholder="e.g., A/B Testing, SEO, Performance"
              />
            )}
          />
        </div>
      </div>

      {/* Hidden Checkbox */}
      <div className="flex items-center space-x-2">
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
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : defaultValues?.title ? 'Update' : 'Create'}
        </Button>
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
    <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-background min-h-[42px]">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
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
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
      />
    </div>
  );
}
