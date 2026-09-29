import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import InvitationForm from './InvitationForm';

vi.mock('./actions', () => ({ createInvitationAction: async () => null }));

const render = () =>
  renderToStaticMarkup(
    <InvitationForm
      defaults={{ title: '', message: '', ideaId: '' }}
      minDateTime="2026-09-28T10:00"
      maxDateTime="2028-09-27T10:00"
    />,
  );

describe('InvitationForm', () => {
  it('limits the start date with min and max', () => {
    const html = render();
    expect(html).toContain('min="2026-09-28T10:00"');
    expect(html).toContain('max="2028-09-27T10:00"');
  });

  it('starts with only the "amandoua" theme checked', () => {
    const radios = render().match(/<input[^>]*type="radio"[^>]*>/g) ?? [];
    expect(radios).toHaveLength(3);
    const checked = radios.filter((r) => /\schecked(=|\s|>)/.test(r));
    expect(checked).toHaveLength(1);
    expect(checked[0]).toContain('value="amandoua"');
  });

  it('has no theme error wiring while the form is valid', () => {
    const html = render();
    expect(html).not.toContain('theme-error');
  });
});
