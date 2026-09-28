import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { pickStrings, toFieldErrors } from './form';

describe('pickStrings', () => {
  it('reads strings and defaults missing or file values to empty', () => {
    const fd = new FormData();
    fd.set('title', 'Cina');
    fd.set('file', new Blob(['x']));
    expect(pickStrings(fd, ['title', 'missing', 'file'])).toEqual({ title: 'Cina', missing: '', file: '' });
  });
});

describe('toFieldErrors', () => {
  it('keeps the first message per field', () => {
    const schema = z.object({ title: z.string().min(1, 'Obligatoriu').min(3, 'Prea scurt'), age: z.number() });
    const result = schema.safeParse({ title: '', age: 'x' });
    if (result.success) throw new Error('expected failure');
    const fields = toFieldErrors(result.error);
    expect(fields.title).toBe('Obligatoriu');
    expect(fields.age).toBeTruthy();
  });

  it('records a message for a field named constructor (not an inherited property)', () => {
    const schema = z.object({ constructor: z.string().min(1, 'Obligatoriu') });
    const result = schema.safeParse({ constructor: '' });
    if (result.success) throw new Error('expected failure');
    const fields = toFieldErrors(result.error);
    expect(fields.constructor).toBe('Obligatoriu');
  });
});
