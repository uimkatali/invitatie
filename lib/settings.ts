export interface SettingsRow {
  recipientName: string;
  senderName: string;
  eventDateIso: string;
  websiteIntroLine: string;
  websiteTapPrompt: string;
  websiteRevealSteps: string[];
  websiteCountdownLabel: string;
  websiteCountdownCompleteLabel: string;
  emailSubject: string;
  emailPreheader: string;
  emailBodyParagraphs: string[];
  emailCtaText: string;
  emailCtaUrl: string;
  loginTitle: string;
  loginHint: string;
  loginUsernameLabel: string;
  loginPasswordLabel: string;
  loginSubmitText: string;
  loginErrorText: string;
  loginExpectedUsername: string;
  loginExpectedPassword: string;
  activeThemeId: string;
  themeColorOverrides: Record<string, string> | null;
}

export function validateSettings(settings: SettingsRow): string[] {
  const errors: string[] = [];
  const requiredStringFields: (keyof SettingsRow)[] = [
    'recipientName', 'senderName', 'websiteIntroLine', 'websiteTapPrompt',
    'websiteCountdownLabel', 'websiteCountdownCompleteLabel', 'emailSubject',
    'emailPreheader', 'emailCtaText', 'emailCtaUrl', 'loginTitle', 'loginHint',
    'loginUsernameLabel', 'loginPasswordLabel', 'loginSubmitText', 'loginErrorText',
    'loginExpectedUsername', 'loginExpectedPassword', 'activeThemeId',
  ];

  for (const field of requiredStringFields) {
    if (!settings[field]) errors.push(`${field} is required`);
  }

  if (!settings.eventDateIso) {
    errors.push('eventDateIso is required');
  } else if (Number.isNaN(Date.parse(settings.eventDateIso))) {
    errors.push('eventDateIso must be a valid ISO date string');
  }

  if (!settings.websiteRevealSteps?.length) {
    errors.push('websiteRevealSteps must have at least one entry');
  }
  if (!settings.emailBodyParagraphs?.length) {
    errors.push('emailBodyParagraphs must have at least one entry');
  }

  return errors;
}
