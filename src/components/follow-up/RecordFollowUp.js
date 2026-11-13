import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useLocation, useSearchParams } from "react-router-dom";
import "./follow-up.css";
import FollowUpSheet from "./FollowUpSheet";
import { ShowToast } from "../show-toast/ShowToast";
import { getSourceTasksAPI } from "../../services/calendar";
import translation from "../../utils/translation";
import { CAL_SOURCE_QUERY, FU_COPY_KEY } from "../../Views/Pages/Calendar/newui/calendarConstants";

/*
 * The record-hosted Follow Up launcher (WORKFLOWS FIN-F01e; CR "Calendar and Follow Up"; 1 Oct Worker #29 / Employer #7 /
 * Job Offer #2). The host renders its own control through `children({ count, open, launcherRef })` — a header button on a
 * Job Offer or an Invoice, a count-and-chevron card on the Worker / Employer context rail. The control exists only when
 * the actor holds the source's Follow Up grant AND the server answers the record's task list (record access is re-checked
 * there); otherwise nothing renders — no disabled fake. The count is the outstanding follow-ups the actor can see. An
 * arrival with ?followup=<task id> opens the sheet once on that task. The sheet facts carry the record reference alone.
 */
const RecordFollowUp = ({ source, granted = true, onLaunch = null, children }) => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [allowed, setAllowed] = useState(false);
    const [count, setCount] = useState(0);
    const [sheet, setSheet] = useState(null);          /* { initialTaskId } while open */
    const arrivalKeyRef = useRef(null);
    const launcherRef = useRef(null);
    const sourceId = source?.id ?? null;

    /* ?followup=<id>&from=calendar|notifications: open once per arrival; an arrival the server refuses gets the neutral notice */
    const followUpParam = searchParams.get(CAL_SOURCE_QUERY.FOLLOW_UP);
    const arrivalRef = useRef(followUpParam); arrivalRef.current = followUpParam;
    useEffect(() => {
        if (!granted || sourceId === null || sourceId === undefined || sourceId === '') { setAllowed(false); return undefined; }
        let live = true;
        getSourceTasksAPI({ source_type: source.type, source_id: sourceId, include_closed: 0 })
            .then((res) => {
                if (!live) return;
                setAllowed(true);
                setCount(Number(res?.data?.data?.outstanding_count) || 0);
            })
            .catch(() => {
                if (!live) return;
                setAllowed(false);
                if (arrivalRef.current) ShowToast('error', `${ translation(FU_COPY_KEY.notAvailableTitle) } · ${ translation(FU_COPY_KEY.notAvailable) }`);
            });
        return () => { live = false; };
    }, [granted, source.type, sourceId]);

    /* `onLaunch` (Job Offer Details): the HOST renders the panel itself — inside its own column, prototype v211 — so every
       launch is handed over instead of opening the drawer here; the host feeds the count back through `setCount` */
    const onLaunchRef = useRef(onLaunch); onLaunchRef.current = onLaunch;
    const launch = useCallback((payload) => {
        if (onLaunchRef.current) onLaunchRef.current(payload); else setSheet(payload);
    }, []);

    useEffect(() => {
        if (!allowed || !followUpParam || arrivalKeyRef.current === location.key) return;
        arrivalKeyRef.current = location.key;
        launch({ initialTaskId: followUpParam });
    }, [allowed, followUpParam, location.key, launch]);

    const open = useCallback(() => launch({ initialTaskId: null, createContext: null }), [launch]);
    /* a sub-record launch (an applicant row): the same sheet and count, the editor open at once with the exact context */
    const openWith = useCallback((createContext) => launch({ initialTaskId: null, createContext: createContext || null }), [launch]);
    const closeSheet = useCallback(() => {
        setSheet(null);
        const el = launcherRef.current;
        const target = el?.tagName === 'BUTTON' ? el : el?.querySelector?.('button');
        target?.focus?.();
    }, []);
    const denied = useCallback(() => {
        setSheet(null);
        setAllowed(false);
        ShowToast('error', `${ translation(FU_COPY_KEY.notAvailableTitle) } · ${ translation(FU_COPY_KEY.notAvailable) }`);
    }, []);

    if (!allowed) return null;
    return (
        <>
            { children({ count, open, openWith, launcherRef, setCount, deny: denied }) }
            { sheet && createPortal(
                <FollowUpSheet source={ source } initialTaskId={ sheet.initialTaskId } createContext={ sheet.createContext } onClose={ closeSheet } onCount={ setCount } onDenied={ denied } />,
                document.body,
            ) }
        </>
    );
};

RecordFollowUp.propTypes = {
    /* the record: { type: HRMS source_type, id, ref, sub, kindLabel, facts, from } — see FollowUpSheet */
    source: PropTypes.shape({
        type: PropTypes.string.isRequired,
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        ref: PropTypes.string,
        sub: PropTypes.string,
        kindLabel: PropTypes.string,
        facts: PropTypes.object,
        from: PropTypes.string,
    }).isRequired,
    /* the actor holds this source's Follow Up grant */
    granted: PropTypes.bool,
    /* the host renders the panel itself (embedded FollowUpSheet): every launch — open, openWith, ?followup= arrival —
       is handed to `onLaunch({ initialTaskId, createContext })` and no drawer opens here; must be referentially stable */
    onLaunch: PropTypes.func,
    /* ({ count, open, openWith, launcherRef, setCount, deny }) => the host's control; `openWith(context)` launches the
       editor for a sub-record; a self-rendering host feeds the sheet's onCount into `setCount` and onDenied into `deny` */
    children: PropTypes.func.isRequired,
};

export default RecordFollowUp;
