export const money = n => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(Number(n || 0));
export const fmtDate = value => {
  if (!value) return '-';
  try {
    const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return String(value);
  }
};
export const slugContains = (value, search) => String(value || '').toLowerCase().includes(String(search || '').toLowerCase());
export const uid = () => Math.random().toString(36).slice(2, 10);
export function setHTML(id, html) { document.getElementById(id).innerHTML = html; }
