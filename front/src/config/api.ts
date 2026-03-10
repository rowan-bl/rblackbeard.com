export const API_BASE_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8787';

export const API_ENDPOINTS = {
  subscribe: `${API_BASE_URL}/api/subscribe`,
  tournaments: `${API_BASE_URL}/api/tournaments`,
  subscriptions: (username: string) => `${API_BASE_URL}/api/subscriptions/${encodeURIComponent(username)}`,
  userCheck: (username: string) => `${API_BASE_URL}/api/user/check/${encodeURIComponent(username)}`,
};
