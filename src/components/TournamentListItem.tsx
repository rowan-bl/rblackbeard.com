import { format, parseISO, isSameWeek } from 'date-fns';
import { Calendar, MapPin } from 'lucide-react';

interface Tournament {
  tournamentKey: string;
  tournamentName: string;
  hostNation: string;
  startDate: string;
  endDate: string;
  surfaceDesc: string;
  categories: string[];
  isLive?: boolean;
}

interface TournamentListItemProps {
  tournament: Tournament;
  onSelect: (tournament: Tournament) => void;
  isSelected: boolean;
}

export function TournamentListItem({ tournament, onSelect, isSelected }: TournamentListItemProps) {
  const isCurrentWeek = isSameWeek(parseISO(tournament.startDate), new Date(), { weekStartsOn: 1 });

  return (
    <div
      onClick={() => onSelect(tournament)}
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected
        ? 'bg-indigo-900/40 border-indigo-500 ring-1 ring-indigo-500'
        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
        } ${isCurrentWeek ? 'border-l-4 border-l-emerald-500' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-white line-clamp-1">{tournament.tournamentName}</h3>
        {tournament.isLive && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
            LIVE
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {tournament.hostNation}
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {format(parseISO(tournament.startDate), 'MMM d')} - {format(parseISO(tournament.endDate), 'MMM d')}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {tournament.categories?.map((cat) => (
          <span key={cat} className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
            {cat}
          </span>
        ))}
        <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
          {tournament.surfaceDesc}
        </span>
      </div>
    </div>
  );
}
