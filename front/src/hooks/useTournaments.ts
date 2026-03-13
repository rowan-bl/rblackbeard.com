import { useState, useEffect } from 'react';
import type { Tournament } from '../types/tournament';
import { API_ENDPOINTS } from '../config/api';

export function useTournaments(circuitCode: 'MT' | 'WT', currentMonth: Date) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchTournaments(circuitCode, currentMonth, controller.signal);
    return () => controller.abort();
  }, [circuitCode, currentMonth]);

  const fetchTournaments = async (code: 'MT' | 'WT', month: Date, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const year = month.getFullYear();
      const monthIndex = month.getMonth();
      const dateFrom = new Date(year, monthIndex, 1).toISOString().split('T')[0];
      const dateTo = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];

      const params = new URLSearchParams({ circuitCode: code, dateFrom, dateTo });
      const response = await fetch(`${API_ENDPOINTS.tournaments}?${params}`, { signal });

      if (!response.ok) throw new Error('Failed to fetch tournaments');

      const data = await response.json();
      setTournaments(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  return {
    tournaments,
    loading,
    error,
    refetch: () => fetchTournaments(circuitCode, currentMonth),
  };
}
