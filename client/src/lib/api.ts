const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
  csrfToken = response.headers.get('x-csrf-token');
  if (!csrfToken) throw new Error('No CSRF token received');
  return csrfToken;
}

export function clearCsrfToken() {
  csrfToken = null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.method && options.method !== 'GET') {
    const token = await getCsrfToken();
    headers['x-csrf-token'] = token;
  }
  const response = await fetch(url, { ...options, headers, credentials: 'include' });
  if (response.status === 401) {
    clearCsrfToken();
    if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    throw new ApiError(401, 'Unauthorized');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(response.status, error.message || 'Request failed');
  }
  if (response.headers.get('content-type')?.includes('application/json')) {
    return response.json();
  }
  return response as unknown as T;
}

export const api = {
  auth: {
    async login(username: string, password: string) {
      const result = await request<{ ok: boolean }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      clearCsrfToken();
      return result;
    },
    async logout() {
      await request('/api/auth/logout', { method: 'POST' });
      clearCsrfToken();
    },
    async me() {
      return request<{ authenticated: boolean; username?: string }>('/api/auth/me');
    },
  },

  settings: {
    async get() {
      const data = await request<{ reminders_enabled: boolean; time_format: '12' | '24' }>('/api/settings');
      return { remindersEnabled: data.reminders_enabled, timeFormat: data.time_format };
    },
    async update(data: Partial<{ remindersEnabled: boolean; timeFormat: '12' | '24' }>) {
      return request('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...(data.remindersEnabled !== undefined ? { reminders_enabled: data.remindersEnabled } : {}),
          ...(data.timeFormat ? { time_format: data.timeFormat } : {}),
        }),
      });
    },
  },

  mealPlan: {
    async get() {
      const res = await request<{ slots: Array<{ slot_key: string; order_index: number; time_24h: string; name: string; notes: string | null }> }>('/api/meal-plan');
      return res.slots.map((s) => ({
        slotKey: s.slot_key,
        orderIndex: s.order_index,
        time24h: s.time_24h,
        name: s.name,
        notes: s.notes,
      }));
    },
    async update(slots: Array<{ slotKey: string; orderIndex: number; time24h: string; name: string; notes: string | null }>) {
      return request('/api/meal-plan', {
        method: 'PUT',
        body: JSON.stringify({
          slots: slots.map((s) => ({
            slot_key: s.slotKey,
            order_index: s.orderIndex,
            time_24h: s.time24h,
            name: s.name,
            notes: s.notes,
          })),
        }),
      });
    },
  },

  today: {
    async get(date: string) {
      const res = await request<{ date: string; meals: Array<{ slot_key: string; time_24h: string; name: string; size: number | null; completed: boolean | null; notes: string | null; log_id: number | null }> }>(`/api/today/${date}`);
      return {
        date: res.date,
        meals: res.meals.map((m) => ({
          slotKey: m.slot_key,
          time: m.time_24h,
          name: m.name,
          size: m.size ?? 0,
          completed: m.completed ?? false,
          notes: m.notes,
          logId: m.log_id,
        })),
      };
    },
    async logMeal(data: { date: string; slotKey: string; size: number; completed: boolean; notes?: string }) {
      return request('/api/today/log', {
        method: 'PUT',
        body: JSON.stringify({
          date: data.date,
          slot_key: data.slotKey,
          size: data.size,
          completed: data.completed,
          notes: data.notes ?? null,
        }),
      });
    },
    async deleteLog(id: number) {
      return request(`/api/today/log/${id}`, { method: 'DELETE' });
    },
  },

  history: {
    async getDates() {
      const res = await request<{ dates: string[] }>(`/api/history/dates`);
      return res.dates;
    },
    async getDay(date: string) {
      const res = await request<{ date: string; logs: Array<{ id: number; slot_key: string; size: number; completed: boolean; notes: string | null; scheduled_time: string }> }>(`/api/history/${date}`);
      return {
        date: res.date,
        logs: res.logs.map((l) => ({
          id: l.id,
          slotKey: l.slot_key,
          size: l.size,
          completed: l.completed,
          notes: l.notes,
          time: l.scheduled_time,
        })),
      };
    },
  },

  weights: {
    async get() {
      const res = await request<{ weights: Array<{ date: string; kg: number }> }>('/api/weights');
      return res.weights;
    },
    async create(data: { date: string; kg: number }) {
      return request('/api/weights', { method: 'POST', body: JSON.stringify(data) });
    },
    async delete(date: string) {
      return request(`/api/weights/${date}`, { method: 'DELETE' });
    },
  },

  stats: {
    async meals(days: number = 14) {
      return request<{ days: number; average_size: number }>(`/api/stats/meals?days=${days}`);
    },
    async mealsByDay(days: number = 14) {
      return request<{ days: number; totals: Array<{ date: string; total: number }> }>(`/api/stats/meals-by-day?days=${days}`);
    },
    async weights() {
      const res = await request<{ weights: Array<{ date: string; kg: number }> }>('/api/stats/weights');
      return res.weights;
    },
  },

  export: {
    async meals() {
      const response = await fetch(`${API_BASE}/api/export/meals.csv`, {
        credentials: 'include',
        headers: { 'x-csrf-token': await getCsrfToken() },
      });
      return response.blob();
    },
    async weights() {
      const response = await fetch(`${API_BASE}/api/export/weights.csv`, {
        credentials: 'include',
        headers: { 'x-csrf-token': await getCsrfToken() },
      });
      return response.blob();
    },
  },

  push: {
    async config() {
      return request<{ enabled: boolean; publicKey?: string }>('/api/push/config');
    },
    async subscribe(data: { endpoint: string; keys: { p256dh: string; auth: string }; tz: string }) {
      return request('/api/push/subscribe', { method: 'POST', body: JSON.stringify(data) });
    },
    async unsubscribe(endpoint: string) {
      return request('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) });
    },
    async heartbeat(endpoint: string, tz?: string) {
      return request('/api/push/heartbeat', { method: 'POST', body: JSON.stringify({ endpoint, tz }) });
    },
  },
};

export { ApiError }; 
