import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { useLocation, useSearchParams } from "react-router-dom";
import "../../../../components/follow-up/follow-up.css";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { getSourceTasksAPI } from "../../../../services/calendar";
import { hasInsuranceFollowUp } from "../../../../utils/permissions/followUpPermissionUtils";
import { CAL_FROM_INSURANCE, CAL_SOURCE_QUERY, CAL_TASK_SOURCE, FU_COPY_KEY } from "../../Calendar/newui/calendarConstants";
import { fmtDateLong, translation } from "../dashboard/insuranceDashboardConfig";
import { requestTypeText } from "./insuranceRecordConfig";

/* loaded on first open: the Calendar sheet and its task editor stay out of the record page's chunk */
const FollowUpSheet = lazy(() => import("../../../../components/follow-up/FollowUpSheet"));

/* The exact launch context of one request row (prototype parts/v211_followup.js rowContext): the request, and the period it
   targets when it has one. Saved on the task; the Calendar shows it as "Request: … · Period: …". */
export const requestFollowUpContext = (record, rq) => {
    const ctx = { request: { id: rq.id, type: rq.type, label: requestTypeText(rq.type) } };
    const periodId = rq.cancellationPeriod?.id ?? rq.targetPeriodId ?? null;
    const period = periodId ? (record.periods || []).find((p) => p.id === periodId) : null;
    if (period) ctx.period = { id: period.id, label: `${fmtDateLong(period.effective)} – ${fmtDateLong(period.expiry)}` };
    return ctx;
};

/*
 * I-16 — Follow Up on the Insurance record (conflicts sheet U-0115; prototype parts/v211_followup.js): one shared task record
 * and editor (the S10 Follow Up sheet) with the Insurance record as its source. Offered only with the Insurance Follow Up grant
 * and a server-confirmed task list (hrms re-checks Insurance record access on every call); otherwise absent. The record's
 * Actions menu opens the list; a request row opens the editor with that row's context; ?followup=<task id> (Calendar
 * "Open in Insurance") opens the sheet once on that task. A follow-up carries the source link only (no invoice, payment
 * or attachment panel).
 */
const useInsuranceFollowUp = (record) => {
    const permissionList = useSelector((state) => state.users.permissionList);
    const granted = hasInsuranceFollowUp(permissionList?.data);
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [allowed, setAllowed] = useState(false);
    const [count, setCount] = useState(0);
    const [sheet, setSheet] = useState(null);          /* { initialTaskId, createContext } while open */
    const arrivalKeyRef = useRef(null);
    const recordId = record?.id ?? null;

    useEffect(() => {
        if (!granted || !recordId) { setAllowed(false); return undefined; }
        let live = true;
        getSourceTasksAPI({ source_type: CAL_TASK_SOURCE.INSURANCE, source_id: recordId, include_closed: 0 })
            .then((res) => {
                if (!live) return;
                setAllowed(true);
                setCount(Number(res?.data?.data?.outstanding_count) || 0);
            })
            .catch(() => { if (live) setAllowed(false); });
        return () => { live = false; };
    }, [granted, recordId]);

    const followUpParam = searchParams.get(CAL_SOURCE_QUERY.FOLLOW_UP);
    useEffect(() => {
        if (!allowed || !followUpParam || arrivalKeyRef.current === location.key) return;
        arrivalKeyRef.current = location.key;
        setSheet({ initialTaskId: followUpParam, createContext: null });
    }, [allowed, followUpParam, location.key]);

    const source = useMemo(() => {
        const worker = record?.parties?.worker?.name || record?.header?.workerName || null;
        const plan = record?.summary?.plan || null;
        return {
            type: CAL_TASK_SOURCE.INSURANCE,
            id: recordId,
            ref: record?.ref || "",
            sub: [worker, plan].filter(Boolean).join(" · "),
            kindLabel: translation("key_insurance"),
            facts: { type: plan, worker_name: worker, employer_name: record?.parties?.employer?.name || null },
            from: CAL_FROM_INSURANCE,
        };
    }, [recordId, record?.ref, record?.parties, record?.header?.workerName, record?.summary?.plan]);

    const openList = useCallback(() => setSheet({ initialTaskId: null, createContext: null }), []);
    const openRow = useCallback((rq) => setSheet({ initialTaskId: null, createContext: requestFollowUpContext(record, rq) }), [record]);
    const close = useCallback(() => setSheet(null), []);
    const denied = useCallback(() => {
        setSheet(null);
        setAllowed(false);
        ShowToast("error", `${translation(FU_COPY_KEY.notAvailableTitle)} · ${translation(FU_COPY_KEY.notAvailable)}`);
    }, []);

    const sheetElement = allowed && sheet ? createPortal(
        <Suspense fallback={null}>
            <FollowUpSheet source={source} initialTaskId={sheet.initialTaskId} createContext={sheet.createContext} onClose={close} onCount={setCount} onDenied={denied} />
        </Suspense>,
        document.body,
    ) : null;

    return useMemo(() => ({ allowed, count, openList, openRow, sheetElement }), [allowed, count, openList, openRow, sheetElement]);
};

export default useInsuranceFollowUp;
