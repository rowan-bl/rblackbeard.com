import { DatabaseQueries } from '../db/queries';

export class TelegramBot {
  private botToken: string;
  private apiUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      const result = await response.json();
      return result.ok;
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      return false;
    }
  }

  async handleStartCommand(chatId: string, username: string, db: DatabaseQueries): Promise<string> {
    try {
      // Check if user already exists
      const existingUser = await db.getTelegramUser(username);

      if (existingUser) {
        return `Welcome back! You're already registered as ${username}.\n\nYou can now subscribe to tournament notifications on the ITF Court Finder website.`;
      }

      // Register new user
      await db.createTelegramUser(username, chatId);

      return `Welcome to ITF Tournament Notifications!\n\nYou've been registered as ${username}.\n\nNow you can:\n1. Visit the ITF Court Finder website\n2. Browse tournaments\n3. Enable notifications for events you want to track\n\nYou'll receive updates here when:\n- The last match on a court starts\n- Order of play is released`;
    } catch (error) {
      console.error('Error handling /start command:', error);
      return 'Sorry, there was an error registering you. Please try again later.';
    }
  }

  async handleMyStatusCommand(username: string, db: DatabaseQueries): Promise<string> {
    try {
      const subscriptions = await db.getSubscriptionsByUsername(username);

      if (subscriptions.length === 0) {
        return 'You have no active subscriptions.\n\nVisit the ITF Court Finder website to subscribe to tournaments.';
      }

      let message = `You have ${subscriptions.length} active subscription(s):\n\n`;

      subscriptions.forEach((sub, index) => {
        message += `${index + 1}. ${sub.tournamentName}\n`;
        message += `   Circuit: ${sub.circuitCode}\n`;
        if (sub.notifyLastMatch) {
          message += `   - Last match notifications: ON\n`;
        }
        if (sub.notifyOrderOfPlay) {
          message += `   - Order of play notifications: ON\n`;
        }
        message += '\n';
      });

      return message;
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return 'Sorry, there was an error fetching your subscriptions.';
    }
  }

  async handleUnsubscribeCommand(username: string, tournamentKey: string, db: DatabaseQueries): Promise<string> {
    try {
      await db.deleteSubscription(username, tournamentKey);
      return `Successfully unsubscribed from tournament: ${tournamentKey}`;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return 'Sorry, there was an error unsubscribing. Please try again later.';
    }
  }

  async processUpdate(update: any, db: DatabaseQueries): Promise<void> {
    if (!update.message || !update.message.text) {
      return;
    }

    const chatId = update.message.chat.id.toString();
    const text = update.message.text.trim();
    const username = update.message.from.username ? `@${update.message.from.username}` : null;

    let responseText = '';

    if (text.startsWith('/start')) {
      if (!username) {
        responseText = 'Sorry, you need to set a Telegram username to use this bot.';
      } else {
        responseText = await this.handleStartCommand(chatId, username, db);
      }
    } else if (text.startsWith('/mystatus')) {
      if (!username) {
        responseText = 'Sorry, you need to set a Telegram username to use this bot.';
      } else {
        responseText = await this.handleMyStatusCommand(username, db);
      }
    } else if (text.startsWith('/unsubscribe')) {
      if (!username) {
        responseText = 'Sorry, you need to set a Telegram username to use this bot.';
      } else {
        const parts = text.split(' ');
        if (parts.length < 2) {
          responseText = 'Usage: /unsubscribe <tournament_key>';
        } else {
          const tournamentKey = parts[1];
          responseText = await this.handleUnsubscribeCommand(username, tournamentKey, db);
        }
      }
    } else {
      responseText = 'Available commands:\n/start - Register for notifications\n/mystatus - View your subscriptions\n/unsubscribe <key> - Unsubscribe from a tournament';
    }

    await this.sendMessage(chatId, responseText);
  }

  formatLastMatchNotification(tournamentName: string, tournamentKey: string, court: string, match: string): string {
    return `🎾 ITF Tournament Alert\n\n📍 ${tournamentName}\n(${tournamentKey})\n\n⏰ Last match on ${court} has started!\n\nMatch: ${match}`;
  }

  formatOrderOfPlayNotification(tournamentName: string, tournamentKey: string): string {
    return `🎾 ITF Tournament Alert\n\n📍 ${tournamentName}\n(${tournamentKey})\n\n📋 Order of play has been released!`;
  }
}
