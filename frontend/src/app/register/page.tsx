'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password }),
      });

      if (res.ok) {
        router.push('/login?registered=true');
      } else {
        const data = await res.json();
        setError(data.detail || 'Registration failed');
      }
    } catch (_err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyan-50 p-4">
      <Card className="w-full max-w-md p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
        <h1 className="text-3xl font-black mb-6 uppercase tracking-tighter italic">Join MindfulTrack</h1>
        
        {error && (
          <div className="bg-rose-100 border-2 border-rose-500 p-3 mb-6 font-bold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-black mb-1 uppercase text-sm">Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your Name"
              className="border-2 border-black"
            />
          </div>
          <div>
            <label className="block font-black mb-1 uppercase text-sm">Name</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="demo"
              className="border-2 border-black"
            />
          </div>
          <div>
            <label className="block font-black mb-1 uppercase text-sm">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="border-2 border-black"
            />
          </div>
          <div>
            <label className="block font-black mb-1 uppercase text-sm">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className="border-2 border-black"
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-lime-400 hover:bg-lime-500 text-black border-4 border-black font-black py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            {loading ? 'CREATING ACCOUNT...' : 'REGISTER'}
          </Button>
        </form>

        <p className="mt-6 text-center font-bold">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-600 hover:underline">
            Login here
          </Link>
        </p>
      </Card>
    </div>
  );
}
