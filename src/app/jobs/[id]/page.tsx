import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getJobById, getHighlightsByJobId } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Briefcase, Calendar, Globe, MapPin } from 'lucide-react';
import { CreateHighlightDialog } from '@/components/dialogs/highlight-dialog';
import { HighlightCard } from '@/components/cards/highlight-card';
import { EditJobDialog } from '@/components/dialogs/job-dialog';

interface JobPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params;
  
  const [job, highlights] = await Promise.all([
    getJobById(id),
    getHighlightsByJobId(id),
  ]);

  if (!job) {
    notFound();
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Present';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const calculateDuration = () => {
    const start = new Date(job.startDate);
    const end = job.endDate ? new Date(job.endDate) : new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) return `${remainingMonths} months`;
    if (remainingMonths === 0) return `${years} years`;
    return `${years} years ${remainingMonths} months`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/jobs" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Link>
          </div>

          <div className="flex items-start gap-4">
            {/* Logo */}
            {job.logoUrl ? (
              <img
                src={job.logoUrl}
                alt={job.company}
                className="w-16 h-16 rounded-lg object-cover border bg-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{job.company}</h1>
                  <p className="text-lg text-muted-foreground">{job.role}</p>
                </div>
                <EditJobDialog
                  job={job}
                  trigger={
                    <Button variant="outline" size="sm">
                      Edit Job
                    </Button>
                  }
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(job.startDate)} — {formatDate(job.endDate)}
                </span>
                <Badge variant="secondary">{calculateDuration()}</Badge>
                {job.website && (
                  <a
                    href={job.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Highlights Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Highlights</h2>
              <p className="text-sm text-muted-foreground">
                {highlights.length} {highlights.length === 1 ? 'highlight' : 'highlights'} recorded
              </p>
            </div>
            <CreateHighlightDialog
              jobId={job.id}
              trigger={
                <Button>
                  Add Highlight
                </Button>
              }
            />
          </div>

          {highlights.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No highlights yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking your achievements, projects, and responsibilities
              </p>
              <CreateHighlightDialog
                jobId={job.id}
                trigger={
                  <Button variant="outline">
                    Add First Highlight
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-4">
              {highlights.map((highlight) => (
                <HighlightCard
                  key={highlight.id}
                  highlight={highlight}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
