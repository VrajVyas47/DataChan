import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { TopCommandNav } from '@/components/navigation/TopCommandNav';

export const metadata: Metadata = {
  title: 'DATA-CHAN | Virtual Database Lab',
  description:
    'Learn By Building And Learn By Querying. Interactive MongoDB virtual database lab, MQL playground, curriculum, and data model builder.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="lavender-light" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-text-main antialiased selection:bg-primary/20 selection:text-primary">
        <ThemeProvider>
          <div className="min-h-screen w-full flex flex-col justify-between p-2 sm:p-4 md:p-6">
            <TopCommandNav />
            <main className="w-full max-w-[1720px] mx-auto pt-20 md:pt-24 flex-1 flex flex-col">
              <div className="w-full bg-surface rounded-2xl md:rounded-3xl shadow-soft border border-border p-4 sm:p-6 md:p-8 flex-1 flex flex-col">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
