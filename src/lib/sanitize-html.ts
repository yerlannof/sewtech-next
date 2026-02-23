/**
 * Sanitize descriptionHtml by removing duplicate FAQ section and JSON-LD scripts.
 *
 * The FAQ section in descriptionHtml (from OpenCart migration) starts with:
 *   <div style="margin-top: 3rem;"> ... <h2><b>Часто задаваемые вопросы (FAQ)</b></h2> ...
 * and contains <details> items. This duplicates the structured faq[] field.
 *
 * JSON-LD <script> tags (Product, BreadcrumbList, FAQPage) also duplicate
 * what page.tsx generates via its own Schema.org output.
 */
export function sanitizeDescriptionHtml(html: string): string {
  if (!html) return html

  // 1. Remove FAQ div: starts with <div style="margin-top: 3rem;"> containing FAQ heading
  //    The div ends with </div>\n before the first <script> or end of string
  let result = html.replace(
    /<div\s+style="margin-top:\s*3rem;?">\s*<h2[\s\S]*?Часто задаваемые вопросы[\s\S]*?<\/div>\s*(?=<script|$)/i,
    '',
  )

  // 2. Remove all JSON-LD script tags
  result = result.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, '')

  // 3. Trim trailing whitespace
  return result.trim()
}
