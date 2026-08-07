import { describe, it, expect } from 'vitest';
import { renderTemplate } from './build-email.mjs';

describe('renderTemplate', () => {
  it('replaces a simple placeholder', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'Cata' })).toBe('Hello Cata');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(renderTemplate('Hi {{missing}}', {})).toBe('Hi {{missing}}');
  });

  it('replaces multiple occurrences of the same placeholder', () => {
    expect(renderTemplate('{{a}} and {{a}}', { a: 'x' })).toBe('x and x');
  });
});
