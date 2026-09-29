'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TopCommandNav } from '@/components/navigation/TopCommandNav';
import { useTheme } from '@/lib/theme';
import { api } from '@/lib/api';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { navPosition } = useTheme();
  const [authChecked, setAuthChecked] = useState(false);

  const isPublicPage = pathname === '/' || pathname === '/login';

  useEffect(() => {
    if (!isPublicPage) {
      if (!api.isAuthenticated()) {
        router.push('/login');
        return;
      }
    }
    setAuthChecked(true);
  }, [pathname, isPublicPage, router]);

  if (isPublicPage) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-background text-text">
        {children}
      </div>
    );
  }

  // Prevent flashing protected dashboard while redirecting unauthenticated user
  if (!authChecked && !api.isAuthenticated()) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-text">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Padding classes depending on dock position
  const paddingClasses = {
    bottom: 'pt-4 sm:pt-6 pb-24 md:pb-28',
    top: 'pt-20 sm:pt-24 pb-6',
    left: 'pl-20 sm:pl-28 py-4 sm:py-6 pr-4',
    right: 'pr-20 sm:pr-28 py-4 sm:py-6 pl-4',
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-2 sm:p-4 md:p-6 bg-background text-text transition-colors">
      <TopCommandNav />
      <main
        className={`w-full max-w-[1720px] mx-auto flex-1 flex flex-col transition-all ${
          paddingClasses[navPosition] || paddingClasses.bottom
        }`}
      >
        <div className="w-full bg-surface rounded-3xl shadow-soft border border-border p-4 sm:p-6 md:p-8 flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
