import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Field, RadioGroup, SelectBox } from "../../../../components/ui/FormControls";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { interpolate } from "../../../../i18n/interpolate";
import { formatDate } from "../../../../utils/utils";
import { EXCHANGE, NO, STANDALONE, YES, asksDriver, asksType, hk, isLocalWorker, isProfileTransfer } from "./contractSetup";
import ReviewWorkHistoryPanel, { workHistoryOutcomeKey } from "./ReviewWorkHistoryPanel";
import "../new-ui-shared.css";
import "../new-ui-create.css";

/*
 * Contract Invoice · Contract setup · the Service card (27 Oct package, INV-C2; the reference page's "Service" section).
 * The application's choices, shown only where the route has them: Local Transfer (Local workers), Direct Hire (Overseas
 * workers), Type (Internal) for ordinary Local and Overseas, Process as driver on every Local route (no default, never
 * from the profile, R-B2). A route the worker profile names is a read-only fact: Local Transfer = Yes, or "Renewal of"
 * the predecessor Contract with its status and end date (OP-27-40, OP-27-41); the Local category is then chosen here.
 * The page sends the worker and the choices to the pricing engine on every change (useContractPricing); the card shows
 * the pricing code it used and what it found: enough to price, or what stops this invoice, word for word. An ordinary
 * Overseas invoice also shows the work history review and opens Review work history (INV-C1b); saving it prices again.
 * Standalone Invoice (mode STANDALONE, INV-G2): no route choices, no Process as driver, no New / Replacement and no pricing
 * code line; the card keeps the engine's note and the rule "A Standalone Invoice bills one party and creates no contract."
 * Exchange (mode EXCHANGE, INV-X2): the replacement worker's route choices as here, without New / Replacement (the exchange
 * is the Replacement, OP-27-106) and without Renewal (not an exchange, OP-27-112); Process as driver has no default and is
 * never A1's (R-B2).
 */

const Fact = ({ label, children }) => (
    <Field label={ label }><div className="svc-fact">{ children }</div></Field>
);
Fact.propTypes = { label: PropTypes.node, children: PropTypes.node };

/** The engine's answer as the setup notes: reading, not read (with Retry), enough to price, or what stops this invoice. */
const PricingNotes = ({ pricing }) => {
    const { t } = useTranslation();
    const result = pricing?.status === "ready" ? pricing.result : null;
    const lines = result?.lines?.length || 0;
    return <>
        { pricing?.status === "loading" && <div className="svc-pricing"><CustomSpinner /></div> }
        { pricing?.status === "error" && (
            <div className="callout danger" role="alert">
                <span className="ico"><i className="ri-error-warning-line" /></span>
                <span>{ pricing.error || t("key_inv_pricing_not_read") }</span>
                <button type="button" className="btn btn-secondary sm svc-retry" onClick={ pricing.retry }>{ t("key_retry") }</button>
            </div>
        ) }
        { result && result.ok && (
            <div className="callout ok" role="status">
                <span className="ico"><i className="ri-check-line" /></span>
                <span><b>{ t("key_inv_enough_to_price") }</b>
                    { lines > 0 && <>{ " " }{ lines === 1 ? interpolate(t("key_inv_populates_one_line"), hk(result.total.net)) : interpolate(t("key_inv_populates_lines"), lines, hk(result.total.net)) }</> }
                </span>
            </div>
        ) }
        { result && !result.ok && (
            <div className="callout danger" role="alert">
                <span className="ico"><i className="ri-error-warning-line" /></span>
                <span>
                    <b>{ t("key_inv_cannot_create_yet") }</b>
                    { result.problems.map((p, i) => <span key={ i } className="svc-problem">{ p.text }</span>) }
                </span>
            </div>
        ) }
    </>;
};
PricingNotes.propTypes = { pricing: PropTypes.shape({ status: PropTypes.string, result: PropTypes.object, error: PropTypes.string, retry: PropTypes.func }) };

const ContractSetupService = ({ mode, worker, categoryName, route, categoryAsked, choices, pricing, onChoose }) => {
    const { t } = useTranslation();
    const [reviewing, setReviewing] = useState(false);
    if (mode === STANDALONE) {
        return (
            <div className="party-card setup-service" data-standalone>
                <div className="pc-head"><span className="role">{ t("key_invoice_type_title_standalone") }</span></div>
                <div className="pc-body">
                    <PricingNotes pricing={ pricing } />
                    <div className="callout info svc-rule" role="note">
                        <span className="ico"><i className="ri-information-line" /></span>
                        <span>{ t("key_inv_rule_standalone") }</span>
                    </div>
                </div>
            </div>
        );
    }
    /* an Exchange shows the engine's note before the replacement is picked: A1's own refusals (#70, #71) come first */
    if (!worker) {
        return mode === EXCHANGE ? (
            <div className="party-card setup-service">
                <div className="pc-head"><span className="role">{ t("key_inv_service") }</span></div>
                <div className="pc-body"><PricingNotes pricing={ pricing } /></div>
            </div>
        ) : null;
    }

    const yesNo = [{ value: YES, label: t("key_yes") }, { value: NO, label: t("key_no") }];
    const radios = (name, label, value, options) => (
        <Field label={ label }>
            <RadioGroup name={ name } ariaLabel={ label } value={ value || "" } options={ options } onChange={ (v) => onChoose({ [name]: v }) } />
        </Field>
    );
    /* the notes are the current answer's; the options, predecessor and pricing code stay from the last answer for this
       worker while the next one is read */
    const last = pricing?.result && String(pricing.result.worker?.id) === String(worker.id) ? pricing.result : null;
    const predecessor = last?.predecessor;
    const categoryOptions = last?.category?.options || [];

    return (
        <div className="party-card setup-service">
            <div className="pc-head"><span className="role">{ t("key_inv_service") }</span></div>
            <div className="pc-body">
                <div className="svc-row">
                    { route === "renewal" && (
                        <Fact label={ t("key_inv_renewal_of") }>
                            { predecessor ? <>
                                <span className="code">{ predecessor.ref }</span>
                                <span className="badge success">{ t("key_active") }</span>
                                { predecessor.end && <span className="sm">{ interpolate(t("key_inv_ends"), formatDate(predecessor.end)) }</span> }
                            </> : "—" }
                        </Fact>
                    ) }
                    { isProfileTransfer(worker, categoryName) && <Fact label={ t("key_local_transfer") }>{ t("key_yes") }</Fact> }
                    { isLocalWorker(worker) && route !== "renewal" && !isProfileTransfer(worker, categoryName) && radios("local_transfer", t("key_local_transfer"), choices?.local_transfer, yesNo) }
                    { !isLocalWorker(worker) && radios("direct_hire", t("key_direct_hire"), choices?.direct_hire, yesNo) }
                    { categoryAsked && (
                        <Field label={ t("key_inv_contract_category") } htmlFor="contract_category" required>
                            <SelectBox id="contract_category" name="contract_category" value={ choices?.contract_category || "" }
                                disabled={ !categoryOptions.length } onChange={ (e) => onChoose({ contract_category: e.target.value }) }>
                                <option value="">{ t("key_please_select") }</option>
                                { categoryOptions.map((c) => <option key={ c.id } value={ String(c.id) }>{ c.name }</option>) }
                            </SelectBox>
                        </Field>
                    ) }
                    { mode !== EXCHANGE && asksType(route) && radios("contract_type_internal", t("key_type_internal"), choices?.contract_type_internal,
                        [{ value: "new", label: t("key_new") }, { value: "replacement", label: t("key_replacement") }]) }
                    { asksDriver(route) && radios("process_as_driver", t("key_process_as_driver"), choices?.process_as_driver, yesNo) }
                </div>
                { last?.pricingCode && (
                    <div className="party-detail svc-facts">
                        <div className="kv">
                            <div className="k">{ t("key_pricing_code") }</div>
                            <div className="v"><span className="mono">{ last.pricingCode }</span> <small>{ t("key_pricing_code_hint") }</small></div>
                        </div>
                    </div>
                ) }
                { route === "overseas" && last?.work_history && (
                    <div className="party-detail svc-facts svc-history" data-work-history>
                        <div className="kv">
                            <div className="k">{ t("key_inv_work_history") }</div>
                            <div className="v">{ last.work_history.outcome ? t(workHistoryOutcomeKey(last.work_history.outcome)) : t("key_inv_history_not_reviewed") }</div>
                        </div>
                        <button type="button" className="btn btn-secondary sm" onClick={ () => setReviewing(true) }>{ t("key_inv_review_work_history") }</button>
                    </div>
                ) }
                <PricingNotes pricing={ pricing } />
                { reviewing && last?.work_history && (
                    <ReviewWorkHistoryPanel workerId={ worker.id } history={ last.work_history } onClose={ () => setReviewing(false) }
                        onSaved={ () => { setReviewing(false); pricing.retry(); } } />
                ) }
                { asksDriver(route) && (
                    <div className="callout info svc-rule" role="note">
                        <span className="ico"><i className="ri-information-line" /></span>
                        <span><b>{ t("key_inv_rule_driver_title") }</b> { t("key_inv_rule_driver") }</span>
                    </div>
                ) }
            </div>
        </div>
    );
};

ContractSetupService.propTypes = {
    mode: PropTypes.oneOf([STANDALONE, EXCHANGE]),
    worker: PropTypes.object,
    categoryName: PropTypes.string,
    route: PropTypes.string,
    categoryAsked: PropTypes.bool,
    choices: PropTypes.object,
    pricing: PropTypes.shape({
        status: PropTypes.string,
        result: PropTypes.object,
        error: PropTypes.string,
        retry: PropTypes.func,
    }),
    onChoose: PropTypes.func.isRequired,
};

export default React.memo(ContractSetupService);
