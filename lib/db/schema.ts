import {
  mysqlTable,
  mysqlEnum,
  varchar,
  text,
  datetime,
  tinyint,
  int,
  index,
  uniqueIndex,
  customType,
} from 'drizzle-orm/mysql-core';
import { USERS, THEMES, INVITATION_STATUSES, NOTIFICATION_TYPES } from '../domain';

// ID-uri ascii: de 4 ori mai mici in index decat utf8mb4.
const uuid = customType<{ data: string }>({
  dataType() {
    return 'char(36) CHARACTER SET ascii COLLATE ascii_bin';
  },
});

const sha256Hex = customType<{ data: string }>({
  dataType() {
    return 'char(64) CHARACTER SET ascii COLLATE ascii_bin';
  },
});

const userColumn = (name: string) => mysqlEnum(name, USERS);
const utc = (name: string) => datetime(name, { mode: 'date' });

export const ideas = mysqlTable(
  'ideas',
  {
    id: uuid('id').primaryKey(),
    author: userColumn('author').notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    description: text('description'),
    createdAt: utc('created_at').notNull(),
  },
  (t) => [index('idx_created').on(t.createdAt)],
);

export const invitations = mysqlTable(
  'invitations',
  {
    id: uuid('id').primaryKey(),
    fromUser: userColumn('from_user').notNull(),
    toUser: userColumn('to_user').notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    message: text('message').notNull(),
    location: varchar('location', { length: 200 }).notNull(),
    startsAt: utc('starts_at').notNull(),
    dressCode: varchar('dress_code', { length: 120 }),
    theme: mysqlEnum('theme', THEMES).notNull(),
    status: mysqlEnum('status', INVITATION_STATUSES).notNull().default('pending'),
    proposedAt: utc('proposed_at'),
    responseNote: varchar('response_note', { length: 500 }),
    ideaId: uuid('idea_id').references(() => ideas.id, { onDelete: 'set null' }),
    createdAt: utc('created_at').notNull(),
    updatedAt: utc('updated_at').notNull(),
  },
  (t) => [index('idx_status_starts').on(t.status, t.startsAt), index('idx_idea').on(t.ideaId)],
);

export const memories = mysqlTable(
  'memories',
  {
    id: uuid('id').primaryKey(),
    invitationId: uuid('invitation_id')
      .notNull()
      .references(() => invitations.id, { onDelete: 'cascade' }),
    author: userColumn('author').notNull(),
    note: text('note').notNull(),
    rating: tinyint('rating').notNull(),
    createdAt: utc('created_at').notNull(),
    updatedAt: utc('updated_at').notNull(),
  },
  (t) => [uniqueIndex('uq_invitation_author').on(t.invitationId, t.author)],
);

export const photos = mysqlTable(
  'photos',
  {
    id: uuid('id').primaryKey(),
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    // Doar pe server: nu se trimit niciodata clientului.
    blobUrl: varchar('blob_url', { length: 500 }).notNull(),
    blobPathname: varchar('blob_pathname', { length: 500 }).notNull(),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    width: int('width'),
    height: int('height'),
    createdAt: utc('created_at').notNull(),
  },
  (t) => [index('idx_memory').on(t.memoryId, t.createdAt)],
);

export const notifications = mysqlTable(
  'notifications',
  {
    id: uuid('id').primaryKey(),
    recipient: userColumn('recipient').notNull(),
    type: mysqlEnum('type', NOTIFICATION_TYPES).notNull(),
    // Statusul invitatiei in momentul notificarii (nu statusul ei curent, care se poate schimba ulterior).
    invitationStatus: mysqlEnum('invitation_status', INVITATION_STATUSES),
    invitationId: uuid('invitation_id').references(() => invitations.id, { onDelete: 'cascade' }),
    readAt: utc('read_at'),
    createdAt: utc('created_at').notNull(),
  },
  (t) => [index('idx_recipient_unread').on(t.recipient, t.readAt, t.createdAt)],
);

export const loginAttempts = mysqlTable('login_attempts', {
  ipHash: sha256Hex('ip_hash').primaryKey(),
  windowStart: utc('window_start').notNull(),
  count: int('count').notNull(),
});

export type InvitationRow = typeof invitations.$inferSelect;
export type MemoryRow = typeof memories.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
export type IdeaRow = typeof ideas.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
