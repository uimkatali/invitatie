import { describe, it, expect } from 'vitest';
import { mapSettingsRow } from './get-public-settings';

describe('mapSettingsRow', () => {
  it('maps a raw DB row to the public settings shape', () => {
    const row = {
      recipient_name: 'fata mea misterioasa',
      sender_name: 'Cata',
      event_date_iso: '2026-07-25T13:00:00+03:00',
      website_intro_line: 'intro',
      website_tap_prompt: 'tap',
      website_reveal_steps: ['pas 1', 'pas 2'],
      website_countdown_label: 'label',
      website_countdown_complete_label: 'gata',
      login_title: 'Acces secret',
      login_hint: 'hint',
      login_username_label: 'user',
      login_password_label: 'parola',
      login_submit_text: 'Intra',
      login_error_text: 'gresit',
      login_expected_username: 'fatamisterioasa',
      login_expected_password: 'elefant123',
      email_subject: 'O invitatie speciala',
      email_preheader: 'Ceva te asteapta',
      email_body_paragraphs: ['paragraf 1', 'paragraf 2'],
      email_cta_text: 'Deschide',
      email_cta_url: 'https://example.com',
      active_theme_id: 'alien-field',
      theme_color_overrides: null,
    };

    const mapped = mapSettingsRow(row);

    expect(mapped.eventDateIso).toBe('2026-07-25T13:00:00+03:00');
    expect(mapped.website.revealSteps).toEqual(['pas 1', 'pas 2']);
    expect(mapped.login.expectedUsername).toBe('fatamisterioasa');
    expect(mapped.email.subject).toBe('O invitatie speciala');
    expect(mapped.email.bodyParagraphs).toEqual(['paragraf 1', 'paragraf 2']);
    expect(mapped.activeThemeId).toBe('alien-field');
  });
});
