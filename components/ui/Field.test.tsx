import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Field from './Field';

describe('Field', () => {
  it('wires the hint id via aria-describedby', () => {
    const html = renderToStaticMarkup(
      <Field label="Utilizator" htmlFor="username" hint="Numele tau">
        <input id="username" name="username" />
      </Field>,
    );
    expect(html).toContain('id="username-hint"');
    expect(html).toContain('aria-describedby="username-hint"');
  });

  it('wires the error id via aria-describedby and sets aria-invalid', () => {
    const html = renderToStaticMarkup(
      <Field label="Utilizator" htmlFor="username" error="Obligatoriu">
        <input id="username" name="username" />
      </Field>,
    );
    expect(html).toContain('id="username-error"');
    expect(html).toContain('aria-describedby="username-error"');
    expect(html).toContain('aria-invalid="true"');
  });

  it('joins hint and error ids when both are present', () => {
    const html = renderToStaticMarkup(
      <Field label="Utilizator" htmlFor="username" hint="Numele tau" error="Obligatoriu">
        <input id="username" name="username" />
      </Field>,
    );
    expect(html).toContain('aria-describedby="username-hint username-error"');
  });

  it('merges with an existing aria-describedby prop on the child', () => {
    const html = renderToStaticMarkup(
      <Field label="Utilizator" htmlFor="username" error="Obligatoriu">
        <input id="username" name="username" aria-describedby="external-hint" />
      </Field>,
    );
    expect(html).toContain('aria-describedby="external-hint username-error"');
  });

  it('does not override an explicit aria-invalid prop on the child', () => {
    const html = renderToStaticMarkup(
      <Field label="Utilizator" htmlFor="username" error="Obligatoriu">
        <input id="username" name="username" aria-invalid={false} />
      </Field>,
    );
    expect(html).toContain('aria-invalid="false"');
  });

  it('renders no aria-describedby when there is neither hint nor error', () => {
    const html = renderToStaticMarkup(
      <Field label="Utilizator" htmlFor="username">
        <input id="username" name="username" />
      </Field>,
    );
    expect(html).not.toContain('aria-describedby');
  });
});
