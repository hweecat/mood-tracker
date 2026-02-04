'use client';

import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  FileJson, 
  FileText, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataManagementProps {
  onDataImported: () => void;
}

export function DataManagement({ onDataImported }: DataManagementProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (format: 'json' | 'csv' | 'md') => {
    setExporting(format);
    setStatus(null);
    try {
      const response = await fetch(`/api/export?format=${format}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindfultrack_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setStatus({ type: 'success', message: `Data exported successfully as ${format.toUpperCase()}.` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setStatus({ type: 'error', message });
    } finally {
      setExporting(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatus(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        let format = 'json';
        if (extension === 'csv') format = 'csv';
        if (extension === 'md' || extension === 'txt') format = 'md';

        const response = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format, content }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Import failed');

        setStatus({ type: 'success', message: result.message });
        onDataImported();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Import failed';
        setStatus({ type: 'error', message: `Import failed: ${message}` });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Status Message */}
      {status && (
        <div className={cn(
          "p-5 rounded-3xl flex items-start gap-4 animate-in zoom-in-95 duration-300 border-2 shadow-lg",
          status.type === 'success'
            ? "bg-green-100 dark:bg-green-900/20 text-green-900 dark:text-green-300 border-green-600 dark:border-green-500"
            : "bg-red-100 dark:bg-red-900/20 text-red-900 dark:text-red-300 border-red-600 dark:border-red-500"
        )}>
          {status.type === 'success' ? <CheckCircle2 className="w-6 h-6 flex-shrink-0" /> : <AlertCircle className="w-6 h-6 flex-shrink-0" />}
          <p className="text-sm font-black tracking-tight leading-snug">{status.message}</p>
        </div>
      )}

      {/* Export Section */}
      <section className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-transparent">
            <Download className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">Export Data</h2>
        </div>
        
        <p className="text-sm text-muted-foreground mb-8 font-medium leading-relaxed">
          Download your journaling history and mood data. Choose a format that works best for your needs.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ExportButton 
            icon={<FileJson className="w-6 h-6" />}
            label="JSON"
            sub="Full backup"
            loading={exporting === 'json'}
            onClick={() => handleExport('json')}
          />
          <ExportButton 
            icon={<FileSpreadsheet className="w-6 h-6" />}
            label="CSV"
            sub="Excel / Sheets"
            loading={exporting === 'csv'}
            onClick={() => handleExport('csv')}
          />
          <ExportButton 
            icon={<FileText className="w-6 h-6" />}
            label="Markdown"
            sub="Readable log"
            loading={exporting === 'md'}
            onClick={() => handleExport('md')}
          />
        </div>
      </section>

      {/* Import Section */}
      <section className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded-xl border border-purple-200 dark:border-transparent">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">Import Data</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-8 font-medium leading-relaxed">
          Restore your data from a JSON, CSV, or Markdown backup. JSON is recommended for the most accurate restoration.
        </p>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".json,.csv,.md,.txt" 
          className="hidden" 
        />

        <button
          onClick={handleImportClick}
          disabled={importing}
          className="w-full flex items-center justify-center gap-4 py-6 border-4 border-dashed border-border rounded-3xl text-muted-foreground hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-400 hover:bg-secondary transition-all group active:scale-[0.98] shadow-inner"
        >
          {importing ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <span className="text-lg font-black text-brand-700">Importing Data...</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 group-hover:-translate-y-1 transition-transform text-muted-foreground group-hover:text-brand-500" />
              <span className="text-lg font-black">Choose Backup File</span>
            </>
          )}
        </button>
      </section>

      <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border-2 border-amber-300 dark:border-amber-900/30 shadow-sm">
        <h3 className="text-sm font-black text-amber-900 dark:text-amber-400 mb-3 border-b border-amber-200 dark:border-amber-900/50 pb-2">Privacy Note</h3>
        <p className="text-sm text-amber-900 dark:text-amber-500 font-bold leading-relaxed">
          Your data is stored locally. Exporting allows you to keep your own backups, but handle these files with care as they contain your personal journal entries.
        </p>
      </div>
    </div>
  );
}

function ExportButton({ icon, label, sub, onClick, loading }: { icon: React.ReactNode, label: string, sub: string, onClick: () => void, loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-center gap-3 p-6 bg-secondary hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-2xl border-2 border-border hover:border-brand-500 dark:hover:border-brand-800 transition-all text-center group shadow-sm active:scale-95"
    >
      <div className="text-muted-foreground group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
        {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : icon}
      </div>
      <div>
        <div className="font-black text-foreground text-sm tracking-wide">{label}</div>
        <div className="text-[10px] font-black text-muted-foreground mt-1 group-hover:text-brand-700 dark:group-hover:text-brand-500">{sub}</div>
      </div>
    </button>
  );
}
