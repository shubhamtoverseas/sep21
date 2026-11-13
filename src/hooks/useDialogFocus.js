import { useEffect, useRef } from "react";

export const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* open dialogs, innermost last — body-targeted Escape / Tab belong to the topmost one only */
const openDialogs = [];

/**
 * Dialog focus contract (WORKER.md §16.20, ACT "Shared Worker Context accessibility"):
 * on open move focus into `ref.current`, keep Tab inside it, close on Escape, make everything
 * outside it inert, and restore focus to the opener on close. Backdrops (`role="presentation"`)
 * stay live so click-to-close keeps working. Nested dialogs rendered inside this one handle
 * their own keys first; a handler that already called preventDefault (react-select, editors) wins.
 * `enabled` lets a component keep the ref on an element that is not always a dialog.
 */
const useDialogFocus = (ref, onClose, enabled = true) => {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        const node = ref.current;
        if (!enabled || !node) return undefined;
        const opener = document.activeElement;
        openDialogs.push(node);

        const inerted = [];
        let el = node;
        while (el && el.parentElement && el !== document.body) {
            Array.from(el.parentElement.children).forEach((sib) => {
                /* #mc-dp-portal: the shared DateInput popup host on <body> (created once, kept across opens) — a dialog's
                   own date field renders its calendar there, so inerting it would leave the calendar visible but dead */
                if (sib === el || sib.hasAttribute('inert') || sib.tagName === 'SCRIPT' || sib.getAttribute('role') === 'presentation' || sib.id === 'mc-dp-portal') return;
                sib.setAttribute('inert', '');
                inerted.push(sib);
            });
            el = el.parentElement;
        }

        const focusables = () => Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR));
        const isTop = () => openDialogs[openDialogs.length - 1] === node;
        const focusFirst = () => {
            const first = focusables()[0];
            if (first) first.focus();
            else { node.setAttribute('tabindex', '-1'); node.focus(); }
        };
        focusFirst();

        const onKey = (event) => {
            if (event.defaultPrevented) return;
            const target = event.target instanceof Node ? event.target : null;
            const inside = target ? node.contains(target) : false;
            if (inside) {
                const nested = target.closest('[role="dialog"]');
                if (nested && nested !== node && node.contains(nested)) return;
            } else if (!(isTop() && (!target || target === document.body))) {
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current?.();
                return;
            }
            if (event.key !== 'Tab') return;
            const list = focusables();
            if (list.length === 0) { event.preventDefault(); return; }
            const active = document.activeElement;
            const index = list.indexOf(active);
            if (index === -1) { event.preventDefault(); list[0].focus(); return; }
            if (!event.shiftKey && index === list.length - 1) { event.preventDefault(); list[0].focus(); }
            else if (event.shiftKey && index === 0) { event.preventDefault(); list[list.length - 1].focus(); }
        };
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('keydown', onKey);
            inerted.forEach((sib) => sib.removeAttribute('inert'));
            const at = openDialogs.indexOf(node);
            if (at !== -1) openDialogs.splice(at, 1);
            if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
        };
    }, [ref, enabled]);
};

export default useDialogFocus;
