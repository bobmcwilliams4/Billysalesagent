'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = { apiKey: "AIzaSyCuTHwqo6HPjR0oSlCnWBkRslXTZg41VWY", authDomain: "echo-prime-ai.firebaseapp.com", projectId: "echo-prime-ai", storageBucket: "echo-prime-ai.firebasestorage.app", messagingSenderId: "249995513427", appId: "1:249995513427:web:968e587d91e887a3b140a6" };
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const API_BASE = 'https://billymc-api.bmcii1976.workers.dev';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [industry, setIndustry] = useState('insurance');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // After Firebase auth, check if tenant exists — if not and signing up, provision one
  const ensureTenant = async (firebaseUser: any) => {
    const token = await firebaseUser.getIdToken();

    // Check if user already has a tenant
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();

    if (meData.status === 'active') {
      // Already provisioned
      return true;
    }

    if (mode === 'signup' || meData.status === 'no_tenant') {
      // Provision new tenant
      const signupRes = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_token: token,
          company_name: companyName || firebaseUser.displayName || firebaseUser.email.split('@')[0],
          owner_name: fullName || firebaseUser.displayName || firebaseUser.email.split('@')[0],
          industry,
        }),
      });

      if (!signupRes.ok) {
        const err = await signupRes.json();
        throw new Error(err.error || 'Failed to create account');
      }
    }

    return true;
  };

  const handleGoogleAuth = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureTenant(result.user);
      router.push('/');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Google sign-in failed');
      }
    }
    setGoogleLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Email and password are required'); return; }
    if (mode === 'signup' && !companyName.trim()) { setError('Company name is required'); return; }
    setError('');
    setLoading(true);
    try {
      let userCred;
      if (mode === 'signup') {
        userCred = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
      }
      await ensureTenant(userCred.user);
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try signing in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Try again later.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-500/[0.04] blur-[100px]" />
      </div>

      {/* Auth Card */}
      <div className="glass-panel-elevated w-full max-w-md mx-4 p-8 animate-scaleIn relative z-10">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ept-logo-dark.png" alt="Echo Prime Technologies" style={{ height: '48px', width: 'auto' }} className="mb-4" />
          <h1 className="font-orbitron text-xl text-[--text-100] tracking-wider">
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-sm text-[--text-48] mt-1">AI-Powered Sales Agent Platform</p>
        </div>

        {/* Google Auth */}
        <button
          onClick={handleGoogleAuth}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[--border-interactive] bg-[--glass-bg] hover:bg-[--glass-bg-hover] text-[--text-100] text-sm font-medium transition-all duration-150 disabled:opacity-50 mb-6"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {googleLoading ? 'Connecting...' : `Continue with Google`}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-[--border-base]" />
          <span className="text-[11px] text-[--text-24] uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-[--border-base]" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="text-xs text-[--text-48] mb-1.5 block">Company Name</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Insurance" className="input-glass w-full px-4 py-2.5" />
              </div>
              <div>
                <label className="text-xs text-[--text-48] mb-1.5 block">Your Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Smith" className="input-glass w-full px-4 py-2.5" />
              </div>
              <div>
                <label className="text-xs text-[--text-48] mb-1.5 block">Industry</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)} className="input-glass w-full px-4 py-2.5">
                  <option value="insurance">Insurance</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="financial_services">Financial Services</option>
                  <option value="home_services">Home Services</option>
                  <option value="automotive">Automotive</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="solar">Solar / Energy</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-[--text-48] mb-1.5 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="input-glass w-full px-4 py-2.5" autoComplete="email" />
          </div>
          <div>
            <label className="text-xs text-[--text-48] mb-1.5 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Create a password (6+ chars)' : 'Enter your password'} className="input-glass w-full px-4 py-2.5" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400 animate-fadeIn">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50 disabled:transform-none">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : (
              mode === 'signup' ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <div className="mt-6 text-center">
          {mode === 'signin' ? (
            <p className="text-sm text-[--text-48]">
              New here?{' '}
              <button onClick={() => { setMode('signup'); setError(''); }} className="text-blue-400 hover:text-blue-300 font-medium">
                Create an account
              </button>
            </p>
          ) : (
            <p className="text-sm text-[--text-48]">
              Already have an account?{' '}
              <button onClick={() => { setMode('signin'); setError(''); }} className="text-blue-400 hover:text-blue-300 font-medium">
                Sign in
              </button>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[--border-base] text-center">
          <p className="text-[9px] text-[--text-24] uppercase tracking-[0.12em]">Powered by</p>
          <p className="chromatic-text text-[11px] font-orbitron font-semibold tracking-wider mt-1">
            ECHO PRIME TECHNOLOGIES
          </p>
        </div>
      </div>
    </div>
  );
}
