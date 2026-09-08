# Media research and preview directory

The protected `/admin/media` page holds 44 research contacts: the existing 26 plus 18 new routes researched on 8 September 2026. Twenty-four unique email addresses have public-source evidence. This is not delivery verification or consent to contact.

`src/lib/media-research.json` records source URLs, checked dates, route types, pitch angles and cautions. Existing contact IDs are preserved. An email must match its evidence, have a valid non-future checked date and an HTTPS source to be labelled publicly listed. Evidence older than 90 days is labelled overdue for review. Rechecking requires reviewing the cited source, not merely changing its date.

All media sending is disabled. The former `scripts/send-media-outreach.ts` now only previews text; it has no database or email-provider imports and rejects delivery flags. Existing delivery records are untouched. There are no new send endpoints, migrations, queued campaigns or permission changes. Copying a draft does not send it.

Drafts use each contact's individual angle, distinguish newsroom greetings from named journalists and state that participation is self-selected, not representative polling. Review current bill details, roles, previous outreach/opt-outs, funding/ownership claims and shared-newsroom duplication before any future approved campaign. Publicly listed addresses must never automatically become approved recipients.

Validation: `npm test` includes model, source-age, HTML-escaping and CLI no-send regression tests. Run the existing lint and production build before releasing via the existing GitHub deployment workflow. No dependency or schema change is required by this feature.

After building, `node scripts/test-media-browser.cjs` runs an isolated loopback server with ephemeral in-memory test authentication, blocks external browser requests and verifies desktop/mobile search, source filters, tailored drafts, clipboard copying, no-send state and anonymous redirects. Set `MEDIA_TEST_CHROMIUM` to an installed Chromium executable when needed. It does not use production credentials or a production database.
