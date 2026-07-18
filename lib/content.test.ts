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

  it('flags an invalid eventDateISO', () => {
    const content = { ...makeValidContent(), eventDateISO: 'not-a-date' };
    expect(validateContent(content)).toContain('eventDateISO must be a valid ISO date string');
  });

  it('flags empty website.revealSteps', () => {
    const content = { ...makeValidContent(), website: { ...makeValidContent().website, revealSteps: [] } };
    expect(validateContent(content)).toContain('website.revealSteps must have at least one entry');
  });

  it('flags empty email.bodyParagraphs', () => {
    const content = { ...makeValidContent(), email: { ...makeValidContent().email, bodyParagraphs: [] } };
    expect(validateContent(content)).toContain('email.bodyParagraphs must have at least one entry');
  });
});

describe('the real content.json', () => {
  it('passes validation', () => {
    expect(validateContent(getContent())).toEqual([]);
  });
});
