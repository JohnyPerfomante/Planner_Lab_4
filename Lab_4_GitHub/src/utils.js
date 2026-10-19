export const statuses = {
  planned: 'Заплановано',
  running: 'Виконується',
  completed: 'Завершено',
  cancelled: 'Скасовано',
};
export const priorities = {
  high: 'Високий',
  normal: 'Звичайний',
  low: 'Низький',
};
export const dateTime = (value) =>
  new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
export function localInput(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
