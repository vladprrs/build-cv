import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HighlightsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Highlights</h1>
            <p className="text-muted-foreground">
              Manage your career highlights and achievements
            </p>
          </div>
          <Button>Add Highlight</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Highlights</CardTitle>
            <CardDescription>
              Coming soon: list of all your achievements, projects, and responsibilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No highlights yet. Add your first highlight to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
