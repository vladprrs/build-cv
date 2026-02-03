"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { exportDatabase, importDatabase, type BackupData, type ImportResult } from "@/app/actions";
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  Database, 
  FileJson, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  HardDrive
} from "lucide-react";

export default function BackupPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setImportResult(null);
  };

  // Handle import
  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text) as BackupData;
      const result = await importDatabase(data);
      setImportResult(result);
      
      if (result.success) {
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        jobsImported: 0,
        highlightsImported: 0,
        errors: [err.message || "Failed to parse backup file"],
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
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
                <Database className="h-7 w-7 text-primary" />
                Backup & Import
              </h1>
              <p className="text-muted-foreground">
                Export and import your data for backup and migration
              </p>
            </div>
          </div>
        </div>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle>Export Backup</CardTitle>
            </div>
            <CardDescription>
              Download a complete backup of your database including all jobs and highlights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <FileJson className="h-10 w-10 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Full Database Export</p>
                <p className="text-sm text-muted-foreground">
                  Includes all jobs, highlights, metrics, and tags in JSON format
                </p>
              </div>
              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="gap-2"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The backup file will be named <code>backup-YYYY-MM-DD.json</code>
            </p>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Import Backup</CardTitle>
            </div>
            <CardDescription>
              Restore your data from a previously exported backup file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warning */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Importing will overwrite existing data with matching IDs. 
                Make sure to export a backup before importing if you want to preserve current data.
              </AlertDescription>
            </Alert>

            <Separator />

            {/* File Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="backup-file"
                  />
                  <label htmlFor="backup-file">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      asChild
                    >
                      <span>
                        <HardDrive className="h-4 w-4" />
                        {selectedFile ? selectedFile.name : "Select backup file..."}
                      </span>
                    </Button>
                  </label>
                </div>
                <Button 
                  onClick={handleImport}
                  disabled={!selectedFile || isImporting}
                  className="gap-2"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import
                    </>
                  )}
                </Button>
              </div>

              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected file: <Badge variant="outline">{selectedFile.name}</Badge>{" "}
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Import Result */}
            {importResult && (
              <>
                <Separator />
                <Alert variant={importResult.success ? "default" : "destructive"}>
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {importResult.success ? "Import Successful" : "Import Completed with Errors"}
                  </AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>
                      Jobs imported: <strong>{importResult.jobsImported}</strong>
                    </p>
                    <p>
                      Highlights imported: <strong>{importResult.highlightsImported}</strong>
                    </p>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Errors:</p>
                        <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                          {importResult.errors.map((error, i) => (
                            <li key={i} className="text-destructive">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">About Backups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">What is backed up?</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>All jobs (companies, roles, dates)</li>
                  <li>All highlights (achievements, projects, etc.)</li>
                  <li>Metrics, tags, and keywords</li>
                  <li>Hidden/visible status</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">How to use</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Regularly export backups for safety</li>
                  <li>Store backup files in a secure location</li>
                  <li>Use import to restore or migrate data</li>
                  <li>Backups are compatible across devices</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
