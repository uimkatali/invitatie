import { describe, it, expect } from 'vitest';
import { clientIpFrom, ipBucket } from './client-ip';

describe('clientIpFrom', () => {
  it('takes the first x-forwarded-for entry', () => {
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }))).toBe('9.9.9.9');
  });

  it('falls back to x-real-ip, then unknown', () => {
    expect(clientIpFrom(new Headers({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8');
    expect(clientIpFrom(new Headers())).toBe('unknown');
  });
});

describe('ipBucket', () => {
  it('leaves IPv4 and unrecognized values untouched', () => {
    expect(ipBucket('9.9.9.9')).toBe('9.9.9.9');
    expect(ipBucket('unknown')).toBe('unknown');
    expect(ipBucket('not:an:ip')).toBe('not:an:ip');
    expect(ipBucket('1:2:3:4:5:6:7:8:9')).toBe('1:2:3:4:5:6:7:8:9');
    expect(ipBucket('1::2::3')).toBe('1::2::3');
  });

  it('groups IPv6 addresses of the same /64 into one bucket', () => {
    const a = ipBucket('2001:db8:abcd:12:1111:2222:3333:4444');
    expect(a).toBe('2001:db8:abcd:12::/64');
    expect(ipBucket('2001:db8:abcd:12:ffff:eeee:dddd:cccc')).toBe(a);
    expect(ipBucket('2001:0DB8:abcd:0012::1')).toBe(a);
  });

  it('separates different /64 prefixes', () => {
    expect(ipBucket('2001:db8:abcd:13::1')).not.toBe(ipBucket('2001:db8:abcd:12::1'));
  });

  it('expands :: compression correctly', () => {
    expect(ipBucket('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(ipBucket('::1')).toBe('0:0:0:0::/64');
    expect(ipBucket('::')).toBe('0:0:0:0::/64');
    expect(ipBucket('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
    expect(ipBucket('1:2:3:4::')).toBe('1:2:3:4::/64');
  });

  it('turns an IPv4-mapped address into plain IPv4', () => {
    expect(ipBucket('::ffff:1.2.3.4')).toBe('1.2.3.4');
  });

  it('is idempotent', () => {
    const once = ipBucket('2001:db8:abcd:12::1');
    expect(ipBucket(once)).toBe(once);
  });
});

describe('clientIpFrom with IPv6', () => {
  it('buckets the forwarded and the real IP by /64', () => {
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '2001:db8:1:2:aaaa::1, 10.0.0.1' }))).toBe('2001:db8:1:2::/64');
    expect(clientIpFrom(new Headers({ 'x-real-ip': '2001:db8:1:2:bbbb::9' }))).toBe('2001:db8:1:2::/64');
  });
});
