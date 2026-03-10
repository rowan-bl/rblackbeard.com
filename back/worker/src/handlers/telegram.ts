import { DatabaseQueries } from '../db/queries';
import { TelegramBot } from '../services/telegramBot';

export async function handleTelegramWebhook(request: Request, db: DatabaseQueries, telegram: TelegramBot): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const update = await request.json();
    await telegram.processUpdate(update, db);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleUserCheck(request: Request, db: DatabaseQueries, username: string): Promise<Response> {
  const rateLimitKey = `check:${username}`;
  const isRateLimited = await db.checkRateLimit(rateLimitKey, 1_000);
  if (isRateLimited) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.updateRateLimit(rateLimitKey);
  const user = await db.getTelegramUser(username);

  return new Response(JSON.stringify({ started: user !== null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleGetSubscriptions(request: Request, db: DatabaseQueries, username: string): Promise<Response> {
  try {
    const subscriptions = await db.getSubscriptionsByUsername(username);

    return new Response(JSON.stringify({ success: true, subscriptions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch subscriptions',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
