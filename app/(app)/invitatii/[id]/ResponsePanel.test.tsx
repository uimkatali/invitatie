import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ResponsePanel from './ResponsePanel';

vi.mock('./actions', () => ({}));

const noop = async () => null;

describe('ResponsePanel', () => {
  it('starts with only the accept radio checked', () => {
    const html = renderToStaticMarkup(<ResponsePanel action={noop} minDateTime="2026-01-01T10:00" maxDateTime="2028-01-01T10:00" />);
    const radios = html.match(/<input[^>]*type="radio"[^>]*>/g) ?? [];
    expect(radios).toHaveLength(3);
    const checked = radios.filter((r) => /\schecked(=|\s|>)/.test(r));
    expect(checked).toHaveLength(1);
    expect(checked[0]).toContain('value="accept"');
  });

  it('limits the proposed date with min and max once "reschedule" is chosen', () => {
    // Campul apare doar dupa alegerea "reschedule" (state client, imposibil de declansat la randare
    // statica), deci verificam legarea limitelor direct in sursa.
    const source = readFileSync(join(process.cwd(), 'app/(app)/invitatii/[id]/ResponsePanel.tsx'), 'utf8');
    expect(source).toMatch(/min=\{minDateTime\}/);
    expect(source).toMatch(/max=\{maxDateTime\}/);
  });

  // React 19 reset-eaza formularul dupa fiecare <form action>. Un radio controlat (`checked=`)
  // revine atunci la valoarea initiala din DOM, dar state-ul ramane, deci se trimite alt raspuns.
  it('uses uncontrolled radios (defaultChecked) so a form reset cannot desync the choice', () => {
    const files = ['app/(app)/invitatii/[id]/ResponsePanel.tsx', 'app/(app)/invitatii/noua/InvitationForm.tsx'];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(source, file).not.toMatch(/\schecked=\{/);
      expect(source, file).toMatch(/defaultChecked=\{/);
    }
  });
});
