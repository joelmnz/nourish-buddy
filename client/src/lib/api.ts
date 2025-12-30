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
      const data = await request<{ reminders_enabled: boolean; time_format: '12' | '24'; first_day_of_week: number; features_enabled: string; goal_kg: number | null }>('/api/settings');
      return { remindersEnabled: data.reminders_enabled, timeFormat: data.time_format, firstDayOfWeek: data.first_day_of_week, featuresEnabled: data.features_enabled, goalKg: data.goal_kg };
    },
    async update(data: Partial<{ remindersEnabled: boolean; timeFormat: '12' | '24'; firstDayOfWeek: number; featuresEnabled: string; goalKg: number | null }>) {
      return request('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...(data.remindersEnabled !== undefined ? { reminders_enabled: data.remindersEnabled } : {}),
          ...(data.timeFormat ? { time_format: data.timeFormat } : {}),
          ...(data.firstDayOfWeek !== undefined ? { first_day_of_week: data.firstDayOfWeek } : {}),
          ...(data.featuresEnabled !== undefined ? { features_enabled: data.featuresEnabled } : {}),
          ...(data.goalKg !== undefined ? { goal_kg: data.goalKg } : {}),
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
    async issuesByDay(days: number = 14) {
      return request<{ days: number; totals: Array<{ date: string; total: number }> }>(`/api/stats/issues-by-day?days=${days}`);
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
    async subscriptions() {
      const res = await request<{
        subscriptions: Array<{
          id: number;
          endpoint: string;
          tz: string;
          user_agent: string | null;
          platform: string | null;
          device_name: string | null;
          enabled: boolean;
          created_at: string;
          updated_at: string;
          last_seen_at: string | null;
        }>;
      }>('/api/push/subscriptions');
      return res.subscriptions.map((s) => ({
        id: s.id,
        endpoint: s.endpoint,
        tz: s.tz,
        userAgent: s.user_agent,
        platform: s.platform,
        deviceName: s.device_name,
        enabled: s.enabled,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        lastSeenAt: s.last_seen_at,
      }));
    },
    async subscribe(data: { endpoint: string; keys: { p256dh: string; auth: string }; tz: string; platform?: string; deviceName?: string }) {
      return request<{ message: string; id: number }>('/api/push/subscribe', { method: 'POST', body: JSON.stringify(data) });
    },
    async updateSubscription(id: number, data: { enabled?: boolean; deviceName?: string; tz?: string }) {
      return request('/api/push/subscriptions/' + id, { method: 'PATCH', body: JSON.stringify(data) });
    },
    async deleteSubscription(id: number) {
      return request('/api/push/subscriptions/' + id, { method: 'DELETE' });
    },
    async unsubscribe(endpoint: string) {
      return request('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) });
    },
    async heartbeat(endpoint: string, tz?: string) {
      return request('/api/push/heartbeat', { method: 'POST', body: JSON.stringify({ endpoint, tz }) });
    },
  },

  issues: {
    async list(params?: { page?: number; per_page?: number; search?: string }) {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.per_page) query.set('per_page', params.per_page.toString());
      if (params?.search) query.set('search', params.search);
      const queryString = query.toString();
      const res = await request<{
        issues: Array<{ id: number; date: string; title: string; severity: number; description: string | null; created_at: string; updated_at: string }>;
        pagination: { page: number; per_page: number; total: number; total_pages: number };
      }>(`/api/issues${queryString ? '?' + queryString : ''}`);
      return {
        issues: res.issues.map((i) => ({
          id: i.id,
          date: i.date,
          title: i.title,
          severity: i.severity,
          description: i.description,
          createdAt: i.created_at,
          updatedAt: i.updated_at,
        })),
        pagination: res.pagination,
      };
    },
    async get(id: number) {
      const res = await request<{ id: number; date: string; title: string; severity: number; description: string | null; created_at: string; updated_at: string }>(`/api/issues/${id}`);
      return {
        id: res.id,
        date: res.date,
        title: res.title,
        severity: res.severity,
        description: res.description,
        createdAt: res.created_at,
        updatedAt: res.updated_at,
      };
    },
    async create(data: { date: string; title: string; severity: number; description?: string }) {
      return request('/api/issues', { method: 'POST', body: JSON.stringify(data) });
    },
    async update(id: number, data: { date?: string; title?: string; severity?: number; description?: string | null }) {
      return request(`/api/issues/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async delete(id: number) {
      return request(`/api/issues/${id}`, { method: 'DELETE' });
    },
  },

  recipes: {
    async list(query?: string) {
      const res = await request<{ recipes: Array<{ id: number; title: string; slot_keys: string[] }> }>(`/api/recipes${query ? `?query=${encodeURIComponent(query)}` : ''}`);
      return res.recipes.map((r) => ({
        id: r.id,
        title: r.title,
        slotKeys: r.slot_keys,
      }));
    },
    async listBySlotKey(slotKey: string) {
      const res = await request<{ recipes: Array<{ id: number; title: string }> }>(`/api/recipes/by-slot/${slotKey}`);
      return res.recipes;
    },
    async get(id: number) {
      const res = await request<{ id: number; title: string; slot_keys: string[]; instructions: string | null }>(`/api/recipes/${id}`);
      return {
        id: res.id,
        title: res.title,
        slotKeys: res.slot_keys,
        instructions: res.instructions,
      };
    },
    async create(data: { title: string; slotKeys: string[]; instructions?: string | null }) {
      return request<{ id: number }>('/api/recipes', {
        method: 'POST',
        body: JSON.stringify({
          title: data.title,
          slot_keys: data.slotKeys,
          instructions: data.instructions,
        }),
      });
    },
    async update(id: number, data: { title?: string; slotKeys?: string[]; instructions?: string | null }) {
      return request(`/api/recipes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.slotKeys !== undefined ? { slot_keys: data.slotKeys } : {}),
          ...(data.instructions !== undefined ? { instructions: data.instructions } : {}),
        }),
      });
    },
    async delete(id: number) {
      return request(`/api/recipes/${id}`, { method: 'DELETE' });
    },
  },

  weeklyPlans: {
    async get() {
      const res = await request<{
        THIS: { id: number; key: string; entries: Array<{ day_index: number; slot_key: string; recipe_id: number | null; recipe_title: string | null }> };
        NEXT: { id: number; key: string; entries: Array<{ day_index: number; slot_key: string; recipe_id: number | null; recipe_title: string | null }> };
      }>('/api/weekly-plans');
      return {
        THIS: {
          id: res.THIS.id,
          key: res.THIS.key,
          entries: res.THIS.entries.map((e) => ({
            dayIndex: e.day_index,
            slotKey: e.slot_key,
            recipeId: e.recipe_id,
            recipeTitle: e.recipe_title,
          })),
        },
        NEXT: {
          id: res.NEXT.id,
          key: res.NEXT.key,
          entries: res.NEXT.entries.map((e) => ({
            dayIndex: e.day_index,
            slotKey: e.slot_key,
            recipeId: e.recipe_id,
            recipeTitle: e.recipe_title,
          })),
        },
      };
    },
    async update(planKey: 'THIS' | 'NEXT', entries: Array<{ dayIndex: number; slotKey: string; recipeId: number | null }>) {
      return request(`/api/weekly-plans/${planKey}`, {
        method: 'PUT',
        body: JSON.stringify({
          entries: entries.map((e) => ({
            day_index: e.dayIndex,
            slot_key: e.slotKey,
            recipe_id: e.recipeId,
          })),
        }),
      });
    },
    async shuffle(planKey: 'THIS' | 'NEXT', scope: 'week' | 'day' | 'cell', dayIndex?: number, slotKey?: string) {
      return request(`/api/weekly-plans/${planKey}/shuffle`, {
        method: 'POST',
        body: JSON.stringify({
          scope,
          ...(dayIndex !== undefined ? { day_index: dayIndex } : {}),
          ...(slotKey ? { slot_key: slotKey } : {}),
        }),
      });
    },
    async rollover() {
      return request('/api/weekly-plans/rollover', { method: 'POST' });
    },
  },
};

export { ApiError }; 
