'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
} from '@/components/ui/alert-dialog';
import {
  exportDatabase,
  importDatabase,
  type BackupData,
  type ImportResult,
} from '@/app/actions';
import {
  ArrowLeft,
  Download,
  Upload,
  Settings,
  Sun,
  Moon,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  HardDrive,
  Trash2,
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<Theme>('system');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (newTheme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(systemDark ? 'dark' : 'light');
    } else {
      root.classList.add(newTheme);
    }
  };

  // Handle theme change
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
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
          fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        jobsImported: 0,
        highlightsImported: 0,
        errors: [err.message || 'Failed to parse backup file'],
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle clear all data
  const handleClearData = async () => {
    setIsClearing(true);
    try {
      // Import empty data to clear
      await importDatabase({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        jobs: [],
        highlights: [],
      });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Failed to clear data:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your preferences and data
            </p>
          </div>
        </div>

        {/* Theme Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Appearance</CardTitle>
            <CardDescription>
              Choose how Build CV looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange('light')}
                className="gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange('dark')}
                className="gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange('system')}
                className="gap-2"
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backup Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Backup & Restore</CardTitle>
            <CardDescription>
              Export or import your data for backup and migration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium text-sm">Export Full Backup</p>
                <p className="text-xs text-muted-foreground">
                  Download all your data as JSON
                </p>
              </div>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                size="sm"
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

            <Separator />

            {/* Import */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
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
                      size="sm"
                      className="w-full justify-start gap-2"
                      asChild
                    >
                      <span>
                        <HardDrive className="h-4 w-4" />
                        {selectedFile ? selectedFile.name : 'Select backup file...'}
                      </span>
                    </Button>
                  </label>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || isImporting}
                  size="sm"
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
                <p className="text-xs text-muted-foreground">
                  Selected: <Badge variant="outline" className="text-xs">{selectedFile.name}</Badge>{' '}
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}

              {/* Import Result */}
              {importResult && (
                <Alert variant={importResult.success ? 'default' : 'destructive'}>
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle className="text-sm">
                    {importResult.success ? 'Import Successful' : 'Import Failed'}
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {importResult.success ? (
                      <>
                        Imported {importResult.jobsImported} jobs and{' '}
                        {importResult.highlightsImported} highlights
                      </>
                    ) : (
                      importResult.errors[0]
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions. Please be careful.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
              <div>
                <p className="font-medium text-sm">Clear All Data</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete all jobs and highlights
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Clear Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all
                      your jobs, highlights, and associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isClearing}
                    >
                      {isClearing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        'Yes, delete everything'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Keyboard Shortcuts</CardTitle>
            <CardDescription>
              Quick actions available on the main page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>Search</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs">⌘K</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>New Highlight</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs">⌘N</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>New Job</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs">⌘⇧N</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>Copy JSON</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs">⌘⇧C</kbd>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
