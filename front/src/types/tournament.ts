export interface Tournament {
  tournamentKey: string;
  tournamentName: string;
  circuitCode: string;
  hostNation: string;
  startDate: string;
  endDate: string;
  surface: string;
  tourCategory: string;
  venueName?: string;
  city?: string;
}

export interface Subscription {
  id?: number;
  telegramUsername: string;
  tournamentKey: string;
  tournamentName: string;
  circuitCode: string;
  notifyLastMatch: boolean;
  notifyOrderOfPlay: boolean;
  createdAt: number;
}
