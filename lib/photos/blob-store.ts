import { put, get, del } from '@vercel/blob';

/**
 * Stocare privata: store-ul Vercel Blob trebuie creat cu acces "Private" (nu se poate schimba dupa creare).
 * Blob-urile se identifica dupa pathname (cel intors de put, cu sufix aleator); URL-ul intors nu se poate
 * citi anonim, deci nu se foloseste pentru citire.
 */
export interface BlobStore {
  put(pathname: string, body: Uint8Array, contentType: string): Promise<{ url: string; pathname: string }>;
  /** Citire autentificata (stream). null = blob-ul nu exista. Erorile SDK-ului se propaga. */
  get(pathname: string, signal?: AbortSignal): Promise<{ stream: ReadableStream<Uint8Array>; contentType?: string } | null>;
  del(pathname: string): Promise<void>;
}

export function vercelBlobStore(token: string): BlobStore {
  return {
    async put(pathname, body, contentType) {
      const result = await put(pathname, Buffer.from(body), {
        access: 'private',
        contentType,
        addRandomSuffix: true,
        token,
      });
      return { url: result.url, pathname: result.pathname };
    },
    async get(pathname, signal) {
      const result = await get(pathname, { access: 'private', token, abortSignal: signal });
      // Fara cerere conditionala nu apare 304; orice altceva decat un 200 complet e tratat ca "lipseste".
      if (!result || result.statusCode !== 200) return null;
      return { stream: result.stream, contentType: result.blob.contentType };
    },
    async del(pathname) {
      await del(pathname, { token });
    },
  };
}
