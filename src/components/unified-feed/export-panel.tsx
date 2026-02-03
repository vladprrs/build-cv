'use client';

import { useState, useEffect } from 'react';
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
import { exportHighlightsForRAG, type SearchFilters, type RAGExportData } from '@/app/actions';
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
  const [activeTab, setActiveTab] = useState<'json' | 'markdown'>('json');

  // Fetch export data when filters change
  useEffect(() => {
    const fetchExportData = async () => {
      const searchFilters: SearchFilters = {
        query: filters.query || undefined,
        types: filters.types.length > 0 ? filters.types : undefined,
        domains: filters.domains.length > 0 ? filters.domains : undefined,
        skills: filters.skills.length > 0 ? filters.skills : undefined,
        onlyWithMetrics: filters.onlyWithMetrics || undefined,
      };
      const data = await exportHighlightsForRAG(customContext || undefined, searchFilters);
      setExportData(data);
    };

    if (isOpen) {
      fetchExportData();
    }
  }, [filters, customContext, isOpen]);

  const jsonContent = exportData ? JSON.stringify(exportData, null, 2) : '';
  const markdownContent = exportData ? generateMarkdownExport(exportData) : '';

  const handleCopy = async () => {
    const content = activeTab === 'json' ? jsonContent : markdownContent;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = activeTab === 'json' ? jsonContent : markdownContent;
    const ext = activeTab === 'json' ? 'json' : 'md';
    const mimeType = activeTab === 'json' ? 'application/json' : 'text/markdown';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `highlights-${new Date().toISOString().split('T')[0]}.${ext}`;
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'json' | 'markdown')}>
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
                </TabsList>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleCopy}
                    disabled={!exportData}
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
                    disabled={!exportData}
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
