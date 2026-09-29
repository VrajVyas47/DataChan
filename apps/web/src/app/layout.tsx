import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { AppShell } from '@/components/layout/AppShell';

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
      <body className="min-h-screen bg-background text-text antialiased selection:bg-primary/20 selection:text-primary">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
