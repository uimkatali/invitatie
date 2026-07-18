import { describe, it, expect } from 'vitest';
import { validateContent, getContent, InviteContent } from './content';

function makeValidContent(): InviteContent {
  return {
    recipientName: 'fata mea misterioasa',
    senderName: 'Cata',
    eventDateISO: '2026-07-25T13:00:00+03:00',
    website: {
      introLine: 'intro',
      tapPrompt: 'tap',
      revealSteps: ['pas 1'],
      countdownLabel: 'label',
      countdownCompleteLabel: 'gata',
    },
    email: {
      subject: 'subiect',
      preheader: 'preheader',
      bodyParagraphs: ['paragraf'],
      ctaText: 'buton',
      ctaUrl: 'https://example.com',
    },
  };
}

describe('validateContent', () => {
  it('returns no errors for valid content', () => {
    expect(validateContent(makeValidContent())).toEqual([]);
  });

  it('flags a missing recipientName', () => {
    const content = { ...makeValidContent(), recipientName: '' };
    expect(validateContent(content)).toContain('recipientName is required');
  });

  it('flags a missing senderName', () => {
    const content = { ...makeValidContent(), senderName: '' };
    expect(validateContent(content)).toContain('senderName is required');
  });

  it('flags a missing eventDateISO', () => {
    const content = { ...makeValidContent(), eventDateISO: '' };
    expect(validateContent(content)).toContain('eventDateISO is required');
  });

  it('flags an invalid eventDateISO', () => {
    const content = { ...makeValidContent(), eventDateISO: 'not-a-date' };
    expect(validateContent(content)).toContain('eventDateISO must be a valid ISO date string');
  });

  it('flags empty website.revealSteps', () => {
    const content = { ...makeValidContent(), website: { ...makeValidContent().website, revealSteps: [] } };
    expect(validateContent(content)).toContain('website.revealSteps must have at least one entry');
  });

  it('handles a missing website object without throwing', () => {
    const content = { ...makeValidContent(), website: undefined as any };
    const errors = validateContent(content);
    expect(() => validateContent(content)).not.toThrow();
    expect(errors).toContain('website.revealSteps must have at least one entry');
  });

  it('flags empty email.bodyParagraphs', () => {
    const content = { ...makeValidContent(), email: { ...makeValidContent().email, bodyParagraphs: [] } };
    expect(validateContent(content)).toContain('email.bodyParagraphs must have at least one entry');
  });

  it('handles a missing email object without throwing', () => {
    const content = { ...makeValidContent(), email: undefined as any };
    const errors = validateContent(content);
    expect(() => validateContent(content)).not.toThrow();
    expect(errors).toContain('email.bodyParagraphs must have at least one entry');
  });

  it('flags all newly-required leaf string fields when blanked out', () => {
    const content = {
      ...makeValidContent(),
      website: {
        ...makeValidContent().website,
        introLine: '',
        tapPrompt: '',
        countdownLabel: '',
        countdownCompleteLabel: '',
      },
      email: {
        ...makeValidContent().email,
        subject: '',
        preheader: '',
        ctaText: '',
        ctaUrl: '',
      },
    };
    const errors = validateContent(content);
    expect(errors).toContain('website.introLine is required');
    expect(errors).toContain('website.tapPrompt is required');
    expect(errors).toContain('website.countdownLabel is required');
    expect(errors).toContain('website.countdownCompleteLabel is required');
    expect(errors).toContain('email.subject is required');
    expect(errors).toContain('email.preheader is required');
    expect(errors).toContain('email.ctaText is required');
    expect(errors).toContain('email.ctaUrl is required');
  });
});

describe('the real content.json', () => {
  it('passes validation', () => {
    expect(validateContent(getContent())).toEqual([]);
  });
});
