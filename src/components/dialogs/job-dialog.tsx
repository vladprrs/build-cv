'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { JobForm, JobFormData } from '@/components/forms/job-form';
import { Plus, Pencil } from 'lucide-react';
import { createJob, updateJob } from '@/app/actions';
import type { Job } from '@/lib/data-types';
import { useRouter } from 'next/navigation';

interface CreateJobDialogProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateJobDialog({ onSuccess, trigger, open: controlledOpen, onOpenChange }: CreateJobDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(data: JobFormData) {
    setIsLoading(true);
    try {
      const { isCurrent, ...jobData } = data;
      await createJob({
        ...jobData,
        logoUrl: jobData.logoUrl || null,
        website: jobData.website || null,
        endDate: isCurrent ? null : (jobData.endDate || null),
      });
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (error: unknown) {
      console.error('Failed to create job:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to create job: ' + message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Job
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Job</DialogTitle>
          <DialogDescription>
            Add a new company to your career timeline.
          </DialogDescription>
        </DialogHeader>
        <JobForm onSubmit={handleSubmit} isLoading={isLoading} submitLabel="Create Job" />
      </DialogContent>
    </Dialog>
  );
}

interface EditJobDialogProps {
  job: Job;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function EditJobDialog({ job, onSuccess, trigger }: EditJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(data: JobFormData) {
    setIsLoading(true);
    try {
      const { isCurrent, ...jobData } = data;
      await updateJob(job.id, {
        ...jobData,
        logoUrl: jobData.logoUrl || null,
        website: jobData.website || null,
        endDate: isCurrent ? null : (jobData.endDate || null),
      });
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (error: unknown) {
      console.error('Failed to update job:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to update job: ' + message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
          <DialogDescription>
            Update the details for {job.company}.
          </DialogDescription>
        </DialogHeader>
        <JobForm
          defaultValues={{
            company: job.company,
            role: job.role,
            startDate: job.startDate,
            isCurrent: !job.endDate,
            endDate: job.endDate || '',
            logoUrl: job.logoUrl || '',
            website: job.website || '',
          }}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel="Update Job"
        />
      </DialogContent>
    </Dialog>
  );
}
