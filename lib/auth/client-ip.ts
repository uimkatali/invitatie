/**
 * Pe Vercel, x-forwarded-for e suprascris de platforma cu IP-ul real al clientului.
 * Pe alt hosting header-ul poate fi falsificat de client.
 */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get('x-real-ip')?.trim();
  return real || 'unknown';
}
