/**
 * Shared Date & Time formatting utility using Intl.DateTimeFormat (en-IN locale).
 * Formats dates as "7 Nov 2026" and times as "09:06 PM".
 */

const LOCALE = 'en-IN';

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function formatDate(value, fallback = 'None') {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return dateFormatter.format(d);
}

function formatTime(value, fallback = '') {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return timeFormatter.format(d).toUpperCase();
}

function formatDateTime(value, fallback = 'Recent') {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return `${dateFormatter.format(d)}, ${timeFormatter.format(d).toUpperCase()}`;
}

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
};
