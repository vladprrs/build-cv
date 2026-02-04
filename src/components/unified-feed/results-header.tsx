'use client';

import { useState } from 'react';
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
}

export function ResultsHeader({
  totalHighlights,
  filteredCount,
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
    <div className="flex items-center justify-between py-3 border-b border-border/20">
      <p className="text-xs text-muted-foreground">
        {hasActiveFilters ? (
          <>
            <span className="text-foreground">{filteredCount}</span> of {totalHighlights}
          </>
        ) : (
          <>{totalHighlights} highlights</>
        )}
      </p>

      {filteredCount > 0 && (
        <div className="flex items-center gap-1">
          <button
            data-copy-json
            onClick={handleCopyJson}
            disabled={copying}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded-md transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy JSON
              </>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded-md transition-colors">
                <Download className="h-3 w-3" />
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleCopyMarkdown} className="text-xs">
                <FileText className="h-3.5 w-3.5 mr-2" />
                Copy Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadJson} className="text-xs">
                <FileJson className="h-3.5 w-3.5 mr-2" />
                Download JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadMarkdown} className="text-xs">
                <FileText className="h-3.5 w-3.5 mr-2" />
                Download MD
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
