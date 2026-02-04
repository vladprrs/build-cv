'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Copy, Download, Check, ChevronDown, ChevronUp, FileJson, FileText } from 'lucide-react';
import { useFilters } from '@/contexts/filter-context';
import { exportHighlightsForRAG, exportN8nWorkflow, type SearchFilters } from '@/app/actions';
import { type RAGExportData } from '@/lib/n8n/workflow';
import { generateMarkdownExport } from '@/lib/export-utils';

interface ExportPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportPanel({ isOpen, onOpenChange }: ExportPanelProps) {
  const { filters, hasActiveFilters } = useFilters();
  const [customContext, setCustomContext] = useState('');
  const [exportData, setExportData] = useState<RAGExportData | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'json' | 'markdown' | 'n8n'>('json');
  const [n8nContent, setN8nContent] = useState('');
  const [n8nLoading, setN8nLoading] = useState(false);

  const searchFilters = useMemo<SearchFilters>(() => ({
    query: filters.query || undefined,
    types: filters.types.length > 0 ? filters.types : undefined,
    domains: filters.domains.length > 0 ? filters.domains : undefined,
    skills: filters.skills.length > 0 ? filters.skills : undefined,
    onlyWithMetrics: filters.onlyWithMetrics || undefined,
  }), [filters]);

  // Fetch export data when filters change
  useEffect(() => {
    const fetchExportData = async () => {
      const data = await exportHighlightsForRAG(customContext || undefined, searchFilters);
      setExportData(data);
    };

    if (isOpen) {
      fetchExportData();
    }
  }, [customContext, isOpen, searchFilters]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'n8n') {
      return;
    }

    let cancelled = false;
    const fetchWorkflow = async () => {
      setN8nLoading(true);
      try {
        const workflow = await exportN8nWorkflow(
          customContext || undefined,
          searchFilters,
          { provider: 'openrouter', outputFormat: 'markdown' }
        );
        if (!cancelled) {
          setN8nContent(JSON.stringify(workflow, null, 2));
        }
      } finally {
        if (!cancelled) {
          setN8nLoading(false);
        }
      }
    };

    fetchWorkflow();
    return () => {
      cancelled = true;
    };
  }, [activeTab, customContext, isOpen, searchFilters]);

  const jsonContent = exportData ? JSON.stringify(exportData, null, 2) : '';
  const markdownContent = exportData ? generateMarkdownExport(exportData) : '';
  const canCopyOrDownload = activeTab === 'n8n' ? Boolean(n8nContent) && !n8nLoading : Boolean(exportData);

  const handleCopy = async () => {
    const content = activeTab === 'json' ? jsonContent : activeTab === 'markdown' ? markdownContent : n8nContent;
    if (!content) {
      return;
    }
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = activeTab === 'json' ? jsonContent : activeTab === 'markdown' ? markdownContent : n8nContent;
    if (!content) {
      return;
    }
    const ext = activeTab === 'markdown' ? 'md' : 'json';
    const mimeType = activeTab === 'markdown' ? 'text/markdown' : 'application/json';
    const baseName = activeTab === 'n8n' ? 'n8n-cv-optimizer' : 'highlights';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}-${new Date().toISOString().split('T')[0]}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-8 px-3 text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <FileJson className="h-3.5 w-3.5" />
            Export Preview
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 border-dashed">
          <CardContent className="p-4 space-y-4">
            {/* Custom Context */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Context (optional)</label>
              <Textarea
                placeholder="e.g., Applying for Senior PM role at Stripe..."
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                className="h-16 text-sm resize-none"
              />
            </div>

            {/* Format Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'json' | 'markdown' | 'n8n')}>
              <div className="flex items-center justify-between">
                <TabsList className="h-8">
                  <TabsTrigger value="json" className="text-xs px-3 h-6">
                    <FileJson className="h-3 w-3 mr-1" />
                    JSON
                  </TabsTrigger>
                  <TabsTrigger value="markdown" className="text-xs px-3 h-6">
                    <FileText className="h-3 w-3 mr-1" />
                    Markdown
                  </TabsTrigger>
                  <TabsTrigger value="n8n" className="text-xs px-3 h-6">
                    n8n
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleCopy}
                    disabled={!canCopyOrDownload}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleDownload}
                    disabled={!canCopyOrDownload}
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                </div>
              </div>

              <TabsContent value="json" className="mt-2">
                <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64 font-mono">
                  {jsonContent || 'Loading...'}
                </pre>
              </TabsContent>
              <TabsContent value="markdown" className="mt-2">
                <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64 font-mono whitespace-pre-wrap">
                  {markdownContent || 'Loading...'}
                </pre>
              </TabsContent>
              <TabsContent value="n8n" className="mt-2">
                <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64 font-mono">
                  {n8nLoading ? 'Loading...' : n8nContent || 'No workflow generated yet.'}
                </pre>
              </TabsContent>
            </Tabs>

            {/* Stats */}
            {exportData && (
              <p className="text-xs text-muted-foreground">
                {exportData.highlights.length} highlight{exportData.highlights.length !== 1 ? 's' : ''} will be exported
              </p>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
