'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, Download, ChevronDown, Check, FileJson, FileText } from 'lucide-react';
import { useFilters } from '@/contexts/filter-context';
import { exportHighlightsForRAG, type SearchFilters } from '@/app/actions';
import { generateMarkdownExport } from '@/lib/export-utils';

interface ResultsHeaderProps {
  totalHighlights: number;
  filteredCount: number;
  onExportPanelToggle?: () => void;
  showExportPanel?: boolean;
}

export function ResultsHeader({
  totalHighlights,
  filteredCount,
  onExportPanelToggle,
  showExportPanel,
}: ResultsHeaderProps) {
  const { filters, hasActiveFilters } = useFilters();
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleCopyJson = async () => {
    setCopying(true);
    try {
      const searchFilters: SearchFilters = {
        query: filters.query || undefined,
        types: filters.types.length > 0 ? filters.types : undefined,
        domains: filters.domains.length > 0 ? filters.domains : undefined,
        skills: filters.skills.length > 0 ? filters.skills : undefined,
        onlyWithMetrics: filters.onlyWithMetrics || undefined,
      };
      const data = await exportHighlightsForRAG(undefined, searchFilters);
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    } finally {
      setCopying(false);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      const searchFilters: SearchFilters = {
        query: filters.query || undefined,
        types: filters.types.length > 0 ? filters.types : undefined,
        domains: filters.domains.length > 0 ? filters.domains : undefined,
        skills: filters.skills.length > 0 ? filters.skills : undefined,
        onlyWithMetrics: filters.onlyWithMetrics || undefined,
      };
      const data = await exportHighlightsForRAG(undefined, searchFilters);
      const markdown = generateMarkdownExport(data);
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownloadJson = async () => {
    try {
      const searchFilters: SearchFilters = {
        query: filters.query || undefined,
        types: filters.types.length > 0 ? filters.types : undefined,
        domains: filters.domains.length > 0 ? filters.domains : undefined,
        skills: filters.skills.length > 0 ? filters.skills : undefined,
        onlyWithMetrics: filters.onlyWithMetrics || undefined,
      };
      const data = await exportHighlightsForRAG(undefined, searchFilters);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `highlights-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const handleDownloadMarkdown = async () => {
    try {
      const searchFilters: SearchFilters = {
        query: filters.query || undefined,
        types: filters.types.length > 0 ? filters.types : undefined,
        domains: filters.domains.length > 0 ? filters.domains : undefined,
        skills: filters.skills.length > 0 ? filters.skills : undefined,
        onlyWithMetrics: filters.onlyWithMetrics || undefined,
      };
      const data = await exportHighlightsForRAG(undefined, searchFilters);
      const markdown = generateMarkdownExport(data);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `highlights-${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  return (
    <div className="flex items-center justify-between py-2 border-b">
      <p className="text-sm text-muted-foreground">
        {hasActiveFilters ? (
          <>
            <span className="font-medium text-foreground">{filteredCount}</span>
            {' '}of {totalHighlights} highlights
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">{totalHighlights}</span>
            {' '}highlights
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        {/* Copy JSON Button - always visible when there are highlights */}
        {filteredCount > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleCopyJson}
              disabled={copying}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy JSON
                </>
              )}
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <Download className="h-3.5 w-3.5" />
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyMarkdown}>
                  <FileText className="h-4 w-4 mr-2" />
                  Copy as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadJson}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Download JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadMarkdown}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download Markdown
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}
