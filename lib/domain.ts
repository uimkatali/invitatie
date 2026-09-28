export const USERS = ['el', 'ea'] as const;
export type UserId = (typeof USERS)[number];

export function isUserId(value: unknown): value is UserId {
  return value === 'el' || value === 'ea';
}

export function otherUser(user: UserId): UserId {
  return user === 'el' ? 'ea' : 'el';
}

export const THEMES = ['toamna', 'iarna', 'amandoua'] as const;
export type ThemeId = (typeof THEMES)[number];

export const THEME_LABELS: Record<ThemeId, string> = {
  toamna: 'Toamna roz',
  iarna: 'Iarna baby blue',
  amandoua: 'Amandoua',
};

export const INVITATION_STATUSES = ['pending', 'accepted', 'declined', 'reschedule', 'cancelled'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: 'In asteptare',
  accepted: 'Acceptata',
  declined: 'Refuzata',
  reschedule: 'Alta ora propusa',
  cancelled: 'Anulata',
};

export const NOTIFICATION_TYPES = [
  'invite_new',
  'invite_response',
  'reschedule_accepted',
  'invite_cancelled',
  'memory_added',
  'idea_added',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const LIMITS = {
  titleMax: 120,
  messageMax: 2000,
  locationMax: 200,
  dressCodeMax: 120,
  responseNoteMax: 500,
  memoryNoteMax: 5000,
  ideaTitleMax: 120,
  ideaDescriptionMax: 1000,
  photosPerMemory: 10,
  maxIdeas: 50,
  photoMaxBytes: 4 * 1024 * 1024,
} as const;
