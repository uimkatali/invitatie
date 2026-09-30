import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Countdown from './Countdown';

describe('Countdown', () => {
  it('renders a stable placeholder before mount (no server/client clock mismatch)', () => {
    const html = renderToStaticMarkup(
      <Countdown targetISO="2099-01-01T00:00:00.000Z" label="Mai sunt" completeLabel="E acum!" />,
    );
    expect(html).toContain('Mai sunt');
    expect(html).toContain('--z');
    expect(html).toContain('--h');
    expect(html).toContain('--m');
    expect(html).toContain('--s');
    expect(html).not.toContain('E acum!');
  });

  it('renders identical markup for a past and a future target before mount', () => {
    const render = (targetISO: string) =>
      renderToStaticMarkup(<Countdown targetISO={targetISO} label="Mai sunt" completeLabel="E acum!" />);
    expect(render('2000-01-01T00:00:00.000Z')).toBe(render('2099-01-01T00:00:00.000Z'));
  });
});
