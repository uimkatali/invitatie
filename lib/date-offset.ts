// Pure helpers for editing an ISO datetime string via a `datetime-local`
// input while preserving its original UTC offset.
//
// Matches e.g. "2026-07-25T13:00:00+03:00" -> date, time (HH:MM) and offset
// ("+03:00" or "Z"). We deliberately keep the original offset around instead
// of letting the browser reinterpret the instant in its own timezone: an
// admin in a different timezone than the event should still see and edit
// the wall-clock time that was stored, and save it back with that same
// offset untouched.
const ISO_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

export function parseIso(iso: string): { localValue: string; offset: string } {
  const match = ISO_PATTERN.exec(iso);
  if (!match) {
    return { localValue: '', offset: '+00:00' };
  }
  const [, datePart, timePart, offsetPart] = match;
  return { localValue: `${datePart}T${timePart}`, offset: offsetPart ?? '+00:00' };
}

export function toIsoWithOffset(localValue: string, offset: string): string {
  // localValue is "YYYY-MM-DDTHH:MM" from the datetime-local input.
  return `${localValue}:00${offset === 'Z' ? 'Z' : offset}`;
}
