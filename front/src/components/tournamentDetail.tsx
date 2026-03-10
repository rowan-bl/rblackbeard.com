import { useState, useEffect } from 'react';
import type { Tournament } from '../types/tournament';
import { API_ENDPOINTS } from '../config/api';

interface TournamentDetailProps {
  tournament: Tournament;
  username: string;
  circuitCode: string;
  onBack: () => void;
}

export function TournamentDetailComponent({ tournament, username, circuitCode, onBack }: TournamentDetailProps) {
  const [notifyLastMatch, setNotifyLastMatch] = useState(false);
  const [notifyOrderOfPlay, setNotifyOrderOfPlay] = useState(false);
  const [savedState, setSavedState] = useState({ notifyLastMatch: false, notifyOrderOfPlay: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(API_ENDPOINTS.subscriptions(username))
      .then(r => r.json())
      .then(data => {
        const existing = data.subscriptions?.find((s: any) => s.tournamentKey === tournament.tournamentKey);
        if (existing) {
          setNotifyLastMatch(existing.notifyLastMatch);
          setNotifyOrderOfPlay(existing.notifyOrderOfPlay);
          setSavedState({ notifyLastMatch: existing.notifyLastMatch, notifyOrderOfPlay: existing.notifyOrderOfPlay });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = notifyLastMatch !== savedState.notifyLastMatch || notifyOrderOfPlay !== savedState.notifyOrderOfPlay;

  const handleSave = async () => {
    setMessage(null);
    if (!hasChanges) return;

    setSaving(true);

    try {
      const response = await fetch(API_ENDPOINTS.subscribe, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUsername: username,
          tournamentKey: tournament.tournamentKey,
          tournamentName: tournament.tournamentName,
          circuitCode: tournament.circuitCode || circuitCode,
          notifyLastMatch,
          notifyOrderOfPlay,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to save subscription' });
        return;
      }

      setSavedState({ notifyLastMatch, notifyOrderOfPlay });
      setMessage({ type: 'success', text: 'Subscription saved!' });
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col space-y-4">
      <button
        onClick={onBack}
        className="px-3 py-2 font-bold bg-gray-700 text-white hover:bg-gray-600 w-fit"
      >
        &lt; Back
      </button>

      <div className="bg-(--rcolor-highlight) p-3 space-y-2">
        <div className="text-lg font-bold">{tournament.tournamentName}</div>
        <div className="text-sm text-gray-400">
          {tournament.city || tournament.venueName || tournament.hostNation}
        </div>
        <div className="text-sm text-gray-400">
          {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
        </div>
        <div className="text-sm text-gray-400">
          {tournament.surface} • {tournament.tourCategory}
        </div>
        <div className="text-xs text-gray-500 mt-2">{tournament.tournamentKey}</div>
      </div>

      <div className="bg-(--rcolor-highlight) p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">Telegram Notifications</div>
          <div className="text-xs text-gray-400 font-mono">{username}</div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setNotifyLastMatch((v) => !v)}
            disabled={loading}
            className={`w-full px-3 py-2 font-bold transition select-none disabled:opacity-50 ${
              notifyLastMatch ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
            }`}
            aria-pressed={notifyLastMatch}
          >
            Last match on court: {notifyLastMatch ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => setNotifyOrderOfPlay((v) => !v)}
            disabled={loading}
            className={`w-full px-3 py-2 font-bold transition select-none disabled:opacity-50 ${
              notifyOrderOfPlay ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
            }`}
            aria-pressed={notifyOrderOfPlay}
          >
            Order of play released: {notifyOrderOfPlay ? 'ON' : 'OFF'}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="w-full px-3 py-2 font-bold bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Subscription'}
        </button>

        {message && (
          <div className={`text-sm p-2 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
