import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import Btn from "../../../../components/ui/Btn";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { fetchInsuranceRecordHistory } from "../../../../redux/Slices/insurance/InsuranceSlice";
import styles from "./InsuranceRecord.module.css";
import { fmtDateTime, translation } from "../dashboard/insuranceDashboardConfig";

const PAGE_SIZE = 25;

/* One Activity event: when · action · actor ("System" when none) · "audit" tag · summary · changes; a migrated (legacy)
   log row keeps the hatched edge (prototype .he.legacy) */
export const ActivityEvent = ({ event }) => (
    <div className={`${styles.event} ${event.legacy ? styles.legacy : ""}`} data-event={event.id}>
        <div className={styles.eventWhen}>{fmtDateTime(event.at)}</div>
        <div>
            <div className={styles.eventWhat}>
                {event.action}
                <span className={styles.eventWho}>{event.actor || translation("key_ins_system")}</span>
                {event.audit && <span className={styles.tag}>{translation("key_ins_audit")}</span>}
            </div>
            {event.summary && <div className={styles.itemLine}>{event.summary}</div>}
            {(event.changes || []).map((c) => (
                <div key={`${c.field}-${c.new}`} className={styles.change}>
                    <span className={styles.changeField}>{c.field}</span>
                    <span className={styles.changeOld}>{c.old == null || c.old === "" ? "—" : String(c.old)}</span>
                    <span>→</span>
                    <span>{String(c.new ?? "")}</span>
                </div>
            ))}
        </div>
    </div>
);
ActivityEvent.propTypes = { event: PropTypes.object.isRequired };

/* Activity tab (Insurance.txt INS08; details.js activityTab): the record's history (R3 GET /records/:ref/history), read-only,
   newest first. Ownership changes are part of it (no Ownership tab). */
const RecordActivityTab = ({ recordRef }) => {
    const dispatch = useDispatch();
    const [events, setEvents] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const seq = useRef(0);

    const load = useCallback((nextPage) => {
        const mine = ++seq.current;
        setLoading(true);
        setFailed(false);
        dispatch(fetchInsuranceRecordHistory({ ref: recordRef, page: nextPage, limit: PAGE_SIZE }))
            .unwrap()
            .then((data) => {
                if (mine !== seq.current) return;
                setEvents((prev) => (nextPage === 1 ? data.events : [...prev, ...data.events]));
                setTotal(data.total);
                setPage(nextPage);
            })
            .catch(() => { if (mine === seq.current) setFailed(true); })
            .finally(() => { if (mine === seq.current) setLoading(false); });
    }, [dispatch, recordRef]);

    useEffect(() => { load(1); }, [load]);

    return (
        <section className={styles.panel} data-panel="activity">
            <div className={styles.panelHead}><h3 className={styles.panelTitle}>{translation("key_activity")}</h3></div>
            <div className={`${styles.panelBodyTight} ${styles.list}`}>
                {events.map((e) => <ActivityEvent key={e.id} event={e} />)}
                {loading && !events.length && <CustomSpinner />}
                {/* a read failure is not an empty Activity (brief B5 / B6) */}
                {failed && (
                    <div className={styles.loadError} role="alert">
                        <span>{translation("key_couldnt_load_this_view")}</span>
                        <Btn variant="secondary" onClick={() => load(events.length ? page + 1 : 1)}>{translation("key_retry")}</Btn>
                    </div>
                )}
            </div>
            {!failed && events.length < total && (
                <div className={styles.loadMore}>
                    <Btn variant="secondary" disabled={loading} onClick={() => load(page + 1)}>{loading ? <CustomSpinner variant="inline" /> : translation("key_load_more")}</Btn>
                </div>
            )}
        </section>
    );
};

RecordActivityTab.propTypes = { recordRef: PropTypes.string.isRequired };

export default React.memo(RecordActivityTab);
