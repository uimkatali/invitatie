import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { LIMITS } from '@/lib/domain';
import { env } from '@/lib/env';
import { log, errorName } from '@/lib/log';
import { vercelBlobStore } from '@/lib/photos/blob-store';
import { addPhoto } from '@/lib/photos/service';
import { parseDimension } from '@/lib/photos/validate';
import { isSameOrigin } from '@/lib/security/origin';

const MAX_BODY_BYTES = LIMITS.photoMaxBytes + 64 * 1024;

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return error('Neautentificat.', 401);
  if (!isSameOrigin(request.headers)) {
    log('warn', 'cross_origin_upload_blocked');
    return error('Cerere respinsa.', 403);
  }
  const declaredLength = Number(request.headers.get('content-length'));
  if (!request.headers.get('content-length') || !Number.isFinite(declaredLength) || declaredLength <= 0) {
    return error('Lipseste Content-Length.', 411);
  }
  if (declaredLength > MAX_BODY_BYTES) return error('Poza e prea mare (maxim 4 MB).', 413);

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const memoryId = form?.get('memoryId');
  if (!form || !(file instanceof File) || typeof memoryId !== 'string') return error('Cerere invalida.', 400);
  if (file.size > LIMITS.photoMaxBytes) return error('Poza e prea mare (maxim 4 MB).', 413);

  try {
    const result = await addPhoto(
      getDb(),
      vercelBlobStore(env().BLOB_READ_WRITE_TOKEN),
      user,
      memoryId,
      {
        bytes: new Uint8Array(await file.arrayBuffer()),
        width: parseDimension(form.get('width')),
        height: parseDimension(form.get('height')),
      },
      new Date(),
    );
    if (!result.ok) {
      if (result.code === 'not_found') log('warn', 'upload_to_foreign_memory', { user });
      return error(result.error, result.code === 'not_found' ? 404 : 400);
    }
    return NextResponse.json({ id: result.value.id }, { status: 201 });
  } catch (err) {
    log('error', 'upload_failed', { reason: errorName(err) });
    return error('Incarcarea a esuat.', 500);
  }
}
