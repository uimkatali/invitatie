import contentJson from '../content.json';

export interface InviteContent {
  recipientName: string;
  senderName: string;
  eventDateISO: string;
  website: {
    introLine: string;
    tapPrompt: string;
    revealSteps: string[];
    countdownLabel: string;
    countdownCompleteLabel: string;
  };
  email: {
    subject: string;
    preheader: string;
    bodyParagraphs: string[];
    ctaText: string;
    ctaUrl: string;
  };
  login: {
    title: string;
    hint: string;
    usernameLabel: string;
    passwordLabel: string;
    submitText: string;
    errorText: string;
    expectedUsername: string;
    expectedPassword: string;
  };
  themeLogin: {
    title: string;
    hint: string;
    usernameLabel: string;
    passwordLabel: string;
    submitText: string;
    errorText: string;
    expectedUsername: string;
    expectedPassword: string;
  };
  selectionsEmail: {
    subject: string;
    preheader: string;
  };
}

export function getContent(): InviteContent {
  return contentJson as InviteContent;
}
