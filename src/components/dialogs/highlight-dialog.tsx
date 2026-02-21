'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash } from 'lucide-react';
import { HighlightForm, HighlightFormData } from '@/components/forms/highlight-form';
import {
  createHighlight,
  updateHighlight,
  deleteHighlight,
} from '@/app/actions';
import type { Highlight } from '@/lib/data-types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CreateHighlightDialogProps {
  jobId?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: 'anonymous' | 'authenticated';
}

export function CreateHighlightDialog({
  jobId,
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange,
  mode = 'authenticated',
}: CreateHighlightDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: HighlightFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const highlightData = {
        jobId: jobId || null,
        type: data.type,
        title: data.title,
        content: data.content,
        startDate: data.startDate,
        endDate: data.endDate,
        domains: data.domains,
        skills: data.skills,
        keywords: data.keywords,
        metrics: data.metrics.map(m => ({ ...m, unit: m.unit || '' })),
        isHidden: data.isHidden,
      };

      if (mode === 'anonymous') {
        const { ClientDataLayer } = await import('@/lib/data-layer/client-data-layer');
        const dl = new ClientDataLayer();
        await dl.createHighlight(highlightData);
      } else {
        await createHighlight(highlightData);
      }

      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create highlight');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Highlight
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Highlight</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}
        <HighlightForm
          jobId={jobId}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditHighlightDialogProps {
  highlight: Highlight;
  onSuccess?: () => void;
  onDelete?: () => void;
  trigger?: React.ReactNode;
  mode?: 'anonymous' | 'authenticated';
}

export function EditHighlightDialog({
  highlight,
  onSuccess,
  onDelete,
  trigger,
  mode = 'authenticated',
}: EditHighlightDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: HighlightFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const updateData = {
        type: data.type,
        title: data.title,
        content: data.content,
        startDate: data.startDate,
        endDate: data.endDate,
        domains: data.domains,
        skills: data.skills,
        keywords: data.keywords,
        metrics: data.metrics.map(m => ({ ...m, unit: m.unit || '' })),
        isHidden: data.isHidden,
      };

      if (mode === 'anonymous') {
        const { ClientDataLayer } = await import('@/lib/data-layer/client-data-layer');
        const dl = new ClientDataLayer();
        await dl.updateHighlight(highlight.id, updateData);
      } else {
        await updateHighlight(highlight.id, updateData);
      }

      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update highlight');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      if (mode === 'anonymous') {
        const { ClientDataLayer } = await import('@/lib/data-layer/client-data-layer');
        const dl = new ClientDataLayer();
        await dl.deleteHighlight(highlight.id);
      } else {
        await deleteHighlight(highlight.id);
      }
      setOpen(false);
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete highlight');
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultValues: Partial<HighlightFormData> = {
    jobId: highlight.jobId,
    type: highlight.type as HighlightFormData['type'],
    title: highlight.title,
    content: highlight.content,
    startDate: highlight.startDate,
    endDate: highlight.endDate,
    isCurrent: !highlight.endDate,
    domains: highlight.domains || [],
    skills: highlight.skills || [],
    keywords: highlight.keywords || [],
    metrics: (highlight.metrics as HighlightFormData['metrics']) || [],
    isHidden: highlight.isHidden,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Highlight</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}
        <HighlightForm
          jobId={highlight.jobId || undefined}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isSubmitting={isSubmitting}
        />
        <div className="pt-4 border-t">
          <DeleteHighlightDialog onDelete={handleDelete} isDeleting={isSubmitting} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteHighlightDialog({
  onDelete,
  isDeleting,
}: {
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full" disabled={isDeleting}>
          <Trash className="w-4 h-4 mr-2" />
          Delete Highlight
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Highlight</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this highlight? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className="bg-red-500 hover:bg-red-600">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
