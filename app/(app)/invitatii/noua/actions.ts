'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { createInvitation } from '@/lib/invitations/service';
import { sendNotificationEmail } from '@/lib/notifications/email';
import { invitationSchema } from '@/lib/validation';
import { pickStrings, toFieldErrors } from '@/lib/form';
import { log, errorInfo } from '@/lib/log';
import { GENERIC_ERROR, type ActionState } from '@/lib/result';

const FIELDS = ['title', 'message', 'location', 'startsAt', 'dressCode', 'theme', 'ideaId'] as const;

export async function createInvitationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  const values = pickStrings(formData, FIELDS);
  const parsed = invitationSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: 'Verifica campurile marcate.', fields: toFieldErrors(parsed.error), values };
  }

  let id: string;
  try {
    const result = await createInvitation(getDb(), actor, parsed.data, new Date());
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields, values };
    const { event } = result.value;
    after(() => sendNotificationEmail(event));
    id = result.value.id;
  } catch (err) {
    log('error', 'create_invitation_failed', errorInfo(err));
    return { ok: false, error: GENERIC_ERROR, values };
  }

  revalidatePath('/');
  redirect(`/invitatii/${id}`);
}
