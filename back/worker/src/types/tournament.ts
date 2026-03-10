export interface Tournament {
  tournamentKey: string;
  tournamentName: string;
  circuitCode: string; // 'MT' | 'WT'
  hostNation: string;
  startDate: string;
  endDate: string;
  surface: string;
  tourCategory: string;
  venueName?: string;
  city?: string;
}

export interface Match {
  matchId: string;
  court: string;
  status: 'NotStarted' | 'InProgress' | 'Completed';
  player1: string;
  player2: string;
  score?: string;
  scheduledTime?: string;
}

export interface OrderOfPlay {
  released: boolean;
  timestamp?: number;
  courts?: Array<{
    courtName: string;
    matches: Match[];
  }>;
}

export interface TournamentState {
  tournamentKey: string;
  lastMatchStatus?: string; // JSON serialized
  orderOfPlayStatus?: string; // JSON serialized
  lastCheckedAt: number;
}

export interface ITFApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}
