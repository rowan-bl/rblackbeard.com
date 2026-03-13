import { useState } from 'react';
import type { Tournament } from '../types/tournament';
import { TournamentDetailComponent } from './tournamentDetail';
import { useTournaments } from '../hooks/useTournaments';

interface TournamentsProps {
  username: string;
  onChangeUsername: () => void;
}

export function TournamentsComponent({ username, onChangeUsername }: TournamentsProps) {
  const [circuitCode, setCircuitCode] = useState<'MT' | 'WT'>('MT');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const { tournaments, loading, error, refetch } = useTournaments(circuitCode, currentMonth);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isThisWeek = (tournament: Tournament) => {
    const now = new Date();
    const start = new Date(tournament.startDate);
    const end = new Date(tournament.endDate);
    return now >= start && now <= end;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (selectedTournament) {
    return (
      <TournamentDetailComponent
        tournament={selectedTournament}
        username={username}
        circuitCode={circuitCode}
        onBack={() => setSelectedTournament(null)}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold">ITF Tournaments</div>
        <button
          onClick={onChangeUsername}
          className="text-xs text-green-400 hover:text-green-300 font-mono"
          title="Change username"
        >
          connected to {username}
        </button>
      </div>

      <div className="bg-(--rcolor-highlight) p-3 flex items-center justify-between gap-2">
        <button
          onClick={() => setCircuitCode('MT')}
          className={`px-3 py-2 font-bold ${circuitCode === 'MT' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}
        >
          Men
        </button>
        <button
          onClick={() => setCircuitCode('WT')}
          className={`px-3 py-2 font-bold ${circuitCode === 'WT' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}
        >
          Women
        </button>
      </div>

      <div className="bg-(--rcolor-highlight) p-3 flex items-center justify-between gap-2">
        <button
          onClick={previousMonth}
          className="px-3 py-2 font-bold bg-gray-700 text-white hover:bg-gray-600"
        >
          &lt;
        </button>
        <div className="text-sm font-bold">{monthYear}</div>
        <button
          onClick={nextMonth}
          className="px-3 py-2 font-bold bg-gray-700 text-white hover:bg-gray-600"
        >
          &gt;
        </button>
      </div>

      {loading && <div className="text-sm text-gray-400 p-3">Loading tournaments...</div>}

      {error && (
        <div className="bg-(--rcolor-highlight) p-3 space-y-2">
          <div className="text-sm text-red-400">{error}</div>
          <button
            onClick={refetch}
            className="px-3 py-2 font-bold bg-gray-700 text-white hover:bg-gray-600"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && tournaments.length === 0 && (
        <div className="text-sm text-gray-400 p-3">No tournaments found for this month</div>
      )}

      {!loading && !error && tournaments.length > 0 && (
        <div className="flex flex-col space-y-2">
          {tournaments.map((tournament) => (
            <button
              key={tournament.tournamentKey}
              onClick={() => setSelectedTournament(tournament)}
              className="bg-(--rcolor-highlight) p-3 text-left hover:bg-gray-700 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-sm">{tournament.tournamentName}</div>
                  <div className="text-xs text-gray-400">
                    {tournament.city || tournament.venueName || tournament.hostNation}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {tournament.surface} • {tournament.tourCategory}
                  </div>
                </div>
                {isThisWeek(tournament) && (
                  <div className="px-2 py-1 bg-blue-600 text-white text-xs font-bold">
                    THIS WEEK
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
