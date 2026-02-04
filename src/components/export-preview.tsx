"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { type RAGExportData } from "@/lib/n8n/workflow";
import { generateMarkdownExport } from "@/lib/export-utils";
import { 
  Copy, 
  Check, 
  FileJson, 
  FileText, 
  Sparkles,
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportPreviewProps {
  data: RAGExportData;
  markdown: string;
}

export function ExportPreview({ data, markdown }: ExportPreviewProps) {
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (err) {
      console.error("Failed to copy JSON:", err);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (err) {
      console.error("Failed to copy Markdown:", err);
    }
  };

  const hasHighlights = data.highlights.length > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Export Preview</CardTitle>
          </div>
          <Badge variant={hasHighlights ? "default" : "secondary"}>
            {data.highlights.length} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        {!hasHighlights ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-lg">No highlights selected</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Adjust your filters to include some highlights for export.
              </p>
            </div>
          </div>
        ) : (
          <>
            <Tabs defaultValue="json" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="json" className="gap-2">
                  <FileJson className="h-4 w-4" />
                  JSON
                </TabsTrigger>
                <TabsTrigger value="markdown" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Markdown
                </TabsTrigger>
              </TabsList>

              <TabsContent value="json" className="flex-1 flex flex-col space-y-3 mt-3">
                <div className="relative flex-1 min-h-[300px]">
                  <pre className="absolute inset-0 overflow-auto rounded-md bg-muted p-4 text-xs font-mono">
                    <code>{jsonString}</code>
                  </pre>
                </div>
                <Button 
                  onClick={handleCopyJson} 
                  className="w-full gap-2"
                  variant={copiedJson ? "secondary" : "default"}
                >
                  {copiedJson ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied to clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy JSON
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Use this JSON with AI tools like ChatGPT, Claude, or Gemini for resume generation.
                </p>
              </TabsContent>

              <TabsContent value="markdown" className="flex-1 flex flex-col space-y-3 mt-3">
                <div className="relative flex-1 min-h-[300px]">
                  <pre className="absolute inset-0 overflow-auto rounded-md bg-muted p-4 text-xs font-mono whitespace-pre-wrap">
                    {markdown}
                  </pre>
                </div>
                <Button 
                  onClick={handleCopyMarkdown} 
                  className="w-full gap-2"
                  variant={copiedMarkdown ? "secondary" : "default"}
                >
                  {copiedMarkdown ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied to clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Markdown
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Use this Markdown for Notion, Google Docs, or other document editors.
                </p>
              </TabsContent>
            </Tabs>

            {/* Filters Summary */}
            {(data.request_filters.query || 
              data.request_filters.domains?.length || 
              data.request_filters.skills?.length ||
              data.request_filters.types?.length) && (
              <div className="pt-4 border-t space-y-2">
                <h4 className="text-sm font-medium">Applied Filters</h4>
                <div className="flex flex-wrap gap-2">
                  {data.request_filters.query && (
                    <Badge variant="outline">Search: &quot;{data.request_filters.query}&quot;</Badge>
                  )}
                  {data.request_filters.types?.map((type) => (
                    <Badge key={type} variant="secondary" className="capitalize">{type}</Badge>
                  ))}
                  {data.request_filters.domains?.map((domain) => (
                    <Badge key={domain} variant="outline">{domain}</Badge>
                  ))}
                  {data.request_filters.skills?.map((skill) => (
                    <Badge key={skill} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
