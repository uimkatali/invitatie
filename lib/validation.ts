import { z } from 'zod';
import { LIMITS, THEMES } from './domain';
import { parseLocalDateTime } from './time';

const required = (label: string, max: number) =>
  z.string().trim().min(1, `${label} e obligatoriu`).max(max, `Maxim ${max} caractere`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maxim ${max} caractere`)
    .transform((v) => (v === '' ? null : v));

const localDateTime = z.string().transform((value, ctx) => {
  const date = parseLocalDateTime(value);
  if (!date) {
    ctx.addIssue({ code: 'custom', message: 'Alege data si ora' });
    return z.NEVER;
  }
  return date;
});

const optionalUuid = z
  .string()
  .transform((v) => v.toLowerCase())
  .pipe(z.union([z.literal(''), z.uuid('Id invalid')]))
  .transform((v) => (v === '' ? null : v));

export const invitationSchema = z.object({
  title: required('Titlul', LIMITS.titleMax),
  message: required('Mesajul', LIMITS.messageMax),
  location: required('Locul', LIMITS.locationMax),
  startsAt: localDateTime,
  dressCode: optionalText(LIMITS.dressCodeMax),
  theme: z.enum(THEMES, { error: 'Alege o tema' }),
  ideaId: optionalUuid,
});

export type InvitationInput = z.infer<typeof invitationSchema>;

const note = optionalText(LIMITS.responseNoteMax);

export const respondSchema = z.discriminatedUnion(
  'action',
  [
    z.object({ action: z.literal('accept'), note }),
    z.object({ action: z.literal('decline'), note }),
    z.object({ action: z.literal('reschedule'), proposedAt: localDateTime, note }),
  ],
  { error: 'Alege un raspuns' },
);

export type RespondInput = z.infer<typeof respondSchema>;
