const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * Un IPv6 rezidential primeste un prefix /64 intreg: fara gruparea pe /64, un atacator ar putea
 * schimba adresa la fiecare incercare si ar ocoli rate limit-ul. IPv4 (si orice valoare
 * nerecunoscuta) ramane neschimbat; IPv4 mapat in IPv6 (::ffff:1.2.3.4) devine IPv4.
 * Valorile deja grupate sunt stabile (grupezi de doua ori = acelasi rezultat).
 */
export function ipBucket(ip: string): string {
  const withoutZone = ip.split('%')[0];
  const mapped = IPV4_MAPPED.exec(withoutZone);
  if (mapped) return mapped[1];
  if (!withoutZone.includes(':')) return ip;

  const halves = withoutZone.split('::');
  if (halves.length > 2) return ip;
  const head = halves[0] === '' ? [] : halves[0].split(':');
  const tail = halves.length === 2 && halves[1] !== '' ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return ip;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g))) return ip;

  return `${groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

/**
 * Pe Vercel, x-forwarded-for e suprascris de platforma cu IP-ul real al clientului.
 * Pe alt hosting header-ul poate fi falsificat de client.
 * Rezultatul e "galeata" folosita la rate limit (IPv6 grupat pe /64, vezi ipBucket).
 */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return ipBucket(forwarded);
  const real = headers.get('x-real-ip')?.trim();
  return real ? ipBucket(real) : 'unknown';
}
