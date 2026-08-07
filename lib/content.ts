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

export interface LoginContent {
  title: string;
  hint: string;
  usernameLabel: string;
  passwordLabel: string;
  submitText: string;
  errorText: string;
  expectedUsername: string;
  expectedPassword: string;
}

export interface InviteContent {
  recipientName: string;
  senderName: string;
  eventDateISO: string;
  website: WebsiteContent;
  email: EmailContent;
  login: LoginContent;
}

export function getContent(): InviteContent {
  return contentData;
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
  if (!content.website?.introLine) errors.push('website.introLine is required');
  if (!content.website?.tapPrompt) errors.push('website.tapPrompt is required');
  if (!content.website?.revealSteps?.length) {
    errors.push('website.revealSteps must have at least one entry');
  }
  if (!content.website?.countdownLabel) errors.push('website.countdownLabel is required');
  if (!content.website?.countdownCompleteLabel) errors.push('website.countdownCompleteLabel is required');
  if (!content.email?.subject) errors.push('email.subject is required');
  if (!content.email?.preheader) errors.push('email.preheader is required');
  if (!content.email?.bodyParagraphs?.length) {
    errors.push('email.bodyParagraphs must have at least one entry');
  }
  if (!content.email?.ctaText) errors.push('email.ctaText is required');
  if (!content.email?.ctaUrl) errors.push('email.ctaUrl is required');
  if (!content.login?.title) errors.push('login.title is required');
  if (!content.login?.hint) errors.push('login.hint is required');
  if (!content.login?.usernameLabel) errors.push('login.usernameLabel is required');
  if (!content.login?.passwordLabel) errors.push('login.passwordLabel is required');
  if (!content.login?.submitText) errors.push('login.submitText is required');
  if (!content.login?.errorText) errors.push('login.errorText is required');
  if (!content.login?.expectedUsername) errors.push('login.expectedUsername is required');
  if (!content.login?.expectedPassword) errors.push('login.expectedPassword is required');

  return errors;
}
