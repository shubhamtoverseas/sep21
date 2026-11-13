import translation from "./translation";

/*
 * Copy objects keep their shape (COPY.title, COPY.sections.start, option.label …) but every string value is an en
 * translation key, resolved when it is read — so the constants stay in the module constants files and the text
 * lives in public/locales/en/translation.json. Functions and non-key strings pass through; nested objects and
 * arrays are proxied too (cached per target so identities stay stable).
 */
const cache = new WeakMap();
const isKey = (value) => typeof value === 'string' && value.startsWith('key_');
const wrap = (source) => {
    if (source === null || typeof source !== 'object') return source;
    if (cache.has(source)) return cache.get(source);
    /* the constants are frozen; a Proxy must return a frozen property's own value, so the proxy sits on a shallow copy */
    const target = Array.isArray(source) ? [...source] : { ...source };
    const proxy = new Proxy(target, {
        get(obj, prop) {
            const value = Reflect.get(obj, prop);
            /* `key`, `labelKey`, `countKey` … hold key names on purpose — the reader translates them itself */
            if (typeof prop === 'string' && /key$/i.test(prop)) return value;
            if (isKey(value)) return translation(value);
            if (value && typeof value === 'object' && typeof prop !== 'symbol' && prop !== 'prototype') return wrap(value);
            return value;
        },
    });
    cache.set(source, proxy);
    return proxy;
};
const copyKeys = (target) => wrap(target);
export default copyKeys;
