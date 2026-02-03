import Link from "next/link";
import {
  searchHighlights,
  getAllDomains,
  getAllSkills,
  type HighlightType,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightsTable } from "@/components/highlights-table";
import { HighlightsFiltersWrapper } from "@/components/highlights-filters-wrapper";
import { ArrowLeft, Briefcase, Plus, Sparkles } from "lucide-react";

export const metadata = {
  title: "Highlights | Build CV",
  description: "Manage your career highlights and achievements",
};

interface HighlightsPageProps {
  searchParams: {
    q?: string;
    types?: string;
    domains?: string;
    skills?: string;
    metrics?: string;
  };
}

export default async function HighlightsPage({ searchParams }: HighlightsPageProps) {
  // Parse filter params from URL
  const filters = {
    query: searchParams.q,
    types: searchParams.types?.split(",").filter(Boolean) as HighlightType[] | undefined,
    domains: searchParams.domains?.split(",").filter(Boolean),
    skills: searchParams.skills?.split(",").filter(Boolean),
    onlyWithMetrics: searchParams.metrics === "true",
  };

  // Fetch filtered highlights and filter options in parallel
  const [highlights, domains, skills] = await Promise.all([
    searchHighlights(filters),
    getAllDomains(),
    getAllSkills(),
  ]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Highlights</h1>
              <p className="text-muted-foreground">
                Manage all your career highlights and achievements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/jobs">
                <Briefcase className="h-4 w-4 mr-2" />
                Manage Jobs
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/export">
                <Sparkles className="h-4 w-4 mr-2" />
                Export
              </Link>
            </Button>
            <Button asChild>
              <Link href="/jobs">
                <Plus className="h-4 w-4 mr-2" />
                Add Highlight
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Highlights</CardDescription>
              <CardTitle className="text-3xl">{highlights.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Achievements</CardDescription>
              <CardTitle className="text-3xl">
                {highlights.filter((h) => h.type === "achievement").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Projects</CardDescription>
              <CardTitle className="text-3xl">
                {highlights.filter((h) => h.type === "project").length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Table with Filters */}
        <Card>
          <CardHeader>
            <CardTitle>All Highlights</CardTitle>
            <CardDescription>
              Search and filter your highlights. Click on column headers to sort.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <HighlightsFiltersWrapper
              domains={domains}
              skills={skills}
              resultCount={highlights.length}
            />
            <HighlightsTable highlights={highlights} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
