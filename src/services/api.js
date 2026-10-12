const API_BASE = '/api';

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const macMiniApi = {
  checkHealth: () => request('/health'),
  fetchBootstrap: () => request('/bootstrap'),
  syncBatch: (actions) =>
    request('/sync', {
      method: 'POST',
      body: JSON.stringify({ actions }),
    }),
};
