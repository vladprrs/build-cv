import { getJobs, deleteJob, type Job } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateJobDialog, EditJobDialog } from '@/components/dialogs/job-dialog';
import { Building2, Calendar, ExternalLink, Trash2, Briefcase, ArrowLeft, Sparkles, Table2, Database } from 'lucide-react';
import Link from 'next/link';

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

interface JobCardProps {
  job: Job & { highlightCount: number };
}

function JobCard({ job }: JobCardProps) {
  return (
    <Card className="group relative hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Link href={`/jobs/${job.id}`} className="flex items-start gap-4 flex-1">
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
            <div>
              <CardTitle className="text-lg group-hover:text-primary transition-colors">{job.company}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Briefcase className="h-3 w-3" />
                {job.role}
              </CardDescription>
            </div>
          </Link>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <EditJobDialog 
              job={job} 
              trigger={
                <Button variant="ghost" size="icon">
                  <span className="sr-only">Edit</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Button>
              }
            />
            <form action={async () => {
              'use server';
              await deleteJob(job.id);
            }}>
              <Button variant="ghost" size="icon" type="submit" className="text-destructive hover:text-destructive">
                <span className="sr-only">Delete</span>
                <Trash2 className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Link href={`/jobs/${job.id}`} className="block">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(job.startDate)} — {formatDate(job.endDate)}
            </div>
            <Badge variant="secondary">
              {formatDuration(job.startDate, job.endDate)}
            </Badge>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Badge variant="outline" className="group-hover:border-primary/50 transition-colors">
              {job.highlightCount} {job.highlightCount === 1 ? 'highlight' : 'highlights'}
            </Badge>
            {job.website && (
              <span 
                className="flex items-center gap-1 text-sm text-muted-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                Website
              </span>
            )}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

export default async function JobsPage() {
  const jobs = await getJobs();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Back link */}
      <div className="mb-6">
        <Link 
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Timeline
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Manage your career history and positions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/highlights">
              <Table2 className="h-4 w-4 mr-2" />
              Highlights
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/export">
              <Sparkles className="h-4 w-4 mr-2" />
              Export
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/backup">
              <Database className="h-4 w-4 mr-2" />
              Backup
            </Link>
          </Button>
          <CreateJobDialog />
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No jobs yet</h3>
          <p className="text-muted-foreground mt-2 mb-6">
            Add your first job to start building your career timeline.
          </p>
          <CreateJobDialog />
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
