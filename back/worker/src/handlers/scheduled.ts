import { DatabaseQueries } from '../db/queries';
import { ITFApiClient } from '../services/itfApi';
import { TelegramBot } from '../services/telegramBot';
import { NotificationService } from '../services/notificationService';

export async function handleScheduled(db: DatabaseQueries, telegram: TelegramBot, proxyUrl: string): Promise<void> {
  console.log('Scheduled handler triggered');

  const itfApi = new ITFApiClient(proxyUrl);
  const notificationService = new NotificationService(db, itfApi, telegram);

  try {
    await notificationService.processSubscriptions();
  } catch (error) {
    console.error('Error in scheduled handler:', error);
  }
}
