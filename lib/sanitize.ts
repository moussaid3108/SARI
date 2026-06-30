import DOMPurify from "isomorphic-dompurify";

export function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
