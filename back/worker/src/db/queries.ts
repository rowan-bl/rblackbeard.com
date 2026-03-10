import { Subscription, TelegramUser } from '../types/subscription';
import { TournamentState } from '../types/tournament';

type SubscriptionRow = {
  id?: number;
  telegram_username: string;
  tournament_key: string;
  tournament_name: string;
  circuit_code: string;
  notify_last_match: number;
  notify_order_of_play: number;
  created_at: number;
};

type TelegramUserRow = {
  telegram_username: string;
  telegram_chat_id: string;
  created_at: number;
};

type TournamentStateRow = {
  tournament_key: string;
  last_match_status?: string;
  order_of_play_status?: string;
  last_checked_at: number;
};

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    telegramUsername: row.telegram_username,
    tournamentKey: row.tournament_key,
    tournamentName: row.tournament_name,
    circuitCode: row.circuit_code,
    notifyLastMatch: Boolean(row.notify_last_match),
    notifyOrderOfPlay: Boolean(row.notify_order_of_play),
    createdAt: row.created_at,
  };
}

function mapTelegramUser(row: TelegramUserRow): TelegramUser {
  return {
    telegramUsername: row.telegram_username,
    telegramChatId: row.telegram_chat_id,
    createdAt: row.created_at,
  };
}

function mapTournamentState(row: TournamentStateRow): TournamentState {
  return {
    tournamentKey: row.tournament_key,
    lastMatchStatus: row.last_match_status,
    orderOfPlayStatus: row.order_of_play_status,
    lastCheckedAt: row.last_checked_at,
  };
}

export class DatabaseQueries {
  constructor(private db: D1Database) { }

  async getTelegramUser(username: string): Promise<TelegramUser | null> {
    const result = await this.db
      .prepare('SELECT * FROM telegram_users WHERE telegram_username = ?')
      .bind(username)
      .first<TelegramUserRow>();
    return result ? mapTelegramUser(result) : null;
  }

  async createTelegramUser(username: string, chatId: string): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO telegram_users (telegram_username, telegram_chat_id, created_at) VALUES (?, ?, ?)'
      )
      .bind(username, chatId, Date.now())
      .run();
  }

  async getTelegramUserByChatId(chatId: string): Promise<TelegramUser | null> {
    const result = await this.db
      .prepare('SELECT * FROM telegram_users WHERE telegram_chat_id = ?')
      .bind(chatId)
      .first<TelegramUserRow>();
    return result ? mapTelegramUser(result) : null;
  }

  async createOrUpdateSubscription(subscription: Subscription): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO subscriptions
        (telegram_username, tournament_key, tournament_name, circuit_code, notify_last_match, notify_order_of_play, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(telegram_username, tournament_key)
        DO UPDATE SET
          notify_last_match = excluded.notify_last_match,
          notify_order_of_play = excluded.notify_order_of_play`
      )
      .bind(
        subscription.telegramUsername,
        subscription.tournamentKey,
        subscription.tournamentName,
        subscription.circuitCode,
        subscription.notifyLastMatch ? 1 : 0,
        subscription.notifyOrderOfPlay ? 1 : 0,
        subscription.createdAt || Date.now()
      )
      .run();
  }

  async getSubscriptionsByUsername(username: string): Promise<Subscription[]> {
    const result = await this.db
      .prepare('SELECT * FROM subscriptions WHERE telegram_username = ?')
      .bind(username)
      .all<SubscriptionRow>();
    return (result.results || []).map(mapSubscription);
  }

  async getActiveSubscriptions(): Promise<Subscription[]> {
    const result = await this.db
      .prepare('SELECT * FROM subscriptions')
      .all<SubscriptionRow>();
    return (result.results || []).map(mapSubscription);
  }

  async deleteSubscription(username: string, tournamentKey: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM subscriptions WHERE telegram_username = ? AND tournament_key = ?')
      .bind(username, tournamentKey)
      .run();
  }

  async getTournamentState(tournamentKey: string): Promise<TournamentState | null> {
    const result = await this.db
      .prepare('SELECT * FROM tournament_state WHERE tournament_key = ?')
      .bind(tournamentKey)
      .first<TournamentStateRow>();
    return result ? mapTournamentState(result) : null;
  }

  async updateTournamentState(state: TournamentState): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO tournament_state
        (tournament_key, last_match_status, order_of_play_status, last_checked_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(tournament_key)
        DO UPDATE SET
          last_match_status = excluded.last_match_status,
          order_of_play_status = excluded.order_of_play_status,
          last_checked_at = excluded.last_checked_at`
      )
      .bind(
        state.tournamentKey,
        state.lastMatchStatus || null,
        state.orderOfPlayStatus || null,
        state.lastCheckedAt
      )
      .run();
  }

  async checkRateLimit(key: string, windowMs: number): Promise<boolean> {
    const result = await this.db
      .prepare('SELECT last_request_at FROM rate_limits WHERE key = ?')
      .bind(key)
      .first<{ last_request_at: number }>();
    if (!result) return false;
    return (Date.now() - result.last_request_at) < windowMs;
  }

  async updateRateLimit(key: string): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO rate_limits (key, last_request_at) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET last_request_at = excluded.last_request_at'
      )
      .bind(key, Date.now())
      .run();
  }

  async getMultipleTournamentStates(tournamentKeys: string[]): Promise<TournamentState[]> {
    if (tournamentKeys.length === 0) return [];

    const placeholders = tournamentKeys.map(() => '?').join(',');
    const result = await this.db
      .prepare(`SELECT * FROM tournament_state WHERE tournament_key IN (${placeholders})`)
      .bind(...tournamentKeys)
      .all<TournamentStateRow>();
    return (result.results || []).map(mapTournamentState);
  }
}
