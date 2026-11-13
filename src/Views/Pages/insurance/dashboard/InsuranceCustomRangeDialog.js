import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field, SelectBox } from "../../../../components/ui/FormControls";
import styles from "./InsuranceDashboard.module.css";
import { CUSTOM_DURATIONS, translation, validateCustomRange } from "./insuranceDashboardConfig";

/* D18 Custom range: Duration · From · To within a granted duration (ENUMS §F3) */
const InsuranceCustomRangeDialog = ({ initial, grantedDurations, onApply, onClose }) => {
    const [range, setRange] = useState({ duration: initial?.duration || "", from: initial?.from || "", to: initial?.to || "" });
    const [errors, setErrors] = useState({});

    /* an error clears as soon as its field is corrected */
    const update = useCallback((key, value) => {
        setRange((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    const apply = useCallback(() => {
        const v = validateCustomRange(range, grantedDurations);
        if (!v.ok) { setErrors(v.errors); return; }
        onApply({ duration: range.duration, from: range.from, to: range.to });
    }, [range, grantedDurations, onApply]);

    const footer = (
        <>
            <Btn variant="secondary" onClick={onClose}>{translation("key_cancel")}</Btn>
            <Btn variant="primary" onClick={apply}>{translation("key_apply")}</Btn>
        </>
    );

    return (
        <Modal
            title={translation("key_ins_custom_range")}
            subtitle={translation("key_ins_custom_range_sub")}
            width={460}
            onClose={onClose}
            footer={footer}
            closeLabel={translation("key_close")}
        >
            <Field
                label={translation("key_ins_duration")}
                htmlFor="ins-range-duration"
                required
                error={errors.duration}
                hint={translation("key_ins_duration_hint")}
            >
                <SelectBox
                    id="ins-range-duration"
                    value={range.duration}
                    invalid={Boolean(errors.duration)}
                    aria-required="true"
                    onChange={(event) => update("duration", event.target.value)}
                >
                    <option value="">{translation("key_ins_select_duration")}</option>
                    {CUSTOM_DURATIONS.filter((d) => grantedDurations.includes(d.key)).map((d) => (
                        <option key={d.key} value={d.key}>{translation(d.labelKey)}</option>
                    ))}
                </SelectBox>
            </Field>
            <div className={styles.rangeGrid}>
                <Field label={translation("key_ins_from")} htmlFor="ins-range-from" required error={errors.from}>
                    <DateInput id="ins-range-from" value={range.from} invalid={Boolean(errors.from)} onChange={(v) => update("from", v)} />
                </Field>
                <Field label={translation("key_ins_to")} htmlFor="ins-range-to" required error={errors.to}>
                    <DateInput id="ins-range-to" value={range.to} invalid={Boolean(errors.to)} onChange={(v) => update("to", v)} />
                </Field>
            </div>
        </Modal>
    );
};

InsuranceCustomRangeDialog.propTypes = {
    initial: PropTypes.shape({ duration: PropTypes.string, from: PropTypes.string, to: PropTypes.string }),
    grantedDurations: PropTypes.arrayOf(PropTypes.string).isRequired,
    onApply: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default InsuranceCustomRangeDialog;
