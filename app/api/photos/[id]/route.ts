import { getSessionUser } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { env } from '@/lib/env';
import { log, errorInfo } from '@/lib/log';
import { vercelBlobStore } from '@/lib/photos/blob-store';
import { getPhotoForViewing } from '@/lib/photos/service';

const UPSTREAM_TIMEOUT_MS = 10_000;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response(null, { status: 401 });

  const { id } = await params;
  try {
    const photo = await getPhotoForViewing(getDb(), id);
    if (!photo) return new Response(null, { status: 404 });

    // Store-ul Blob e privat: citirea autentificata (get din SDK) cu tokenul serverului, dupa verificarea
    // sesiunii de mai sus. Un blob lipsa sau o eroare a SDK-ului devine 502, fara detalii catre client.
    const blob = await vercelBlobStore(env().BLOB_READ_WRITE_TOKEN)
      .get(photo.pathname, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS))
      .catch((err) => {
        log('error', 'photo_blob_read_failed', errorInfo(err));
        return null;
      });
    if (!blob) return new Response(null, { status: 502 });

    return new Response(blob.stream, {
      headers: {
        'Content-Type': photo.contentType,
        'Cache-Control': 'private, max-age=300',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    log('error', 'photo_stream_failed', errorInfo(err));
    return new Response(null, { status: 500 });
  }
}
