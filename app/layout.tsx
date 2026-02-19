'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import CopilotWidget from './components/copilot-widget';
import { setTokenProvider } from './lib/api';
import './globals.css';

const firebaseConfig = { apiKey: "AIzaSyCuTHwqo6HPjR0oSlCnWBkRslXTZg41VWY", authDomain: "echo-prime-ai.firebaseapp.com", projectId: "echo-prime-ai", storageBucket: "echo-prime-ai.firebasestorage.app", messagingSenderId: "249995513427", appId: "1:249995513427:web:968e587d91e887a3b140a6" };
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const API_BASE = 'https://billymc-api.bmcii1976.workers.dev';

const NAV_ITEMS = [
  { href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Dashboard', exact: true },
  { href: '/leads', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: 'Leads' },
  { href: '/calls', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', label: 'Calls' },
  { href: '/campaigns', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', label: 'Campaigns' },
  { href: '/scripts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Scripts' },
  { href: '/appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Appointments' },
  { href: '/emails', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'Emails' },
  { href: '/calculators', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', label: 'Calculators' },
  { href: '/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Analytics' },
  { href: '/approvals', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Approvals' },
  { href: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', label: 'Settings' },
];

function NavIcon({ d, className = 'w-5 h-5' }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (dark: boolean) => {
      const t = dark ? 'dark' : 'light';
      setTheme(t);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return { theme, toggle };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setTokenProvider(u ? () => u.getIdToken() : () => Promise.resolve(null));
    });
    return () => unsub();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>BillyMC - AI Sales Platform</title>
        <meta name="description" content="AI-Powered Insurance Sales Development Rep Platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="noise-overlay flex h-screen overflow-hidden bg-surface-0">
          {/* Sidebar — hover to expand */}
          <aside
            onMouseEnter={() => setSidebarOpen(true)}
            onMouseLeave={() => setSidebarOpen(false)}
            className={`${sidebarOpen ? 'w-56' : 'w-16'} transition-all duration-200 ease-out flex flex-col glass-sidebar relative z-30`}
          >
            {/* Sidebar Logo — theme-aware */}
            <div className="border-b border-[--border-base] flex items-center justify-center h-[80px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theme === 'dark' ? '/ept-logo-dark.png' : '/ept-logo-light.png'}
                alt="EPT"
                style={{ height: '60px', width: 'auto', maxWidth: 'none' }}
              />
            </div>

            {/* Nav */}
            <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
              {NAV_ITEMS.map((item) => {
                const active = item.exact ? pathname === item.href : (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-xl text-sm transition-all duration-150 ${
                      active
                        ? 'nav-active font-medium'
                        : 'nav-item text-[--text-48] hover:text-[--text-100]'
                    }`}
                  >
                    <NavIcon d={item.icon} className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-blue-500 dark:text-blue-400' : ''}`} />
                    <span className={`truncate transition-all duration-200 ${sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Powered by EPT Footer */}
            <div className="powered-footer">
              {sidebarOpen ? (
                <div className="flex flex-col items-center gap-1 animate-fadeIn">
                  <p className="text-[9px] text-[--text-24] uppercase tracking-[0.12em]">Powered by</p>
                  <p className="chromatic-text text-[11px] font-orbitron font-semibold tracking-wider whitespace-nowrap">
                    ECHO PRIME TECHNOLOGIES
                  </p>
                </div>
              ) : (
                <div className="flex justify-center" title="Powered by Echo Prime Technologies">
                  <Image src={theme === 'dark' ? '/ept-logo-dark.png' : '/ept-logo-light.png'} alt="EPT" width={22} height={22} className="opacity-40 object-contain" />
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="h-[90px] glass-topbar flex items-center justify-between px-6 relative">
              {/* Left — page title + live dot */}
              <div className="flex items-center gap-4 z-10">
                <h1 className="font-orbitron text-xs text-[--text-48] tracking-[0.15em] uppercase">
                  {NAV_ITEMS.find(n => n.exact ? pathname === n.href : (n.href === '/' ? pathname === '/' : pathname.startsWith(n.href)))?.label || 'BillyMC'}
                </h1>
                <div className="flex items-center gap-2">
                  <div className="live-dot" />
                  <span className="text-[10px] font-medium text-emerald-500 dark:text-emerald-400/80 tracking-wider uppercase">Live</span>
                </div>
              </div>

              {/* Center — large logo, switches with theme */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={theme === 'dark' ? '/ept-logo-dark.png' : '/ept-logo-light.png'}
                  alt="Echo Prime Technologies"
                  style={{ height: '70px', width: 'auto' }}
                />
              </div>

              {/* Right — controls */}
              <div className="flex items-center gap-3 z-10">
                {/* Theme Toggle */}
                <button onClick={toggleTheme} className="w-8 h-8 rounded-lg flex items-center justify-center text-[--text-48] hover:text-[--text-100] hover:bg-[--glass-bg-hover] transition-all" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                  {theme === 'dark' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>
                  )}
                </button>
                {user && (
                  <>
                    <span className="text-[11px] text-[--text-24] font-mono">{user.email}</span>
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/80 to-purple-600/80 flex items-center justify-center text-white text-[10px] font-bold border border-[--border-interactive]">
                      {user.email?.[0]?.toUpperCase() || 'B'}
                    </div>
                  </>
                )}
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>

          {/* Copilot Widget */}
          <CopilotWidget apiBase={API_BASE} user={user} />
        </div>
      </body>
    </html>
  );
}
