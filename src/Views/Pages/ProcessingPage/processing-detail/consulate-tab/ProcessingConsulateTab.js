import React, { useCallback, useEffect, useRef, useState } from "react";
import { PropTypes } from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import consulateConfig from "../../../../../components/ReusableComponents/processing-configs/ConsulateConfigs";
import { downloadNonEditablePdf, fetchProcessingDetails, fetchProcessingStatusList, updateProcessingFullDetails } from "../../../../../redux/Slices/processing/ProcessingSlice";
import { isAdminUser, showErrorMessage, showSuccessOrError } from "../../../../../services/commonService";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";
import CircularSpinner from "../../../../../components/ReusableComponents/CircularSpinner";
import pdfIcon from "../../../../../assets/img/svg/pdf-red.svg";
import docIcon from "../../../../../assets/img/svg/doc-icon.svg";
import { useProcessingPermissions } from "../../../../../utils/permissions/processingPermissionsUtils";
import useWithdrawnCompletingOptions from "../terminal-flow/useWithdrawnCompletingOptions";
import { CheckCell, EmptyCell, FolderButton, Listing, ListingRow, StageFooter, StagePanel, StagePanelHead, UpCell, UploadButton } from "../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../components/Processing/newui/StageSendTemplate";
import { useIsProcessingContract } from "../contractLifecycle";
import { SignOffNote, signOffColumnTitles, signOffOf, signOffRefusalCode } from "../signOff";

const PDF_KEYS = ["OWWA_MEMBERSHIP_FORM", "EMPLOYER_UNDERTAKING_THAI"];

/**
 * Consulate stage panel (prototype consulatePanel): three listings — Contracts (no Uploaded declaration, an empty first
 * track keeps Prepared / Ready aligned), Employer Documents and Helper Documents (Uploaded · Prepared · Ready) — per
 * Group and nationality (ConsulateConfigs). Prepared / Ready ticks autosave; Uploaded is the Documents-view declaration.
 */
const ProcessingConsulateTab = ({ entityProcessingStatuses, handleOnChangeStatus, stageActionPermission }) => {
    const dispatch = useDispatch();
    const { contract_id } = useParams();
    const { contractDetails } = useSelector((state) => state.contracts);
    const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);
    const { documentPermissions } = useProcessingPermissions(permissionList, ownerOnboardingList, contract_id);
    const processing = useIsProcessingContract(contractDetails);
    const legacyCanTick = processing && stageActionPermission.includes("edit");

    const [processingDetails, setProcessingDetails] = useState({});
    /* Prepared / Ready follow the register owner (`sign_off`, CHANGE_HISTORY 252) inside the lifecycle gate; Edit alone no longer enables them */
    const signOff = signOffOf(processingDetails, legacyCanTick);
    const canPrepared = processing && signOff.canPrepared;
    const canReady = processing && signOff.canReady;
    const holders = { prepared: contractDetails?.prepared_owner_name || "", ready: contractDetails?.ready_owner_name || "" };
    const columnTitles = signOffColumnTitles(signOff, holders);
    const [contractData, setContractData] = useState([]);
    const [employerDocumentsData, setEmployerDocumentsData] = useState([]);
    const [helperDocumentsData, setHelperDocumentsData] = useState([]);
    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const isInitialMount = useRef(true);
    const isUserUpdate = useRef(false);

    const applyDetails = useCallback((data) => {
        setProcessingDetails(data);
        isUserUpdate.current = false;
        setContractData(consulateConfig.mapConsulateContractTableData(data, contractDetails));
        setEmployerDocumentsData(consulateConfig.mapConsulateEmpooyerDocTableData(data, contractDetails));
        setHelperDocumentsData(consulateConfig.mapConsulateHelperDocTableData(data, contractDetails));
    }, [contractDetails]);

    useEffect(() => {
        dispatch(fetchProcessingDetails({ contract_id, type: "consulate" })).then((res) => {
            const { payload, error } = res;
            if (error || !payload?.data) { if (error) showErrorMessage(res); return; }
            applyDetails(payload.data);
        });
    }, [dispatch, contract_id, applyDetails]);

    const updateConsulate = useCallback((contracts, employerDocs, helperDocs) => {
        dispatch(updateProcessingFullDetails({ contract_id, type: "consulate", ...consulateConfig.updatePayloadOfConsulate(contracts, employerDocs, helperDocs) })).then((res) => {
            showSuccessOrError(res);
            if (!res.error) {
                dispatch(fetchProcessingDetails({ contract_id, type: "consulate" })).then((r) => { if (!r.error) setProcessingDetails(r.payload.data); });
                dispatch(fetchProcessingStatusList({ contract_id, type: "consulate" }));
                return;
            }
            /* a sign-off refusal (403 NOT_*_OWNER / *_OWNER_UNASSIGNED — stale screen or an owner changed meanwhile): the stored
               marks did not change, so re-read the details and let the columns re-render from the fresh `sign_off`; no retry */
            if (signOffRefusalCode(res)) {
                dispatch(fetchProcessingDetails({ contract_id, type: "consulate" })).then((r) => { if (!r.error && r.payload?.data) applyDetails(r.payload.data); });
            }
        });
    }, [dispatch, contract_id, applyDetails]);

    /* the Prepared / Ready ticks autosave (the refs are flags, not dependencies) */
    useEffect(() => {
        if (!isInitialMount.current && isUserUpdate.current && Object.keys(processingDetails).length > 0 && contractData.length && employerDocumentsData.length && helperDocumentsData.length) {
            updateConsulate(contractData, employerDocumentsData, helperDocumentsData);
            isUserUpdate.current = false;
        }
        if (isInitialMount.current) isInitialMount.current = false;
    }, [contractData, employerDocumentsData, helperDocumentsData, processingDetails, updateConsulate]);

    const tick = (setter) => (label, field, checked) => {
        isUserUpdate.current = true;
        setter((prev) => prev.map((item) => (item.label === label ? { ...item, [field]: checked, ...(field === "prepared" && !checked ? { ready: false } : {}) } : item)));
    };
    const tickContract = tick(setContractData);
    const tickEmployer = tick(setEmployerDocumentsData);
    const tickHelper = tick(setHelperDocumentsData);

    const onDocumentClick = useCallback(async (row) => {
        setHelperDocumentsData((prev) => prev.map((item) => (item.label === row.label ? { ...item, isPdfLoading: true } : item)));
        try {
            const result = await dispatch(downloadNonEditablePdf({ contract_id: Number(contract_id), pdf_file_name: row?.key, employer_id: contractDetails.employer_id, worker_id: contractDetails.worker_id }));
            if (downloadNonEditablePdf.rejected.match(result)) ShowToast("error", result.payload?.message || translation("key_failed_to_open_pdf"));
            if (downloadNonEditablePdf.fulfilled.match(result)) {
                const blobUrl = URL.createObjectURL(result.payload);
                const win = window.open(blobUrl, "_blank"); if (win) win.focus();
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            }
        } catch { ShowToast("error", translation("key_failed_to_open_pdf")); }
        finally { setHelperDocumentsData((prev) => prev.map((item) => (item.label === row.label ? { ...item, isPdfLoading: false } : item))); }
    }, [dispatch, contract_id, contractDetails]);

    const handleTemplateMessageClick = useCallback(() => {
        setTemplate({ slug: "processing_consulate", statusKey: "" });
    }, []);

    const statusOptions = useWithdrawnCompletingOptions("consulate", entityProcessingStatuses);
    const doneOf = (rows) => rows.filter((r) => r.prepared && r.ready).length;
    const marks = (row, onTick) => (
        <>
            <CheckCell checked={ Boolean(row.prepared) } disabled={ !canPrepared } label={ `${ row.label } — ${ translation("key_prepared") }` } onChange={ (v) => onTick(row.label, "prepared", v) } />
            <CheckCell checked={ Boolean(row.ready) } disabled={ !canReady || !row.prepared } label={ `${ row.label } — ${ translation("key_ready") }` } onChange={ (v) => onTick(row.label, "ready", v) } />
        </>
    );
    const docIco = (row) => (row.isDoc ? <img src={ docIcon } alt="" /> : null);
    const prepCol = { key: "prep", label: translation("key_prepared"), title: columnTitles.prepared };
    const readyCol = { key: "rdy", label: translation("key_ready"), title: columnTitles.ready };

    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ translation("key_consulate") } stage="consulate" status={ processingDetails?.processing_consulate_document_status }
                updatedAt={ processingDetails?.processing_consulate_document_status_updated_at } updatedBy={ processingDetails?.last_updated_by_info }>
                <FolderButton folder="consulate" label={ translation("key_consulate") } />
                { documentPermissions.includes("upload") && processing && <UploadButton folder="consulate" /> }
            </StagePanelHead>
            <div className="g1-panel-body">
                { processing && <SignOffNote signOff={ signOff } holders={ holders } /> }
                <Listing title={ translation("key_contracts") } done={ doneOf(contractData) } total={ contractData.length }
                    columns={ [{ key: "sp" }, prepCol, readyCol] }>
                    { contractData.map((row) => <ListingRow key={ row.label } name={ row.label } icon={ docIco(row) }><EmptyCell />{ marks(row, tickContract) }</ListingRow>) }
                </Listing>
                <Listing title={ translation("key_employer_documents") } done={ doneOf(employerDocumentsData) } total={ employerDocumentsData.length }
                    columns={ [{ key: "up", label: translation("key_uploaded") }, prepCol, readyCol] }>
                    { employerDocumentsData.map((row) => <ListingRow key={ row.label } name={ row.label } icon={ docIco(row) }><UpCell value={ row.uploaded } />{ marks(row, tickEmployer) }</ListingRow>) }
                </Listing>
                <Listing title={ translation("key_helper_documents") } done={ doneOf(helperDocumentsData) } total={ helperDocumentsData.length }
                    columns={ [{ key: "up", label: translation("key_uploaded") }, prepCol, readyCol] }>
                    { helperDocumentsData.map((row) => (
                        <ListingRow key={ row.label } name={ row.label }
                            icon={ row.isPdfLoading ? <CircularSpinner paddingClass="p-0" /> : (PDF_KEYS.includes(row.key)
                                ? <button type="button" className="g1-ico-btn" aria-label={ `${ translation("key_download") } ${ row.label }` } onClick={ () => onDocumentClick(row) }><img src={ pdfIcon } alt="" /></button>
                                : docIco(row)) }>
                            <UpCell value={ row.uploaded } />{ marks(row, tickHelper) }
                        </ListingRow>
                    )) }
                </Listing>
            </div>
            <StageFooter stage="consulate" onSendTemplate={ handleTemplateMessageClick } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusOptions } current={ processingDetails?.processing_consulate_document_status } onChangeStatus={ handleOnChangeStatus }
                canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) } />

            { template && (
                <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey }
                    onClose={ () => setTemplate(null) } />
            ) }
        </StagePanel>
    );
};

ProcessingConsulateTab.propTypes = {
    entityProcessingStatuses: PropTypes.array.isRequired,
    handleOnChangeStatus: PropTypes.func,
    stageActionPermission: PropTypes.array,
};

export default React.memo(ProcessingConsulateTab);
