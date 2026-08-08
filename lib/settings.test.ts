import { describe, it, expect } from 'vitest';
import { validateSettings, SettingsRow } from './settings';

function makeValidSettings(): SettingsRow {
  return {
    recipientName: 'fata mea misterioasa',
    senderName: 'Cata',
    eventDateIso: '2026-07-25T13:00:00+03:00',
    websiteIntroLine: 'intro',
    websiteTapPrompt: 'tap',
    websiteRevealSteps: ['pas 1'],
    websiteCountdownLabel: 'label',
    websiteCountdownCompleteLabel: 'gata',
    emailSubject: 'subiect',
    emailPreheader: 'preheader',
    emailBodyParagraphs: ['paragraf'],
    emailCtaText: 'buton',
    emailCtaUrl: 'https://example.com',
    loginTitle: 'Acces secret',
    loginHint: 'hint',
    loginUsernameLabel: 'user',
    loginPasswordLabel: 'parola',
    loginSubmitText: 'Intra',
    loginErrorText: 'gresit',
    loginExpectedUsername: 'fatamisterioasa',
    loginExpectedPassword: 'elefant123',
    activeThemeId: 'alien-field',
    themeColorOverrides: null,
  };
}

describe('validateSettings', () => {
  it('returns no errors for valid settings', () => {
    expect(validateSettings(makeValidSettings())).toEqual([]);
  });

  it('flags a missing recipientName', () => {
    expect(validateSettings({ ...makeValidSettings(), recipientName: '' })).toContain('recipientName is required');
  });

  it('flags an invalid eventDateIso', () => {
    expect(validateSettings({ ...makeValidSettings(), eventDateIso: 'not-a-date' })).toContain(
      'eventDateIso must be a valid ISO date string'
    );
  });

  it('flags empty websiteRevealSteps', () => {
    expect(validateSettings({ ...makeValidSettings(), websiteRevealSteps: [] })).toContain(
      'websiteRevealSteps must have at least one entry'
    );
  });

  it('flags empty emailBodyParagraphs', () => {
    expect(validateSettings({ ...makeValidSettings(), emailBodyParagraphs: [] })).toContain(
      'emailBodyParagraphs must have at least one entry'
    );
  });
});
