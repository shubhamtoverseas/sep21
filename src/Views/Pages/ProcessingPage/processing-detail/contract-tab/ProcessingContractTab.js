import React, { useCallback, useEffect, useRef, useState } from "react";
import { PropTypes } from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { downloadNonEditablePdf, fetchProcessingDetails, fetchProcessingLicence, fetchProcessingStatusList, updateProcessingFullDetails } from "../../../../../redux/Slices/processing/ProcessingSlice";
import contractConfig from "../../../../../components/ReusableComponents/processing-configs/ContractConfigs";
import { isAdminUser, showErrorMessage, showSuccessOrError } from "../../../../../services/commonService";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";
import CircularSpinner from "../../../../../components/ReusableComponents/CircularSpinner";
import pdfIcon from "../../../../../assets/img/svg/pdf-red.svg";
import docIcon from "../../../../../assets/img/svg/doc-icon.svg";
import { useProcessingPermissions } from "../../../../../utils/permissions/processingPermissionsUtils";
import useWithdrawnCompletingOptions from "../terminal-flow/useWithdrawnCompletingOptions";
import { CheckCell, EditFooter, EmptyCell, FieldRead, FolderButton, Listing, ListingRow, StageFooter, StagePanel, StagePanelHead, UpCell, UploadButton } from "../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../components/Processing/newui/StageSendTemplate";
import { useIsProcessingContract } from "../contractLifecycle";
import { CONTRACT_SERVICE_TYPES, CONTRACT_SERVICE_TYPE_LABEL_KEYS } from "../../processingConstants";
import { fetchContractDetailsById } from "../../../../../redux/Slices/contract/ContractSlice";

const PDF_KEYS = ["JOB_ORDER", "LOCAL_EMPLOYMENT_AGREEMENT", "EMPLOYER_DATA_FORM"];

/**
 * Contract stage panel (prototype contractPanel): head (status tag · last update · Edit · Contract folder · Upload),
 * the read fields (Contract Number · Licence · Direct Hire · Service Type) or the edit draft, the Contract Checklist and
 * Service Agreements listings (CS ticks autosave; Uploaded is the Documents declaration), footer Send Template · status menu.
 * Edit works on a draft — nothing is written until Save changes (REQ-2 / SR-03 version-aware).
 */
const ProcessingContractTab = ({ handleOnChangeStatus, entityProcessingStatuses, stageActionPermission }) => {
    const dispatch = useDispatch();
    const { contract_id } = useParams();
    const { processingLicences } = useSelector((state) => state.processing);
    const { contractDetails } = useSelector((state) => state.contracts);
    const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);
    const { documentPermissions } = useProcessingPermissions(permissionList, ownerOnboardingList, contract_id);
    const processing = useIsProcessingContract(contractDetails);
    const canEdit = processing && stageActionPermission.includes("edit");

    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const [processingDetails, setProcessingDetails] = useState({});
    const [contractNumber, setContractNumber] = useState("");
    const [checklistData, setChecklistData] = useState([]);
    const [serviceAgreementData, setServiceAgreementData] = useState([]);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ number: "", licence: "", version: null, directHire: "", serviceType: "" });
    const [draftError, setDraftError] = useState("");
    const [draftSaving, setDraftSaving] = useState(false);
    const isUserUpdate = useRef(false);

    const loadDetails = useCallback(() => (
        dispatch(fetchProcessingDetails({ contract_id, type: "contract" })).then((res) => {
            const { payload, error } = res;
            if (error || !payload?.data) { if (error) showErrorMessage(res); return; }
            const data = payload.data;
            setProcessingDetails(data);
            setContractNumber(data["407_contract_number"] || "");
            isUserUpdate.current = false;
            setChecklistData(contractConfig.mapContractCheckListTableData(data));
            setServiceAgreementData(contractConfig.mapContractServiceAgreementData(data).map((item) => ({ ...item, isPdfLoading: false })));
        })
    ), [dispatch, contract_id]);
    useEffect(() => { loadDetails(); }, [loadDetails]);

    /* the shared status save refreshes the record row (rail) and the status list, but the panel tag, the "Last updated" stamp
       and the menu's current option read this tab's own details — re-read them after the save, or the menu keeps the old
       status as current and the way back is inert until a reload (Mubin 30 Oct: Ready → Not Ready → Ready) */
    const onChangeStatus = useCallback((id, name, enable) => (
        Promise.resolve(handleOnChangeStatus?.(id, name, enable)).then((res) => { if (!res?.error) loadDetails(); return res; })
    ), [handleOnChangeStatus, loadDetails]);
    useEffect(() => { dispatch(fetchProcessingLicence()); }, [dispatch]);

    const updateContractDetails = useCallback((number, licenceId, agreements, checklist, version, extras) => {
        const additionalFields = {
            contract_id, type: "contract", "407_contract_number": number, licence_id: licenceId,
            /* REQ-2 / SR-03: Save changes sends the version the draft opened on; a concurrent save answers 409 and writes nothing */
            ...(version !== undefined && version !== null && version !== "" ? { version } : {}),
            /* workbook #56: Direct Hire / Service Type — only the changed value is written */
            ...(extras || {}),
        };
        return dispatch(updateProcessingFullDetails(contractConfig.updatePayloadOfContract(agreements, checklist, additionalFields))).then((res) => {
            showSuccessOrError(res);
            if (!res.error) {
                dispatch(fetchProcessingDetails({ contract_id, type: "contract" })).then((r) => { if (!r.error) setProcessingDetails(r?.payload?.data); });
                dispatch(fetchProcessingStatusList({ contract_id, type: "contract" }));
            }
            isUserUpdate.current = false;
            return res;
        });
    }, [dispatch, contract_id]);

    /* the CS ticks autosave (the ref is a flag, not a dependency) */
    useEffect(() => {
        if (isUserUpdate.current && checklistData.length > 0 && serviceAgreementData.length > 0) {
            updateContractDetails(contractNumber, processingDetails?.licence_id, serviceAgreementData, checklistData);
        }
    }, [serviceAgreementData, checklistData, contractNumber, processingDetails?.licence_id, updateContractDetails]);

    const handleCheckboxChange = useCallback((name, checked) => {
        isUserUpdate.current = true;
        setChecklistData((prev) => prev.map((item) => (item.contract_checklist === name ? { ...item, cs: checked } : item)));
    }, []);
    const handleServiceAgreementCheckChange = useCallback((name, checked) => {
        isUserUpdate.current = true;
        setServiceAgreementData((prev) => prev.map((item) => (item.service_agreement === name ? { ...item, cs: checked } : item)));
    }, []);
    const setRowLoading = useCallback((name, isLoading) => {
        setServiceAgreementData((prev) => prev.map((item) => (item.service_agreement === name ? { ...item, isPdfLoading: isLoading } : item)));
    }, []);
    const onDocumentClick = useCallback(async (row) => {
        setRowLoading(row.service_agreement, true);
        try {
            const result = await dispatch(downloadNonEditablePdf({ contract_id: Number(contract_id), pdf_file_name: row?.key, employer_id: contractDetails.employer_id, worker_id: contractDetails.worker_id }));
            if (downloadNonEditablePdf.rejected.match(result)) ShowToast("error", result.payload?.message || translation("key_failed_to_open_pdf"));
            if (downloadNonEditablePdf.fulfilled.match(result)) {
                const blobUrl = URL.createObjectURL(result.payload);
                const win = window.open(blobUrl, "_blank"); if (win) win.focus();
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            }
        } catch { ShowToast("error", translation("key_failed_to_open_pdf")); }
        finally { setRowLoading(row.service_agreement, false); }
    }, [dispatch, contract_id, contractDetails, setRowLoading]);

    const handleTemplateMessageClick = useCallback(() => {
        setTemplate({ slug: "processing_contract", statusKey: "" });
    }, []);

    /* the card's own metadata (workbook #56): Direct Hire and Service Type live on the contract record */
    const directHire = contractDetails?.is_direct_hire ?? contractDetails?.direct_hire;
    const directHireOriginal = directHire === undefined || directHire === null ? "" : (Number(directHire) ? "1" : "0");
    const serviceTypeOriginal = contractDetails?.contract_type || "";
    const serviceTypeLabel = (value) => (CONTRACT_SERVICE_TYPE_LABEL_KEYS[value]
        ? translation(CONTRACT_SERVICE_TYPE_LABEL_KEYS[value])
        : (value ? value.charAt(0).toUpperCase() + value.slice(1) : ""));

    const startEdit = useCallback(() => {
        setDraft({ number: contractNumber || "", licence: processingDetails?.licence_id || "", version: processingDetails?.version ?? null, directHire: directHireOriginal, serviceType: serviceTypeOriginal });
        setDraftError(""); setEditing(true);
    }, [contractNumber, processingDetails?.licence_id, processingDetails?.version, directHireOriginal, serviceTypeOriginal]);
    const cancelEdit = useCallback(() => { setEditing(false); setDraftError(""); }, []);
    const saveDraft = useCallback(() => {
        const number = String(draft.number || "").trim();
        if (!number) { setDraftError(translation("key_this_field_is_required")); return; }
        setDraftError(""); setDraftSaving(true); isUserUpdate.current = true;
        /* only a changed value is written (prototype ctApplyEdit); an empty draft (no recorded value kept) writes nothing */
        const extras = {};
        if (draft.directHire !== "" && draft.directHire !== directHireOriginal) extras.direct_hire = Number(draft.directHire);
        if (draft.serviceType !== "" && draft.serviceType !== serviceTypeOriginal) extras.service_type = draft.serviceType;
        updateContractDetails(number, draft.licence, serviceAgreementData, checklistData, processingDetails?.version ?? draft.version, extras).then((res) => {
            setDraftSaving(false);
            if (!res?.error) {
                setContractNumber(number); setEditing(false);
                /* the read row shows these from the contract record — re-read it when they changed */
                if (Object.keys(extras).length) dispatch(fetchContractDetailsById(contract_id));
            }
        });
    }, [draft, updateContractDetails, serviceAgreementData, checklistData, processingDetails?.version, directHireOriginal, serviceTypeOriginal, dispatch, contract_id]);

    const statusOptions = useWithdrawnCompletingOptions("contract", entityProcessingStatuses);
    const licenceName = processingLicences?.find((l) => String(l.id) === String(processingDetails?.licence_id))?.name;
    const draftLicenceName = processingLicences?.find((l) => String(l.id) === String(draft.licence))?.name || "";
    /* a stored value outside the pair (prototype licOpts pattern) stays offered as the record's own option */
    const serviceTypeOptions = (serviceTypeOriginal && !CONTRACT_SERVICE_TYPES.includes(serviceTypeOriginal) ? [serviceTypeOriginal] : []).concat(CONTRACT_SERVICE_TYPES);
    const canTick = canEdit && !editing;

    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ translation("key_contract") } stage="contract" status={ processingDetails?.processing_contract_document_status }
                label={ processingDetails?.processing_contract_document_status === "ready" ? "Ready" : "Not Ready" } tone={ processingDetails?.processing_contract_document_status === "ready" ? "green" : "muted" }
                updatedAt={ processingDetails?.processing_contract_document_status_updated_at } updatedBy={ processingDetails?.last_updated_by_info }>
                { canEdit && !editing && <button type="button" className="g1-btn" data-fid="ct-edit" onClick={ startEdit }>{ translation("key_edit") }</button> }
                <FolderButton folder="contract" label={ translation("key_contract") } />
                { documentPermissions.includes("upload") && processing && <UploadButton folder="contract" /> }
            </StagePanelHead>

            { editing ? (
                <div className="ct-meta" data-ct-meta-edit="">
                    <div className="g1-f t-compact">
                        <label htmlFor="ct-number">{ translation("key_contract_number") }</label>
                        <input id="ct-number" className={ `g1-in mono${ draftError ? " invalid" : "" }` } value={ draft.number } maxLength={ 20 } placeholder={ translation("key_enter_contract_number") } disabled={ draftSaving }
                            onChange={ (e) => { setDraft((d) => ({ ...d, number: e.target.value })); if (draftError) setDraftError(""); } } />
                        { draftError && <div className="err">{ draftError }</div> }
                    </div>
                    <div className="g1-f t-wide">
                        <label htmlFor="ct-licence">{ translation("key_licence") }</label>
                        <span className="ct-sizer" aria-hidden="true">{ draftLicenceName || "Licence not recorded" }</span>
                        <span className="ct-sizer-min" aria-hidden="true">{ draftLicenceName || "Licence not recorded" }</span>
                        <select id="ct-licence" className="g1-in" value={ draft.licence } disabled={ draftSaving } onChange={ (e) => setDraft((d) => ({ ...d, licence: e.target.value })) }>
                            <option value="">{ translation("key_please_select") }</option>
                            { processingLicences?.map((l) => <option key={ l.id } value={ l.id }>{ l.name }</option>) }
                        </select>
                    </div>
                    <div className="g1-f t-boolean">
                        <label htmlFor="ct-dh">{ translation("key_direct_hire") }</label>
                        <select id="ct-dh" className="g1-in" value={ draft.directHire } disabled={ draftSaving } onChange={ (e) => setDraft((d) => ({ ...d, directHire: e.target.value })) }>
                            { directHireOriginal === "" && <option value="">—</option> }
                            <option value="1">{ translation("key_yes") }</option>
                            <option value="0">{ translation("key_no") }</option>
                        </select>
                    </div>
                    <div className="g1-f t-standard">
                        <label htmlFor="ct-st">{ translation("key_service_type") }</label>
                        <select id="ct-st" className="g1-in" value={ draft.serviceType } disabled={ draftSaving } onChange={ (e) => setDraft((d) => ({ ...d, serviceType: e.target.value })) }>
                            { serviceTypeOriginal === "" && <option value="">—</option> }
                            { serviceTypeOptions.map((value) => <option key={ value } value={ value }>{ serviceTypeLabel(value) }</option>) }
                        </select>
                    </div>
                </div>
            ) : (
                <div className="ct-meta">
                    <FieldRead className="t-compact" label={ translation("key_contract_number") } value={ contractNumber } mono />
                    <div className="g1-f t-wide">
                        <div className="lb">{ translation("key_licence") }</div>
                        <span className="ct-sizer" aria-hidden="true">{ licenceName || "Licence not recorded" }</span>
                        <span className="ct-sizer-min" aria-hidden="true">{ licenceName || "Licence not recorded" }</span>
                        <div className={ `vl${ licenceName ? "" : " empty" }` } title={ licenceName || undefined } tabIndex={ licenceName ? 0 : undefined }>{ licenceName || "—" }</div>
                    </div>
                    <FieldRead className="t-boolean" label={ translation("key_direct_hire") } value={ directHireOriginal === "" ? "" : translation(directHireOriginal === "1" ? "key_yes" : "key_no") } />
                    <FieldRead className="t-standard" label={ translation("key_service_type") } value={ serviceTypeLabel(serviceTypeOriginal) } />
                </div>
            ) }

            <div className={ `g1-lists${ editing ? " g1-dim" : "" }` }>
                <Listing title={ translation("key_contract_checklist") } done={ checklistData.filter((c) => c.cs).length } total={ checklistData.length }
                    columns={ [{ key: "sp", wide: true }, { key: "cs", label: translation("key_cs"), narrow: true }] }>
                    { checklistData.map((row) => (
                        <ListingRow key={ row.contract_checklist } name={ row.contract_checklist }>
                            <EmptyCell wide />
                            <CheckCell narrow checked={ Boolean(row.cs) } disabled={ !canTick } label={ `${ row.contract_checklist } — ${ translation("key_cs") }` } onChange={ (v) => handleCheckboxChange(row.contract_checklist, v) } />
                        </ListingRow>
                    )) }
                </Listing>
                <Listing title={ translation("key_service_agreements") } done={ serviceAgreementData.filter((c) => c.cs).length } total={ serviceAgreementData.length }
                    columns={ [{ key: "up", label: translation("key_uploaded"), wide: true }, { key: "cs", label: translation("key_cs"), narrow: true }] }>
                    { serviceAgreementData.map((row) => (
                        <ListingRow key={ row.service_agreement } name={ row.service_agreement }
                            icon={ row.isPdfLoading ? <CircularSpinner paddingClass="p-0" /> : (PDF_KEYS.includes(row.key)
                                ? <button type="button" className="g1-ico-btn" aria-label={ `${ translation("key_download") } ${ row.service_agreement }` } onClick={ () => onDocumentClick(row) }><img src={ pdfIcon } alt="" /></button>
                                : <img src={ docIcon } alt="" />) }>
                            <UpCell wide value={ row.uploaded } />
                            <CheckCell narrow checked={ Boolean(row.cs) } disabled={ !canTick } label={ `${ row.service_agreement } — ${ translation("key_cs") }` } onChange={ (v) => handleServiceAgreementCheckChange(row.service_agreement, v) } />
                        </ListingRow>
                    )) }
                </Listing>
            </div>

            { editing && <EditFooter onCancel={ cancelEdit } onSave={ saveDraft } saving={ draftSaving } /> }

            <StageFooter stage="contract" onSendTemplate={ handleTemplateMessageClick } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusOptions } current={ processingDetails?.processing_contract_document_status } onChangeStatus={ onChangeStatus }
                canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) } />

            { template && (
                <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey }
                    onClose={ () => setTemplate(null) } />
            ) }
        </StagePanel>
    );
};

ProcessingContractTab.propTypes = {
    entityProcessingStatuses: PropTypes.array,
    handleOnChangeStatus: PropTypes.func,
    stageActionPermission: PropTypes.array,
};

export default React.memo(ProcessingContractTab);
