import React, { useCallback, useMemo, useRef, useState } from "react";
import { keepsDraft, refusalOf } from "./insuranceFormsConfig";
import styles from "./InsuranceForms.module.css";

/* After a stale conflict or a save that failed, an Insurance dialog stays open with what was typed and shows the message above
   its fields (CURRENT_REQUIREMENTS.md line 25: "Another user's save must not erase an open unsaved draft … Preserve the draft and
   use the established conflict handling"; PROMPT 9 F-1 / F-2, owner 12 Nov 2026). The dialog keeps its submission key, so a
   retry after a lost answer is answered "already recorded" and nothing is written twice. Once the draft was kept, closing the
   dialog reloads the record, so the page then shows the current values.
   keep(res): true when it kept the draft (the caller stops there); reset(): clears the message before a new attempt;
   close(): the dialog's own close (Cancel, ×, Escape); note: the message, or null. */
const useKeptDraft = (onClose, onDone) => {
    const [message, setMessage] = useState("");
    const reload = useRef(false);
    const keep = useCallback((res) => {
        if (!keepsDraft(res)) return false;
        reload.current = true;
        setMessage(refusalOf(res).message);
        return true;
    }, []);
    const reset = useCallback(() => setMessage(""), []);
    const close = useCallback(() => {
        if (reload.current) onDone();
        onClose();
    }, [onClose, onDone]);
    return useMemo(() => ({
        keep,
        reset,
        close,
        note: message ? <div className={styles.notice} data-tone="danger" role="alert" data-kept-draft>{message}</div> : null,
    }), [keep, reset, close, message]);
};

export default useKeptDraft;
