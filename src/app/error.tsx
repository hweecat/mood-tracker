'use client';

import { AlertCircle, RefreshCcw } from 'lucide-react';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="bg-amber-50 dark:bg-amber-900/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
        Oops, something went wrong!
      </h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
        An error occurred while loading this page. You can try refreshing or returning home.
      </p>

      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md active:scale-95"
      >
        <RefreshCcw className="w-4 h-4" />
        Retry Page
      </button>
    </div>
  );
}
