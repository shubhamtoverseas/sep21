// Drop-in replacement for @mui/material's debounce (same API incl. .clear()),
// so list pages don't need to pull the MUI package for a timer helper
export default function debounce(func, wait = 166) {
    let timeout;

    function debounced(...args) {
        const later = () => {
            timeout = undefined;
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    }

    debounced.clear = () => {
        clearTimeout(timeout);
        timeout = undefined;
    };
    debounced.cancel = debounced.clear;

    return debounced;
}
