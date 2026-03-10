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

export interface TelegramUser {
  telegramUsername: string;
  telegramChatId: string;
  createdAt: number;
}

export interface SubscribeRequest {
  telegramUsername: string;
  tournamentKey: string;
  tournamentName: string;
  circuitCode: string;
  notifyLastMatch: boolean;
  notifyOrderOfPlay: boolean;
}

export interface SubscribeResponse {
  success: boolean;
  message: string;
  error?: string;
}
