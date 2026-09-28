import { describe, it, expect } from 'vitest';
import { ok, failure, toActionState } from './result';

describe('toActionState', () => {
  it('maps ok to ok state with message', () => {
    expect(toActionState(ok(1), 'Gata')).toEqual({ ok: true, message: 'Gata' });
  });

  it('maps failure without the internal code', () => {
    const state = toActionState(failure('invalid', 'Gresit', { title: 'Obligatoriu' }));
    expect(state).toEqual({ ok: false, error: 'Gresit', fields: { title: 'Obligatoriu' } });
  });
});
