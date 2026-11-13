import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field } from "../../../../components/ui/FormControls";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { getPermissionValue, isAdminUser } from "../../../../services/permissionService";
import { searchInsuranceEmployers } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { translation } from "../dashboard/insuranceDashboardConfig";
import styles from "../shared/InsuranceForms.module.css";

const NewEmployerModal = lazy(() => import("../../Employer/newui/NewEmployerModal"));

const SEARCH_DEBOUNCE_MS = 250;

/* D21 · Search employer (companions.pickEmployer, R7). "Create employer (existing flow)" opens the
   Employer module's own create flow when the actor holds Create Employer (employer_add). */
const EmployerSearchDialog = ({ onClose, onPick }) => {
    const dispatch = useDispatch();
    const permissionList = useSelector((state) => state.users.permissionList);
    const canCreate = useMemo(
        () => isAdminUser() || getPermissionValue(permissionList?.data, "employer", "employer_add") === "y",
        [permissionList],
    );
    const [q, setQ] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        let alive = true;
        const timer = setTimeout(() => {
            setLoading(true);
            dispatch(searchInsuranceEmployers(q.trim())).then((res) => {
                if (!alive) return;
                setLoading(false);
                setRows(res.error ? [] : res.payload || []);
            });
        }, SEARCH_DEBOUNCE_MS);
        return () => { alive = false; clearTimeout(timer); };
    }, [dispatch, q]);

    const choose = useCallback((e) => { onPick(e); onClose(); }, [onPick, onClose]);

    /* A created or opened employer is looked up through the same search, so the wizard shows the same facts */
    const chooseById = useCallback((employer) => {
        const id = Number(employer?.employer_id ?? employer?.id);
        setCreating(false);
        if (!id) return;
        const name = [employer?.name, employer?.surname].filter(Boolean).join(" ") || employer?.employer_name || "";
        dispatch(searchInsuranceEmployers(name)).then((res) => {
            const hit = (res.payload || []).find((row) => row.id === id);
            if (hit) choose(hit);
            else setQ(name);
        });
    }, [choose, dispatch]);

    const create = useCallback(() => {
        if (!canCreate) {
            ShowToast("error", translation("key_ins_creating_employers_unavailable"));
            return;
        }
        setCreating(true);
    }, [canCreate]);

    if (creating) {
        return (
            <Suspense fallback={null}>
                <NewEmployerModal
                    onClose={() => setCreating(false)}
                    onAdded={chooseById}
                    onUpdated={chooseById}
                    onOpenEmployer={chooseById}
                    onSendRegLink={() => setCreating(false)}
                />
            </Suspense>
        );
    }

    return (
        <Modal
            title={translation("key_ins_search_employer")}
            subtitle={translation("key_ins_search_employer_sub")}
            width={760}
            onClose={onClose}
            footer={(
                <>
                    <Btn variant="secondary" onClick={create}>{translation("key_ins_create_employer_existing")}</Btn>
                    <span style={{ flex: 1 }} />
                    <Btn variant="secondary" onClick={onClose}>{translation("key_close")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                <Field label={translation("key_ins_search")} htmlFor="ins-employer-q">
                    <input
                        id="ins-employer-q" maxLength={100}
                        type="search"
                        className={styles.search}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={translation("key_ins_search_employer_placeholder")}
                    />
                </Field>
                <div className={styles.picklist} role="listbox" aria-label={translation("key_ins_search_employer")} aria-busy={loading}>
                    {rows.map((e) => (
                        <div
                            key={e.id}
                            role="option"
                            aria-selected={false}
                            tabIndex={0}
                            className={styles.prow}
                            onClick={() => choose(e)}
                            onKeyDown={(ev) => { if (ev.key === "Enter") choose(e); }}
                        >
                            <div className={styles.prowMain}>
                                <div className={styles.l1}>
                                    <b>{e.name}</b>
                                    {e.zh && <span className={styles.muted}>{e.zh}</span>}
                                    {e.code && <span className={styles.code}>{e.code}</span>}
                                </div>
                                <div className={styles.l2}>{[e.phone, e.address].filter(Boolean).join(" · ")}</div>
                            </div>
                            <div className={`${styles.why} ${styles.whyOk}`}>{translation("key_ins_select")}</div>
                        </div>
                    ))}
                    {loading && !rows.length && <CustomSpinner />}
                    {!loading && !rows.length && <div className={styles.empty}>{translation("key_ins_no_employer_matches")}</div>}
                </div>
            </div>
        </Modal>
    );
};

EmployerSearchDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    onPick: PropTypes.func.isRequired,
};

export default EmployerSearchDialog;
