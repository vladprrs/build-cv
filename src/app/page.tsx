import { getJobsWithHighlights } from '@/app/actions';
import { Timeline } from '@/components/timeline';
import { Button } from '@/components/ui/button';
import { Briefcase, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default async function HomePage() {
  const jobs = await getJobsWithHighlights();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto py-6 px-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Career Timeline</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {jobs.length} {jobs.length === 1 ? 'position' : 'positions'} • 
                {jobs.reduce((acc, job) => acc + job.highlights.length, 0)} highlights
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/highlights">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Highlights
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/export">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Export
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/jobs">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Job
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Timeline Content */}
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <Timeline jobs={jobs} />
      </main>
    </div>
  );
}
