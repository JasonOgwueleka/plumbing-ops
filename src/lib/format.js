// Small helpers for showing and editing data.

export const JOB_STATUSES = ['new', 'scheduled', 'in_progress', 'completed', 'cancelled']
export const LEAD_STATUSES = ['new', 'contacted', 'converted', 'lost']

// "in_progress" -> "In progress"
export function statusLabel(status) {
  const text = status.replace('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function fullName(person) {
  if (!person) return ''
  return `${person.first_name} ${person.last_name}`
}

// Shows a timestamp in the user's local time, e.g. "Nov 17, 2026, 9:00 AM"
export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString(undefined, { timeStyle: 'short' })
}

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:MM" in LOCAL time.
export function toDateTimeInput(value) {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// The reverse: datetime-local value -> ISO string for the database (or null).
export function fromDateTimeInput(value) {
  return value ? new Date(value).toISOString() : null
}

// Turns an empty form field into null so the database stores NULL, not "".
export function emptyToNull(obj) {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = typeof value === 'string' && value.trim() === '' ? null : value
  }
  return result
}
