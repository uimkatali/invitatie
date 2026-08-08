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

  it('flags all remaining required string fields when blanked out', () => {
    const settings = {
      ...makeValidSettings(),
      senderName: '',
      websiteTapPrompt: '',
      websiteCountdownLabel: '',
      websiteCountdownCompleteLabel: '',
      emailSubject: '',
      emailPreheader: '',
      emailCtaText: '',
      emailCtaUrl: '',
      loginTitle: '',
      loginHint: '',
      loginUsernameLabel: '',
      loginPasswordLabel: '',
      loginSubmitText: '',
      loginErrorText: '',
      loginExpectedUsername: '',
      loginExpectedPassword: '',
      activeThemeId: '',
    };
    const errors = validateSettings(settings);
    expect(errors).toContain('senderName is required');
    expect(errors).toContain('websiteTapPrompt is required');
    expect(errors).toContain('websiteCountdownLabel is required');
    expect(errors).toContain('websiteCountdownCompleteLabel is required');
    expect(errors).toContain('emailSubject is required');
    expect(errors).toContain('emailPreheader is required');
    expect(errors).toContain('emailCtaText is required');
    expect(errors).toContain('emailCtaUrl is required');
    expect(errors).toContain('loginTitle is required');
    expect(errors).toContain('loginHint is required');
    expect(errors).toContain('loginUsernameLabel is required');
    expect(errors).toContain('loginPasswordLabel is required');
    expect(errors).toContain('loginSubmitText is required');
    expect(errors).toContain('loginErrorText is required');
    expect(errors).toContain('loginExpectedUsername is required');
    expect(errors).toContain('loginExpectedPassword is required');
    expect(errors).toContain('activeThemeId is required');
  });
});
