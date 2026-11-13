/**
 * A Deployment panel keeps a draft of its fields and re-reads it from the server document after every save. The refresh of
 * an earlier save can land while the user is typing in a blur-saved input; the draft must then keep that input's text,
 * or the keystrokes (and backspaces) since are undone (Mubin 4 Nov, SIM Card Number). `fieldIds` maps the input ids of the
 * panel's blur-saved text fields to their draft keys (DEPLOYMENT_TYPED_FIELDS); `activeEl` is the focused element.
 */
export const withFocusedText = (next, prev, fieldIds, activeEl = typeof document === "undefined" ? null : document.activeElement) => {
    const key = activeEl?.id ? fieldIds?.[activeEl.id] : undefined;
    if (!key || !prev || !(key in prev)) return next;
    return { ...next, [key]: prev[key] };
};
