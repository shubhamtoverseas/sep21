// Android-style placeholder interpolation.
// Supports positional placeholders (%1$s, %2$d, %3$f) and sequential bare
// placeholders (%s, %d, %f). "%%" renders a literal percent sign.
// Missing arguments render as an empty string — never "undefined".

const PLACEHOLDER_RE = /%%|%(\d+)\$[sdf]|%[sdf]/g;

export function interpolate(template, ...args) {
    if (template === null || template === undefined) return '';
    const str = String(template);
    if (str.indexOf('%') === -1) return str;

    let sequential = 0;
    return str.replace(PLACEHOLDER_RE, (match, position) => {
        if (match === '%%') return '%';
        const value =
            position !== undefined
                ? args[Number(position) - 1]
                : args[sequential++];
        if (value === undefined || value === null) return '';
        return String(value);
    });
}
