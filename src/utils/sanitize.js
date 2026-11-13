import DOMPurify from "dompurify";

/**
 * Sanitize an untrusted HTML string before injecting it via
 * dangerouslySetInnerHTML. Strips <script>, event handlers (onerror, onclick…),
 * javascript:/data: URIs and other XSS vectors while keeping safe formatting
 * (bold, line breaks, links, etc.).
 *
 * Returns the object shape React expects, so usage is a drop-in replacement:
 *   dangerouslySetInnerHTML={sanitizeHtml(value)}
 *
 * @param {unknown} dirty - the untrusted HTML/string
 * @returns {{ __html: string }}
 */
export const sanitizeHtml = (dirty) => ({
    __html: DOMPurify.sanitize(dirty == null ? "" : String(dirty), { ADD_ATTR: ["target"] }),
});

export default sanitizeHtml;
