import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import translation from "../../../../../utils/translation";
import Icon from "../../../../../components/Icon/Icon";
import { downloadEditablePdf, downloadNonEditablePdf, fetchProcessingDetails, fetchProcessingStatusList, updateProcessingFullDetails } from "../../../../../redux/Slices/processing/ProcessingSlice";
import { isAdminUser, showErrorMessage, showSuccessOrError } from "../../../../../services/commonService";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { useProcessingPermissions } from "../../../../../utils/permissions/processingPermissionsUtils";
import useWithdrawnCompletingOptions from "../terminal-flow/useWithdrawnCompletingOptions";
import { FolderButton, Listing, PortalButton, StageFooter, StagePanel, StagePanelHead, UploadButton } from "../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../components/Processing/newui/StageSendTemplate";
import ImmigrationListing, { immColumns, immigrationProgress, ImmigrationRows } from "./ImmigrationListing";
import AdditionalRequirements from "./AdditionalRequirements";
import ApplicationPurpose from "./ApplicationPurpose";
import { immigrationChecklistRows, immigrationChecklistSections, immigrationMarksPayload, immigrationSectionLabel } from "../../processing-documents/immigrationRequirementOptions";
import { IMMIGRATION_GROUP, IMMIGRATION_GROUP_LABEL_KEYS, IMMIGRATION_NON_EDITABLE_PDF_KEYS } from "../../processingConstants";
import { useIsProcessingContract } from "../contractLifecycle";
import { SignOffNote, signOffColumnTitles, signOffOf, signOffRefusalCode } from "../signOff";

/**
 * Immigration stage panel (prototype immigrationPanel / v210ImmPanel): head with the portal link, the Immigration folder
 * and Upload; the application purpose; the Contracts · Employer Documents · Helper Documents listings (Uploaded · Prepared ·
 * Ready); the Additional requirements listing with the per-section applicability assessment; the collapsed Optional
 * documents; footer Send Template · status menu. The rows are the server's working checklist (`immigration_checklist`,
 * contract 22 Oct 2026): presence, order, treatment, sections and blocking come from the API for the resolved purpose (the
 * superset while the purpose is unresolved); marks autosave through updateProcessingFullDetails on the rows' stable keys;
 * once Immigration is Submitted the checklist is read-only until it is returned (EXTEND §5.12 / CHANGE_HISTORY 214).
 */
const ProcessingImmigrationTab = ({ entityProcessingStatuses, handleOnChangeStatus, stageActionPermission }) => {
    const { contract_id } = useParams();
    const dispatch = useDispatch();
    const { contractDetails } = useSelector((state) => state.contracts);
    const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);
    const { documentPermissions } = useProcessingPermissions(permissionList, ownerOnboardingList, contract_id);
    const [processingDetails, setProcessingDetails] = useState({});
    const [rows, setRows] = useState([]);
    const [optionalOpen, setOptionalOpen] = useState(false);
    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const isUserUpdate = useRef(false);
    const statusOptions = useWithdrawnCompletingOptions("immigration", entityProcessingStatuses);

    const processing = useIsProcessingContract(contractDetails);
    const immigrationStatus = processingDetails?.processing_immigration_document_status || contractDetails?.["processingImmigrationDocumentModel.status"];
    const immigrationSubmitted = immigrationStatus === "submitted";
    const canEdit = processing && !immigrationSubmitted && stageActionPermission.includes("edit");
    /* Prepared / Ready follow the register owner (`sign_off`, CHANGE_HISTORY 252), inside the lifecycle gate (Processing, not Submitted);
       Edit alone no longer enables the marks — it still governs the assessments and the application purpose */
    const signOff = signOffOf(processingDetails, canEdit);
    const markGate = processing && !immigrationSubmitted;
    const canPrepared = markGate && signOff.canPrepared;
    const canReady = markGate && signOff.canReady;
    const holders = { prepared: contractDetails?.prepared_owner_name || "", ready: contractDetails?.ready_owner_name || "" };
    const columnTitles = signOffColumnTitles(signOff, holders);

    const applyDetails = useCallback((details) => {
        setProcessingDetails(details);
        setRows(immigrationChecklistRows(details));
    }, []);
    const reloadImmigrationDetails = useCallback(() => {
        dispatch(fetchProcessingDetails({ contract_id, type: "immigration" })).then((res) => { if (!res.error && res.payload?.data) applyDetails(res.payload.data); });
        dispatch(fetchProcessingStatusList({ contract_id, type: "immigration" }));
    }, [dispatch, contract_id, applyDetails]);

    useEffect(() => {
        dispatch(fetchProcessingDetails({ contract_id, type: "immigration" })).then((res) => {
            if (res.error || !res.payload?.data) { if (res.error) showErrorMessage(res); return; }
            applyDetails(res.payload.data);
        });
    }, [dispatch, contract_id, applyDetails]);

    /* a mark autosaves the whole checklist (ref = user flag, not a dependency) */
    useEffect(() => {
        if (!isUserUpdate.current || !Object.keys(processingDetails).length || rows.length === 0) return;
        isUserUpdate.current = false;
        dispatch(updateProcessingFullDetails({ contract_id, type: "immigration", ...immigrationMarksPayload(rows) })).then((res) => {
            showSuccessOrError(res);
            if (!res.error) { reloadImmigrationDetails(); return; }
            /* a sign-off refusal (403 NOT_*_OWNER / *_OWNER_UNASSIGNED — stale screen or an owner changed meanwhile): the stored
               marks did not change, so re-read the details and let the columns re-render from the fresh `sign_off`; no retry */
            if (signOffRefusalCode(res)) {
                dispatch(fetchProcessingDetails({ contract_id, type: "immigration" })).then((r) => { if (!r.error && r.payload?.data) applyDetails(r.payload.data); });
            }
        });
    }, [rows, processingDetails, dispatch, contract_id, reloadImmigrationDetails, applyDetails]);

    /* rows are addressed by their stable key — the same label exists under distinct `_company` keys */
    const tick = useCallback((row, field, checked) => {
        isUserUpdate.current = true;
        setRows((prev) => prev.map((item) => (item.requirementKey === row.requirementKey ? { ...item, [field]: checked, ...(field === "prepared" && !checked ? { ready: false } : {}) } : item)));
    }, []);
    const setRowLoading = useCallback((row, loading) => {
        setRows((prev) => prev.map((item) => (item.requirementKey === row.requirementKey ? { ...item, isPdfLoading: loading } : item)));
    }, []);
    const openDocument = useCallback(async (row) => {
        setRowLoading(row, true);
        const api = IMMIGRATION_NON_EDITABLE_PDF_KEYS.includes(row.key) ? downloadNonEditablePdf : downloadEditablePdf;
        try {
            const result = await dispatch(api({ contract_id, pdf_file_name: row.key, employer_id: contractDetails.employer_id, worker_id: contractDetails.worker_id }));
            if (api.rejected.match(result)) ShowToast("error", result.payload?.message);
            if (api.fulfilled.match(result)) {
                const blobUrl = URL.createObjectURL(result.payload);
                const win = window.open(blobUrl, "_blank"); if (win) win.focus();
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            }
        } catch { ShowToast("error", translation("key_failed_to_open_pdf")); }
        finally { setRowLoading(row, false); }
    }, [dispatch, contract_id, contractDetails, setRowLoading]);

    const openSendTemplate = useCallback(() => { setTemplate({ slug: "processing_immigration", statusKey: "" }); }, []);

    /* the conditional sections in force (server order) with their rows and applicability; a row under an unlisted section still shows */
    const sections = useMemo(() => {
        const listed = immigrationChecklistSections(processingDetails);
        const extra = rows.map((r) => r.section).filter((s, i, a) => s && !listed.includes(s) && a.indexOf(s) === i);
        return [...listed, ...extra].map((key) => ({
            key, title: immigrationSectionLabel(key), current: processingDetails?.immigration_applicability?.[key], rows: rows.filter((r) => r.section === key), onOpen: openDocument,
        }));
    }, [rows, processingDetails, openDocument]);
    const groupRows = (group) => rows.filter((r) => r.group === group);
    const listing = (group) => (
        <ImmigrationListing title={ translation(IMMIGRATION_GROUP_LABEL_KEYS[group]) } rows={ groupRows(group) } canPrepared={ canPrepared } canReady={ canReady } columnTitles={ columnTitles } onTick={ tick } onOpen={ openDocument } />
    );
    const optional = groupRows(IMMIGRATION_GROUP.OPTIONAL);
    const optionalProgress = immigrationProgress(optional);
    const loaded = Object.keys(processingDetails).length > 0;

    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ translation("key_immigration") } stage="immigration" status={ immigrationStatus } updatedAt={ processingDetails?.processing_immigration_document_status_updated_at } updatedBy={ processingDetails?.last_updated_by_info }>
                <PortalButton />
                <FolderButton folder="immigration" label={ translation("key_immigration") } />
                { /* Excel Contract No. 11: ONE blue Upload that opens the Documents view scoped to Immigration */ }
                { documentPermissions.includes("upload") && <UploadButton folder="immigration" /> }
            </StagePanelHead>
            <div className="g1-panel-body">
                { markGate && <SignOffNote signOff={ signOff } holders={ holders } /> }
                { processingDetails?.application_purpose && <ApplicationPurpose contractId={ contract_id } data={ processingDetails.application_purpose } canEdit={ canEdit } onSaved={ reloadImmigrationDetails } /> }
                { loaded && rows.length === 0 && <div className="g1-note" role="status">{ translation("key_no_data_available") }</div> }
                { groupRows(IMMIGRATION_GROUP.CONTRACT).length > 0 && listing(IMMIGRATION_GROUP.CONTRACT) }
                { groupRows(IMMIGRATION_GROUP.EMPLOYER).length > 0 && listing(IMMIGRATION_GROUP.EMPLOYER) }
                { groupRows(IMMIGRATION_GROUP.HELPER).length > 0 && listing(IMMIGRATION_GROUP.HELPER) }
                { sections.length > 0 && (
                    <AdditionalRequirements contractId={ contract_id } sections={ sections } canEdit={ canEdit } canPrepared={ canPrepared } canReady={ canReady } onSaved={ reloadImmigrationDetails } onTick={ tick } />
                ) }
                { /* Optional documents never block progression (prototype 'Optional' section, collapsed) */ }
                { optional.length > 0 && (
                    <div className="g1-sec">
                        <button type="button" className="g1-sec-head" aria-expanded={ optionalOpen } aria-controls="imm-optional" onClick={ () => setOptionalOpen((v) => !v) }>
                            <span className="t">{ translation("key_optional") }</span>
                            <span className="g1-sec-sum">{ optional.filter((r) => r.prepared && r.ready).length } / { optional.length }</span>
                            <span className="chev" aria-hidden="true"><Icon name="chev_down" size={ 10 } strokeWidth={ 1.8 } /></span>
                        </button>
                        { optionalOpen && (
                            <div id="imm-optional">
                                <Listing title={ translation("key_documents") } done={ optionalProgress.done } total={ optionalProgress.total } columns={ immColumns(columnTitles) }>
                                    <ImmigrationRows rows={ optional } canPrepared={ canPrepared } canReady={ canReady } onTick={ tick } onOpen={ openDocument } />
                                </Listing>
                            </div>
                        ) }
                    </div>
                ) }
            </div>
            <StageFooter stage="immigration" onSendTemplate={ openSendTemplate } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusOptions || [] } current={ immigrationStatus } onChangeStatus={ handleOnChangeStatus } canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) } />

            { template && (
                <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey }
                    onClose={ () => setTemplate(null) } />
            ) }
        </StagePanel>
    );
};

ProcessingImmigrationTab.propTypes = {
    entityProcessingStatuses: PropTypes.array.isRequired,
    handleOnChangeStatus: PropTypes.func,
    stageActionPermission: PropTypes.array,
};

export default ProcessingImmigrationTab;
