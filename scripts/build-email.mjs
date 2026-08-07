import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(data, key) ? String(data[key]) : match;
  });
}

function buildEmail() {
  const contentPath = path.join(__dirname, '..', 'content.json');
  const templatePath = path.join(__dirname, '..', 'email', 'template.html');
  const outputPath = path.join(__dirname, '..', 'email', 'invite-email.html');

  const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
  const template = fs.readFileSync(templatePath, 'utf-8');

  const bodyHtml = content.email.bodyParagraphs
    .map((paragraph) => `<p style="margin:0 0 16px; font-size:16px; line-height:1.6;">${paragraph}</p>`)
    .join('\n');

  const rendered = renderTemplate(template, {
    recipientName: content.recipientName,
    senderName: content.senderName,
    subject: content.email.subject,
    preheader: content.email.preheader,
    bodyHtml,
    ctaText: content.email.ctaText,
    ctaUrl: content.email.ctaUrl,
  });

  fs.writeFileSync(outputPath, rendered, 'utf-8');
  console.log(`Email written to ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildEmail();
}
