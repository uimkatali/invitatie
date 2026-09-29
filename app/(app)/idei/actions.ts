'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { createIdea, deleteIdea } from '@/lib/ideas/service';
import { ideaSchema } from '@/lib/validation';
import { pickStrings, toFieldErrors } from '@/lib/form';
import { log, errorName } from '@/lib/log';
import { GENERIC_ERROR, toActionState, type ActionState } from '@/lib/result';

export async function createIdeaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  const values = pickStrings(formData, ['title', 'description']);
  const parsed = ideaSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: 'Verifica ideea.', fields: toFieldErrors(parsed.error), values };
  try {
    const result = await createIdea(getDb(), actor, parsed.data, new Date());
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields, values };
  } catch (err) {
    log('error', 'create_idea_failed', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR, values };
  }
  revalidatePath('/idei');
  return { ok: true, message: 'Idee adaugata.' };
}

export async function deleteIdeaAction(ideaId: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  try {
    const result = await deleteIdea(getDb(), actor, ideaId);
    if (!result.ok) return toActionState(result);
  } catch (err) {
    log('error', 'delete_idea_failed', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath('/idei');
  return { ok: true };
}
