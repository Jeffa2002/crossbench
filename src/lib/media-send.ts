import { createHash } from 'node:crypto';
import { MEDIA_CONTACTS, buildMediaOutreachEmail, mediaEmailStatus } from './media-outreach';

export const MEDIA_CAMPAIGN = 'media_outreach_intro_2026_06';

export type MediaDelivery = {
  id: string;
  status: string;
  sentAt: Date | null;
  sentBy: string | null;
};

export type MediaClaim = {
  campaign: string;
  chamber: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  textBody: string;
  sentBy: string;
};

export type MediaSendDependencies = {
  admin: () => Promise<{ email: string } | null>;
  configuration: () => { ready: boolean; from: string; replyTo: string };
  previous: (email: string) => Promise<MediaDelivery | null>;
  claim: (data: MediaClaim) => Promise<MediaDelivery>;
  record: (id: string, status: 'SENT' | 'FAILED' | 'PENDING', providerId?: string) => Promise<void>;
  deliver: (mail: { from: string; replyTo: string; to: string; subject: string; text: string; html: string }, key: string) => Promise<{ id?: string; rejected?: boolean }>;
  now?: () => Date;
};

function response(body: object, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function createMediaSendHandlers(dependencies: MediaSendDependencies) {
  function preview(contactId: unknown) {
    const contact = MEDIA_CONTACTS.find(entry => entry.id === contactId);
    if (!contact) return null;
    const configuration = dependencies.configuration();
    const draft = buildMediaOutreachEmail(contact);
    const mail = { from: configuration.from, replyTo: configuration.replyTo, to: contact.email?.trim().toLowerCase() ?? '', subject: draft.subject, text: draft.plain, html: draft.html };
    const eligible = mediaEmailStatus(contact, dependencies.now?.() ?? new Date()) === 'Publicly listed' && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(mail.to);
    const draftHash = createHash('sha256').update(JSON.stringify(mail)).digest('hex');
    return { contact, mail, eligible, draftHash, ready: configuration.ready };
  }

  async function GET(request: Request) {
    if (!await dependencies.admin()) return response({ error: 'Admin sign-in required.' }, 401);
    const prepared = preview(new URL(request.url).searchParams.get('contactId'));
    if (!prepared) return response({ error: 'Unknown contact.' }, 404);
    try {
      const previous = prepared.mail.to ? await dependencies.previous(prepared.mail.to) : null;
      return response({
        canSend: prepared.ready && prepared.eligible && !previous,
        reason: previous ? 'This address already has a recorded attempt. Sending again is blocked.' : !prepared.eligible ? 'A current, publicly sourced single email address is required.' : !prepared.ready ? 'The email provider is not configured.' : null,
        delivery: previous,
        draftHash: prepared.draftHash,
        from: prepared.mail.from,
        replyTo: prepared.mail.replyTo,
        recipient: prepared.mail.to,
        subject: prepared.mail.subject,
        text: prepared.mail.text,
      });
    } catch {
      return response({ error: 'Delivery history is unavailable. Sending is blocked until it can be checked.' }, 503);
    }
  }

  async function POST(request: Request) {
    const admin = await dependencies.admin();
    if (!admin) return response({ error: 'Admin sign-in required.' }, 401);
    const origin = request.headers.get('origin');
    if (!['https://www.crossbench.io', 'https://crossbench.io'].includes(origin ?? '') || request.headers.get('sec-fetch-site') === 'cross-site') {
      return response({ error: 'Same-site confirmation required.' }, 403);
    }
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return response({ error: 'JSON confirmation required.' }, 415);
    let body: Record<string, unknown>;
    try {
      const reader = request.body?.getReader();
      if (!reader) return response({ error: 'Confirmation required.' }, 400);
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 2048) { await reader.cancel(); return response({ error: 'Confirmation too large.' }, 413); }
        chunks.push(part.value);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(key => !['contactId', 'draftHash', 'confirmed'].includes(key)) || body.confirmed !== true || typeof body.contactId !== 'string' || typeof body.draftHash !== 'string') {
        return response({ error: 'Confirm exactly one contact and its reviewed draft.' }, 400);
      }
    } catch {
      return response({ error: 'Invalid confirmation.' }, 400);
    }
    const prepared = preview(body.contactId);
    if (!prepared) return response({ error: 'Unknown contact.' }, 404);
    if (!prepared.eligible) return response({ error: 'This contact needs current email source verification.' }, 422);
    if (body.draftHash !== prepared.draftHash) return response({ error: 'The draft changed. Refresh and review it again.' }, 409);
    if (!prepared.ready) return response({ error: 'The email provider is not configured.' }, 503);
    let claim: MediaDelivery;
    try {
      if (await dependencies.previous(prepared.mail.to)) return response({ error: 'An attempt already exists for this address. Repeat sending is blocked.' }, 409);
      claim = await dependencies.claim({ campaign: MEDIA_CAMPAIGN, chamber: 'Media', recipientName: prepared.contact.name, recipientEmail: prepared.mail.to, subject: prepared.mail.subject, textBody: prepared.mail.text, sentBy: admin.email });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return response({ error: 'Another attempt already exists. Repeat sending is blocked.' }, 409);
      return response({ error: 'Could not reserve a delivery record. Nothing was sent.' }, 503);
    }
    try {
      const result = await dependencies.deliver(prepared.mail, `media-${claim.id}`);
      if (result.rejected) {
        await dependencies.record(claim.id, 'FAILED');
        return response({ error: 'The provider rejected this attempt. Automatic retries are disabled; review the delivery record before further action.' }, 502);
      }
      if (!result.id) throw new Error('Missing provider acknowledgement');
      await dependencies.record(claim.id, 'SENT', result.id);
      return response({ status: 'SENT', message: 'Accepted by the email provider for this recipient only. Inbox delivery is not yet confirmed.' });
    } catch {
      try { await dependencies.record(claim.id, 'PENDING'); } catch {}
      return response({ error: 'Delivery outcome is uncertain. It may have been accepted. Repeat sending is blocked; check the provider record before further action.' }, 503);
    }
  }

  return { GET, POST };
}
