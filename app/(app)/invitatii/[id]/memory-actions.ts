'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { env } from '@/lib/env';
import { saveMemory } from '@/lib/memories/service';
import { vercelBlobStore } from '@/lib/photos/blob-store';
import { deletePhoto } from '@/lib/photos/service';
import { memorySchema } from '@/lib/validation';
import { pickStrings, toFieldErrors } from '@/lib/form';
import { log, errorName } from '@/lib/log';
import { GENERIC_ERROR, toActionState, type ActionState } from '@/lib/result';

export async function saveMemoryAction(invitationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  const values = pickStrings(formData, ['note', 'rating']);
  const parsed = memorySchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: 'Verifica amintirea.', fields: toFieldErrors(parsed.error), values };
  try {
    const result = await saveMemory(getDb(), actor, invitationId, parsed.data, new Date());
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields, values };
  } catch (err) {
    log('error', 'save_memory_failed', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR, values };
  }
  revalidatePath(`/invitatii/${invitationId}`);
  return { ok: true, message: 'Amintire salvata.' };
}

export async function deletePhotoAction(
  photoId: string,
  invitationId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const actor = await requireSession();
  try {
    const result = await deletePhoto(getDb(), vercelBlobStore(env().BLOB_READ_WRITE_TOKEN), actor, photoId);
    if (!result.ok) return toActionState(result);
  } catch (err) {
    log('error', 'delete_photo_failed', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(`/invitatii/${invitationId}`);
  return { ok: true };
}
