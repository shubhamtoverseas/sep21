import { useEffect } from "react";

/**
 * Calls `onOutside` when a pointer-down lands outside `ref.current`.
 * `enabled` lets callers attach the listener only while a popover is open.
 */
const useOutsideClick = (ref, onOutside, enabled = true) => {
    useEffect(() => {
        if (!enabled) return undefined;
        const handler = (event) => {
            const target = event.target;
            if (!(target instanceof Node) || !target.isConnected) return;
            if (ref.current && !ref.current.contains(target)) onOutside(event);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ref, onOutside, enabled]);
};

export default useOutsideClick;
