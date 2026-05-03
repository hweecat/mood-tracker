'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Brain, ArrowRight, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSubmitted(false);
    setResetUrl(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      if (!res.ok) {
        throw new Error('Unable to request password reset');
      }

      const body = await res.json().catch(() => ({}));
      const url = body?.reset_url ?? body?.resetUrl ?? null;
      if (url) setResetUrl(url);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-brand-600 rounded-3xl shadow-xl shadow-brand-500/20 mb-4">
            <Brain className="w-10 h-10 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Reset Password</h1>
          <p className="text-muted-foreground font-medium mt-2">We will help you get back into your journal</p>
        </div>

        <Card className="w-full p-8 rounded-[2.5rem] shadow-2xl border-2 border-border bg-card">
          {error && (
            <div role="alert" className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold text-center mb-6">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="space-y-4">
              <p className="text-sm font-bold text-foreground text-center">
                If an account exists for that identifier, we have sent password reset instructions.
              </p>
              {resetUrl && (
                <Link href={resetUrl} className="block">
                  <Button className="w-full">
                    Continue to reset <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </Link>
              )}
              <Link href="/login" className="block text-center text-sm font-bold text-brand-600 hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="identifier" className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-3">
                  Email or Username
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="identifier"
                    name="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email or username"
                    className="pl-12"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-sm font-bold text-brand-600 hover:underline">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
