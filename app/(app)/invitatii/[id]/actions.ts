'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import type { UserId } from '@/lib/domain';
import { applyInvitationAction } from '@/lib/invitations/service';
import type { InvitationAction } from '@/lib/invitations/state-machine';
import { sendNotificationEmail } from '@/lib/notifications/email';
import { respondSchema } from '@/lib/validation';
import { pickStrings, toFieldErrors } from '@/lib/form';
import { log, errorName } from '@/lib/log';
import { GENERIC_ERROR, toActionState, type ActionState } from '@/lib/result';

async function perform(
  invitationId: string,
  actor: UserId,
  action: InvitationAction,
  note: string | null,
  successMessage: string,
): Promise<ActionState> {
  try {
    const result = await applyInvitationAction(getDb(), actor, invitationId, action, new Date(), note);
    if (!result.ok) {
      if (result.code === 'forbidden') log('warn', 'forbidden_action', { actor, action: action.type });
      return toActionState(result);
    }
    const { event } = result.value;
    after(() => sendNotificationEmail(event));
    revalidatePath(`/invitatii/${invitationId}`);
    revalidatePath('/');
    return { ok: true, message: successMessage };
  } catch (err) {
    log('error', 'invitation_action_failed', { action: action.type, reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function respondAction(invitationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  const parsed = respondSchema.safeParse(pickStrings(formData, ['action', 'proposedAt', 'note']));
  if (!parsed.success) return { ok: false, error: 'Verifica raspunsul.', fields: toFieldErrors(parsed.error) };
  const input = parsed.data;
  const action: InvitationAction =
    input.action === 'reschedule' ? { type: 'reschedule', proposedAt: input.proposedAt } : { type: input.action };
  return perform(invitationId, actor, action, input.note, 'Raspuns trimis.');
}

export async function acceptProposalAction(invitationId: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  return perform(invitationId, actor, { type: 'acceptProposal' }, null, 'Ora noua a fost acceptata.');
}

export async function cancelInvitationAction(invitationId: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  return perform(invitationId, actor, { type: 'cancel' }, null, 'Invitatia a fost anulata.');
}
