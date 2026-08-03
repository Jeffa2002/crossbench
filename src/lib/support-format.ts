function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" style="color: #2563eb;">$1</a>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>');
}

export function supportMarkdownToHtml(markdown: string) {
  const lines = markdown.trim().split('\n');
  const output: string[] = [];
  let list: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (list) output.push(`</${list}>`);
    list = null;
  };

  for (const line of lines) {
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    const nextList = unordered ? 'ul' : ordered ? 'ol' : null;

    if (nextList) {
      if (list !== nextList) {
        closeList();
        list = nextList;
        output.push(`<${list} style="padding-left: 24px;">`);
      }
      output.push(`<li>${inlineMarkdown((unordered || ordered)![1])}</li>`);
      continue;
    }

    closeList();
    if (!line.trim()) continue;
    output.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  closeList();
  return output.join('\n');
}

export function supportMarkdownToText(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .trim();
}
