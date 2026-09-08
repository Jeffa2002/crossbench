#!/usr/bin/env npx tsx
import { MEDIA_CONTACTS, buildMediaOutreachEmail } from '../src/lib/media-outreach';

const args = process.argv.slice(2);
if (args.some(arg => /^--(?:send|force|test-to)(?:=|$)/.test(arg))) {
  console.error('Media sending is disabled. This command only previews drafts; it never creates delivery or campaign records.');
  process.exitCode = 1;
} else {
  const sampleId = args.find(arg => arg.startsWith('--sample-id='))?.slice('--sample-id='.length) ?? MEDIA_CONTACTS[0].id;
  const contact = MEDIA_CONTACTS.find(entry => entry.id === sampleId);
  if (!contact) {
    console.error('Unknown contact. Choose a contact ID from the media directory.');
    process.exitCode = 1;
  } else {
    const draft = buildMediaOutreachEmail(contact);
    console.log('PREVIEW ONLY — sending disabled; no database or email-provider connection.');
    console.log(`Contact: ${contact.name} / ${contact.outlet}`);
    console.log(`Subject: ${draft.subject}\n\n${draft.plain}`);
  }
}
