'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { TopCommandNav } from '@/components/navigation/TopCommandNav';
import { useTheme } from '@/lib/theme';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { navPosition } = useTheme();

  const isPublicPage = pathname === '/' || pathname === '/login';

  if (isPublicPage) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-background text-text">
        {children}
      </div>
    );
  }

  // Padding classes depending on dock position
  const paddingClasses = {
    bottom: 'pt-4 sm:pt-6 pb-24 md:pb-28',
    top: 'pt-20 sm:pt-24 pb-6',
    left: 'pl-24 sm:pl-28 py-4 sm:py-6 pr-4',
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
