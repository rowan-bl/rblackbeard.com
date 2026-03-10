import { DatabaseQueries } from './db/queries';
import { ITFApiClient } from './services/itfApi';
import { TelegramBot } from './services/telegramBot';
import { handleSubscribe } from './handlers/subscribe';
import { handleTelegramWebhook, handleGetSubscriptions, handleUserCheck } from './handlers/telegram';
import { handleScheduled } from './handlers/scheduled';

export interface Env {
	DB: D1Database;
	TELEGRAM_BOT_TOKEN: string;
	PROXY_URL: string;
}

function corsHeaders(origin?: string) {
	return {
		'Access-Control-Allow-Origin': origin || '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const origin = request.headers.get('Origin');

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(origin),
			});
		}

		const db = new DatabaseQueries(env.DB);
		const telegram = new TelegramBot(env.TELEGRAM_BOT_TOKEN);

		try {
			// Route: POST /api/subscribe
			if (url.pathname === '/api/subscribe' && request.method === 'POST') {
				const response = await handleSubscribe(request, db, telegram);
				const responseHeaders = new Headers(response.headers);
				Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
					responseHeaders.set(key, value);
				});
				return new Response(response.body, {
					status: response.status,
					headers: responseHeaders,
				});
			}

			// Route: POST /api/telegram/webhook
			if (url.pathname === '/api/telegram/webhook' && request.method === 'POST') {
				return await handleTelegramWebhook(request, db, telegram);
			}

			// Route: GET /api/user/check/:username
			const userCheckMatch = url.pathname.match(/^\/api\/user\/check\/(.+)$/);
			if (userCheckMatch && request.method === 'GET') {
				const username = decodeURIComponent(userCheckMatch[1]);
				const response = await handleUserCheck(request, db, username);
				const responseHeaders = new Headers(response.headers);
				Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
					responseHeaders.set(key, value);
				});
				return new Response(response.body, {
					status: response.status,
					headers: responseHeaders,
				});
			}

			// Route: GET /api/subscriptions/:username
			const subscriptionsMatch = url.pathname.match(/^\/api\/subscriptions\/(.+)$/);
			if (subscriptionsMatch && request.method === 'GET') {
				const username = decodeURIComponent(subscriptionsMatch[1]);
				const response = await handleGetSubscriptions(request, db, username);
				const responseHeaders = new Headers(response.headers);
				Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
					responseHeaders.set(key, value);
				});
				return new Response(response.body, {
					status: response.status,
					headers: responseHeaders,
				});
			}

			// Route: GET /api/tournaments (proxy to ITF API)
			if (url.pathname === '/api/tournaments' && request.method === 'GET') {
				const circuitCode = url.searchParams.get('circuitCode') || 'MT';
				const dateFrom = url.searchParams.get('dateFrom') || new Date().toISOString().split('T')[0];
				const dateTo = url.searchParams.get('dateTo') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

				const itfApi = new ITFApiClient(env.PROXY_URL);
				const tournaments = await itfApi.fetchCalendar(circuitCode, dateFrom, dateTo);

				return new Response(JSON.stringify(tournaments), {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						...corsHeaders(origin),
					},
				});
			}

			// Default response
			return new Response(
				JSON.stringify({
					message: 'ITF Notification Worker',
					endpoints: [
						'POST /api/subscribe',
						'POST /api/telegram/webhook',
						'GET /api/subscriptions/:username',
						'GET /api/tournaments',
					],
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						...corsHeaders(origin),
					},
				}
			);
		} catch (error) {
			console.error('Worker error:', error);
			return new Response(
				JSON.stringify({
					error: 'Internal server error',
					message: error instanceof Error ? error.message : String(error),
				}),
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json',
						...corsHeaders(origin),
					},
				}
			);
		}
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`Scheduled trigger fired at ${event.cron}`);

		const db = new DatabaseQueries(env.DB);
		const telegram = new TelegramBot(env.TELEGRAM_BOT_TOKEN);

		await handleScheduled(db, telegram, env.PROXY_URL);
	},
} satisfies ExportedHandler<Env>;
