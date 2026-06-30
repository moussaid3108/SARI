const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ",
};

export function sanitizeContent(content: string): string {
  return content
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (m) => HTML_ENTITIES[m] ?? m)
    .trim();
}
