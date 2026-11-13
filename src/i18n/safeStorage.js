// localStorage wrappers that never throw (quota exceeded, privacy mode,
// disabled storage). When localStorage is unusable we degrade to an
// in-memory map so the session still works; persistence is simply lost.

const memoryStore = new Map();

export function safeGet(key) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const value = window.localStorage.getItem(key);
            if (value !== null) return value;
        }
    } catch (e) {
        // ignore — fall through to memory
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
}

export function safeSet(key, value) {
    memoryStore.set(key, value);
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
        }
    } catch (e) {
        // quota / privacy mode — memory copy above already keeps us alive
    }
}

export function safeRemove(key) {
    memoryStore.delete(key);
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
        }
    } catch (e) {
        // ignore
    }
}
