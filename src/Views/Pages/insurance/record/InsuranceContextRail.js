import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useDialogFocus from "../../../../hooks/useDialogFocus";
import { fetchInsuranceRemarks } from "../../../../redux/Slices/remarks/RemarkSlice";
import { FU_COPY_KEY } from "../../Calendar/newui/calendarConstants";
import { translation } from "../dashboard/insuranceDashboardConfig";
import { insuranceRemarksKey, liveRemarks, remarksPreview } from "./insuranceRecordRemarks";
import styles from "./InsuranceRecord.module.css";

/* loaded on first open: the Remarks drawer's body and its dialogs stay out of the record page's first chunk */
const InsuranceRemarks = lazy(() => import("./InsuranceRemarks"));

const chevRight = (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#676e77" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
);
const closeIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
);

/*
 * Context rail of the Insurance record (Insurance.txt INS08 "General Remarks and record Follow Up open from Context";
 * UI Correction C4; Insurance.html details.js contextPanel) on the app's shared rail and drawer frame (the Worker / Employer
 * record rail: .wkd-rail-seg, .ctx-rail-btn, .ctx-drawer, useDialogFocus).
 *   Remarks — count and the latest of the live remarks (remarks.js contextButton); opens the Remarks drawer, whose body is
 *   InsuranceRemarks (remarks.js: composer, remarks with their versions, deleted ones as tombstones).
 *   Follow Up — count; opens the record's follow-ups (useInsuranceFollowUp: the Insurance Follow Up grant and a server-confirmed
 *   task list; absent otherwise). Request rows keep their own Follow Up with the request's context.
 */
const InsuranceContextRail = ({ record, canWriteRemarks, followUp, openRemarksOnArrival = false }) => {
    const dispatch = useDispatch();
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerRef = useRef(null);
    const remarksLauncherRef = useRef(null);
    const arrivalKeyRef = useRef(null);
    const close = useCallback(() => setDrawerOpen(false), []);
    useDialogFocus(drawerRef, close, drawerOpen);

    /* ?tab=remarks (an older shared Remarks link, P6B-2): the drawer opens once on arrival, as if its card had been pressed, so
       closing it returns focus to the Remarks card */
    useEffect(() => {
        if (!openRemarksOnArrival || arrivalKeyRef.current === location.key) return;
        arrivalKeyRef.current = location.key;
        remarksLauncherRef.current?.focus();
        setDrawerOpen(true);
    }, [openRemarksOnArrival, location.key]);

    /* the record's remarks: the entry the Remarks list itself reads (seeded by the record view, INS-2, so opening a record
       makes no second read); count and preview come from the same list the drawer shows */
    const queryClient = useQueryClient();
    const { isLoading } = useQuery({
        queryKey: insuranceRemarksKey(record.id),
        queryFn: () => dispatch(fetchInsuranceRemarks({ insurance_id: record.id })).unwrap(),
        enabled: Boolean(record.id),
        refetchOnWindowFocus: false,
    });
    const remarks = useSelector((state) => state.remarks.insuranceRemarks);
    const live = useMemo(() => liveRemarks(remarks), [remarks]);
    const refreshRemarks = useCallback(() => queryClient.invalidateQueries({ queryKey: insuranceRemarksKey(record.id) }), [queryClient, record.id]);

    return (
        <>
            <div className="wkd-rail-seg-wrap">
                <div className="wkd-rail-seg"><div className="seg on" role="heading" aria-level={2}>{translation("key_context")}</div></div>
            </div>
            <div className="wkd-rail-cards">
                <button ref={remarksLauncherRef} type="button" className="ctx-rail-btn" data-ins-context="remarks" aria-haspopup="dialog" onClick={() => setDrawerOpen(true)}>
                    <span className="ctx-grow">
                        <span className="ctx-row">
                            <span className="ctx-title">{translation("key_remarks")}</span>
                            <span className="ctx-count" data-remarks-count={live.length}>{live.length}</span>
                        </span>
                        <span className="ctx-preview" translate="no">{remarksPreview(remarks)}</span>
                    </span>
                    {chevRight}
                </button>
                {followUp.allowed && (
                    <button type="button" className="ctx-rail-btn" data-ins-context="follow-up" data-fu-launcher="insurance" onClick={followUp.openList}>
                        <span className="ctx-grow">
                            <span className="ctx-row">
                                <span className="ctx-title">{translation(FU_COPY_KEY.followUp)}</span>
                                <span className="ctx-count" data-fu-count={followUp.count}>{followUp.count}</span>
                            </span>
                        </span>
                        {chevRight}
                    </button>
                )}
            </div>

            {drawerOpen && (
                <>
                    <div className="ctx-backdrop" onClick={close} role="presentation" />
                    <div ref={drawerRef} className="ctx-drawer" role="dialog" aria-modal="true" aria-label={translation("key_remarks")} data-drawer="remarks">
                        <div className="ctx-drawer-head">
                            <div>
                                <h2>{translation("key_remarks")}</h2>
                                <div>{record.header.workerName} · <span className="mono-neutral">{record.ref}</span></div>
                            </div>
                            <button type="button" className="ctx-icon-btn" aria-label={translation("key_ins_close_remarks")} onClick={close}>{closeIcon}</button>
                        </div>
                        <div className={`ctx-drawer-body ${styles.remarksDrawerBody}`}>
                            <Suspense fallback={null}>
                                <InsuranceRemarks record={record} remarks={remarks} loading={isLoading} canWrite={!!canWriteRemarks} onChanged={refreshRemarks} />
                            </Suspense>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

InsuranceContextRail.propTypes = {
    record: PropTypes.object.isRequired,
    canWriteRemarks: PropTypes.bool,
    followUp: PropTypes.shape({ allowed: PropTypes.bool, count: PropTypes.number, openList: PropTypes.func }).isRequired,
    openRemarksOnArrival: PropTypes.bool,
};

export default React.memo(InsuranceContextRail);
