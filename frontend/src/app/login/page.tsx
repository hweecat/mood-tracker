'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Brain, ArrowRight, Lock, User } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mounted) return;
    
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        username: identifier,
        password,
        callbackUrl: '/',
        redirect: true,
      });

      if (result?.error) {
        setError('Invalid credentials');
        setLoading(false);
      }
    } catch {
      setError('An error occurred');
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
          <h1 className="text-3xl font-black text-foreground tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground font-medium mt-2">Sign in to your MindfulTrack journal</p>
        </div>

        <div className="bg-card p-8 rounded-[2.5rem] shadow-2xl border-2 border-border">
          <form 
            onSubmit={handleSubmit} 
            method="POST" 
            data-hydrated={mounted}
            className={`space-y-6 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
          >
            {error && (
              <div role="alert" className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="identifier" className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-3">Email or Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full p-4 pl-12 rounded-2xl bg-secondary border-2 border-border focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none font-bold transition-all text-foreground"
                  placeholder="Enter your email or username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-3">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 pl-12 rounded-2xl bg-secondary border-2 border-border focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none font-bold transition-all text-foreground"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-700 hover:bg-brand-800 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Signing in...' : (
                  <>
                    Sign In <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm font-bold">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-brand-600 hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
