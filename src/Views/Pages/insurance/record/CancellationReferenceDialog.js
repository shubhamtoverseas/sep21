import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field, TextInput } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { addInsuranceCancellationRef } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { translation } from "../dashboard/insuranceDashboardConfig";
import { isBlank, mustReload, refusalOf, refusalText, requiredErrors } from "../shared/insuranceFormsConfig";
import useKeptDraft from "../shared/useKeptDraft";
import styles from "../shared/InsuranceForms.module.css";

/* D11 · QBE reference of a recorded cancellation (forms.openAddCancelRef, M11), from the period row */
const CancellationReferenceDialog = ({ record, period, onClose, onDone }) => {
    const dispatch = useDispatch();
    const periodVersion = useRef(period.version);
    const [carrierRef, setCarrierRef] = useState("");
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const kept = useKeptDraft(onClose, onDone);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first (same rules and copy as the server guard); nothing is sent while one is missing
        const missing = requiredErrors([
            ["carrierRef", isBlank(carrierRef), "key_ins_err_enter_qbe_reference"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        kept.reset();
        dispatch(addInsuranceCancellationRef({ ref: record.ref, periodId: period.id, periodVersion: periodVersion.current, carrierRef })).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", res.payload?.message || translation("key_ins_qbe_reference_recorded"));
                onDone();
                onClose();
                return;
            }
            const r = refusalOf(res);
            if (mustReload(res)) { ShowToast("error", r.message); onClose(); onDone(); return; }
            if (kept.keep(res)) return;
            setErrors(r.errors);
            ShowToast("error", refusalText(r, ["carrierRef"]));
        });
    }, [busy, carrierRef, dispatch, kept, onClose, onDone, period.id, record.ref]);

    return (
        <Modal
            busy={busy}
            title={translation("key_ins_cxl_reference_title")}
            width={480}
            onClose={kept.close}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={kept.close}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : translation("key_save")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {kept.note}
                <Field label={translation("key_ins_qbe_reference")} required htmlFor="ins-cxl-qbe-ref" error={errors.carrierRef}>
                    <TextInput id="ins-cxl-qbe-ref" maxLength={100} value={carrierRef} invalid={!!errors.carrierRef} onChange={(e) => { setCarrierRef(e.target.value); setErrors({}); }} />
                </Field>
            </div>
        </Modal>
    );
};

CancellationReferenceDialog.propTypes = {
    record: PropTypes.object.isRequired,
    period: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default CancellationReferenceDialog;
