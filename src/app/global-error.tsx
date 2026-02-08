'use client';

import { AlertCircle, RefreshCcw } from 'lucide-react';
import { useEffect } from 'react';
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-[#fcfcfd] dark:bg-[#0f172a] min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-red-50 dark:bg-red-900/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Something went wrong
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              An unexpected error occurred in MindfulTrack. We apologize for the inconvenience.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-lg shadow-brand-200 dark:shadow-brand-900/20 active:scale-95"
            >
              <RefreshCcw className="w-5 h-5" />
              Try again
            </button>
          </div>
          
          <p className="text-[10px] font-medium text-slate-600 dark:text-slate-500 uppercase tracking-widest pt-8">
            Global Error Handler
          </p>
        </div>
      </body>
    </html>
  );
}
