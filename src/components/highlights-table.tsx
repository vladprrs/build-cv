"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  type HighlightWithJob,
  quickUpdateHighlightTitle,
  bulkDeleteHighlights,
  type HighlightType,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Pencil, 
  Trash2, 
  MoreHorizontal, 
  Building2,
  ExternalLink,
  Calendar,
  Tag,
  ChevronUp,
  ChevronDown,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

// Type colors for badges
const typeColors: Record<HighlightType, string> = {
  achievement: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100 border-amber-200",
  project: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100 border-blue-200",
  responsibility: "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border-gray-200",
  education: "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100 border-green-200",
};

const typeLabels: Record<HighlightType, string> = {
  achievement: "Achievement",
  project: "Project",
  responsibility: "Responsibility",
  education: "Education",
};

type SortField = "title" | "company" | "type" | "startDate";
type SortDirection = "asc" | "desc";

interface HighlightsTableProps {
  highlights: HighlightWithJob[];
}

export function HighlightsTable({ highlights }: HighlightsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sortField, setSortField] = useState<SortField>("startDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isDeleting, setIsDeleting] = useState(false);

  // Sort highlights
  const sortedHighlights = [...highlights].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "company":
        const companyA = a.job?.company || "";
        const companyB = b.job?.company || "";
        comparison = companyA.localeCompare(companyB);
        break;
      case "type":
        comparison = a.type.localeCompare(b.type);
        break;
      case "startDate":
        comparison = a.startDate.localeCompare(b.startDate);
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Toggle all selection
  const toggleAll = () => {
    if (selectedIds.size === highlights.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(highlights.map((h) => h.id)));
    }
  };

  // Toggle single selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Start inline editing
  const startEditing = (highlight: HighlightWithJob) => {
    setEditingId(highlight.id);
    setEditValue(highlight.title);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  // Save inline edit
  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    
    try {
      await quickUpdateHighlightTitle(id, editValue.trim());
      setEditingId(null);
      setEditValue("");
      router.refresh();
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      await bulkDeleteHighlights(Array.from(selectedIds));
      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      console.error("Failed to delete highlights:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date range
  const formatDateRange = (start: string, end?: string | null) => {
    const startFormatted = new Date(start).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    if (!end) return `${startFormatted} — Present`;
    const endFormatted = new Date(end).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return `${startFormatted} — ${endFormatted}`;
  };

  // Render sort header
  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        )}
      </div>
    </TableHead>
  );

  if (highlights.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No highlights yet.</p>
        <Button asChild>
          <Link href="/jobs">Add Your First Highlight</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} highlights?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The selected highlights will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    highlights.length > 0 && selectedIds.size === highlights.length
                  }
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <SortHeader field="title">Title</SortHeader>
              <SortHeader field="company">Company</SortHeader>
              <SortHeader field="type">Type</SortHeader>
              <TableHead>Tags</TableHead>
              <SortHeader field="startDate">Period</SortHeader>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedHighlights.map((highlight) => (
              <TableRow
                key={highlight.id}
                className={cn(
                  selectedIds.has(highlight.id) && "bg-muted/50"
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(highlight.id)}
                    onCheckedChange={() => toggleSelection(highlight.id)}
                    aria-label={`Select ${highlight.title}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {editingId === highlight.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(highlight.id);
                          if (e.key === "Escape") cancelEditing();
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => saveEdit(highlight.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <Link
                        href={highlight.jobId ? `/jobs/${highlight.jobId}` : "#"}
                        className="hover:underline"
                      >
                        {highlight.title}
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => startEditing(highlight)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {highlight.job ? (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{highlight.job.company}</span>
                      <Link href={`/jobs/${highlight.job.id}`}>
                        <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </Link>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">No company</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(typeColors[highlight.type])}>
                    {typeLabels[highlight.type]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {highlight.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {highlight.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{highlight.skills.length - 3}
                      </Badge>
                    )}
                    {highlight.skills.length === 0 && highlight.domains.length > 0 && (
                      <>
                        {highlight.domains.slice(0, 2).map((domain) => (
                          <Badge key={domain} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {domain}
                          </Badge>
                        ))}
                        {highlight.domains.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{highlight.domains.length - 2}
                          </Badge>
                        )}
                      </>
                    )}
                    {highlight.skills.length === 0 && highlight.domains.length === 0 && (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDateRange(highlight.startDate, highlight.endDate)}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startEditing(highlight)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Title
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={highlight.jobId ? `/jobs/${highlight.jobId}` : "#"}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Job
                        </Link>
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete highlight?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove &quot;{highlight.title}&quot;. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  const { bulkDeleteHighlights } = await import("@/app/actions");
                                  await bulkDeleteHighlights([highlight.id]);
                                  router.refresh();
                                } catch (error) {
                                  console.error("Failed to delete:", error);
                                }
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {sortedHighlights.length} highlight
          {sortedHighlights.length !== 1 && "s"}
        </span>
        {selectedIds.size > 0 && (
          <span>{selectedIds.size} selected</span>
        )}
      </div>
    </div>
  );
}
