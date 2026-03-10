import { useState, useEffect } from 'react';
import type { Tournament } from '../types/tournament';
import { API_ENDPOINTS } from '../config/api';

export function useTournaments(circuitCode: string, currentMonth: Date) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTournaments();
  }, [circuitCode, currentMonth]);

  const fetchTournaments = async () => {
    setLoading(true);
    setError(null);

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const dateFrom = new Date(year, month, 1).toISOString().split('T')[0];
      const dateTo = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const params = new URLSearchParams({
        circuitCode,
        dateFrom,
        dateTo,
      });

      const response = await fetch(`${API_ENDPOINTS.tournaments}?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch tournaments');
      }

      const data = await response.json();
      setTournaments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  return { tournaments, loading, error, refetch: fetchTournaments };
}
