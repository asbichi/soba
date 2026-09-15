import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function Login() {
  const { user, signIn, signInDemo } = useAuth() as any;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  if (user) {
    return <Navigate to="/dashboard" />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (username.toLowerCase() === 'asbichi' || username.toLowerCase().startsWith('agent-')) {
        await signInDemo(username);
      } else {
        const email = `${username.toLowerCase()}@soba.local`;
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fbfe] px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#5cb85c] rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>

      <div className="relative w-full max-w-md space-y-8 bg-white p-10 rounded-3xl shadow-2xl z-10 border border-slate-100">
        <div>
          <div className="mx-auto w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-6 shadow-sm border border-[#5cb85c]">
            <LogIn className="w-6 h-6 text-[#5cb85c]" />
          </div>
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#484848]">
            TRACKER OF SOBA ELECTION
          </h2>
          <p className="mt-3 text-center text-sm font-medium text-slate-500">
            Tracking Result of Soba LGA &bull; Secure collation, verification, and results reporting.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-bold text-slate-700">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-2 block w-full rounded-lg border-slate-300 py-2.5 px-4 text-slate-900 shadow-sm focus:border-[#5cb85c] focus:ring-[#5cb85c] sm:text-sm font-medium transition-shadow bg-slate-50 focus:bg-white border outline-none"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-2 block w-full rounded-lg border-slate-300 py-2.5 px-4 text-slate-900 shadow-sm focus:border-[#5cb85c] focus:ring-[#5cb85c] sm:text-sm font-medium transition-shadow bg-slate-50 focus:bg-white border outline-none"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-rose-600 bg-rose-50 px-3 py-2 rounded-md border border-rose-100">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-[#5cb85c] px-4 py-3 text-sm font-bold text-white hover:bg-green-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                <LogIn className="h-5 w-5 text-green-300 group-hover:text-green-200" aria-hidden="true" />
              </span>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
          
          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Demo Credentials</p>
                <p className="text-sm font-medium text-slate-600">User: <span className="font-bold text-slate-900">asbichi</span> | Pass: <span className="font-bold text-slate-900">Asbichi12#</span></p>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">PU Agent Login</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Agents can log in using <span className="font-bold text-slate-900 bg-slate-200 px-1 py-0.5 rounded">agent-[pu-code]</span> (e.g., <code className="text-indigo-600 font-bold">agent-pu-01-001</code>) and any password.
                </p>
              </div>
            </div>
          </div>
        </form>
        <p className="text-xs text-center font-medium text-slate-400 mt-4">
          Authorized personnel only. All access is logged and monitored.
        </p>
        <div className="text-center pt-4 border-t border-slate-100">
          <Link to="/" className="text-sm font-bold text-[#5cb85c] hover:text-green-700 hover:underline">
            ← Back to Public Results Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
