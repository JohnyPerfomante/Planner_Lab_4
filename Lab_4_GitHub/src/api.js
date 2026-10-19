export async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
    });
    if (response.status === 204) return null;
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || `Помилка HTTP ${response.status}`);
    return data;
  } catch (error) {
    if (error.name === 'AbortError')
      throw new Error('Час очікування API вичерпано. Повторіть запит.');
    if (error instanceof TypeError)
      throw new Error('Немає зв’язку з API. Перевірте, чи запущено сервер.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  state: () => request('/state'),
  create: (task) =>
    request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  update: (id, status) =>
    request(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};
