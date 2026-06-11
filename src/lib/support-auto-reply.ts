const AUTO_REPLY_SUBJECT_PATTERNS = [
  /\bautomatic reply\b/i,
  /\bauto(?:matic)?[-\s]?reply\b/i,
  /\bauto(?:matic)?[-\s]?response\b/i,
  /\bout of (?:the )?office\b/i,
  /\baway from (?:the )?office\b/i,
  /\bvacation responder\b/i,
  /\babsence notification\b/i,
  /\bcurrently away\b/i,
  /\bmail delivery (?:failed|system|subsystem)\b/i,
  /\bundeliver(?:ed|able)\b/i,
  /\bdelivery status notification\b/i,
];

const AUTO_REPLY_BODY_PATTERNS = [
  /\bthis is an automatic(?:ally generated)? (?:reply|response|message)\b/i,
  /\bthis is an automated (?:reply|response|message)\b/i,
  /\bi am (?:currently )?(?:out of|away from) (?:the )?office\b/i,
  /\bi'?m (?:currently )?(?:out of|away from) (?:the )?office\b/i,
  /\bi will be (?:out of|away from) (?:the )?office\b/i,
  /\bi am (?:currently )?on leave\b/i,
  /\bi'?m (?:currently )?on leave\b/i,
  /\bcurrently on leave and (?:will )?(?:return|be back)\b/i,
  /\bthank you for your email\.?\s+i am away\b/i,
  /\bthank you for (?:your )?(?:message|email)\.?\s+i (?:am|will be) (?:currently )?(?:out of|away from|on leave)\b/i,
  /\bdo not reply to this (?:email|message)\b/i,
  /\bdelivery to the following recipients? (?:failed|was unsuccessful)\b/i,
  /\brecipient inbox is full\b/i,
  /\bmessage could not be delivered\b/i,
];

export function isClearlyAutomaticSupportReply(input: { subject?: string | null; body?: string | null }) {
  const subject = input.subject?.trim() || '';
  const body = input.body?.trim() || '';

  if (subject && AUTO_REPLY_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject))) {
    return true;
  }

  const bodyPreview = body.slice(0, 2500);
  return Boolean(bodyPreview && AUTO_REPLY_BODY_PATTERNS.some((pattern) => pattern.test(bodyPreview)));
}
