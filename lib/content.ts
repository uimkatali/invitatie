import contentData from '../content.json';

export interface WebsiteContent {
  introLine: string;
  tapPrompt: string;
  revealSteps: string[];
  countdownLabel: string;
  countdownCompleteLabel: string;
}

export interface EmailContent {
  subject: string;
  preheader: string;
  bodyParagraphs: string[];
  ctaText: string;
  ctaUrl: string;
}

export interface InviteContent {
  recipientName: string;
  senderName: string;
  eventDateISO: string;
  website: WebsiteContent;
  email: EmailContent;
}

export function getContent(): InviteContent {
  return contentData as InviteContent;
}

export function validateContent(content: InviteContent): string[] {
  const errors: string[] = [];

  if (!content.recipientName) errors.push('recipientName is required');
  if (!content.senderName) errors.push('senderName is required');
  if (!content.eventDateISO) {
    errors.push('eventDateISO is required');
  } else if (Number.isNaN(Date.parse(content.eventDateISO))) {
    errors.push('eventDateISO must be a valid ISO date string');
  }
  if (!content.website?.revealSteps?.length) {
    errors.push('website.revealSteps must have at least one entry');
  }
  if (!content.email?.bodyParagraphs?.length) {
    errors.push('email.bodyParagraphs must have at least one entry');
  }

  return errors;
}
