import React, { useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import Modal from "../../../../components/ui/Modal";
import { Field, RadioGroup, SelectBox } from "../../../../components/ui/FormControls";
import { saveWorkHistoryReview } from "../../../../services/workers";
import { formatDate } from "../../../../utils/utils";
import "../new-ui-review.css";
import "./ReviewWorkHistoryPanel.css";

/*
 * Contract Invoice · Contract setup · Review work history (27 Oct package, INV-C1b; OP-27-8; QA-27 ruling 2). The worker's
 * history rows, read-only, as the pricing engine reads them (the /price answer's work_history), and the review's outcome:
 * overseas work, no work history, or domestic only with the domestic contract named. Saving writes to the worker through
 * admin-api under the existing worker edit permission, with an audit event; the setup then prices again. This panel does
 * not judge the outcome: one that does not fit the history blocks the invoice with the package's own text.
 * @migration-unspecified(invoice): the package has no such panel; the ruling names its contents and gives no copy (OP-27-99).
 */

const OUTCOME_KEYS = {
    overseas: "key_inv_history_overseas_work",
    no_history: "key_inv_history_no_work_history",
    domestic_only: "key_inv_history_domestic_only",
};

const monthText = (ym) => (ym ? dayjs(`${ ym }-01`).format("MMM YYYY") : "—");

export const workHistoryOutcomeKey = (outcome) => OUTCOME_KEYS[outcome] || null;

const ReviewWorkHistoryPanel = ({ workerId, history, onSaved, onClose }) => {
    const { t } = useTranslation();
    const rows = history?.rows || [];
    const domesticRows = rows.filter((r) => r.domestic);
    const [outcome, setOutcome] = useState(history?.outcome || "");
    const [domesticId, setDomesticId] = useState(domesticRows.length === 1 ? String(domesticRows[0].id) : "");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const save = () => {
        if (!outcome) { setError(t("key_inv_history_choose_outcome")); return; }
        if (outcome === "domestic_only" && !domesticId) { setError(t("key_inv_history_name_domestic")); return; }
        setSaving(true);
        setError("");
        saveWorkHistoryReview({ worker_id: workerId, outcome, ...(outcome === "domestic_only" ? { domestic_contract_id: Number(domesticId) } : {}) })
            .then((res) => {
                setSaving(false);
                if (res?.data?.status === true) onSaved();
                else setError(res?.data?.message || t("key_something_went_wrong"));
            })
            .catch((e) => {
                setSaving(false);
                setError(e?.response?.data?.message || t("key_something_went_wrong"));
            });
    };

    return (
        <Modal title={ t("key_inv_review_work_history") } width={ 760 } onClose={ onClose } footer={
            <>
                { error && <span className="req panel-err" role="alert">{ error }</span> }
                <button type="button" className="btn btn-secondary md" onClick={ onClose } disabled={ saving }>{ t("key_cancel") }</button>
                <button type="button" className="btn btn-primary md" onClick={ save } disabled={ saving }>{ saving ? t("key_saving") : t("key_inv_save_review") }</button>
            </>
        }>
            { rows.length === 0
                ? <div className="callout info history-empty" role="note"><span className="ico"><i className="ri-information-line" /></span><span>{ t("key_inv_history_none_recorded") }</span></div>
                : (
                    <table className="items-table history-rows">
                        <thead>
                            <tr>
                                <th>{ t("key_inv_history_position") }</th>
                                <th>{ t("key_country") }</th>
                                <th>{ t("key_contract_status") }</th>
                                <th>{ t("key_inv_history_from") }</th>
                                <th>{ t("key_inv_history_to") }</th>
                                <th>{ t("key_inv_history_reviewed") }</th>
                            </tr>
                        </thead>
                        <tbody>
                            { rows.map((r) => (
                                <tr key={ r.id } data-history={ r.id }>
                                    <td className="primary">{ r.position === "we1" ? t("key_pl_we1") : t("key_inv_history_earlier") }</td>
                                    <td>{ r.country_name || "—" }{ r.domestic && <span className="sm"> · { t("key_inv_history_home_country") }</span> }</td>
                                    <td>{ r.status || "—" }</td>
                                    <td>{ monthText(r.start) }</td>
                                    <td>{ monthText(r.end) }</td>
                                    <td>{ r.reviewed ? t("key_yes") : t("key_no") }</td>
                                </tr>
                            )) }
                        </tbody>
                    </table>
                ) }
            { history?.reviewed_at && <div className="history-last">{ t("key_inv_history_last_reviewed") } { formatDate(history.reviewed_at) }</div> }
            <div className="history-outcome">
                <Field label={ t("key_inv_history_outcome") } required>
                    <RadioGroup name="history_outcome" ariaLabel={ t("key_inv_history_outcome") } value={ outcome }
                        options={ Object.keys(OUTCOME_KEYS).map((value) => ({ value, label: t(OUTCOME_KEYS[value]) })) }
                        onChange={ (v) => { setOutcome(v); setError(""); } } />
                </Field>
                { outcome === "domestic_only" && (
                    domesticRows.length === 0
                        ? <div className="callout danger" role="alert"><span className="ico"><i className="ri-error-warning-line" /></span><span>{ t("key_inv_history_no_domestic") }</span></div>
                        : (
                            <Field label={ t("key_inv_history_domestic_contract") } htmlFor="history_domestic_contract" required>
                                <SelectBox id="history_domestic_contract" name="history_domestic_contract" value={ domesticId } onChange={ (e) => { setDomesticId(e.target.value); setError(""); } }>
                                    <option value="">{ t("key_please_select") }</option>
                                    { domesticRows.map((r) => <option key={ r.id } value={ String(r.id) }>{ r.country_name } · { monthText(r.start) } – { monthText(r.end) }</option>) }
                                </SelectBox>
                            </Field>
                        )
                ) }
            </div>
        </Modal>
    );
};

ReviewWorkHistoryPanel.propTypes = {
    workerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    /* the /price answer's work_history: { rows, outcome, reviewed_at } */
    history: PropTypes.object,
    onSaved: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default ReviewWorkHistoryPanel;
