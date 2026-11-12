// Client mirror of send_message checks; the server enforces the same rules.
export const MESSAGE_MAX = 4000;
export const MAX_LINKS = 3;
export const RETENTION_MONTHS = 2;

export type MessageKind = 'message' | 'instructions' | 'schedule';
export const KIND_LABELS: Record<MessageKind, string> = {
  message: 'Message',
  instructions: 'Placement instructions',
  schedule: 'Scheduling',
};

export const REPORT_REASONS = [
  { value: 'abusive', label: 'Abusive or threatening' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'safeguarding', label: 'Safeguarding concern' },
  { value: 'contact_request', label: 'Asking for private contact details' },
  { value: 'other', label: 'Other' },
] as const;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /\+?\d[\d\s().-]{8,}\d/;

export const containsContactDetails = (text: string) => EMAIL.test(text) || PHONE.test(text);
export const linkCount = (text: string) => (text.match(/https?:\/\/|www\./gi) ?? []).length;

/** Returns a problem to show before sending, or null. */
export function messageProblem(text: string, safeguarded: boolean): string | null {
  const b = text.trim();
  if (!b) return 'Write a message first.';
  if (b.length > MESSAGE_MAX) return `Messages can be up to ${MESSAGE_MAX} characters.`;
  if (linkCount(b) > MAX_LINKS) return `Messages can include at most ${MAX_LINKS} links.`;
  if (safeguarded && containsContactDetails(b)) return 'For safety, email addresses and phone numbers cannot be shared in messages with under-18s.';
  return null;
}
