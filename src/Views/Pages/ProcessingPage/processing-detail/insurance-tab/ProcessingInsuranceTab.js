import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { Link, useNavigate, useParams } from "react-router-dom";
import { isAdminUser, showSuccessOrError } from "../../../../../services/commonService";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { fetchInsuranceDocumentStatusList, insuranceDocumentStatusChange, insuranceDocumentView } from "../../../../../redux/Slices/processing/ProcessingSlice";
import { fetchContractDetailsById } from "../../../../../redux/Slices/contract/ContractSlice";
import { fetchInsuranceMeta } from "../../../../../redux/Slices/insurance/InsuranceSlice";
import routes from "../../../routes/routesConfig";
import { COVERAGE_TONE, coverageLabel, fmtDateLong, translation } from "../../../insurance/dashboard/insuranceDashboardConfig";
import { contractEntryBlockingRef, invoiceStatusText, successorUrl } from "../../../insurance/shared/insuranceFormsConfig";
import { AttentionNote, RequestTag } from "../../../insurance/shared/InsuranceWorkTags";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import NewPolicyAfter from "./NewPolicyAfter";
import useWithdrawnCompletingOptions from "../terminal-flow/useWithdrawnCompletingOptions";
import { StageFooter, StagePanel, StagePanelHead } from "../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../components/Processing/newui/StageSendTemplate";
import { useIsProcessingContract } from "../contractLifecycle";

/* The Contract Insurance step (insurance TARGET_DB §8, INDEX §3.5): Not Ready → Request Submitted →
   Policy Confirmed / Not Required. Request Submitted is created by New Insurance (Contract entry) and
   Policy Confirmed by its Record QBE result; this step moves only Not Ready ↔ Not Required. */
const STAGES = {
    not_ready: { key: "key_ins_stage_not_ready", tone: "muted" },
    submit_policy_request: { key: "key_ins_stage_request_submitted", tone: "teal" },
    ready: { key: "key_ins_stage_policy_confirmed", tone: "green" },
    not_required: { key: "key_ins_stage_not_required", tone: "gray" },
};
const tr = (key, fallback) => { const v = translation(key); return !v || v === key ? fallback : v; };

/* Insurance now (prototype companions.js "Insurance now"; PROMPT 6 related screens, U-0328 / U-0078): the record's Coverage
   status tag — the same three labels and tones as the dashboard, not a combined Policy Status — then one tag per open
   request (oldest first, each in its request tone) and the Needs attention note. No Next Step. */
export const InsuranceNow = ({ insurance }) => {
    const cov = insurance.coverage?.label || "none";
    return (
        <div className="mcdt-insbadge" data-insurance-now="">
            <span className={ listStyles.statusTag } data-tone={ COVERAGE_TONE[cov] || "neutral" } data-coverage={ cov }>{ coverageLabel(cov) }</span>
            { (insurance.openRequests || []).map((type, i) => <RequestTag key={ `${ type }-${ i }` } type={ type } />) }
            <AttentionNote count={ insurance.attention || 0 } />
        </div>
    );
};
InsuranceNow.propTypes = { insurance: PropTypes.object.isRequired };

/* the step body — the prototype's read states (i-03 Request Submitted, i-04 Policy Confirmed, i-05 Not Required):
   Insurance now, a field grid, the pending note while the request is open. The policy request itself is New Insurance
   (Contract entry), opened by Change Status → Request Submitted. */
export const InsuranceStepBody = ({ stage, insurance, recordLink }) => {
    const f = (label, value, cls = "") => (
        <div key={ label }><div className="lb">{ label }</div><div className={ `vl${ value == null || value === "" || value === "—" ? " empty" : "" }${ cls ? ` ${ cls }` : "" }` }>{ value == null || value === "" ? "—" : value }</div></div>
    );
    const invoiceCell = insurance?.invoice
        ? <span><span className="mono">{ insurance.invoice.ref }</span><span className="sub">{ ` · ${ invoiceStatusText(insurance.invoice.status) }` }</span></span>
        : null;
    if (insurance && insurance.period) {
        return (
            <div className="mcdt-insbody">
                <InsuranceNow insurance={ insurance } />
                <div className="mcdt-insform" data-cols="policy">
                    { f(translation("key_insurance_type"), translation("key_new")) }
                    { f(tr("key_cd_ins_ref_no", "Insurance Ref No."), recordLink, "mono") }
                    { f(translation("key_policy"), insurance.plan) }
                    { f(translation("key_ins_col_qbe_policy_number"), insurance.period.carrierRef, "mono") }
                    { f(translation("key_effective_date"), fmtDateLong(insurance.period.effective)) }
                    { f(tr("key_cd_ins_expiry_date", "Expiry Date"), fmtDateLong(insurance.period.expiry)) }
                    { f(translation("key_invoice"), invoiceCell) }
                </div>
            </div>
        );
    }
    if (insurance) {
        return (
            <div className="mcdt-insbody">
                <InsuranceNow insurance={ insurance } />
                <div className="mcdt-insform" data-cols="request">
                    { f(translation("key_insurance_type"), translation("key_new")) }
                    { f(tr("key_cd_ins_ref_no", "Insurance Ref No."), recordLink, "mono") }
                    { f(translation("key_policy"), insurance.plan) }
                    { f(tr("key_cd_ins_requested_effective_date", "Requested Effective Date"), fmtDateLong(insurance.requestedEffective)) }
                    { f(translation("key_invoice"), invoiceCell) }
                    { f(translation("key_ins_col_submitted_by"), insurance.submittedBy) }
                </div>
                { stage === "submit_policy_request" && <div className="mcdt-insnote">{ tr("key_cd_ins_pending_note", "Policy number and expiry date will appear once the policy is confirmed.") }</div> }
            </div>
        );
    }
    return (
        <div className="mcdt-insbody">
            <div className="mcdt-insform" data-cols="empty">
                { f(translation("key_insurance_type"), null) }
                { f(translation("key_ins_col_qbe_policy_number"), null) }
                { f(tr("key_cd_ins_expiry_date", "Expiry Date"), null) }
            </div>
            { stage === "not_ready" && <div className="mcdt-insnote">{ tr("key_cd_ins_request_hint", "Change Status → Request Submitted opens New Insurance for this contract.") }</div> }
        </div>
    );
};
InsuranceStepBody.propTypes = { stage: PropTypes.string, insurance: PropTypes.object, recordLink: PropTypes.node };

/**
 * Insurance stage panel (prototype insurance step i-01…i-05) on the kit: head with the step tag, the step body, footer
 * Send Template · status menu. Logic unchanged: insuranceDocumentView / fetchInsuranceDocumentStatusList /
 * insuranceDocumentStatusChange; Request Submitted hands over to New Insurance (Contract entry) with the Contract's facts.
 */
const ProcessingInsuranceTab = ({ stageActionPermission, reloadGlobalActivityList }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { contract_id } = useParams();

    const contractDetails = useSelector((state) => state.contracts.contractDetails);
    const insuranceDocument = useSelector((state) => state.processing.insuranceDocument);
    const insuranceDocumentStatusList = useSelector((state) => state.processing.insuranceDocumentStatusList);
    const meta = useSelector((state) => state.insurance.meta);

    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const [isLoading, setIsLoading] = useState(true);
    const processing = useIsProcessingContract(contractDetails);

    useEffect(() => {
        setIsLoading(true);
        dispatch(insuranceDocumentView(contract_id)).finally(() => setIsLoading(false));
        dispatch(fetchInsuranceDocumentStatusList(contract_id));
    }, [dispatch, contract_id]);

    useEffect(() => { if (!meta) dispatch(fetchInsuranceMeta()); }, [dispatch, meta]);

    const stage = insuranceDocument?.status || "not_ready";
    const insurance = insuranceDocument?.insurance || null;
    const canSubmit = Boolean(meta?.access && meta?.caps?.contractEntryNew);

    /* Request Submitted opens New Insurance with the Contract's facts; it and Not Ready <-> Not Required
       (spec M17) follow the Contract-entry New grant. Only a record in use blocks it (M1; UI verification W17). */
    const blockingRef = contractEntryBlockingRef(insurance);
    const dropdownList = useMemo(() => (insuranceDocumentStatusList || []).map((item) => {
        const label = STAGES[item.id] ? translation(STAGES[item.id].key) : item.name;
        if (item.id !== "submit_policy_request") return { ...item, name: label, enable: item.enable && canSubmit };
        return { ...item, name: label, enable: item.enable && canSubmit && !blockingRef };
    }), [insuranceDocumentStatusList, canSubmit, blockingRef]);
    const statusOptions = useWithdrawnCompletingOptions("insurance", dropdownList);

    /* the Contract's facts for New Insurance, passed in the navigation state so the wizard need not look the Contract up */
    const contractFacts = useCallback(() => {
        const d = contractDetails || {};
        return {
            id: Number(contract_id),
            number: d.contract_number,
            employerId: Number(d.employer_id),
            employerName: d.employer_name,
            employerZh: d.employer_chinese_name || null,
            workerId: Number(d.worker_id),
            workerName: d.worker_name,
            workerCode: d.worker_reference_id || null,
            ownerName: d.cs_name,
            branchName: d.branch_name,
            branchCode: d.branch_code || "",
            evisaDate: d["processingVisaDocumentModel.e_visa_payment_date"] || null,
            stage,
            insuranceRef: blockingRef,
        };
    }, [contractDetails, contract_id, blockingRef, stage]);

    const openNewInsurance = useCallback(() => {
        if (!canSubmit) { ShowToast("error", translation("key_ins_not_available_to_you")); return; }
        const contract = contractFacts();
        navigate(`${ routes.insuranceNew }?contract=${ encodeURIComponent(contract.number) }&entry=contract`, { state: { contract } });
    }, [canSubmit, contractFacts, navigate]);

    /* New policy after {ref} (companions.js; UI verification W19): asked of the record only while it is in use on the Contract
       with no cover now or to come; the record decides whether it can be followed by a new policy */
    const successorRef = blockingRef && insurance?.coverage?.label === "none" ? blockingRef : null;
    const openSuccessor = useCallback(() => {
        const contract = contractFacts();
        navigate(successorUrl(successorRef, contract.number), { state: { contract } });
    }, [contractFacts, navigate, successorRef]);

    const handleChangeStatus = useCallback((statusVal) => {
        if (statusVal === "submit_policy_request") { openNewInsurance(); return; }
        dispatch(insuranceDocumentStatusChange({ contract_id, status: statusVal })).then((res) => {
            showSuccessOrError(res);
            if (!res.error) {
                dispatch(insuranceDocumentView(contract_id));
                dispatch(fetchInsuranceDocumentStatusList(contract_id));
                dispatch(fetchContractDetailsById(contract_id));
                reloadGlobalActivityList?.();
            }
        });
    }, [dispatch, contract_id, openNewInsurance, reloadGlobalActivityList]);

    const openSendTemplate = useCallback(() => { setTemplate({ slug: "processing_insurance", statusKey: "" }); }, []);

    const stageInfo = STAGES[stage] || STAGES.not_ready;
    const recordLink = insurance ? <Link className="mono" to={ routes.insuranceRecord.replace(":ref", insurance.ref) }>{ insurance.ref }</Link> : null;

    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ translation("key_insurance") } stage="insurance" status={ stage } label={ translation(stageInfo.key) } tone={ stageInfo.tone }
                updatedAt={ stage === "not_ready" ? undefined : (insuranceDocument?.last_status_updated_at || undefined) } updatedBy={ insuranceDocument?.last_updated_by_info } />
            { isLoading ? <div className="g1-note">{ translation("key_loading") }…</div> : (
                <>
                    <InsuranceStepBody stage={ stage } insurance={ insurance } recordLink={ recordLink } />
                    { successorRef && <NewPolicyAfter insuranceRef={ successorRef } onStart={ openSuccessor } /> }
                </>
            ) }
            <StageFooter stage="insurance" onSendTemplate={ openSendTemplate } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusOptions || [] } current={ stage } onChangeStatus={ handleChangeStatus } canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) } />

            { template && <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey } onClose={ () => setTemplate(null) } /> }
        </StagePanel>
    );
};

ProcessingInsuranceTab.propTypes = {
    stageActionPermission: PropTypes.array,
    reloadGlobalActivityList: PropTypes.func,
};

export default React.memo(ProcessingInsuranceTab);
