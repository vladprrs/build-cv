import { type RAGExportData } from "@/app/actions";

/**
 * Generate Markdown format from RAG export data
 */
export function generateMarkdownExport(data: RAGExportData): string {
  const lines: string[] = [];

  lines.push("# Professional Experience Summary");
  lines.push("");
  lines.push(data.context);
  lines.push("");

  if (data.request_filters.query || data.request_filters.domains?.length || data.request_filters.skills?.length) {
    lines.push("## Filters Applied");
    if (data.request_filters.query) {
      lines.push(`- **Search:** ${data.request_filters.query}`);
    }
    if (data.request_filters.domains?.length) {
      lines.push(`- **Domains:** ${data.request_filters.domains.join(", ")}`);
    }
    if (data.request_filters.skills?.length) {
      lines.push(`- **Skills:** ${data.request_filters.skills.join(", ")}`);
    }
    if (data.request_filters.types?.length) {
      lines.push(`- **Types:** ${data.request_filters.types.join(", ")}`);
    }
    lines.push("");
  }

  lines.push(`## Highlights (${data.highlights.length})`);
  lines.push("");

  for (const h of data.highlights) {
    lines.push(`### ${h.title}`);
    if (h.company) {
      lines.push(`**Company:** ${h.company}`);
    }
    lines.push(`**Period:** ${h.period}`);
    lines.push("");
    lines.push(h.description);
    lines.push("");
    
    if (h.metrics) {
      lines.push(`**Metrics:** ${h.metrics}`);
      lines.push("");
    }
    
    if (h.tags.length > 0) {
      lines.push(`**Tags:** ${h.tags.join(", ")}`);
      lines.push("");
    }
    
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
