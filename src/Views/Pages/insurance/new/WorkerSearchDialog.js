import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field } from "../../../../components/ui/FormControls";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import listStyles from "../../Invoice/InvoiceList.module.css";
import { searchInsuranceWorkers } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { fmtDateLong, translation } from "../dashboard/insuranceDashboardConfig";
import styles from "../shared/InsuranceForms.module.css";
import CreateInsuranceWorkerDialog from "./CreateInsuranceWorkerDialog";

const SEARCH_DEBOUNCE_MS = 250;

/* Line 2 of a worker row: "{nationality · }DOB {date} · passport {x}[ · HKID {y}] · {phone}" */
export const workerLine = (w) => [
    w.nationality,
    translation("key_ins_dob_date", { date: fmtDateLong(w.dob) }),
    w.passport ? translation("key_ins_passport_x", { x: w.passport }) : null,
    w.hkid ? translation("key_ins_hkid_x", { x: w.hkid }) : null,
    w.phone,
].filter(Boolean).join(" · ");

/* D19 · Search worker (companions.pickWorker, R7): existing workers first; Create Insurance-only worker
   when none matches (Create Insurance-only Worker grant). */
const WorkerSearchDialog = ({ caps, onClose, onPick }) => {
    const dispatch = useDispatch();
    const [q, setQ] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        let alive = true;
        const timer = setTimeout(() => {
            setLoading(true);
            dispatch(searchInsuranceWorkers(q.trim())).then((res) => {
                if (!alive) return;
                setLoading(false);
                setRows(res.error ? [] : res.payload || []);
            });
        }, SEARCH_DEBOUNCE_MS);
        return () => { alive = false; clearTimeout(timer); };
    }, [dispatch, q]);

    const choose = useCallback((w) => { onPick(w); onClose(); }, [onPick, onClose]);

    const create = useCallback(() => {
        if (!caps?.createWorkerInsOnly) {
            ShowToast("error", translation("key_ins_creating_workers_unavailable"));
            return;
        }
        setCreating(true);
    }, [caps]);

    if (creating) {
        return (
            <CreateInsuranceWorkerDialog
                canResolveDuplicates={!!caps?.resolveWorkerDuplicates}
                onClose={onClose}
                onCreated={choose}
            />
        );
    }

    return (
        <Modal
            title={translation("key_ins_search_worker")}
            subtitle={translation("key_ins_search_worker_sub")}
            width={760}
            onClose={onClose}
            footer={(
                <>
                    <span className={styles.hint}>{translation("key_ins_not_found")}</span>
                    <Btn variant="secondary" onClick={create}>{translation("key_ins_create_insurance_only_worker_existing")}</Btn>
                    <span style={{ flex: 1 }} />
                    <Btn variant="secondary" onClick={onClose}>{translation("key_close")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                <Field label={translation("key_ins_search")} htmlFor="ins-worker-q">
                    <input
                        id="ins-worker-q" maxLength={100}
                        type="search"
                        className={styles.search}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={translation("key_ins_search_worker_placeholder")}
                    />
                </Field>
                <div className={styles.picklist} role="listbox" aria-label={translation("key_ins_search_worker")} aria-busy={loading}>
                    {rows.map((w) => (
                        <div
                            key={w.id}
                            role="option"
                            aria-selected={false}
                            tabIndex={0}
                            className={styles.prow}
                            onClick={() => choose(w)}
                            onKeyDown={(e) => { if (e.key === "Enter") choose(w); }}
                        >
                            <div className={styles.prowMain}>
                                <div className={styles.l1}>
                                    <b>{w.name}</b>
                                    {w.code && <span className={styles.code}>{w.code}</span>}
                                    {w.insuranceOnly && <span className={listStyles.statusTag} data-tone="neutral">{translation("key_ins_insurance_only")}</span>}
                                    {w.duplicates?.length > 0 && (
                                        <span
                                            className={listStyles.statusTag}
                                            data-tone="orange"
                                            title={w.duplicates.map((d) => `${d.code}: ${d.why.join(", ")}`).join("; ")}
                                        >
                                            {translation("key_ins_possible_duplicate_n", { n: w.duplicates.length })}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.l2}>{workerLine(w)}</div>
                            </div>
                            <div className={`${styles.why} ${styles.whyOk}`}>{translation("key_ins_select")}</div>
                        </div>
                    ))}
                    {loading && !rows.length && <CustomSpinner />}
                    {!loading && !rows.length && <div className={styles.empty}>{translation("key_ins_no_worker_matches")}</div>}
                </div>
            </div>
        </Modal>
    );
};

WorkerSearchDialog.propTypes = {
    caps: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onPick: PropTypes.func.isRequired,
};

export default WorkerSearchDialog;
