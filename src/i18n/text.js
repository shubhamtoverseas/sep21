import React from 'react';

// Sheet strings may contain literal "\n" sequences, real newlines and
// <br>/<br/>/<BR> tags. normalizeLineBreaks() collapses all of them into
// real "\n" characters; renderLineBreaks() turns those into <br /> elements
// safely (plain text nodes only — no dangerouslySetInnerHTML).

const LINE_BREAK_RE = /\\n|<br\s*\/?\s*>/gi;

export function normalizeLineBreaks(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(LINE_BREAK_RE, '\n');
}

export function renderLineBreaks(text) {
    const normalized = normalizeLineBreaks(text);
    const lines = normalized.split('\n');
    if (lines.length === 1) return normalized;
    return lines.flatMap((line, index) =>
        index === 0 ? [line] : [<br key={`br-${index}`} />, line]
    );
}
