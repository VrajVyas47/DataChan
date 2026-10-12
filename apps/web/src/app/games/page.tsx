'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Search, Loader2, Target, Hash } from 'lucide-react';


export default function GamesHubPage() {
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const gamesList = await api.listGames();
      setGames(gamesList || []);
    } catch (err: any) {
      console.error('Error loading games', err);
      setError(err.message || 'Failed to load case files from the investigation registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  return (
    <div className="container max-w-6xl py-8 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">DataChan Games</h1>
        <p className="text-muted-foreground text-lg">
          Interactive learning through database-driven investigations and puzzles.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive flex items-center justify-between">
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={loadGames}
            className="px-3 py-1.5 text-xs font-semibold bg-destructive/20 hover:bg-destructive/30 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <div key={game.id} className="bg-surface hover:bg-surface-high transition-colors border border-border rounded-xl overflow-hidden group">
              <div className="h-1.5 w-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center text-xs font-bold px-2 py-1 bg-surface-low border border-border rounded-full text-text-muted">
                    <Hash className="w-3 h-3 mr-1" />
                    Case #001
                  </div>
                  <div className="text-xs font-bold px-2 py-1 bg-primary-fixed text-primary rounded-full">
                    {game.difficulty}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-text-main mb-2">{game.title}</h3>
                <p className="text-sm text-text-muted line-clamp-2 mb-4">
                  {game.description}
                </p>
                <div className="flex items-center text-sm text-text-muted mb-6">
                  <Target className="w-4 h-4 mr-2" />
                  {game.type}
                </div>
                <button
                  className="w-full flex items-center justify-center bg-primary text-white py-2 px-4 rounded-lg font-bold hover:bg-primary/90 transition-colors"
                  onClick={() => router.push(`/games/${game.id}`)}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Open Case
                </button>
              </div>
            </div>
          ))}
          {!error && games.length === 0 && (
            <div className="col-span-full p-8 text-center border rounded-lg bg-muted/20 border-dashed">
              <p className="text-muted-foreground">No cases currently available in this semester's catalog.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
