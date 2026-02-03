import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExportPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Export</h1>
          <p className="text-muted-foreground">
            Export your data for AI resume generation
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>RAG Export</CardTitle>
            <CardDescription>
              Export your highlights in a format optimized for AI processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This feature will allow you to export your career data in a structured JSON format 
              that can be used with AI tools for resume generation.
            </p>
            <Button disabled>Export as JSON</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
