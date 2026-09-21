/** Date, time and number formatting helpers shared across DONUM. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatDate(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDate(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatTime(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(ts: number | undefined): string {
  if (!ts) return '—';
  return `${formatShortDate(ts)}, ${formatTime(ts)}`;
}

/** "in 3 h", "2 d ago" — compact relative time. */
export function relativeTime(ts: number | undefined, base = Date.now()): string {
  if (!ts) return '—';
  const diff = ts - base;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? 'from now' : 'ago';

  if (abs < MINUTE) return 'just now';
  if (abs < HOUR) return `${Math.round(abs / MINUTE)} min ${suffix}`;
  if (abs < DAY) return `${Math.round(abs / HOUR)} hr ${suffix}`;
  if (abs < 30 * DAY) return `${Math.round(abs / DAY)} d ${suffix}`;
  return formatShortDate(ts);
}

/** Countdown used for expiry pressure: "expires in 4h 20m". */
export function countdown(ts: number | undefined, base = Date.now()): string {
  if (!ts) return 'No expiry';
  const diff = ts - base;
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / HOUR);
  const minutes = Math.floor((diff % HOUR) / MINUTE);
  if (hours >= 48) return `${Math.floor(hours / 24)} days left`;
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function isExpiringSoon(ts: number | undefined, withinHours = 24, base = Date.now()) {
  if (!ts) return false;
  const diff = ts - base;
  return diff > 0 && diff <= withinHours * HOUR;
}

export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(
      value,
    );
  }
  return new Intl.NumberFormat().format(Math.round(value));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(Math.round(value));
}

export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Convert an epoch value to the `yyyy-MM-ddTHH:mm` a datetime-local input needs. */
export function toDateTimeInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export function toDateInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
