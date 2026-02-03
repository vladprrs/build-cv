"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportFilters, type ExportFiltersState } from "@/components/export-filters";
import { ExportPreview } from "@/components/export-preview";
import { 
  exportHighlightsForRAG,
  getAllDomains,
  getAllSkills,
  searchHighlights,
  type HighlightWithJob,
  type RAGExportData,
  type SearchFilters,
  type HighlightType 
} from "@/app/actions";
import { generateMarkdownExport } from "@/lib/export-utils";
import { ArrowLeft, Download, Sparkles } from "lucide-react";

export default function ExportPage() {
  // Filter options
  const [domains, setDomains] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  
  // Filter state
  const [filters, setFilters] = useState<ExportFiltersState>({
    query: "",
    selectedTypes: [],
    selectedDomains: [],
    selectedSkills: [],
    onlyWithMetrics: false,
    customContext: "",
  });

  // Data state
  const [highlights, setHighlights] = useState<HighlightWithJob[]>([]);
  const [exportData, setExportData] = useState<RAGExportData | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Load filter options on mount
  useEffect(() => {
    async function loadFilterOptions() {
      const [domainsData, skillsData] = await Promise.all([
        getAllDomains(),
        getAllSkills(),
      ]);
      setDomains(domainsData);
      setSkills(skillsData);
    }
    loadFilterOptions();
  }, []);

  // Convert ExportFiltersState to SearchFilters
  const buildSearchFilters = useCallback((): SearchFilters => ({
    query: filters.query || undefined,
    types: filters.selectedTypes.length > 0 ? filters.selectedTypes : undefined,
    domains: filters.selectedDomains.length > 0 ? filters.selectedDomains : undefined,
    skills: filters.selectedSkills.length > 0 ? filters.selectedSkills : undefined,
    onlyWithMetrics: filters.onlyWithMetrics || undefined,
  }), [filters]);

  // Load highlights based on filters
  useEffect(() => {
    async function loadHighlights() {
      setIsLoading(true);
      const searchFilters = buildSearchFilters();
      const data = await searchHighlights(searchFilters);
      setHighlights(data);
      setIsLoading(false);
    }
    loadHighlights();
  }, [buildSearchFilters]);

  // Generate export data when highlights change
  useEffect(() => {
    async function generateExport() {
      const searchFilters = buildSearchFilters();
      const context = filters.customContext || undefined;
      const data = await exportHighlightsForRAG(context, searchFilters);
      setExportData(data);
      setMarkdown(generateMarkdownExport(data));
    }
    generateExport();
  }, [highlights, filters.customContext, buildSearchFilters]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: ExportFiltersState) => {
    setFilters(newFilters);
  }, []);

  // Handle download JSON file
  const handleDownloadJson = () => {
    if (!exportData) return;
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cv-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle download Markdown file
  const handleDownloadMarkdown = () => {
    if (!markdown) return;
    
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cv-export-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-primary" />
                RAG Export
              </h1>
              <p className="text-muted-foreground">
                Export your career data for AI-powered resume generation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadJson} disabled={!exportData || exportData.highlights.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
            <Button variant="outline" onClick={handleDownloadMarkdown} disabled={!exportData || exportData.highlights.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Download MD
            </Button>
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Filters */}
          <div className="lg:col-span-4">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Export Filters</CardTitle>
                <CardDescription>
                  Select highlights to include in your export
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExportFilters
                  domains={domains}
                  skills={skills}
                  resultCount={highlights.length}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-8">
            {exportData ? (
              <ExportPreview data={exportData} markdown={markdown} />
            ) : (
              <Card className="h-[500px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-muted animate-pulse mx-auto" />
                  <p className="text-muted-foreground">Loading preview...</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Usage Tips */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">How to use this export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">For AI Resume Generation</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Select relevant highlights using filters</li>
                  <li>Add custom context (target role, industry)</li>
                  <li>Copy JSON or download the file</li>
                  <li>Upload to ChatGPT, Claude, or Gemini</li>
                  <li>Ask AI to generate a tailored resume</li>
                </ol>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">For Manual Editing</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Export as Markdown</li>
                  <li>Copy to Notion, Google Docs, or Word</li>
                  <li>Edit and format as needed</li>
                  <li>Use as a foundation for your resume</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
