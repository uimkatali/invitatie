import { getSessionUser } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { log, errorInfo } from '@/lib/log';
import { isTrustedBlobUrl } from '@/lib/photos/blob-store';
import { getPhotoForViewing } from '@/lib/photos/service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response(null, { status: 401 });

  const { id } = await params;
  try {
    const photo = await getPhotoForViewing(getDb(), id);
    if (!photo) return new Response(null, { status: 404 });

    // Un URL din DB care nu e pe hostul Vercel Blob nu se acceseaza niciodata (fara SSRF).
    if (!isTrustedBlobUrl(photo.url)) {
      log('error', 'photo_untrusted_url', { photoId: id });
      return new Response(null, { status: 502 });
    }

    // Fara redirecturi si cu timeout: un upstream lent sau care redirectioneaza devine 502.
    const upstream = await fetch(photo.url, { redirect: 'error', signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (!upstream || !upstream.ok || !upstream.body) return new Response(null, { status: 502 });

    return new Response(upstream.body, {
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
