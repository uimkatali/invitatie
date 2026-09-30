'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { markAllRead } from '@/lib/notifications/queries';
import { log, errorInfo } from '@/lib/log';
import { GENERIC_ERROR, type ActionState } from '@/lib/result';

export async function markAllReadAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const me = await requireSession();
  try {
    await markAllRead(getDb(), me, new Date());
  } catch (err) {
    log('error', 'mark_all_read_failed', errorInfo(err));
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
