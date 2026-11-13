import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, FormGrid, SelectBox, TextInput } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { createInsuranceWorker } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { translation } from "../dashboard/insuranceDashboardConfig";
import { isBlank, refusalOf, requiredErrors } from "../shared/insuranceFormsConfig";
import styles from "../shared/InsuranceForms.module.css";

/* The phone keeps the existing worker phone countries */
const PHONE_COUNTRIES = ["HK", "MO", "PH", "ID", "TH", "BD"];

const DUP_WHY_KEYS = {
    name: "key_ins_dup_name",
    "surname + date of birth": "key_ins_dup_surname_dob",
    HKID: "key_ins_dup_hkid",
    phone: "key_ins_dup_phone",
    passport: "key_ins_dup_passport",
};
export const duplicateText = (d) => `${d.worker.name} (${d.worker.code}) — ${d.why.map((w) => (DUP_WHY_KEYS[w] ? translation(DUP_WHY_KEYS[w]) : w)).join(", ")}`;

/* D20 · Create Insurance-only worker (companions.createWorker, M16): exactly Name, Passport or HKID,
   Phone and Date of birth — no nationality. Possible duplicates need Resolve Worker Duplicates. */
const CreateInsuranceWorkerDialog = ({ canResolveDuplicates, onClose, onCreated }) => {
    const dispatch = useDispatch();
    const [form, setForm] = useState({ name: "", passport: "", hkid: "", phone: "", phoneCountry: "HK", dob: "" });
    const [errors, setErrors] = useState({});
    const [duplicates, setDuplicates] = useState([]);
    const [reviewed, setReviewed] = useState(false);
    const [busy, setBusy] = useState(false);

    const set = useCallback((key) => (value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    }, []);

    const submit = useCallback(() => {
        if (busy) return;
        // required fields first, then the phone length (same rules and copy as the M16 guard; OP-U20); nothing is sent
        const missing = requiredErrors([
            ["name", isBlank(form.name), "key_ins_err_enter_the_name"],
            ["passport", isBlank(form.passport) && isBlank(form.hkid), "key_ins_err_enter_passport_or_hkid"],
            ["phone", isBlank(form.phone), "key_ins_err_enter_the_phone"],
            ["phone", !/^[0-9]{7,13}$/.test(form.phone || ""), "key_invalid_mobile_number"],
            ["dob", !form.dob, "key_ins_err_enter_the_date_of_birth"],
        ]);
        if (Object.keys(missing).length) { setErrors(missing); return; }
        setBusy(true);
        const payload = { ...form, overrideDuplicates: reviewed };
        dispatch(createInsuranceWorker(payload)).then((res) => {
            setBusy(false);
            if (!res.error) {
                ShowToast("success", translation("key_ins_worker_created", { code: res.payload?.data?.worker?.code }));
                onCreated(res.payload?.data?.worker);
                return;
            }
            const r = refusalOf(res);
            if (r.code === "DUPLICATE") {
                setDuplicates(r.duplicates);
                ShowToast("error", translation("key_ins_possible_duplicate_found"));
                return;
            }
            if (r.duplicates.length) setDuplicates(r.duplicates);
            setErrors(r.errors);
            ShowToast("error", r.message);
        });
    }, [busy, dispatch, form, onCreated, reviewed]);

    const countries = useMemo(() => PHONE_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>), []);

    return (
        <Modal
            busy={busy}
            title={translation("key_ins_create_insurance_only_worker")}
            subtitle={translation("key_ins_create_worker_sub")}
            onClose={onClose}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={onClose}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? translation("key_saving") : translation("key_ins_create_via_existing_flow")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                <Field label={translation("key_ins_name")} required htmlFor="ins-w-name" error={errors.name}>
                    <TextInput id="ins-w-name" maxLength={255} value={form.name} invalid={!!errors.name} onChange={(e) => set("name")(e.target.value)} />
                </Field>
                <FormGrid columns={2}>
                    <Field label={translation("key_ins_passport")} htmlFor="ins-w-passport" hint={translation("key_ins_passport_hint")} error={errors.passport}>
                        <TextInput id="ins-w-passport" maxLength={50} value={form.passport} invalid={!!errors.passport} onChange={(e) => set("passport")(e.target.value)} />
                    </Field>
                    <Field label={translation("key_ins_hkid")} htmlFor="ins-w-hkid">
                        <TextInput id="ins-w-hkid" maxLength={20} value={form.hkid} onChange={(e) => set("hkid")(e.target.value.toUpperCase())} />
                    </Field>
                </FormGrid>
                <FormGrid columns={2}>
                    <Field label={translation("key_ins_phone")} required htmlFor="ins-w-phone" error={errors.phone}>
                        <div className={styles.pickerHead}>
                            <SelectBox value={form.phoneCountry} onChange={(e) => set("phoneCountry")(e.target.value)} aria-label={translation("key_ins_phone")}>{countries}</SelectBox>
                            <TextInput id="ins-w-phone" type="tel" maxLength={13} value={form.phone} invalid={!!errors.phone} onChange={(e) => set("phone")(e.target.value.replace(/\D/g, ""))} />
                        </div>
                    </Field>
                    <Field label={translation("key_ins_date_of_birth")} required htmlFor="ins-w-dob" error={errors.dob}>
                        <DateInput id="ins-w-dob" value={form.dob} invalid={!!errors.dob} onChange={set("dob")} />
                    </Field>
                </FormGrid>
                {duplicates.length > 0 && (
                    <div className={styles.notice} data-tone="warn">
                        <b>{translation("key_ins_potential_duplicates")}</b> {duplicates.map(duplicateText).join("; ")}
                        <div style={{ marginTop: 6 }}>
                            {canResolveDuplicates
                                ? (
                                    <label className={styles.check}>
                                        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
                                        <span>{translation("key_ins_reviewed_create_anyway")}</span>
                                    </label>
                                )
                                : translation("key_ins_select_existing_or_ask")}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

CreateInsuranceWorkerDialog.propTypes = {
    canResolveDuplicates: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onCreated: PropTypes.func.isRequired,
};

export default CreateInsuranceWorkerDialog;
