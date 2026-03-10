import { DatabaseQueries } from '../db/queries';
import { ITFApiClient } from './itfApi';
import { TelegramBot } from './telegramBot';
import { Subscription } from '../types/subscription';

export class NotificationService {
  constructor(
    private db: DatabaseQueries,
    private itfApi: ITFApiClient,
    private telegram: TelegramBot
  ) {}

  async processSubscriptions(): Promise<void> {
    console.log('Starting subscription processing...');

    const subscriptions = await this.db.getActiveSubscriptions();

    if (subscriptions.length === 0) {
      console.log('No active subscriptions found');
      return;
    }

    console.log(`Processing ${subscriptions.length} subscriptions`);

    // Group subscriptions by tournament to minimize API calls
    const tournamentGroups = this.groupSubscriptionsByTournament(subscriptions);

    for (const [tournamentKey, subs] of Object.entries(tournamentGroups)) {
      await this.processTournament(tournamentKey, subs);
    }

    console.log('Subscription processing complete');
  }

  private groupSubscriptionsByTournament(subscriptions: Subscription[]): Record<string, Subscription[]> {
    return subscriptions.reduce((acc, sub) => {
      if (!acc[sub.tournamentKey]) {
        acc[sub.tournamentKey] = [];
      }
      acc[sub.tournamentKey].push(sub);
      return acc;
    }, {} as Record<string, Subscription[]>);
  }

  private async processTournament(tournamentKey: string, subscriptions: Subscription[]): Promise<void> {
    console.log(`Processing tournament: ${tournamentKey}`);

    // Get current state from database
    const currentState = await this.db.getTournamentState(tournamentKey);

    // Check for last match notifications
    const lastMatchSubs = subscriptions.filter(s => s.notifyLastMatch);
    if (lastMatchSubs.length > 0) {
      await this.checkLastMatch(tournamentKey, lastMatchSubs, currentState);
    }

    // Check for order of play notifications
    const oopSubs = subscriptions.filter(s => s.notifyOrderOfPlay);
    if (oopSubs.length > 0) {
      await this.checkOrderOfPlay(tournamentKey, oopSubs, currentState);
    }
  }

  private async checkLastMatch(
    tournamentKey: string,
    subscriptions: Subscription[],
    currentState: any
  ): Promise<void> {
    const lastMatchData = await this.itfApi.checkLastMatchStarted(tournamentKey);

    if (!lastMatchData.started) {
      return;
    }

    // Parse previous state
    let previousState: any = null;
    if (currentState?.lastMatchStatus) {
      try {
        previousState = JSON.parse(currentState.lastMatchStatus);
      } catch {
        previousState = null;
      }
    }

    // Check if this is a new event (match just started)
    const isNewEvent = !previousState || !previousState.started || previousState.court !== lastMatchData.court;

    if (isNewEvent) {
      console.log(`New last match started on ${lastMatchData.court} for ${tournamentKey}`);

      // Send notifications to all subscribed users
      for (const sub of subscriptions) {
        await this.sendLastMatchNotification(sub, lastMatchData.court!, lastMatchData.match!);
      }

      // Update state
      await this.db.updateTournamentState({
        tournamentKey,
        lastMatchStatus: JSON.stringify(lastMatchData),
        orderOfPlayStatus: currentState?.orderOfPlayStatus,
        lastCheckedAt: Date.now(),
      });
    }
  }

  private async checkOrderOfPlay(
    tournamentKey: string,
    subscriptions: Subscription[],
    currentState: any
  ): Promise<void> {
    const orderOfPlay = await this.itfApi.fetchOrderOfPlay(tournamentKey);
    console.log(`OOP result for ${tournamentKey}:`, JSON.stringify(orderOfPlay));

    if (!orderOfPlay || !orderOfPlay.released) {
      return;
    }

    // Parse previous state
    let previousState: any = null;
    if (currentState?.orderOfPlayStatus) {
      try {
        previousState = JSON.parse(currentState.orderOfPlayStatus);
      } catch {
        previousState = null;
      }
    }

    // Check if this is a new release (was not released before, now it is)
    const isNewRelease = !previousState || !previousState.released;

    if (isNewRelease) {
      console.log(`Order of play released for ${tournamentKey}`);

      // Send notifications to all subscribed users
      for (const sub of subscriptions) {
        await this.sendOrderOfPlayNotification(sub);
      }

      // Update state
      await this.db.updateTournamentState({
        tournamentKey,
        lastMatchStatus: currentState?.lastMatchStatus,
        orderOfPlayStatus: JSON.stringify(orderOfPlay),
        lastCheckedAt: Date.now(),
      });
    }
  }

  private async sendLastMatchNotification(subscription: Subscription, court: string, match: string): Promise<void> {
    try {
      const user = await this.db.getTelegramUser(subscription.telegramUsername);

      if (!user) {
        console.warn(`User not found: ${subscription.telegramUsername}`);
        return;
      }

      const message = this.telegram.formatLastMatchNotification(
        subscription.tournamentName,
        subscription.tournamentKey,
        court,
        match
      );

      await this.telegram.sendMessage(user.telegramChatId, message);
      console.log(`Sent last match notification to ${subscription.telegramUsername}`);
    } catch (error) {
      console.error(`Failed to send notification to ${subscription.telegramUsername}:`, error);
    }
  }

  private async sendOrderOfPlayNotification(subscription: Subscription): Promise<void> {
    try {
      const user = await this.db.getTelegramUser(subscription.telegramUsername);

      if (!user) {
        console.warn(`User not found: ${subscription.telegramUsername}`);
        return;
      }

      const message = this.telegram.formatOrderOfPlayNotification(
        subscription.tournamentName,
        subscription.tournamentKey
      );

      await this.telegram.sendMessage(user.telegramChatId, message);
      console.log(`Sent order of play notification to ${subscription.telegramUsername}`);
    } catch (error) {
      console.error(`Failed to send notification to ${subscription.telegramUsername}:`, error);
    }
  }
}
