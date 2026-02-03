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
import { createJob, updateJob, type Job } from '@/app/actions';
import { useRouter } from 'next/navigation';

interface CreateJobDialogProps {
  onSuccess?: () => void;
}

export function CreateJobDialog({ onSuccess }: CreateJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(data: JobFormData) {
    setIsLoading(true);
    try {
      await createJob({
        ...data,
        logoUrl: data.logoUrl || null,
        website: data.website || null,
        endDate: data.endDate || null,
      });
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (error) {
      console.error('Failed to create job:', error);
      alert('Failed to create job. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Job
        </Button>
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
      await updateJob(job.id, {
        ...data,
        logoUrl: data.logoUrl || null,
        website: data.website || null,
        endDate: data.endDate || null,
      });
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (error: any) {
      console.error('Failed to update job:', error);
      alert('Failed to update job: ' + (error?.message || 'Unknown error'));
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
