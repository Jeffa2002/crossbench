const SUPPORT_MAILBOXES = new Map([
  ['privacy@crossbench.io', 'Privacy Email'],
  ['security@crossbench.io', 'Security Email'],
]);

function emailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export function supportMailboxSources(addresses: string[]) {
  return [...new Set(addresses
    .map(emailAddress)
    .map(address => SUPPORT_MAILBOXES.get(address))
    .filter((source): source is string => Boolean(source)))];
}

export function supportMailboxSourcesFromMessage(message: string) {
  const line = message.split('\n').find(value => value.startsWith('Source mailbox: '));
  return line?.slice('Source mailbox: '.length).split(', ').filter(Boolean) ?? [];
}
