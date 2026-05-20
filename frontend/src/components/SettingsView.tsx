'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ThemeSelector } from './ThemeSelector';
import { User, Mail, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1_URL = `${API_BASE_URL}/api/v1`;

export function SettingsView() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
    }
  }, [session]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch(`${API_V1_URL}/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Update the session to reflect changes in UI
      await update({ name, email });
      
      setStatus({ type: 'success', message: 'Profile updated successfully!' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      setStatus({ type: 'error', message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-3xl p-6 border-2 border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-border pb-4">
          <div className="p-2 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-xl border-2 border-brand-200 dark:border-transparent">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight uppercase">Profile Settings</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary border-2 border-border focus:border-brand-500 outline-none transition-all font-bold"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary border-2 border-border focus:border-brand-500 outline-none transition-all font-bold"
                required
              />
            </div>
          </div>

          {status && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200 ${
              status.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-2 border-green-200 dark:border-green-800' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-2 border-red-200 dark:border-red-800'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <p className="text-sm font-bold">{status.message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-b-4 border-brand-800"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </section>

      <section className="bg-card rounded-3xl p-6 border-2 border-border shadow-sm">
        <ThemeSelector />
      </section>
    </div>
  );
}
