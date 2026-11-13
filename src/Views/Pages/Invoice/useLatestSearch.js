import { useCallback, useEffect, useRef } from "react";

/*
 * An invoice picker's search (performance track A-17): read once typing pauses, and only the latest read counts — a read
 * still in flight is aborted when a newer one starts, so its answer never reaches the store (the thunk reports it as
 * aborted). `makeAction(text)` builds the search thunk. A search still waiting when the picker closes or unmounts is sent
 * then (`flush`), so the last text typed is read, as each keystroke's read was before.
 */
export const SEARCH_PAUSE_MS = 300;

const useLatestSearch = (dispatch, makeAction, delay = SEARCH_PAUSE_MS) => {
    const timer = useRef(null);
    const waiting = useRef(null);
    const inFlight = useRef(null);
    const actionRef = useRef(makeAction);
    actionRef.current = makeAction;

    const send = useCallback((text) => {
        inFlight.current?.abort();
        inFlight.current = dispatch(actionRef.current(text));
    }, [dispatch]);

    const flush = useCallback(() => {
        if (timer.current === null) return;
        clearTimeout(timer.current);
        timer.current = null;
        send(waiting.current);
    }, [send]);

    const search = useCallback((text) => {
        clearTimeout(timer.current);
        waiting.current = text;
        timer.current = setTimeout(() => {
            timer.current = null;
            send(text);
        }, delay);
    }, [send, delay]);

    const flushRef = useRef(flush);
    flushRef.current = flush;
    useEffect(() => () => flushRef.current(), []);

    return { search, flush };
};

export default useLatestSearch;
