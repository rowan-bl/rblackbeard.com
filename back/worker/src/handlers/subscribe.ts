import { DatabaseQueries } from '../db/queries';
import { SubscribeRequest, SubscribeResponse } from '../types/subscription';

export async function handleSubscribe(request: Request, db: DatabaseQueries): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: SubscribeRequest = await request.json();

    // Validate request
    if (!body.telegramUsername || !body.tournamentKey || !body.tournamentName || !body.circuitCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: telegramUsername, tournamentKey, tournamentName, circuitCode',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has started the bot
    const user = await db.getTelegramUser(body.telegramUsername);

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Please start the Telegram bot first',
          error: 'USER_NOT_REGISTERED',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create or update subscription
    await db.createOrUpdateSubscription({
      telegramUsername: body.telegramUsername,
      tournamentKey: body.tournamentKey,
      tournamentName: body.tournamentName,
      circuitCode: body.circuitCode,
      notifyLastMatch: body.notifyLastMatch || false,
      notifyOrderOfPlay: body.notifyOrderOfPlay || false,
      createdAt: Date.now(),
    });

    const response: SubscribeResponse = {
      success: true,
      message: 'Subscription created successfully',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error handling subscribe request:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
